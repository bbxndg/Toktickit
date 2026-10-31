import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { ActionTakenStatus, PrismaClient, TicketStatus } from '@prisma/client';
import app from '../../src/index';
import { generateToken, hashPassword } from '../../src/utils/auth';

const db = new PrismaClient();
const prefix = `deep-contract-${randomUUID()}`;
const tickets: number[] = [];
let users: Awaited<ReturnType<typeof db.user.create>>[] = [];
let categoryId: number, systemId: number;
let ticket: Awaited<ReturnType<typeof db.ticket.create>>, action: Awaited<ReturnType<typeof db.actionTaken.create>>;
const auth = (index = 1) => ({ Authorization: `Bearer ${generateToken(users[index])}` });
const actionUrl = () => `/api/staff/tickets/${ticket.id}/actions-taken`;
const create = (body: object, headers = auth()) => request(app).post(actionUrl()).set(headers).send(body);
const payload = () => ({ description: 'Inspect deep fixture', ticketVersion: 1, clientRequestId: randomUUID() });
const protectedRoutes = [
  ['get', () => `/api/tickets/${ticket.id}/actions-taken`],
  ['get', () => `/api/tickets/${ticket.id}/status-history`],
  ['get', () => `/api/tickets/${ticket.id}`],
  ['get', () => `/api/staff/tickets/${ticket.id}`],
  ['get', () => '/api/tickets'], ['get', () => '/api/staff/tickets'],
  ['get', () => `/api/tickets/${ticket.id}/comments`], ['post', () => `/api/tickets/${ticket.id}/comments`],
  ['get', () => `/api/tickets/${ticket.id}/notes`], ['post', () => `/api/tickets/${ticket.id}/notes`],
  ['post', actionUrl], ['patch', () => `${actionUrl()}/${action.id}`],
  ...['claim', 'assign', 'priority', 'status'].map(operation => ['patch', () => `/api/staff/tickets/${ticket.id}/${operation}`]),
  ['patch', () => `/api/tickets/${ticket.id}/indicate-resolved`],
  ['post', () => `/api/tickets/${ticket.id}/attachments`],
  ['get', () => '/api/dashboard/requester'], ['get', () => '/api/dashboard/staff'],
  ['get', () => '/api/admin/users'], ['post', () => '/api/admin/users'],
  ['patch', () => `/api/admin/users/${users[0].id}`], ['post', () => `/api/admin/users/${users[0].id}/reset-password`],
  ['get', () => '/api/staff/members'], ['get', () => '/api/requesters'], ['post', () => '/api/tickets'],
  ['get', () => '/api/attachments/2147483647/download'],
  ...(['patch', 'delete'] as const).flatMap(method => ['', '/remove'].map(suffix => [method, () => `/api/attachments/2147483647${suffix}`])),
] as [string, () => string][];

