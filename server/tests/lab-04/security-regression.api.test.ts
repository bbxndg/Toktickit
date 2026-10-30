import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import app from '../../src/index';
import { requesterFixtures } from '../lab-02/fixtures';
import { hashPassword, generateToken } from '../../src/utils/auth';
import fs from 'fs';
import path from 'path';
let fixtures: Awaited<ReturnType<typeof requesterFixtures>>, ticketId: number, attachmentId: number, fixturePath: string;
const db = new PrismaClient(); let gatedId: number;
describe('Lab 4 protected routes', () => {
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_lab4_feature2_test')) throw Error('Isolated database required');
    fixtures = await requesterFixtures();
    const ticket = await db.ticket.create({ data: { ticketNumber: `SEC-${fixtures.users[0].id}`, summary: 'Security test ticket', description: 'Security test description', requestedPriority: 'LOW', requesterId: fixtures.users[0].id, categoryId: fixtures.categories[0].id, relatedSystemId: fixtures.systems[0].id } }); ticketId = ticket.id;
    const attachment = await db.attachment.create({ data: { ticketId, filename: 'nonexistent.pdf', originalName: 'fixture.pdf', mimeType: 'application/pdf', sizeBytes: 1, isRemoved: true } }); attachmentId = attachment.id;
    const gated = await db.user.create({ data: { email: `gated-${ticketId}@test.local`, name: 'Gated', role: 'REQUESTER', passwordHash: hashPassword('Password123!'), isPasswordChangeRequired: true } }); gatedId = gated.id;
    fixturePath = path.join(process.cwd(), 'uploads', 'attachments', `security-${ticketId}.pdf`);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true }); fs.writeFileSync(fixturePath, '%PDF-1.4 test');
  });
  afterAll(async () => { if (fixturePath) fs.rmSync(fixturePath, { force: true }); await db.user.deleteMany({ where: { id: gatedId } }); await fixtures.cleanup(); await db.$disconnect(); });
  it('rejects unauthenticated access even when a requester id or query token is provided', async () => {
    expect((await request(app).get(`/api/tickets/${ticketId}?requesterId=${fixtures.users[0].id}`)).status).toBe(401);
    expect((await request(app).post('/api/tickets').field('requesterId', fixtures.users[0].id)).status).toBe(401);
    expect((await request(app).post(`/api/tickets/${ticketId}/attachments?requesterId=${fixtures.users[0].id}`)).status).toBe(401);
    expect((await request(app).get(`/api/attachments/${attachmentId}/download?token=${fixtures.tokens[0]}`)).status).toBe(401);
    expect((await request(app).patch(`/api/attachments/${attachmentId}/remove`).send({ requesterId: fixtures.users[0].id, reason: 'test' })).status).toBe(401);
    expect((await request(app).get(`/uploads/attachments/security-${ticketId}.pdf`)).status).toBe(404);
    expect((await request(app).get('/api/requesters')).status).toBe(401);
  });
  it('checks ownership before revealing removed attachments and enforces the password gate', async () => {
    const other = await request(app).get(`/api/attachments/${attachmentId}/download`).set('Authorization', `Bearer ${fixtures.tokens[1]}`);
    expect(other.status).toBe(404);
    const owner = await request(app).get(`/api/attachments/${attachmentId}/download`).set('Authorization', `Bearer ${fixtures.tokens[0]}`);
    expect(owner.status).toBe(410);
    const gated = generateToken({ id: gatedId, email: `gated-${ticketId}@test.local`, role: 'REQUESTER' });
    expect((await request(app).get(`/api/tickets/${ticketId}/comments`).set('Authorization', `Bearer ${gated}`)).status).toBe(403);
    expect((await request(app).get(`/api/tickets/${ticketId}/comments?next=/auth/me`).set('Authorization', `Bearer ${gated}`)).status).toBe(403);
    const forged = generateToken({ id: fixtures.users[1].id, email: fixtures.users[1].email, role: 'ADMINISTRATOR' });
    expect((await request(app).get('/api/requesters').set('Authorization', `Bearer ${forged}`)).status).toBe(403);
  });
  it('rejects malformed attachment IDs across download and all removal aliases without changing data', async () => {
    const before = await db.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    for (const id of [`${attachmentId}abc`, '0', '-1', '1.5', '1e3', '2147483648', '9007199254740992', `0${attachmentId}`]) {
      const authorization = `Bearer ${fixtures.tokens[0]}`;
      const result = await request(app).get(`/api/attachments/${id}/download`).set('Authorization', authorization);
      expect(result.status, id).toBe(400); expect(result.body.error.code).toBe('VALIDATION_ERROR');
      for (const method of ['patch', 'delete'] as const) for (const suffix of ['', '/remove']) {
        const response = await request(app)[method](`/api/attachments/${id}${suffix}`).set('Authorization', authorization).send({ reason: 'Invalid identifier test' });
        expect(response.status, `${method} ${id}${suffix}`).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    }
    expect(await db.attachment.findUniqueOrThrow({ where: { id: attachmentId } })).toEqual(before);
  });
});
