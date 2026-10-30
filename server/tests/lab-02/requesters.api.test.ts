import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import app from '../../src/index';
import { generateToken, hashPassword } from '../../src/utils/auth';
const db = new PrismaClient(); let adminId: number, token: string;
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_lab4_feature2_test')) throw Error('Isolated database required');
  const admin = await db.user.create({ data: { email: `requesters-test-${randomUUID()}@test.local`, name: 'Test Admin', role: 'ADMINISTRATOR', passwordHash: hashPassword('Password123!'), isPasswordChangeRequired: false } });
  adminId = admin.id; token = generateToken({ id: admin.id, email: admin.email, role: admin.role });
});
afterAll(async () => { if (adminId) await db.user.delete({ where: { id: adminId } }); await db.$disconnect(); });
describe('GET /api/requesters', () => {
  it('requires authenticated Administrator access', async () => {
    expect((await request(app).get('/api/requesters')).status).toBe(401);
  });
  it('returns only active requester accounts to an Administrator', async () => {
    const res = await request(app).get('/api/requesters').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200); expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    for (const user of res.body) expect(user).toMatchObject({ isActive: true });
    expect(res.body.every((user: any) => 'id' in user && 'name' in user && 'email' in user && 'department' in user)).toBe(true);
  });
});
