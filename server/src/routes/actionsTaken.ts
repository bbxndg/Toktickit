import { Router } from 'express';
import { createHash } from 'node:crypto';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { authenticate, enforcePasswordChange, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { ACTION_TRANSITIONS, ACTIVE_TICKETS, actionBody, normalizeAction } from '../utils/actionValidation';
import { ApiError, checkVersion, integer, invalid, lockTicket, pathId, sendApiError, ticketProjection } from '../utils/ticketWrites';

const prisma = new PrismaClient();
const router = Router();
const userSummary = { id: true, name: true, role: true } as const;
export const sharedAction = {
  id: true, ticketId: true, actionAt: true, description: true, result: true, status: true,
  followUpRequired: true, followUpNote: true, attachmentNotes: true, cancelReason: true,
  completedAt: true, cancelledAt: true, version: true, createdAt: true, updatedAt: true,
  assignee: { select: userSummary }, createdBy: { select: userSummary }, updatedBy: { select: userSummary }, performedBy: { select: userSummary },
} satisfies Prisma.ActionTakenSelect;
const protectedRead = [authenticate, enforcePasswordChange];
const protectedWrite = [authenticate, enforcePasswordChange, requireRole(Role.IT_STAFF, Role.ADMINISTRATOR)];

router.get('/tickets/:id/actions-taken', ...protectedRead, async (req: AuthenticatedRequest, res) => {
  try {
    const id = pathId(req.params.id);
    const queryNumber = (field: string, fallback: number) => req.query[field] === undefined ? fallback : pathId(req.query[field], field);
    const page = queryNumber('page', 1), pageSize = queryNumber('pageSize', 20);
    if (pageSize > 50 || !Number.isSafeInteger((page - 1) * pageSize)) invalid('pageSize', 'Use a page size from 1 to 50 and a valid page.');
    const result = await prisma.$transaction(async tx => {
      const ticket = await tx.ticket.findUnique({ where: { id } });
      if (!ticket || (req.user!.role === Role.REQUESTER && ticket.requesterId !== req.user!.id)) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
      const totalItems = await tx.actionTaken.count({ where: { ticketId: id } });
      const data = await tx.actionTaken.findMany({ where: { ticketId: id }, select: sharedAction,
        orderBy: [{ actionAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize });
      return { data, ticket: ticketProjection(ticket), pagination: { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return res.json(result);
  } catch (error) { return sendApiError(res, error); }
});

async function eligibleAssignee(tx: Prisma.TransactionClient, id: number) {
  const assignee = await tx.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
  if (!assignee?.isActive || !([Role.IT_STAFF, Role.ADMINISTRATOR] as Role[]).includes(assignee.role)) {
    throw new ApiError(400, 'INVALID_ASSIGNEE', 'Choose an active IT Staff or Administrator assignee.');
  }
}

router.post('/staff/tickets/:id/actions-taken', ...protectedWrite, async (req: AuthenticatedRequest, res) => {
  try {
    const id = pathId(req.params.id), body = actionBody(req.body, true);
    const expected = integer(body.ticketVersion, 'ticketVersion');
    if (typeof body.clientRequestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.clientRequestId)) invalid('clientRequestId', 'A UUID is required.');
    const key = body.clientRequestId.toLowerCase();
    const input = normalizeAction(body, {}, req.user!.id);
    if (input.status === 'CANCELLED') invalid('status', 'Create as Planned, In Progress or Completed.');
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const result = await prisma.$transaction(async tx => {
      const ticket = await lockTicket(tx, id);
      // Locking the same parent also serializes simultaneous requests for the same creation key.
      const existing = await tx.actionTaken.findUnique({ where: { ticketId_createdById_clientRequestId: {
        ticketId: id, createdById: req.user!.id, clientRequestId: key,
      } } });
      if (existing) {
        if (existing.requestFingerprint !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This request key was already used with different action details.');
        return { data: await tx.actionTaken.findUniqueOrThrow({ where: { id: existing.id }, select: sharedAction }), ticket: ticketProjection(ticket), replayed: true };
      }
      checkVersion(ticket.version, expected);
      if (!ACTIVE_TICKETS.includes(ticket.status)) throw new ApiError(422, 'TICKET_NOT_ACTIVE', 'Reopen a resolved Ticket before recording more work. Closed/cancelled Tickets are read-only.');
      await eligibleAssignee(tx, input.assigneeId);
      const now = new Date();
      const data = await tx.actionTaken.create({ data: { ...input, ticketId: id, createdById: req.user!.id, updatedById: req.user!.id,
        actionAt: now, createdAt: now, clientRequestId: key, requestFingerprint: fingerprint,
        ...(input.status === 'COMPLETED' ? { performedById: req.user!.id, completedAt: now } : {}),
      }, select: sharedAction });
      const parent = await tx.ticket.update({ where: { id }, data: { version: { increment: 1 } } });
      return { data, ticket: ticketProjection(parent), replayed: false };
    });
    return res.status(result.replayed ? 200 : 201).json(result);
  } catch (error) { return sendApiError(res, error); }
});

router.patch('/staff/tickets/:id/actions-taken/:actionId', ...protectedWrite, async (req: AuthenticatedRequest, res) => {
  try {
    const id = pathId(req.params.id), actionId = pathId(req.params.actionId, 'actionId');
    const body = actionBody(req.body, false), parentVersion = integer(body.ticketVersion, 'ticketVersion'), version = integer(body.version, 'version');
    const result = await prisma.$transaction(async tx => {
      const ticket = await lockTicket(tx, id);
      const action = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId: id } });
      if (!action) throw new ApiError(404, 'NOT_FOUND', 'Action not found.');
      checkVersion(ticket.version, parentVersion); checkVersion(action.version, version, 'version');
      if (!ACTIVE_TICKETS.includes(ticket.status)) throw new ApiError(422, 'TICKET_NOT_ACTIVE', 'Actions are read-only while the Ticket is resolved, closed or cancelled.');
      if (!ACTION_TRANSITIONS[action.status].length) throw new ApiError(422, 'INVALID_ACTION_TRANSITION', 'Completed/cancelled actions are read-only. Record a new action for corrections.');
      const input = normalizeAction(body, action, req.user!.id);
      if (input.status !== action.status && !ACTION_TRANSITIONS[action.status].includes(input.status)) throw new ApiError(422, 'INVALID_ACTION_TRANSITION', 'This action status transition is not permitted.');
      if ('assigneeId' in body || input.status === 'COMPLETED') await eligibleAssignee(tx, input.assigneeId);
      const changed = Object.entries(input).some(([field, value]) => action[field as keyof typeof input] !== value);
      if (!changed) return { data: await tx.actionTaken.findUniqueOrThrow({ where: { id: actionId }, select: sharedAction }), ticket: ticketProjection(ticket) };
      const now = new Date();
      const data = await tx.actionTaken.update({ where: { id: actionId }, data: { ...input,
        updatedById: req.user!.id, version: { increment: 1 },
        ...(input.status === 'COMPLETED' ? { performedById: req.user!.id, completedAt: now } : {}),
        ...(input.status === 'CANCELLED' ? { cancelledAt: now } : {}),
      }, select: sharedAction });
      const parent = await tx.ticket.update({ where: { id }, data: { version: { increment: 1 } } });
      return { data, ticket: ticketProjection(parent) };
    });
    return res.json(result);
  } catch (error) { return sendApiError(res, error); }
});

export default router;
