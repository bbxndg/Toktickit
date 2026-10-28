import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Role } from '@prisma/client';
import app from '../../src/index';
import { generateToken, hashPassword } from '../../src/utils/auth';

const prisma = new PrismaClient();
const prefix = `lab4-actions-${randomUUID()}`;
const userIds: number[] = [];
const ticketIds: number[] = [];
let createdActions = false;
let staff: any, other: any, admin: any, owner: any, stranger: any, inactive: any, gated: any;
let ticket: any, category: any, system: any;
const token = (user: any) => generateToken({ id: user.id, email: user.email, role: user.role });
const auth = (user: any) => ({ Authorization: `Bearer ${token(user)}` });

async function create(overrides: Record<string, unknown> = {}, actor = staff) {
  const current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  const response = await request(app).post(`/api/staff/tickets/${ticket.id}/actions-taken`)
    .set(auth(actor)).send({ description: 'Inspect the connection', ticketVersion: current.version ?? 1,
      clientRequestId: randomUUID(), ...overrides });
  if (response.status === 201) createdActions = true;
  return response;
}

async function edit(action: any, changes: Record<string, unknown>, actor = staff) {
  const current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  return request(app).patch(`/api/staff/tickets/${ticket.id}/actions-taken/${action.id}`)
    .set(auth(actor)).send({ version: action.version, ticketVersion: current.version, ...changes });
}

