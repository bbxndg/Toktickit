import { Router } from 'express';
import { Prisma, PrismaClient, Priority, Role, TicketStatus } from '@prisma/client';
import { authenticate, enforcePasswordChange, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { sendApiError } from '../utils/ticketWrites';
import { ACTIVE_TICKET_STATUSES } from '../utils/dashboardFilters';

const router = Router();
const prisma = new PrismaClient({ log: process.env.NODE_ENV === 'test' ? [{ emit: 'event', level: 'query' }] : [] });
let queryCount = 0;
if (process.env.NODE_ENV === 'test') prisma.$on('query', () => { queryCount++; });
export const dashboardQueryCount = () => queryCount;
const selectTicket = { id: true, ticketNumber: true, summary: true, status: true, requestedPriority: true, itPriority: true, updatedAt: true } as const;
const owner = { select: { id: true, name: true, role: true } } as const;
const active = { in: ACTIVE_TICKET_STATUSES };
router.use('/dashboard', authenticate, enforcePasswordChange);
router.get('/dashboard/requester', requireRole(Role.REQUESTER), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const generatedAt = new Date(), since = new Date(generatedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
      const requesterId = req.user!.id;
      const [totalTickets, activeTickets, waitingForRequester, recentlyResolved, recentTickets] = await Promise.all([
        tx.ticket.count({ where: { requesterId } }),
        tx.ticket.count({ where: { requesterId, status: active } }),
        tx.ticket.count({ where: { requesterId, status: 'WAITING_FOR_REQUESTER' } }),
        tx.ticket.count({ where: { requesterId, status: 'RESOLVED', resolvedAt: { gte: since, lte: generatedAt } } }),
        tx.ticket.findMany({ where: { requesterId }, select: selectTicket, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 5 }),
      ]);
      const start = since.toISOString(), end = generatedAt.toISOString();
      return { generatedAt, window: { timeZone: 'UTC', recentResolvedSince: start, recentResolvedUntil: end },
        metrics: { totalTickets, activeTickets, waitingForRequester, recentlyResolved }, recentTickets,
        drillDown: {
          totalTickets: { view: 'my-tickets', query: { page: 1 } },
          activeTickets: { view: 'my-tickets', query: { statusGroup: 'active', page: 1 } },
          waitingForRequester: { view: 'my-tickets', query: { status: 'WAITING_FOR_REQUESTER', page: 1 } },
          recentlyResolved: { view: 'my-tickets', query: { status: 'RESOLVED', resolvedSince: start, resolvedUntil: end, page: 1 } },
        } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return res.json(result);
  } catch (error) { return sendApiError(res, error); }
});
router.get('/dashboard/staff', requireRole(Role.IT_STAFF, Role.ADMINISTRATOR), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const generatedAt = new Date(), userId = req.user!.id;
      const pending: Prisma.ActionTakenWhereInput = { assigneeId: userId, status: { in: ['PLANNED', 'IN_PROGRESS'] }, ticket: { status: active } };
      const [activeTickets, unassignedTickets, myAssignedTickets, waitingForRequester, statuses, priorities, recentTickets, totalItems, actions] = await Promise.all([
        tx.ticket.count({ where: { status: active } }), tx.ticket.count({ where: { status: active, ownerId: null } }),
        tx.ticket.count({ where: { status: active, ownerId: userId } }), tx.ticket.count({ where: { status: 'WAITING_FOR_REQUESTER' } }),
        tx.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
        tx.ticket.groupBy({ by: ['itPriority', 'requestedPriority'], where: { status: active }, _count: { _all: true } }),
        tx.ticket.findMany({ select: { ...selectTicket, owner }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 5 }),
        tx.actionTaken.count({ where: pending }),
        tx.actionTaken.findMany({ where: pending, select: { id: true, ticketId: true, description: true, status: true, actionAt: true,
          ticket: { select: { ticketNumber: true } }, assignee: owner }, orderBy: [{ actionAt: 'asc' }, { id: 'asc' }], take: 5 }),
      ]);
      const byStatus = Object.fromEntries(Object.values(TicketStatus).map(s => [s, 0]));
      statuses.forEach(s => { byStatus[s.status] = s._count._all; });
      const byItPriority = Object.fromEntries(Object.values(Priority).map(p => [p, 0]));
      priorities.forEach(p => { byItPriority[p.itPriority ?? p.requestedPriority] += p._count._all; });
      const counts = actions.length ? await tx.$queryRaw<{ id: number; preceding: bigint }[]>(Prisma.sql`
        SELECT a.id, (SELECT count(*) FROM "ActionTaken" b
          WHERE b."ticketId" = a."ticketId" AND (b."actionAt", b.id) < (a."actionAt", a.id)) AS preceding
        FROM "ActionTaken" a WHERE a.id IN (${Prisma.join(actions.map(row => row.id))})`) : [];
      const actionPages = new Map(counts.map(row => [row.id, Math.floor(Number(row.preceding) / 20) + 1]));
      return { generatedAt, metrics: { activeTickets, unassignedTickets, myAssignedTickets, waitingForRequester }, byStatus, byItPriority, recentTickets,
        myPendingActions: { totalItems, data: actions.map(({ ticket, ...row }) => ({ ...row, ticketNumber: ticket.ticketNumber, page: actionPages.get(row.id) ?? 1 })) },
        drillDown: {
          activeTickets: { view: 'ticket-queue', query: { statusGroup: 'active', page: 1 } },
          unassignedTickets: { view: 'ticket-queue', query: { statusGroup: 'active', ownerId: 'unassigned', page: 1 } },
          myAssignedTickets: { view: 'ticket-queue', query: { statusGroup: 'active', ownerId: userId, page: 1 } },
          waitingForRequester: { view: 'ticket-queue', query: { status: 'WAITING_FOR_REQUESTER', page: 1 } },
        } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return res.json(result);
  } catch (error) { return sendApiError(res, error); }
});
export default router;
