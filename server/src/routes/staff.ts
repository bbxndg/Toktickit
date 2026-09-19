import { Router, Response } from 'express';
import { PrismaClient, Role, Priority, TicketStatus } from '@prisma/client';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Permitted status transitions per BR-10
export const PERMITTED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.NEW]: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  [TicketStatus.WAITING_FOR_REQUESTER]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  [TicketStatus.CLOSED]: [], // Terminal state
  [TicketStatus.REOPENED]: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  [TicketStatus.CANCELLED]: [], // Terminal state
};

// Apply authentication and role check (IT_STAFF and ADMINISTRATOR only) to all staff routes
router.use('/staff', authenticate, requireRole(Role.IT_STAFF, Role.ADMINISTRATOR));

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

    const where: any = {};

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

    if (itPriority && typeof itPriority === 'string') {
      const prio = itPriority.toUpperCase() as Priority;
      if (Object.values(Priority).includes(prio)) {
        where.itPriority = prio;
      }
    }

    // 4. Status filter
    if (status && typeof status === 'string') {
      const st = status.toUpperCase() as TicketStatus;
      if (Object.values(TicketStatus).includes(st)) {
        where.status = st;
      }
    }

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
          orderBy: { [finalSortBy]: finalSortOrder },
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
    const ticketId = parseInt(req.params.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ticket ID.',
        },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true, department: true } },
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

    return res.status(200).json({
      ...ticket,
      activeAttachmentsCount: ticket.attachments.filter((a) => !a.isRemoved).length,
    });
  } catch (error) {
    console.error('Failed to retrieve staff ticket detail:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve ticket details.',
      },
    });
  }
});

// PATCH /api/staff/tickets/:id/claim - Claims ticket ownership for authenticated staff member
router.patch('/staff/tickets/:id/claim', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ticket ID.',
        },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found.',
        },
      });
    }

    // Advance status from NEW to OPEN if unassigned/new
    const targetStatus = ticket.status === TicketStatus.NEW ? TicketStatus.OPEN : ticket.status;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ownerId: req.user!.id,
        status: targetStatus,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      ownerId: updated.ownerId,
      owner: updated.owner,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Failed to claim ticket:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to claim ticket.',
      },
    });
  }
});

// PATCH /api/staff/tickets/:id/assign - Reassigns ticket ownership to another active staff member or unassigns
router.patch('/staff/tickets/:id/assign', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ticket ID.',
        },
      });
    }

    const { ownerId } = req.body;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found.',
        },
      });
    }

    let parsedOwnerId: number | null = null;
    if (ownerId !== null && ownerId !== undefined && ownerId !== '') {
      parsedOwnerId = parseInt(ownerId, 10);
      if (isNaN(parsedOwnerId)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid ownerId format.',
          },
        });
      }

      // Validate target user exists, is active, and has role IT_STAFF or ADMINISTRATOR (BR-08)
      const targetUser = await prisma.user.findUnique({
        where: { id: parsedOwnerId },
      });

      if (!targetUser || !targetUser.isActive || !([Role.IT_STAFF, Role.ADMINISTRATOR] as Role[]).includes(targetUser.role)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_OWNER',
            message: 'Assigned owner must be an active IT Staff or Administrator user.',
          },
        });
      }
    }

    const targetStatus = ticket.status === TicketStatus.NEW && parsedOwnerId !== null
      ? TicketStatus.OPEN
      : ticket.status;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ownerId: parsedOwnerId,
        status: targetStatus,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      ownerId: updated.ownerId,
      owner: updated.owner,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Failed to assign ticket:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reassign ticket.',
      },
    });
  }
});

// PATCH /api/staff/tickets/:id/priority - Updates operational IT Priority
router.patch('/staff/tickets/:id/priority', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ticket ID.',
        },
      });
    }

    const { itPriority } = req.body;
    if (!itPriority || typeof itPriority !== 'string' || !Object.values(Priority).includes(itPriority.toUpperCase() as Priority)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valid itPriority (LOW, MEDIUM, HIGH, CRITICAL) is required.',
        },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found.',
        },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        itPriority: itPriority.toUpperCase() as Priority,
      },
    });

    return res.status(200).json({
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      itPriority: updated.itPriority,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Failed to update IT Priority:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update IT priority.',
      },
    });
  }
});

// PATCH /api/staff/tickets/:id/status - Transitions status per BR-10 matrix
router.patch('/staff/tickets/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ticket ID.',
        },
      });
    }

    const { status: targetStatusRaw } = req.body;
    if (!targetStatusRaw || typeof targetStatusRaw !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Target status is required.',
        },
      });
    }

    const targetStatus = targetStatusRaw.toUpperCase() as TicketStatus;
    if (!Object.values(TicketStatus).includes(targetStatus)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid ticket status: ${targetStatusRaw}`,
        },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found.',
        },
      });
    }

    // Check if transition is permitted per BR-10
    const currentStatus = ticket.status;
    const permittedTransitions = PERMITTED_STATUS_TRANSITIONS[currentStatus] || [];

    if (currentStatus !== targetStatus && !permittedTransitions.includes(targetStatus)) {
      return res.status(422).json({
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Status transition from ${currentStatus} to ${targetStatus} is not permitted by workflow rules.`,
        },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: targetStatus,
      },
    });

    return res.status(200).json({
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Failed to transition ticket status:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update ticket status.',
      },
    });
  }
});

export default router;
