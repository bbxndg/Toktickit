import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, Role } from '@prisma/client';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../../src/index';
import { generateToken, hashPassword } from '../../src/utils/auth';

const db = new PrismaClient();
let admins: { id: number; email: string; role: Role }[] = [];
const token = (user: typeof admins[number]) => `Bearer ${generateToken(user)}`;

describe('Lab 4 account safety regression', () => {
  beforeAll(async () => {
    if (new URL(process.env.DATABASE_URL!).pathname !== '/toktickit_lab4_feature2_test') throw Error('Isolated database required');
    for (let i = 0; i < 2; i++) admins.push(await db.user.create({ data: {
      name: 'Safety Administrator', email: `safety-${randomUUID()}@test.local`, role: 'ADMINISTRATOR',
      passwordHash: hashPassword('Password123!'), isPasswordChangeRequired: false,
    } }));
  });
  afterAll(async () => { await db.user.deleteMany({ where: { id: { in: admins.map(a => a.id) } } }); await db.$disconnect(); });

  it.each([0, 1, '', 'false', null, [], {}])('rejects a non-boolean active flag %j without changing an account', async value => {
    const before = await db.user.findUniqueOrThrow({ where: { id: admins[0].id } });
    const result = await request(app).patch(`/api/admin/users/${admins[0].id}`).set('Authorization', token(admins[0])).send({ isActive: value });
    expect(result.status).toBe(400); expect(result.body.error.code).toBe('VALIDATION_ERROR');
    expect(await db.user.findUniqueOrThrow({ where: { id: admins[0].id } })).toEqual(before);
    const create = await request(app).post('/api/admin/users').set('Authorization', token(admins[0]))
      .send({ name: 'Invalid flag', email: `bad-${randomUUID()}@test.local`, role: 'REQUESTER', initialPassword: 'Password123!', isActive: value });
    expect(create.status).toBe(400);
  });

  it.each([{ isActive: false }, { role: 'REQUESTER' }])('preserves a live administrator during competing changes %j', async change => {
    const original = await db.user.findMany({ where: { role: 'ADMINISTRATOR', isActive: true }, select: { id: true } });
    try {
      await db.user.updateMany({ where: { role: 'ADMINISTRATOR', id: { notIn: admins.map(a => a.id) } }, data: { isActive: false } });
      await db.user.updateMany({ where: { id: { in: admins.map(a => a.id) } }, data: { isActive: true, role: 'ADMINISTRATOR' } });
      const results = await Promise.all(admins.map((actor, i) => request(app).patch(`/api/admin/users/${admins[1 - i].id}`)
        .set('Authorization', token(actor)).send(change)));
      expect(results.filter(result => result.status === 200)).toHaveLength(1);
      expect(results.filter(result => [401, 403].includes(result.status))).toHaveLength(1);
      expect(await db.user.count({ where: { isActive: true, role: 'ADMINISTRATOR' } })).toBe(1);
    } finally {
      await db.user.updateMany({ where: { id: { in: original.map(a => a.id) } }, data: { isActive: true, role: 'ADMINISTRATOR' } });
      await db.user.updateMany({ where: { id: { in: admins.map(a => a.id) } }, data: { isActive: true, role: 'ADMINISTRATOR' } });
    }
  });
});
