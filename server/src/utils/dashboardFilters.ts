import { Prisma, Priority, TicketStatus } from '@prisma/client';
import { invalid, pathId } from './ticketWrites';

export const ACTIVE_TICKET_STATUSES: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'];
export function dashboardFilters(query: Record<string, unknown>, staff: boolean): Prisma.TicketWhereInput {
  const { statusGroup, status, resolvedSince, resolvedUntil, ownerId, itPriority } = query;
  if (statusGroup !== undefined && statusGroup !== 'active') invalid('statusGroup', 'Use active.');
  if (status !== undefined && (typeof status !== 'string' || !Object.values(TicketStatus).includes(status as TicketStatus))) invalid('status', 'Choose a valid status.');
  if (statusGroup && (status || resolvedSince || resolvedUntil)) invalid('statusGroup', 'Cannot combine active with a status or resolution window.');
  const where: Prisma.TicketWhereInput = {};
  if (statusGroup) where.status = { in: ACTIVE_TICKET_STATUSES };
  else if (status) where.status = status as TicketStatus;
  if (resolvedSince !== undefined || resolvedUntil !== undefined) {
    if (status !== 'RESOLVED' || typeof resolvedSince !== 'string' || typeof resolvedUntil !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(resolvedSince) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(resolvedUntil)) invalid('resolvedSince', 'Provide both UTC instants and status RESOLVED.');
    const since = new Date(resolvedSince), until = new Date(resolvedUntil);
    if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime()) || since > until ||
      since.toISOString().slice(0, 19) !== resolvedSince.slice(0, 19) || until.toISOString().slice(0, 19) !== resolvedUntil.slice(0, 19)) invalid('resolvedSince', 'Invalid resolution window.');
    where.resolvedAt = { gte: since, lte: until };
  }
  if (staff && ownerId !== undefined && ownerId !== '') where.ownerId = ownerId === 'unassigned' || ownerId === 'null' ? null : pathId(ownerId, 'ownerId');
  if (staff && itPriority !== undefined && itPriority !== '') {
    if (typeof itPriority !== 'string' || !Object.values(Priority).includes(itPriority as Priority)) invalid('itPriority', 'Choose a valid IT priority.');
    where.AND = [{ OR: [{ itPriority: itPriority as Priority }, { itPriority: null, requestedPriority: itPriority as Priority }] }];
  }
  return where;
}
