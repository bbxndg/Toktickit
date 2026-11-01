import { Prisma, Ticket, TicketStatus } from '@prisma/client';
import { ApiError, invalid } from './ticketWrites';

export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'], CLOSED: [],
  REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'], CANCELLED: [],
};
export const PENDING_ACTIONS = ['PLANNED', 'IN_PROGRESS'] as const;
export const pendingActionsWhere = { status: { in: [...PENDING_ACTIONS] } } satisfies Prisma.ActionTakenWhereInput;
export const workflowFields = (ticket: Ticket) => ({ requesterResolvedIndication: ticket.requesterResolvedIndication,
  requesterResolvedAt: ticket.requesterResolvedAt, resolutionSummary: ticket.resolutionSummary,
  resolvedAt: ticket.resolvedAt, closedAt: ticket.closedAt });
export const workflowDetail = (ticket: Ticket, count: number, staff: boolean) => ({ ...workflowFields(ticket),
  allowedStatusTransitions: staff ? TICKET_TRANSITIONS[ticket.status] : [],
  resolutionGate: { blocked: count > 0, pendingActionCount: count } });

export function workflowText(value: unknown, field: string, required = false): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) invalid(field, 'Enter 2 to 2,000 characters.');
    return null;
  }
  if (typeof value !== 'string') invalid(field, 'A string is required.');
  const text = value.trim();
  if (!text && !required) return null;
  if (text.length < 2 || text.length > 2000) invalid(field, 'Enter 2 to 2,000 characters.');
  return text;
}

// Caller holds the parent row lock and checks its version before checking children.
// History, child cancellations and the caller's parent update share one transaction.
export async function prepareTransition(tx: Prisma.TransactionClient, ticket: Ticket, target: TicketStatus,
  actorId: number, body: Record<string, unknown> = {}): Promise<Prisma.TicketUncheckedUpdateInput> {
  if (target === ticket.status) return { status: target };
  if (!TICKET_TRANSITIONS[ticket.status].includes(target)) throw new ApiError(422, 'INVALID_STATUS_TRANSITION',
    `Status transition from ${ticket.status} to ${target} is not permitted.`);
  const reason = workflowText(body.reason, 'reason', target === 'CANCELLED');
  const summary = workflowText(body.resolutionSummary, 'resolutionSummary', target === 'RESOLVED');
  const now = new Date();
  const data: Prisma.TicketUncheckedUpdateInput = { status: target, updatedAt: now };
  if (target === 'RESOLVED') {
    if (await tx.actionTaken.count({ where: { ticketId: ticket.id, ...pendingActionsWhere } })) {
      throw new ApiError(422, 'INCOMPLETE_ACTIONS', 'Complete or cancel pending actions before resolving this ticket.');
    }
    data.resolvedAt = now; data.resolutionSummary = summary;
  } else if (target === 'CLOSED') data.closedAt = now;
  else if (target === 'REOPENED') Object.assign(data, { requesterResolvedIndication: false, requesterResolvedAt: null,
    resolvedAt: null, resolutionSummary: null, closedAt: null });
  else if (target === 'CANCELLED') {
    await tx.actionTaken.updateMany({ where: { ticketId: ticket.id, ...pendingActionsWhere }, data: {
      status: 'CANCELLED', cancelReason: reason, cancelledAt: now, updatedAt: now, updatedById: actorId, version: { increment: 1 },
    } });
  }
  await tx.ticketStatusEvent.create({ data: { ticketId: ticket.id, fromStatus: ticket.status, toStatus: target,
    actorId, reason: target === 'RESOLVED' ? summary : reason, createdAt: now } });
  return data;
}
