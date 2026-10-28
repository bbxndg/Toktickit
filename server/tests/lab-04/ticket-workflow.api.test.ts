import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Role, TicketStatus } from '@prisma/client';
import app from '../../src/index';
import { hashPassword, generateToken } from '../../src/utils/auth';

const db = new PrismaClient();
const prefix = `workflow-${randomUUID()}`;
const users: any[] = [], tickets: number[] = [];
let staff: any, admin: any, owner: any, stranger: any, gated: any;
let category: any, system: any, ticket: any;
const auth = (user: any) => ({ Authorization: `Bearer ${generateToken({ id: user.id, email: user.email, role: user.role })}` });
// Independent contract table: exercise every source/destination pair through HTTP.
const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'], CLOSED: [],
  REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'], CANCELLED: [],
};
async function current() { return db.ticket.findUniqueOrThrow({ where: { id: ticket.id } }); }
async function status(target: string, extra: Record<string, unknown> = {}, actor = staff) {
  return request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set(auth(actor))
    .send({ status: target, version: (await current()).version, ...extra });
}
async function action(state: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') {
  return db.actionTaken.create({ data: { ticketId: ticket.id, assigneeId: staff.id, createdById: staff.id, updatedById: staff.id,
    description: 'Workflow fixture work', status: state, clientRequestId: randomUUID(), requestFingerprint: 'fixture',
    ...(state === 'COMPLETED' ? { result: 'Verified work', performedById: staff.id, completedAt: new Date() } : {}),
    ...(state === 'CANCELLED' ? { cancelReason: 'Previous cancellation', cancelledAt: new Date() } : {}) } });
}
describe('Lab 4 Ticket workflow, indication and history (API-08–13)', () => {
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_lab4_feature2_test')) throw new Error('Dedicated Lab 4 test database required.');
    for (const [name, role, gate] of [['staff', Role.IT_STAFF, false], ['admin', Role.ADMINISTRATOR, false],
      ['owner', Role.REQUESTER, false], ['stranger', Role.REQUESTER, false], ['gated', Role.IT_STAFF, true]] as const) {
      users.push(await db.user.create({ data: { name, email: `${prefix}-${name}@test.local`, role,
        passwordHash: hashPassword('Password123!'), isPasswordChangeRequired: gate } }));
    }
    [staff, admin, owner, stranger, gated] = users;
    category = await db.category.create({ data: { name: prefix } });
    system = await db.relatedSystem.create({ data: { name: prefix } });
  });
  beforeEach(async () => {
    ticket = await db.ticket.create({ data: { ticketNumber: `${prefix}-${randomUUID()}`, summary: 'Workflow regression fixture',
      description: 'Temporary data for workflow verification.', status: 'OPEN', requestedPriority: 'HIGH', itPriority: 'HIGH',
      requesterId: owner.id, ownerId: staff.id, categoryId: category.id, relatedSystemId: system.id } });
    tickets.push(ticket.id);
  });
  afterAll(async () => {
    await db.actionTaken.deleteMany({ where: { ticketId: { in: tickets } } });
    await db.ticket.deleteMany({ where: { id: { in: tickets } } });
    await db.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    if (category) await db.category.delete({ where: { id: category.id } });
    if (system) await db.relatedSystem.delete({ where: { id: system.id } });
    await db.$disconnect();
  });
  it.each(Object.values(TicketStatus).flatMap(from => Object.values(TicketStatus).map(to => [from, to] as const)))
    ('enforces the complete matrix for %s -> %s with atomic history and no-op behavior', async (from, to) => {
      await db.ticket.update({ where: { id: ticket.id }, data: { status: from } });
      const before = await current();
      const res = await status(to, { resolutionSummary: 'Reviewed work', reason: 'Shared explanation' });
      const permitted = from === to || matrix[from].includes(to);
      expect(res.status).toBe(permitted ? 200 : 422);
      const after = await current();
      const history = await db.ticketStatusEvent.findMany({ where: { ticketId: ticket.id } });
      if (!permitted || from === to) {
        expect(after).toEqual(before); expect(history).toHaveLength(0);
      } else {
        expect(after.status).toBe(to); expect(after.version).toBe(before.version + 1);
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({ fromStatus: from, toStatus: to, actorId: staff.id });
      }
    });
  it('blocks resolution while any child is pending without partially changing the Ticket', async () => {
    await action('PLANNED');
    const res = await status('RESOLVED', { resolutionSummary: 'Verified with requester' });
    expect(res.status).toBe(422); expect(res.body.error.code).toBe('INCOMPLETE_ACTIONS');
    expect(await current()).toMatchObject({ status: 'OPEN', version: 1 });
  });
  it('keeps requester indication advisory and makes a fresh repeat a no-op', async () => {
    await db.ticket.update({ where: { id: ticket.id }, data: { status: 'IN_PROGRESS' } });
    const url = `/api/tickets/${ticket.id}/indicate-resolved`;
    const first = await request(app).patch(url).set(auth(owner)).send({ version: 1 });
    expect(first.status).toBe(200); expect(first.body).toMatchObject({ status: 'IN_PROGRESS', requesterResolvedIndication: true, version: 2 });
    const repeat = await request(app).patch(url).set(auth(owner)).send({ version: 2 });
    expect(repeat.body).toEqual(first.body);
    expect(await db.ticketStatusEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
  });
  it('records actual transitions and returns shared append-only history to the owner', async () => {
    const changed = await status('IN_PROGRESS', { reason: 'Investigating connectivity' }, admin);
    expect(changed.status).toBe(200);
    const history = await request(app).get(`/api/tickets/${ticket.id}/status-history`).set(auth(owner));
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0]).toMatchObject({ fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', actor: { id: admin.id }, reason: 'Investigating connectivity' });
  });
  it.each(['PLANNED', 'IN_PROGRESS'] as const)('counts %s blockers in staff/Requester detail without exposing formal Requester transitions', async state => {
    await action(state);
    for (const actor of [staff, owner]) {
      const url = actor === staff ? `/api/staff/tickets/${ticket.id}` : `/api/tickets/${ticket.id}`;
      const res = await request(app).get(url).set(auth(actor));
      expect(res.status).toBe(200);
      expect(res.body.resolutionGate).toEqual({ blocked: true, pendingActionCount: 1 });
      expect(res.body.allowedStatusTransitions).toEqual(actor === staff ? ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'] : []);
    }
  });
  it.each([undefined, '', ' ', 'x', 'x'.repeat(2001), 12])('rejects invalid resolution summary without history or partial writes (%s)', async summary => {
    expect((await status('RESOLVED', { resolutionSummary: summary })).status).toBe(400);
    expect(await current()).toMatchObject({ status: 'OPEN', version: 1, resolvedAt: null });
    expect(await db.ticketStatusEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
  });
  it('resolves a zero-action legacy Ticket, closes it and keeps summary/history on a fresh no-op', async () => {
    const resolved = await status('RESOLVED', { resolutionSummary: '  Verified after staff review  ' });
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({ status: 'RESOLVED', version: 2, resolutionSummary: 'Verified after staff review' });
    expect(resolved.body.resolvedAt).toBeTruthy();
    const closed = await status('CLOSED', { reason: 'Requester confirmed' });
    expect(closed.body.closedAt).toBeTruthy(); expect(closed.body.resolvedAt).toBe(resolved.body.resolvedAt);
    const before = await current();
    expect((await status('CLOSED', { reason: 'Cannot rewrite saved reason' })).status).toBe(200);
    expect(await current()).toEqual(before);
    expect(await db.ticketStatusEvent.findMany({ where: { ticketId: ticket.id }, orderBy: { id: 'asc' } })).toMatchObject([
      { fromStatus: 'OPEN', toStatus: 'RESOLVED', reason: 'Verified after staff review' },
      { fromStatus: 'RESOLVED', toStatus: 'CLOSED', reason: 'Requester confirmed' },
    ]);
  });
  it('ignores terminal actions at the gate and clears current advisory/resolution data on reopen while retaining history', async () => {
    await action('COMPLETED'); await action('CANCELLED');
    await db.ticket.update({ where: { id: ticket.id }, data: { requesterResolvedIndication: true, requesterResolvedAt: new Date() } });
    expect((await status('RESOLVED', { resolutionSummary: 'Terminal work reviewed' })).status).toBe(200);
    const reopened = await status('REOPENED', { reason: 'Issue recurred' });
    expect(reopened.body).toMatchObject({ status: 'REOPENED', requesterResolvedIndication: false, requesterResolvedAt: null,
      resolutionSummary: null, resolvedAt: null, closedAt: null });
    expect(await db.ticketStatusEvent.count({ where: { ticketId: ticket.id } })).toBe(2);
    expect((await status('RESOLVED', { resolutionSummary: 'Reviewed again' })).status).toBe(200);
  });
  it('requires a cancellation reason then cancels pending work atomically, preserving terminal records', async () => {
    const pending = [await action('PLANNED'), await action('IN_PROGRESS')];
    const terminal = [await action('COMPLETED'), await action('CANCELLED')];
    expect((await status('CANCELLED')).status).toBe(400);
    expect(await db.actionTaken.findMany({ where: { ticketId: ticket.id }, orderBy: { id: 'asc' } })).toEqual([...pending, ...terminal]);
    const cancelled = await status('CANCELLED', { reason: '  Request no longer needed  ' }, admin);
    expect(cancelled.body).toMatchObject({ status: 'CANCELLED', version: 2 });
    const saved = await db.actionTaken.findMany({ where: { ticketId: ticket.id }, orderBy: { id: 'asc' } });
    for (const row of saved.slice(0, 2)) expect(row).toMatchObject({ status: 'CANCELLED', cancelReason: 'Request no longer needed', version: 2, updatedById: admin.id, performedById: null });
    expect(saved.slice(2)).toEqual(terminal);
    expect(saved[0].cancelledAt).toEqual(saved[1].cancelledAt);
    expect(await db.ticketStatusEvent.count({ where: { ticketId: ticket.id } })).toBe(1);
    expect((await status('CANCELLED', { reason: 'Changed reason' })).status).toBe(200);
    expect(await db.actionTaken.findMany({ where: { ticketId: ticket.id }, orderBy: { id: 'asc' } })).toEqual(saved);
  });
  it.each(['claim', 'assign'])('records exactly one implicit NEW -> OPEN event for %s', async operation => {
    await db.ticket.update({ where: { id: ticket.id }, data: { status: 'NEW', ownerId: null } });
    const url = `/api/staff/tickets/${ticket.id}/${operation}`;
    const payload = operation === 'assign' ? { ownerId: staff.id } : {};
    expect((await request(app).patch(url).set(auth(staff)).send({ version: 1, ...payload })).status).toBe(200);
    const before = await current();
    expect((await request(app).patch(url).set(auth(staff)).send({ version: 2, ...payload })).status).toBe(200);
    expect(await current()).toEqual(before);
    expect(await db.ticketStatusEvent.findMany({ where: { ticketId: ticket.id } })).toMatchObject([{ fromStatus: 'NEW', toStatus: 'OPEN', actorId: staff.id }]);
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/priority`).set(auth(staff)).send({ version: 2, itPriority: 'CRITICAL' })).status).toBe(200);
    expect(await db.ticketStatusEvent.count({ where: { ticketId: ticket.id } })).toBe(1);
    expect((await current()).requestedPriority).toBe('HIGH');
  });
  it.each([['NEW', 'RESOLVED'], ['OPEN', 'CLOSED'], ['RESOLVED', 'IN_PROGRESS'], ['CLOSED', 'REOPENED'], ['CANCELLED', 'OPEN']] as const)('rejects forbidden %s -> %s', async (from, to) => {
    await db.ticket.update({ where: { id: ticket.id }, data: { status: from } });
    expect((await status(to, { resolutionSummary: 'Reviewed', reason: 'Explained' })).status).toBe(422);
    expect(await db.ticketStatusEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
  });
  it('permits all active progression edges and keeps one event per actual change', async () => {
    for (const state of ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'REOPENED', 'IN_PROGRESS'] as TicketStatus[]) {
      expect((await status(state, state === 'RESOLVED' ? { resolutionSummary: 'Reviewed by IT' } : {})).status).toBe(200);
    }
    expect(await db.ticketStatusEvent.count({ where: { ticketId: ticket.id } })).toBe(7);
  });
  it('guards indication ownership, role, state and versions; WAITING_FOR_REQUESTER remains unchanged', async () => {
    const url = `/api/tickets/${ticket.id}/indicate-resolved`;
    expect((await request(app).patch(url).set(auth(owner)).send({ version: 1 })).status).toBe(422);
    await db.ticket.update({ where: { id: ticket.id }, data: { status: 'WAITING_FOR_REQUESTER' } });
    expect((await request(app).patch(url).set(auth(staff)).send({ version: 1 })).status).toBe(403);
    expect((await request(app).patch(url).set(auth(stranger)).send({ version: 1 })).status).toBe(404);
    const indicated = await request(app).patch(url).set(auth(owner)).send({ version: 1 });
    expect(indicated.body).toMatchObject({ status: 'WAITING_FOR_REQUESTER', requesterResolvedIndication: true });
    expect((await request(app).patch(url).set(auth(owner)).send({ version: 1 })).status).toBe(409);
  });
  it('authenticates and paginates stable history, hides secrets and rejects writes', async () => {
    const url = `/api/tickets/${ticket.id}/status-history`;
    expect((await request(app).get(url)).status).toBe(401);
    expect((await request(app).get(url).set(auth(gated))).status).toBe(403);
    const missing = await request(app).get('/api/tickets/2147483647/status-history').set(auth(owner));
    expect((await request(app).get(url).set(auth(stranger))).body).toEqual(missing.body);
    const now = new Date();
    await db.ticketStatusEvent.createMany({ data: Array.from({ length: 21 }, () => ({ ticketId: ticket.id, fromStatus: 'OPEN' as const, toStatus: 'IN_PROGRESS' as const, actorId: staff.id, createdAt: now })) });
    const first = await request(app).get(url).set(auth(owner));
    const second = await request(app).get(url + '?page=2').set(auth(admin));
    expect(first.body.data).toHaveLength(20); expect(second.body.data).toHaveLength(1);
    expect(first.body.data[19].id).toBeLessThan(second.body.data[0].id);
    expect(first.body.data[0].actor).not.toHaveProperty('email');
    expect(first.body.pagination).toMatchObject({ totalItems: 21, totalPages: 2 });
    for (const query of ['page=0', 'pageSize=51', 'page=abc']) expect((await request(app).get(url + '?' + query).set(auth(owner))).status).toBe(400);
    expect((await request(app).get(url + '?page=3').set(auth(owner))).body.data).toEqual([]);
    expect((await request(app).post(url).set(auth(staff)).send({})).status).toBe(404);
    expect((await request(app).delete(url + '/' + first.body.data[0].id).set(auth(staff))).status).toBe(404);
  });
  it('serializes new action creation against resolution on one parent version', async () => {
    const [resolved, created] = await Promise.all([
      status('RESOLVED', { resolutionSummary: 'Final review', version: 1 }),
      request(app).post(`/api/staff/tickets/${ticket.id}/actions-taken`).set(auth(staff)).send({ ticketVersion: 1, clientRequestId: randomUUID(), description: 'Late planned work' }),
    ]);
    expect([resolved.status, created.status].sort()).toEqual(created.status === 201 ? [201, 409] : [200, 409]);
    const saved = await current();
    const count = await db.actionTaken.count({ where: { ticketId: ticket.id } });
    expect(saved.version).toBe(2);
    expect(count).toBe(saved.status === 'RESOLVED' ? 0 : 1);
    expect(await db.ticketStatusEvent.count({ where: { ticketId: ticket.id } })).toBe(saved.status === 'RESOLVED' ? 1 : 0);
  });
  it('serializes Ticket cancellation against child editing without partial cascade/history', async () => {
    const row = await action('PLANNED');
    const [cancelled, edited] = await Promise.all([
      status('CANCELLED', { reason: 'Cancel all work', version: 1 }, admin),
      request(app).patch(`/api/staff/tickets/${ticket.id}/actions-taken/${row.id}`).set(auth(staff)).send({ version: 1, ticketVersion: 1, description: 'Concurrent edit' }),
    ]);
    expect([cancelled.status, edited.status].sort()).toEqual([200, 409]);
    const saved = await current();
    const child = await db.actionTaken.findUniqueOrThrow({ where: { id: row.id } });
    expect(saved.version).toBe(2); expect(child.version).toBe(2);
    expect(child.status).toBe(saved.status === 'CANCELLED' ? 'CANCELLED' : 'PLANNED');
    expect(await db.ticketStatusEvent.count({ where: { ticketId: ticket.id } })).toBe(saved.status === 'CANCELLED' ? 1 : 0);
  });
});