describe('Lab 4 Actions Taken (API-01–07, API-13–14)', () => {
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_lab4_feature2_test')) {
      throw new Error('Use a dedicated *_lab4_feature2_test database for Lab 4 integration tests.');
    }
    const addUser = async (name: string, role: Role, isActive = true, gate = false) => {
      const user = await prisma.user.create({ data: { name, email: `${prefix}-${name}@test.local`, role,
        passwordHash: hashPassword('Password123!'), isActive, isPasswordChangeRequired: gate } });
      userIds.push(user.id); return user;
    };
    staff = await addUser('Staff', Role.IT_STAFF); other = await addUser('Other', Role.IT_STAFF);
    admin = await addUser('Admin', Role.ADMINISTRATOR); owner = await addUser('Requester', Role.REQUESTER);
    stranger = await addUser('Stranger', Role.REQUESTER); inactive = await addUser('Inactive', Role.IT_STAFF, false);
    gated = await addUser('Gated', Role.IT_STAFF, true, true);
    category = await prisma.category.create({ data: { name: prefix } });
    system = await prisma.relatedSystem.create({ data: { name: prefix } });
  });
  beforeEach(async () => {
    ticket = await prisma.ticket.create({ data: { ticketNumber: `${prefix}-${randomUUID()}`, summary: 'Action test',
      description: 'Test a safe independent work record.', requestedPriority: 'HIGH', itPriority: 'HIGH',
      requesterId: owner.id, ownerId: other.id, categoryId: category.id, relatedSystemId: system.id } });
    ticketIds.push(ticket.id);
  });
  afterAll(async () => {
    if (createdActions) await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (category) await prisma.category.delete({ where: { id: category.id } });
    if (system) await prisma.relatedSystem.delete({ where: { id: system.id } });
    await prisma.$disconnect();
  });

  it('API-01: creates one action with automatic identity and independent owner/status', async () => {
    const res = await create({ description: '  Inspect the connection  ' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ ticketId: ticket.id, description: 'Inspect the connection', version: 1,
      status: 'PLANNED', assignee: { id: staff.id }, createdBy: { id: staff.id }, performedBy: null });
    expect(res.body.ticket).toMatchObject({ version: 2, status: 'NEW' });
    const saved = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(saved.ownerId).toBe(other.id);
    expect(res.body.data).not.toHaveProperty('requestFingerprint');
    expect(res.body.data).not.toHaveProperty('clientRequestId');
    expect(res.body.data.assignee).not.toHaveProperty('email');
  });
  it.each([{}, { description: ' ' }, { description: 'a' }, { description: 'a'.repeat(2001) },
    { followUpRequired: 'true' }, { followUpRequired: true }, { result: 12 }, { status: 'cancelled' },
    { status: 'COMPLETED' }, { createdById: 1 }, { actionAt: '2020-01-01' }, { assigneeId: null },
    { ticketVersion: 0 }, { clientRequestId: 'bad' }])('API-02: rejects invalid input %j without partial writes', async (invalid) => {
    const input = Object.keys(invalid).length ? invalid : { description: undefined };
    const res = await create(input);
    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code');
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(1);
  });
  it.each([2, 2000])('API-02: accepts description boundary %i', async (length) => {
    expect((await create({ description: 'a'.repeat(length) })).status).toBe(201);
  });
  it('API-03: supports a separate active assignee; rejects inactive/Requester/missing targets', async () => {
    for (const id of [inactive.id, owner.id, 2147483647]) {
      expect((await create({ assigneeId: id })).body.error.code).toBe('INVALID_ASSIGNEE');
    }
    const res = await create({ assigneeId: admin.id });
    expect(res.body.data.assignee.id).toBe(admin.id);
    expect((await edit(res.body.data, { assigneeId: other.id })).body.data.assignee.id).toBe(other.id);
  });
  it('API-04: completes as actual actor and retains terminal records', async () => {
    const initial = await create({ assigneeId: other.id });
    const done = await edit(initial.body.data, { status: 'COMPLETED', result: 'Connection tested' }, admin);
    expect(done.status).toBe(200);
    expect(done.body.data).toMatchObject({ status: 'COMPLETED', performedBy: { id: admin.id }, assignee: { id: other.id }, version: 2 });
    expect(done.body.data.completedAt).toBeTruthy();
    expect(done.body.ticket.status).toBe('NEW');
    expect((await edit(done.body.data, { description: 'Overwrite result' })).status).toBe(422);
    expect((await request(app).delete(`/api/staff/tickets/${ticket.id}/actions-taken/${done.body.data.id}`).set(auth(staff))).status).not.toBe(200);
  });
  it('API-04: validates merged fields, cancels with reason and clears disabled follow-up note', async () => {
    const initial = await create({ followUpRequired: true, followUpNote: 'Check tomorrow' });
    expect((await edit(initial.body.data, { followUpNote: null })).status).toBe(400);
    const changed = await edit(initial.body.data, { status: 'IN_PROGRESS', followUpRequired: false });
    expect(changed.body.data.followUpNote).toBeNull();
    expect((await edit(changed.body.data, { status: 'PLANNED' })).status).toBe(422);
    const cancelled = await edit(changed.body.data, { status: 'CANCELLED', cancelReason: 'Not needed' });
    expect(cancelled.body.data).toMatchObject({ status: 'CANCELLED', cancelReason: 'Not needed', performedBy: null });
    expect(cancelled.body.data.cancelledAt).toBeTruthy();
  });
  it('API-04: permits completed creation and blocks writes on resolved/closed/cancelled parents', async () => {
    const res = await create({ status: 'COMPLETED', result: 'Verified successfully' });
    expect(res.body.data.performedBy.id).toBe(staff.id);
    for (const status of ['RESOLVED', 'CLOSED', 'CANCELLED'] as const) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status } });
      expect((await create()).status).toBe(422);
    }
  });
  it('API-03: preserves inactive attribution but requires active reassignment before completion', async () => {
    const res = await create({ assigneeId: other.id });
    await prisma.user.update({ where: { id: other.id }, data: { isActive: false } });
    try {
      expect((await edit(res.body.data, { status: 'COMPLETED', result: 'Done correctly' })).body.error.code).toBe('INVALID_ASSIGNEE');
      const textEdit = await edit(res.body.data, { description: 'Updated planning notes' });
      expect(textEdit.status).toBe(200);
      expect((await edit(textEdit.body.data, { assigneeId: staff.id, status: 'COMPLETED', result: 'Done correctly' })).status).toBe(200);
    } finally { await prisma.user.update({ where: { id: other.id }, data: { isActive: true } }); }
  });
  it('API-05: enforces live auth, role, password gate and requester ownership', async () => {
    const url = `/api/tickets/${ticket.id}/actions-taken`;
    expect((await request(app).get(url)).status).toBe(401);
    expect((await request(app).get(url).set(auth(inactive))).status).toBe(401);
    expect((await request(app).get(url).set(auth(gated))).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await request(app).get(url).set(auth(owner))).status).toBe(200);
    expect((await request(app).get(url).set(auth(stranger))).status).toBe(404);
    expect((await create({}, owner)).status).toBe(403);
    expect((await request(app).post('/api/staff/tickets/2147483647/actions-taken').set(auth(owner)).send({})).status).toBe(403);
    const oldToken = token(staff);
    await prisma.user.update({ where: { id: staff.id }, data: { role: 'REQUESTER' } });
    try { expect((await request(app).post(`/api/staff/tickets/${ticket.id}/actions-taken`).set('Authorization', `Bearer ${oldToken}`).send({})).status).toBe(403); }
    finally { await prisma.user.update({ where: { id: staff.id }, data: { role: 'IT_STAFF' } }); }
  });
  it('API-07: uses stable ordering, pagination and a consistent parent version', async () => {
    const first = await create(); const second = await create({ description: 'Second inspection' });
    const at = new Date('2026-01-01T00:00:00Z');
    await prisma.actionTaken.updateMany({ where: { ticketId: ticket.id }, data: { actionAt: at } });
    const page = await request(app).get(`/api/tickets/${ticket.id}/actions-taken?pageSize=1&page=2`).set(auth(owner));
    expect(page.body.data[0].id).toBe(second.body.data.id);
    expect(page.body.pagination).toMatchObject({ totalItems: 2, totalPages: 2 });
    expect(page.body.ticket.version).toBe(3);
    expect(first.body.data.id).toBeLessThan(second.body.data.id);
    for (const query of ['page=0', 'pageSize=51', 'page=1&page=2', 'page=1x']) {
      expect((await request(app).get(`/api/tickets/${ticket.id}/actions-taken?${query}`).set(auth(owner))).status).toBe(400);
    }
    expect((await request(app).get(`/api/tickets/${ticket.id}/actions-taken?page=9`).set(auth(owner))).body.data).toEqual([]);
  });
  it('API-13: no-op keeps versions/time and stale parent/action edits return 409', async () => {
    const initial = await create(); const row = initial.body.data;
    const noop = await edit(row, { description: ' Inspect the connection ' });
    expect(noop.body.data.updatedAt).toBe(row.updatedAt);
    expect(noop.body.ticket.version).toBe(2);
    expect((await edit(row, { description: 'Changed record' }, admin)).status).toBe(200);
    expect((await edit(row, { description: 'Lost update' })).status).toBe(409);
    expect((await create({ ticketVersion: 1 })).body.error.code).toBe('STALE_UPDATE');
  });
  it('API-14: concurrent identical creation/replay remains one row even after edits/parent closure', async () => {
    const key = randomUUID();
    const results = await Promise.all([create({ clientRequestId: key, ticketVersion: 1 }), create({ clientRequestId: key, ticketVersion: 1 })]);
    expect(results.map(r => r.status).sort()).toEqual([200, 201]);
    expect(results[0].body.data.id).toBe(results[1].body.data.id);
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
    const changed = await edit(results[0].body.data, { description: 'New description' });
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'CLOSED' } });
    const replay = await create({ clientRequestId: key, ticketVersion: 1 });
    expect(replay.status).toBe(200); expect(replay.body.replayed).toBe(true);
    expect(replay.body.data.description).toBe(changed.body.data.description);
    expect((await create({ clientRequestId: key, description: 'Changed payload' })).body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });
  it('API-13: racing action edits and parent mutations serialize on the same parent', async () => {
    const res = await create();
    const results = await Promise.all([
      edit(res.body.data, { description: 'New investigation', ticketVersion: 2 }),
      request(app).patch(`/api/staff/tickets/${ticket.id}/priority`).set(auth(other)).send({ itPriority: 'CRITICAL', version: 2 }),
    ]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(3);
  });
  it.each(['claim', 'assign', 'priority', 'status'])('API-13: %s requires versions and keeps a fresh no-op unchanged', async operation => {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { ownerId: null } });
    const changes = { claim: {}, assign: { ownerId: other.id }, priority: { itPriority: 'CRITICAL' }, status: { status: 'OPEN' } }[operation];
    const write = (body: object) => request(app).patch(`/api/staff/tickets/${ticket.id}/${operation}`).set(auth(staff)).send(body);
    expect((await write(changes!)).status).toBe(400);
    expect((await write({ ...changes, version: 2 })).status).toBe(409);
    const changed = await write({ ...changes, version: 1 }); expect(changed.status).toBe(200);
    const unchanged = await write({ ...changes, version: 2 });
    expect(unchanged.status).toBe(200); expect(unchanged.body.version).toBe(2);
    expect(unchanged.body.updatedAt).toBe(changed.body.updatedAt);
    expect((await write({ ...changes, version: 1 })).status).toBe(409);
  });
  it('API-05/06: rejects malformed JSON/IDs, wrong children and allows Administrator creation', async () => {
    expect((await create({}, admin)).status).toBe(201);
    const malformed = await request(app).post(`/api/staff/tickets/${ticket.id}/actions-taken`)
      .set(auth(staff)).set('Content-Type', 'application/json').send('{bad');
    expect(malformed.status).toBe(400); expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
    expect((await request(app).get(`/api/tickets/${ticket.id}x/actions-taken`).set(auth(owner))).status).toBe(400);
    const missing = await request(app).patch(`/api/staff/tickets/${ticket.id}/actions-taken/2147483647`)
      .set(auth(staff)).send({ version: 1, ticketVersion: 2 });
    expect(missing.status).toBe(404);
  });
});
