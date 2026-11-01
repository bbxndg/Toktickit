import { Router, Response } from 'express';
import { PrismaClient, Role, Priority, TicketStatus, Prisma } from '@prisma/client';
import { authenticate, enforcePasswordChange, requireRole, AuthenticatedRequest } from '../middleware/auth';

import { ApiError, bodyFields, checkVersion, integer, invalid, lockTicket, pathId, sendApiError } from '../utils/ticketWrites';
import { dashboardFilters } from '../utils/dashboardFilters';

const router = Router();
const prisma = new PrismaClient();

import { TICKET_TRANSITIONS, pendingActionsWhere, prepareTransition, workflowDetail, workflowFields } from '../utils/ticketWorkflow';
export const PERMITTED_STATUS_TRANSITIONS = TICKET_TRANSITIONS;

// Apply authentication and role check (IT_STAFF and ADMINISTRATOR only) to all staff routes
router.use('/staff', authenticate, enforcePasswordChange, requireRole(Role.IT_STAFF, Role.ADMINISTRATOR));

// GET /api/staff/members - Retrieves active IT Staff and Administrator users for ticket assignment
router.get('/staff/members', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const staffMembers = await prisma.user.findMany({
      where: {
        role: { in: [Role.IT_STAFF, Role.ADMINISTRATOR] },
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.status(200).json(staffMembers);
  } catch (error) {
    console.error('Failed to retrieve staff members:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve staff members.',
      },
    });
  }
});

// GET /api/staff/tickets - Retrieves centralized IT Staff Ticket Queue with search, filters, sorting, and pagination
router.get('/staff/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search,
      categoryId,
      requestedPriority,
      itPriority,
      status,
      ownerId,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    const where: any = dashboardFilters(req.query, true);

    // 1. Search keyword across ticketNumber and summary
    if (search && typeof search === 'string' && search.trim() !== '') {
      const trimmed = search.trim();
      where.OR = [
        { ticketNumber: { contains: trimmed, mode: 'insensitive' } },
        { summary: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    // 2. Category filter
    if (categoryId) {
      const parsedCat = parseInt(categoryId as string, 10);
      if (!isNaN(parsedCat)) {
        where.categoryId = parsedCat;
      }
    }

    // 3. Priority filters
    if (requestedPriority && typeof requestedPriority === 'string') {
      const prio = requestedPriority.toUpperCase() as Priority;
      if (Object.values(Priority).includes(prio)) {
        where.requestedPriority = prio;
      }
    }


    // 4. Status filter

    // 5. Owner filter
    if (ownerId !== undefined && ownerId !== '') {
      if (ownerId === 'unassigned' || ownerId === 'null') {
        where.ownerId = null;
      } else {
        const parsedOwner = parseInt(ownerId as string, 10);
        if (!isNaN(parsedOwner)) {
          where.ownerId = parsedOwner;
        }
      }
    }

    // 6. Pagination & Sorting
    const p = Math.max(1, parseInt(page as string, 10) || 1);
    const ps = Math.max(1, Math.min(100, parseInt(pageSize as string, 10) || 10));
    const skip = (p - 1) * ps;

    const allowedSortColumns = ['createdAt', 'ticketNumber', 'requestedPriority', 'itPriority', 'status', 'updatedAt'];
    const finalSortBy = allowedSortColumns.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const finalSortOrder = (sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [tickets, totalFiltered, totalAll, unassignedCount, openCount, inProgressCount, waitingCount] =
      await prisma.$transaction([
        prisma.ticket.findMany({
          where,
          skip,
          take: ps,
          orderBy: [{ [finalSortBy]: finalSortOrder }, { id: finalSortOrder }],
          include: {
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
            requester: { select: { id: true, name: true, email: true, department: true } },
            owner: { select: { id: true, name: true, email: true } },
            attachments: { select: { isRemoved: true } },
          },
        }),
        prisma.ticket.count({ where }),
        prisma.ticket.count(),
        prisma.ticket.count({ where: { ownerId: null } }),
        prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
        prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
        prisma.ticket.count({ where: { status: TicketStatus.WAITING_FOR_REQUESTER } }),
      ]);

    const data = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      description: t.description,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      status: t.status,
      category: t.category,
      relatedSystem: t.relatedSystem,
      requester: t.requester,
      owner: t.owner,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      activeAttachmentsCount: t.attachments.filter((a) => !a.isRemoved).length,
    }));

    return res.status(200).json({
      data,
      pagination: {
        page: p,
        pageSize: ps,
        totalItems: totalFiltered,
        totalPages: Math.ceil(totalFiltered / ps) || 1,
      },
      queueCounts: {
        total: totalAll,
        unassigned: unassignedCount,
        open: openCount,
        inProgress: inProgressCount,
        waitingForRequester: waitingCount,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return sendApiError(res, error);
    console.error('Failed to query IT Staff Ticket Queue:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve ticket queue.',
      },
    });
  }
});

