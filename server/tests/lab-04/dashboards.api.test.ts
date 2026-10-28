import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient, Role, TicketStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import app from '../../src/index';
import { generateToken, hashPassword } from '../../src/utils/auth';
const db = new PrismaClient();
const key = `dashboard-${randomUUID()}`;
const users: any[] = [], ids: number[] = [];
let requester: any, other: any, staff: any, admin: any, gated: any, category: any, system: any;
const auth = (u: any) => ({ Authorization: `Bearer ${generateToken({ id: u.id, email: u.email, role: u.role })}` });
const active: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'];
describe('Lab 4 dashboard and drill-down API', () => {
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_lab4_feature2_test')) throw Error('Isolated test database required');
    for (const [name, role, gate] of [['owner', Role.REQUESTER, false], ['other', Role.REQUESTER, false], ['staff', Role.IT_STAFF, false], ['admin', Role.ADMINISTRATOR, false], ['gated', Role.REQUESTER, true]] as const)
      users.push(await db.user.create({ data: { name, email: `${key}-${name}@test.local`, role, isPasswordChangeRequired: gate, passwordHash: hashPassword('Password123!') } }));
    [requester, other, staff, admin, gated] = users;
    category = await db.category.create({ data: { name: key } }); system = await db.relatedSystem.create({ data: { name: key } });
    for (const [index, status] of Object.values(TicketStatus).entries()) {
      const row = await db.ticket.create({ data: { ticketNumber: `${key}-${index}`, summary: `Dashboard fixture ${index}`, description: 'Dashboard fixture data',
        status, requestedPriority: 'HIGH', itPriority: index === 0 ? null : 'LOW', requesterId: requester.id, ownerId: index === 0 ? null : staff.id,
        categoryId: category.id, relatedSystemId: system.id, resolvedAt: status === 'RESOLVED' ? new Date() : null } }); ids.push(row.id);
    }
    await db.ticket.create({ data: { ticketNumber: `${key}-other`, summary: 'Other account fixture', description: 'Dashboard fixture data',
      requesterId: other.id, requestedPriority: 'HIGH', categoryId: category.id, relatedSystemId: system.id } }).then(t => ids.push(t.id));
  });
  afterAll(async () => {
    await db.actionTaken.deleteMany({ where: { ticketId: { in: ids } } }); await db.ticket.deleteMany({ where: { id: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    if (category) await db.category.delete({ where: { id: category.id } }); if (system) await db.relatedSystem.delete({ where: { id: system.id } }); await db.$disconnect();
  });
  it('enforces live identity, role and password gate on dashboard routes', async () => {
    expect((await request(app).get('/api/dashboard/requester')).status).toBe(401);
    expect((await request(app).get('/api/dashboard/requester').set(auth(staff))).status).toBe(403);
    expect((await request(app).get('/api/dashboard/staff').set(auth(requester))).status).toBe(403);
    expect((await request(app).get('/api/dashboard/requester').set(auth(gated))).status).toBe(403);
    expect((await request(app).get('/api/dashboard/staff').set(auth(admin))).status).toBe(200);
  });
  it('returns zero requester metrics and an empty list, and zero personal actions for another staff member', async () => {
    const empty = await db.user.create({ data: { name: 'Empty requester', email: `${key}-empty@test.local`, role: 'REQUESTER', isPasswordChangeRequired: false, passwordHash: hashPassword('Password123!') } });
    users.push(empty);
    const requesterResponse = await request(app).get('/api/dashboard/requester').set(auth(empty));
    expect(requesterResponse.status).toBe(200);
    expect(requesterResponse.body.metrics).toEqual({ totalTickets: 0, activeTickets: 0, waitingForRequester: 0, recentlyResolved: 0 });
    expect(requesterResponse.body.recentTickets).toEqual([]);
    const staffResponse = await request(app).get('/api/dashboard/staff').set(auth(admin));
    expect(staffResponse.status).toBe(200); expect(staffResponse.body.myPendingActions).toEqual({ totalItems: 0, data: [] });
    expect(Object.values(staffResponse.body.byStatus).every(n => typeof n === 'number')).toBe(true);
    expect(Object.values(staffResponse.body.byItPriority).every(n => typeof n === 'number')).toBe(true);
  });
  it('scopes requester metrics to the caller and produces matching fixed-window drill-down results', async () => {
    const res = await request(app).get(`/api/dashboard/requester?requesterId=${other.id}`).set(auth(requester));
    expect(res.status).toBe(200); expect(res.body.metrics).toEqual({ totalTickets: 8, activeTickets: 5, waitingForRequester: 1, recentlyResolved: 1 });
    expect(res.body.recentTickets).toHaveLength(5); expect(res.body.recentTickets[0]).not.toHaveProperty('description');
    for (const [key, destination] of Object.entries(res.body.drillDown) as [string, any][]) {
      const params = new URLSearchParams(Object.entries(destination.query).map(([k, v]) => [k, String(v)]));
      params.set('requesterId', String(other.id));
      const list = await request(app).get(`/api/tickets?${params}`).set(auth(requester));
      expect(list.status).toBe(200); expect(list.body.pagination.totalItems).toBe(res.body.metrics[key]);
    }
  });
  it('returns complete shared buckets, correct priority fallback and user-scoped pending action totals', async () => {
    const parent = ids[0];
    for (let i = 0; i < 27; i++) await db.actionTaken.create({ data: { ticketId: parent, assigneeId: staff.id, createdById: staff.id, updatedById: staff.id,
      description: `Action ${i}`, status: i >= 20 ? 'PLANNED' : 'COMPLETED', clientRequestId: randomUUID(), requestFingerprint: key, actionAt: new Date(1700000000000 + i * 1000) } });
    const res = await request(app).get('/api/dashboard/staff').set(auth(staff));
    expect(res.status).toBe(200); expect(Object.keys(res.body.byStatus)).toHaveLength(8); expect(Object.keys(res.body.byItPriority)).toHaveLength(4);
    expect(res.body.myPendingActions.totalItems).toBe(7); expect(res.body.myPendingActions.data).toHaveLength(5);
    expect(res.body.myPendingActions.data[0]).toMatchObject({ ticketId: parent, page: 2 });
    const byPriority = await request(app).get('/api/staff/tickets?statusGroup=active&itPriority=HIGH').set(auth(staff));
    expect(byPriority.body.pagination.totalItems).toBe(res.body.byItPriority.HIGH);
    for (const [key, destination] of Object.entries(res.body.drillDown) as [string, any][]) {
      const params = new URLSearchParams(Object.entries(destination.query).map(([k, v]) => [k, String(v)]));
      const list = await request(app).get(`/api/staff/tickets?${params}`).set(auth(staff));
      expect(list.status).toBe(200); expect(list.body.pagination.totalItems).toBe(res.body.metrics[key]);
    }
  });
  it('rejects invalid filter combinations and allows all specified status values', async () => {
    for (const query of ['statusGroup=active&status=OPEN', 'statusGroup=bad', 'status=RESOLVED&resolvedSince=bad&resolvedUntil=bad', 'status=RESOLVED&resolvedSince=2026-02-31T00:00:00Z&resolvedUntil=2026-03-04T00:00:00Z', 'status=OPEN&resolvedSince=2026-01-01T00:00:00Z&resolvedUntil=2026-01-02T00:00:00Z'])
      expect((await request(app).get(`/api/tickets?${query}`).set(auth(requester))).status).toBe(400);
    for (const status of active) expect((await request(app).get(`/api/tickets?status=${status}`).set(auth(requester))).body.pagination.totalItems).toBe(1);
    expect((await request(app).get('/api/staff/tickets?ownerId=123bad').set(auth(staff))).status).toBe(400);
  });
  it('uses inclusive UTC instants and excludes future, old, null and non-resolved records', async () => {
    const r = await db.user.create({ data: { name: 'Window', email: `${key}-window@test.local`, role: 'REQUESTER', isPasswordChangeRequired: false, passwordHash: hashPassword('Password123!') } });
    users.push(r);
    const now = new Date('2026-10-29T12:00:00.000Z'), since = now.getTime() - 7 * 86400000;
    for (const [index, time, state] of [[0, since, 'RESOLVED'], [1, now.getTime(), 'RESOLVED'], [2, since - 1, 'RESOLVED'], [3, now.getTime() + 1, 'RESOLVED'], [4, null, 'RESOLVED'], [5, now.getTime(), 'CLOSED']] as const) {
      const row = await db.ticket.create({ data: { ticketNumber: `${key}-window-${index}`, summary: 'Resolution window fixture', description: 'Resolution window fixture data',
        status: state, resolvedAt: time === null ? null : new Date(time), requestedPriority: 'LOW', requesterId: r.id, categoryId: category.id, relatedSystemId: system.id } }); ids.push(row.id);
    }
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now);
    try {
      const result = await request(app).get('/api/dashboard/requester').set(auth(r));
      expect(result.status).toBe(200); expect(result.body.metrics.recentlyResolved).toBe(2);
      const query = new URLSearchParams(Object.entries(result.body.drillDown.recentlyResolved.query).map(([k, v]) => [k, String(v)]));
      expect((await request(app).get(`/api/tickets?${query}`).set(auth(r))).body.pagination.totalItems).toBe(2);
    } finally { vi.useRealTimers(); }
  });
});