describe('Lab 4 exhaustive contract boundaries', () => {
  beforeAll(async () => {
    if (new URL(process.env.DATABASE_URL!).pathname !== '/toktickit_lab4_feature2_test') throw Error('Isolated test database required');
    for (const [index, role] of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR', 'REQUESTER', 'IT_STAFF', 'IT_STAFF'].entries()) {
      users.push(await db.user.create({ data: { name: `Contract ${index}`, email: `${prefix}-${index}@test.local`,
        role: role as 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR', passwordHash: hashPassword('Password123!'),
        isActive: index !== 4, isPasswordChangeRequired: index === 5 } }));
    }
    categoryId = (await db.category.create({ data: { name: prefix } })).id;
    systemId = (await db.relatedSystem.create({ data: { name: prefix } })).id;
  });
  beforeEach(async () => {
    ticket = await db.ticket.create({ data: { ticketNumber: `${prefix}-${randomUUID()}`, summary: 'Deep boundary fixture', description: 'Independent isolated fixture',
      status: 'IN_PROGRESS', requestedPriority: 'HIGH', requesterId: users[0].id, categoryId, relatedSystemId: systemId } });
    tickets.push(ticket.id);
    action = await db.actionTaken.create({ data: { ticketId: ticket.id, assigneeId: users[1].id, createdById: users[1].id,
      updatedById: users[1].id, description: 'Existing planned work', clientRequestId: randomUUID(), requestFingerprint: prefix } });
  });
  afterAll(async () => {
    await db.actionTaken.deleteMany({ where: { ticketId: { in: tickets } } });
    await db.ticket.deleteMany({ where: { id: { in: tickets } } });
    await db.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
    if (categoryId) await db.category.delete({ where: { id: categoryId } });
    if (systemId) await db.relatedSystem.delete({ where: { id: systemId } });
    await db.$disconnect();
  });

  const credentials = ['missing', 'malformed', 'wrong-signature', 'expired', 'inactive', 'password-gated'] as const;
  it.each(protectedRoutes.flatMap((route, index) => credentials.map(credential => [index, route[0], credential] as const)))
  ('protected route %i %s rejects %s before any mutation', async (index, method, credential) => {
    const send = (request(app) as any)[method](protectedRoutes[index][1]());
    const valid = users[1];
    const tokens = {
      malformed: 'not-a-jwt',
      'wrong-signature': jwt.sign({ id: valid.id, email: valid.email, role: valid.role }, 'deliberately-wrong-test-secret'),
      expired: jwt.sign({ id: valid.id, email: valid.email, role: valid.role }, process.env.JWT_SECRET || 'toktickit-secret-jwt-key-2026', { expiresIn: -1 }),
      inactive: generateToken(users[4]), 'password-gated': generateToken(users[5]),
    };
    if (credential !== 'missing') send.set('Authorization', `Bearer ${tokens[credential]}`);
    const before = await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const result = await send.send({});
    expect(result.status).toBe(credential === 'password-gated' ? 403 : 401);
    expect(result.body.error.code).toBe(credential === 'password-gated' ? 'PASSWORD_CHANGE_REQUIRED' : 'UNAUTHORIZED');
    expect(await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toEqual(before);
  });

  const allowed: Record<ActionTakenStatus, ActionTakenStatus[]> = { PLANNED: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    IN_PROGRESS: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] };
  it.each(Object.values(ActionTakenStatus).flatMap(from => Object.values(ActionTakenStatus).map(to => [from, to] as const)))
  ('action transition %s -> %s obeys the complete matrix and atomicity', async (from, to) => {
    await db.actionTaken.update({ where: { id: action.id }, data: { status: from,
      result: from === 'COMPLETED' ? 'Original result' : null, cancelReason: from === 'CANCELLED' ? 'Original cancellation' : null,
      performedById: from === 'COMPLETED' ? users[1].id : null } });
    const before = await db.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
    const body = { status: to, version: 1, ticketVersion: 1,
      ...(to === 'COMPLETED' ? { result: 'Completed by another actor' } : {}), ...(to === 'CANCELLED' ? { cancelReason: 'No longer required' } : {}) };
    const result = await request(app).patch(`${actionUrl()}/${action.id}`).set(auth(2)).send(body);
    if (!allowed[from].includes(to)) {
      expect(result.status).toBe(422);
      expect(await db.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).toEqual(before);
      expect((await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(1);
    } else {
      expect(result.status).toBe(200); expect(result.body.data.status).toBe(to);
      expect(result.body.ticket.status).toBe('IN_PROGRESS');
      expect(result.body.ticket.version).toBe(from === to ? 1 : 2);
      if (to === 'COMPLETED') expect(result.body.data.performedBy.id).toBe(users[2].id);
      if (to === 'CANCELLED') expect(result.body.data.performedBy).toBeNull();
    }
  });

  it.each(Object.values(TicketStatus))('enforces action create/edit boundaries on %s parents', async status => {
    await db.ticket.update({ where: { id: ticket.id }, data: { status } });
    const active = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'].includes(status);
    const made = await create(payload()); expect(made.status).toBe(active ? 201 : 422);
    const edited = await request(app).patch(`${actionUrl()}/${action.id}`).set(auth())
      .send({ description: 'Edit under this parent state', version: 1, ticketVersion: active ? 2 : 1 });
    expect(edited.status).toBe(active ? 200 : 422);
  });

  it.each(['ticketId', 'createdById', 'updatedById', 'performedById', 'actionAt', 'createdAt', 'updatedAt', 'completedAt', 'cancelledAt', 'requestFingerprint'])
  ('rejects forged %s on both create and edit without changing data', async field => {
    const before = await db.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
    expect((await create({ ...payload(), [field]: 999 })).status).toBe(400);
    expect((await request(app).patch(`${actionUrl()}/${action.id}`).set(auth()).send({ version: 1, ticketVersion: 1, [field]: 999 })).status).toBe(400);
    expect(await db.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).toEqual(before);
  });

  it.each(['page=0', 'page=-1', 'page=1.5', 'page=1e3', 'page=01', 'page=1x', 'page=1&page=2',
    'page[]=1', 'unexpected=1', 'pageSize=0', 'pageSize=51', 'pageSize=1.5', 'pageSize=2147483648', 'pageSize=20&pageSize=20'])
  ('rejects invalid pagination %s consistently on actions and history', async query => {
    for (const suffix of ['actions-taken', 'status-history']) {
      const result = await request(app).get(`/api/tickets/${ticket.id}/${suffix}?${query}`).set(auth(0));
      expect(result.status).toBe(400); expect(result.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('paginates 55 equal-timestamp records without gaps, duplicates or reordering after edits', async () => {
    await db.actionTaken.delete({ where: { id: action.id } });
    const at = new Date('2026-01-01T00:00:00Z');
    await db.actionTaken.createMany({ data: Array.from({ length: 55 }, (_, n) => ({ ticketId: ticket.id, assigneeId: users[1].id,
      createdById: users[1].id, updatedById: users[1].id, description: `Work ${n}`, actionAt: at, clientRequestId: randomUUID(), requestFingerprint: prefix })) });
    await db.ticketStatusEvent.createMany({ data: Array.from({ length: 55 }, (_, n) => ({ ticketId: ticket.id,
      fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', actorId: users[1].id, reason: `Recorded fixture ${n}`, createdAt: at })) });
    const ids: number[] = []; const historyIds: number[] = [];
    for (const page of [1, 2, 3]) {
      const result = await request(app).get(`/api/tickets/${ticket.id}/actions-taken?page=${page}`).set(auth(0));
      expect(result.status).toBe(200); expect(result.body.pagination).toMatchObject({ totalItems: 55, totalPages: 3 });
      ids.push(...result.body.data.map((row: { id: number }) => row.id));
      const history = await request(app).get(`/api/tickets/${ticket.id}/status-history?page=${page}`).set(auth(0));
      expect(history.status).toBe(200); expect(history.body.pagination).toMatchObject({ totalItems: 55, totalPages: 3 });
      historyIds.push(...history.body.data.map((row: { id: number }) => row.id));
      expect(JSON.stringify(result.body)).not.toMatch(/passwordHash|requestFingerprint|clientRequestId|internalNotes/);
    }
    expect(historyIds).toHaveLength(55); expect(new Set(historyIds).size).toBe(55); expect(historyIds).toEqual([...historyIds].sort((a, b) => a - b));
    expect(ids).toHaveLength(55); expect(new Set(ids).size).toBe(55); expect(ids).toEqual([...ids].sort((a, b) => a - b));
    await request(app).patch(`${actionUrl()}/${ids[0]}`).set(auth()).send({ description: 'Changed oldest record', version: 1, ticketVersion: 1 }).expect(200);
    const first = await request(app).get(`/api/tickets/${ticket.id}/actions-taken?pageSize=50`).set(auth(0));
    expect(first.body.data).toHaveLength(50); expect(first.body.data[0].id).toBe(ids[0]);
    const beyond = await request(app).get(`/api/tickets/${ticket.id}/actions-taken?page=4`).set(auth(0));
    expect(beyond.body.data).toEqual([]); expect(beyond.body.pagination.totalItems).toBe(55);
    for (const suffix of ['actions-taken', 'status-history']) {
      const highPage = await request(app).get(`/api/tickets/${ticket.id}/${suffix}?page=2147483647&pageSize=50`).set(auth(0));
      expect(highPage.status).toBe(200); expect(highPage.body.data).toEqual([]);
    }
  });

  it.each(['distinct-key', 'same-key', 'changed-payload'] as const)('serializes ten concurrent creations (%s)', async mode => {
    const key = randomUUID();
    const results = await Promise.all(Array.from({ length: 10 }, (_, n) => create({ ...payload(),
      clientRequestId: mode === 'distinct-key' ? randomUUID() : key, description: mode === 'changed-payload' ? `Distinct intent ${n}` : 'Shared intent' })));
    expect(results.filter(result => result.status === 201)).toHaveLength(1);
    expect(results.filter(result => result.status === (mode === 'same-key' ? 200 : 409))).toHaveLength(9);
    expect(await db.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(2);
    expect((await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(2);
  });

  it('scopes retry keys by creator and parent and normalizes omitted defaults for replay', async () => {
    const key = randomUUID();
    const first = await create({ ...payload(), description: '  Shared normalized intent  ', clientRequestId: key });
    expect(first.status).toBe(201);
    const replay = await create({ ...payload(), description: 'Shared normalized intent', assigneeId: users[1].id,
      status: 'PLANNED', followUpRequired: false, result: null, attachmentNotes: '', clientRequestId: key });
    expect(replay.status).toBe(200); expect(replay.body.data.id).toBe(first.body.data.id);
    const other = await create({ ...payload(), ticketVersion: 2, clientRequestId: key }, auth(2));
    expect(other.status).toBe(201); expect(other.body.data.id).not.toBe(first.body.data.id);
    expect((await create({ ...payload(), clientRequestId: key }, auth(0))).status).toBe(403);
    const secondParent = await db.ticket.create({ data: { ticketNumber: `${prefix}-${randomUUID()}`, summary: 'Other retry parent',
      description: 'Separate key scope', requestedPriority: 'LOW', requesterId: users[0].id, categoryId, relatedSystemId: systemId } });
    tickets.push(secondParent.id);
    const second = await request(app).post(`/api/staff/tickets/${secondParent.id}/actions-taken`).set(auth()).send({ ...payload(), clientRequestId: key });
    expect(second.status).toBe(201); expect(second.body.data.id).not.toBe(first.body.data.id);
  });

  it('keeps dashboard bucket invariants while statuses and priorities change concurrently', async () => {
    const writer = (async () => {
      for (let n = 0; n < 25; n++) await db.ticket.update({ where: { id: ticket.id }, data: {
        status: n % 2 ? 'RESOLVED' : 'IN_PROGRESS', itPriority: n % 2 ? 'CRITICAL' : null } });
    })();
    try {
      for (let n = 0; n < 20; n++) {
        const result = await request(app).get('/api/dashboard/staff').set(auth()); expect(result.status).toBe(200);
        const active = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'].reduce((sum, key) => sum + result.body.byStatus[key], 0);
        expect(result.body.metrics.activeTickets).toBe(active);
        expect(Object.values(result.body.byItPriority).reduce((sum: number, value) => sum + Number(value), 0)).toBe(active);
        expect(result.body.recentTickets.length).toBeLessThanOrEqual(5);
        expect(result.body.myPendingActions.data.length).toBeLessThanOrEqual(5);
      }
    } finally { await writer; }
  });
});