// GET /api/staff/tickets/:id - Retrieves full operational ticket details
router.get('/staff/tickets/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = pathId(req.params.id);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true, department: true } },
        _count: { select: { actionsTaken: { where: pendingActionsWhere } } },
        owner: { select: { id: true, name: true, email: true, role: true } },
        attachments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            isRemoved: true,
            removedAt: true,
            removalReason: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found.',
        },
      });
    }

    const { _count, ...detail } = ticket;
    return res.status(200).json({
      ...detail, ...workflowDetail(ticket, _count.actionsTaken, true),
      activeAttachmentsCount: ticket.attachments.filter((a) => !a.isRemoved).length,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendApiError(res, error);
    console.error('Failed to retrieve staff ticket detail:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve ticket details.',
      },
    });
  }
});

// Parent-first locking gives existing operational writes the same version boundary as actions.
for (const operation of ['claim', 'assign', 'priority', 'status'] as const) {
  router.patch(`/staff/tickets/:id/${operation}`, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = pathId(req.params.id);
      const field = { claim: [], assign: ['ownerId'], priority: ['itPriority'], status: ['status', 'reason', 'resolutionSummary'] }[operation];
      const body = bodyFields(req.body, ['version', ...field]);
      const version = integer(body.version, 'version');
      const updated = await prisma.$transaction(async tx => {
        const ticket = await lockTicket(tx, id);
        checkVersion(ticket.version, version, 'version');
        if (operation !== 'status' && ['CLOSED', 'CANCELLED'].includes(ticket.status)) {
          throw new ApiError(422, 'TICKET_NOT_ACTIVE', 'Closed/cancelled Tickets are read-only.');
        }
        let data: Prisma.TicketUncheckedUpdateInput = {};
        if (operation === 'claim') {
          if (ticket.ownerId !== null && ticket.ownerId !== req.user!.id) {
            throw new ApiError(409, 'ALREADY_ASSIGNED', 'This Ticket already has an owner. Use explicit reassignment.');
          }
          data = { ownerId: req.user!.id, status: ticket.status === 'NEW' ? 'OPEN' : ticket.status };
        } else if (operation === 'assign') {
          if (!('ownerId' in body)) invalid('ownerId', 'Choose an owner or null to unassign.');
          const ownerId = body.ownerId === null ? null : integer(body.ownerId, 'ownerId');
          if (ownerId !== null) {
            const user = await tx.user.findUnique({ where: { id: ownerId } });
            if (!user?.isActive || !([Role.IT_STAFF, Role.ADMINISTRATOR] as Role[]).includes(user.role)) {
              throw new ApiError(400, 'INVALID_OWNER', 'Assigned owner must be active IT Staff or Administrator.');
            }
          }
          data = { ownerId, status: ticket.status === 'NEW' && ownerId !== null ? 'OPEN' : ticket.status };
        } else if (operation === 'priority') {
          if (typeof body.itPriority !== 'string' || !Object.values(Priority).includes(body.itPriority as Priority)) invalid('itPriority', 'Choose a valid IT Priority.');
          data = { itPriority: body.itPriority as Priority };
        } else {
          if (typeof body.status !== 'string' || !Object.values(TicketStatus).includes(body.status as TicketStatus)) invalid('status', 'Choose a valid Ticket status.');
          const status = body.status as TicketStatus;
          data = await prepareTransition(tx, ticket, status, req.user!.id, body);
        }
        if (operation !== 'status' && data.status && data.status !== ticket.status) {
          Object.assign(data, await prepareTransition(tx, ticket, data.status as TicketStatus, req.user!.id));
        }
        const changed = Object.entries(data).some(([key, value]) => ticket[key as keyof typeof ticket] !== value);
        const include = { owner: { select: { id: true, name: true, email: true } } } as const;
        return changed
          ? tx.ticket.update({ where: { id }, data: { ...data, version: { increment: 1 } }, include })
          : tx.ticket.findUniqueOrThrow({ where: { id }, include });
      });
      return res.json({ id: updated.id, ticketNumber: updated.ticketNumber, ownerId: updated.ownerId,
        owner: updated.owner, status: updated.status, itPriority: updated.itPriority, version: updated.version, updatedAt: updated.updatedAt, ...workflowFields(updated) });
    } catch (error) { return sendApiError(res, error); }
  });
}

export default router;
