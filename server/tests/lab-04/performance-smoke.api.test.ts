import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import request from 'supertest';
import app from '../../src/index';
import { generateToken, hashPassword } from '../../src/utils/auth';
import { dashboardQueryCount } from '../../src/routes/dashboard';

const db = new PrismaClient();
const key = `perf-${randomUUID()}`;
let requesterId = 0, staffId = 0, categoryId = 0, systemId = 0;
let baselineActive = 0;
const token = (id: number, role: 'REQUESTER' | 'IT_STAFF') => `Bearer ${generateToken({ id, email: `${key}-${role}@test.local`, role })}`;

describe('PERF-01 dashboard smoke on 1000 Tickets and 3000 actions', () => {
  beforeAll(async () => {
    if (new URL(process.env.DATABASE_URL!).pathname !== '/toktickit_lab4_feature2_test') throw Error('Dedicated test database required');
    const passwordHash = hashPassword('Password123!');
    requesterId = (await db.user.create({ data: { name: key, email: `${key}-REQUESTER@test.local`, role: 'REQUESTER', passwordHash, isPasswordChangeRequired: false } })).id;
    staffId = (await db.user.create({ data: { name: key, email: `${key}-IT_STAFF@test.local`, role: 'IT_STAFF', passwordHash, isPasswordChangeRequired: false } })).id;
    categoryId = (await db.category.create({ data: { name: key } })).id;
    systemId = (await db.relatedSystem.create({ data: { name: key } })).id;
    baselineActive = await db.ticket.count({ where: { status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } } });
    await db.ticket.createMany({ data: Array.from({ length: 1000 }, (_, i) => ({ ticketNumber: `${key}-${i}`, summary: key, description: key,
      requestedPriority: 'HIGH' as const, requesterId, ownerId: staffId, categoryId, relatedSystemId: systemId })) });
    const tickets = await db.ticket.findMany({ where: { requesterId }, select: { id: true } });
    await db.actionTaken.createMany({ data: tickets.flatMap(ticket => Array.from({ length: 3 }, () => ({ ticketId: ticket.id, assigneeId: staffId,
      createdById: staffId, updatedById: staffId, description: key, clientRequestId: randomUUID(), requestFingerprint: key }))) });
  }, 60000);
  afterAll(async () => {
    if (requesterId) {
      const tickets = await db.ticket.findMany({ where: { requesterId }, select: { id: true } });
      await db.actionTaken.deleteMany({ where: { ticketId: { in: tickets.map(t => t.id) } } });
      await db.ticket.deleteMany({ where: { requesterId } });
    }
    if (requesterId || staffId) await db.user.deleteMany({ where: { id: { in: [requesterId, staffId].filter(Boolean) } } });
    if (categoryId) await db.category.delete({ where: { id: categoryId } });
    if (systemId) await db.relatedSystem.delete({ where: { id: systemId } });
    await db.$disconnect();
  });
  it('returns exact totals, bounded lists and records 20 warm measurements per role', async () => {
    for (const role of ['REQUESTER', 'IT_STAFF'] as const) {
      const id = role === 'REQUESTER' ? requesterId : staffId;
      const route = `/api/dashboard/${role === 'REQUESTER' ? 'requester' : 'staff'}`;
      const samples: number[] = []; let maxBytes = 0; const queries: number[] = [];
      for (let i = 0; i < 23; i++) {
        const start = performance.now();
        const queryStart = dashboardQueryCount();
        const response = await request(app).get(route).set('Authorization', token(id, role));
        queries.push(dashboardQueryCount() - queryStart);
        const duration = performance.now() - start;
        expect(response.status).toBe(200);
        if (role === 'REQUESTER') expect(response.body.metrics.totalTickets).toBe(1000);
        else {
          expect(response.body.metrics.activeTickets).toBe(baselineActive + 1000);
          expect(response.body.myPendingActions.totalItems).toBe(3000);
          expect(response.body.myPendingActions.data.length).toBeLessThanOrEqual(5);
        }
        expect(response.body.recentTickets.length).toBeLessThanOrEqual(5);
        maxBytes = Math.max(maxBytes, Buffer.byteLength(response.text));
        if (i >= 3) samples.push(duration);
      }
      samples.sort((a, b) => a - b);
      const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
      console.log(`PERF-01 ${role}: warmups=3 samples=20 p95=${p95.toFixed(1)}ms maxBytes=${maxBytes} dashboardQueries=${Math.max(...queries)}`);
      expect(p95).toBeLessThanOrEqual(1000);
      // Include Prisma's transaction commands and separate relation-loading queries.
      expect(Math.max(...queries)).toBeLessThanOrEqual(role === 'REQUESTER' ? 8 : 16);
      if (role === 'IT_STAFF') {
        const first = await db.actionTaken.findFirstOrThrow({ where: { assigneeId: staffId } });
        await db.actionTaken.updateMany({ where: { assigneeId: staffId, id: { not: first.id } }, data: { status: 'COMPLETED' } });
        const before = dashboardQueryCount();
        const small = await request(app).get(route).set('Authorization', token(id, role));
        expect(small.status).toBe(200);
        expect(small.body.myPendingActions.totalItems).toBe(1);
        expect(dashboardQueryCount() - before).toBe(Math.max(...queries));
      }
    }
  }, 60000);
});
