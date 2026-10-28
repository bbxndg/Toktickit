import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, enforcePasswordChange, requireRole, AuthenticatedRequest } from '../middleware/auth';

import { bodyFields, checkVersion, integer, lockTicket, pathId, ApiError, sendApiError } from '../utils/ticketWrites';

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// 1. PUBLIC COMMENTS APIs (AC-08, BR-12, BR-14, BR-15)
// ============================================================================

// GET /api/tickets/:id/comments
router.get('/tickets/:id/comments', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticketId = Number(req.params.id);
    if (isNaN(ticketId)) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    // Requester data isolation (BR-06)
    if (req.user?.role === 'REQUESTER' && ticket.requesterId !== req.user.id) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json(comments);
  } catch (error: any) {
    console.error('Error fetching public comments:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve public comments.' },
    });
  }
});

// POST /api/tickets/:id/comments
router.post('/tickets/:id/comments', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticketId = Number(req.params.id);
    if (isNaN(ticketId)) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
      });
      return;
    }

    const { content } = req.body;
    const trimmed = typeof content === 'string' ? content.trim() : '';

    // BR-15: Content must be between 2 and 2000 characters
    if (!trimmed || trimmed.length < 2 || trimmed.length > 2000) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Comment content must be between 2 and 2,000 characters.',
        },
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    // Requester data isolation (BR-06)
    if (req.user?.role === 'REQUESTER' && ticket.requesterId !== req.user.id) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    // Auto-stamp author ID from authenticated JWT session (BR-14)
    const newComment = await prisma.publicComment.create({
      data: {
        ticketId,
        authorId: req.user!.id,
        content: trimmed,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
    });

    res.status(201).json(newComment);
  } catch (error: any) {
    console.error('Error creating public comment:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to post public comment.' },
    });
  }
});

// ============================================================================
// 2. INTERNAL NOTES APIs (AC-04, BR-13, BR-14, BR-15)
// ============================================================================

// GET /api/tickets/:id/notes (Restricted to IT_STAFF and ADMINISTRATOR)
router.get('/tickets/:id/notes', authenticate, requireRole(['IT_STAFF', 'ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticketId = Number(req.params.id);
    if (isNaN(ticketId)) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json(notes);
  } catch (error: any) {
    console.error('Error fetching internal notes:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve internal notes.' },
    });
  }
});

// POST /api/tickets/:id/notes (Restricted to IT_STAFF and ADMINISTRATOR)
router.post('/tickets/:id/notes', authenticate, requireRole(['IT_STAFF', 'ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticketId = Number(req.params.id);
    if (isNaN(ticketId)) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
      });
      return;
    }

    const { content } = req.body;
    const trimmed = typeof content === 'string' ? content.trim() : '';

    // BR-15: Content must be between 2 and 2000 characters
    if (!trimmed || trimmed.length < 2 || trimmed.length > 2000) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Note content must be between 2 and 2,000 characters.',
        },
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    // Auto-stamp author ID from authenticated JWT session (BR-14)
    const newNote = await prisma.internalNote.create({
      data: {
        ticketId,
        authorId: req.user!.id,
        content: trimmed,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
    });

    res.status(201).json(newNote);
  } catch (error: any) {
    console.error('Error creating internal note:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to save internal note.' },
    });
  }
});

// ============================================================================
// 3. REQUESTER RESOLUTION INDICATION (AC-12, BR-11, FR-08)
// ============================================================================

// PATCH /api/tickets/:id/indicate-resolved
router.patch('/tickets/:id/indicate-resolved', authenticate, enforcePasswordChange, requireRole('REQUESTER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = pathId(req.params.id), body = bodyFields(req.body, ['version']);
    const expected = integer(body.version, 'version');
    const updated = await prisma.$transaction(async tx => {
      const ticket = await lockTicket(tx, id);
      if (ticket.requesterId !== req.user!.id) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
      checkVersion(ticket.version, expected, 'version');
      if (ticket.status !== 'IN_PROGRESS' && ticket.status !== 'WAITING_FOR_REQUESTER') {
        throw new ApiError(422, 'INVALID_STATUS_TRANSITION', 'This Ticket is not eligible for resolution indication.');
      }
      const select = { id: true, status: true, updatedAt: true, version: true, requesterResolvedIndication: true, requesterResolvedAt: true } as const;
      if (ticket.requesterResolvedIndication) return tx.ticket.findUniqueOrThrow({ where: { id }, select });
      return tx.ticket.update({ where: { id }, data: { requesterResolvedIndication: true, requesterResolvedAt: new Date(), version: { increment: 1 } }, select });
    });
    return res.json(updated);
  } catch (error) { return sendApiError(res, error); }
});

export default router;
