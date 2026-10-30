import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { uploadAttachments } from '../utils/fileUpload';
import { authenticate, enforcePasswordChange, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { pendingActionsWhere, workflowDetail } from '../utils/ticketWorkflow';

const router = Router();
const prisma = new PrismaClient();
const attachmentIdFromPath = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
};

// ---------------------------------------------------------------------------
// GET /api/tickets/:id — Ticket Detail with all attachment metadata
// ---------------------------------------------------------------------------
router.get('/tickets/:id', authenticate, enforcePasswordChange, requireRole('REQUESTER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } },
        _count: { select: { actionsTaken: { where: pendingActionsWhere } } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          orderBy: { createdAt: 'asc' },
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
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
    }

    if (ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found.' } });
    }

    const { _count, ...detail } = ticket;
    res.status(200).json({ ...detail, ...workflowDetail(ticket, _count.actionsTaken, false) });
  } catch (error) {
    console.error('Failed to fetch ticket detail:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve ticket details.' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/attachments — Add attachment to existing ticket
// ---------------------------------------------------------------------------
const handleSingleUpload = (req: Request, res: Response, next: any) => {
  uploadAttachments.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File size exceeds maximum allowed limit of 5 MB.',
            details: [{ field: 'file', message: 'File size must not exceed 5 MB.' }],
          },
        });
      }
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    } else if (err) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: [{ field: 'file', message: err.message }],
        },
      });
    }
    next();
  });
};

router.post('/tickets/:id/attachments', authenticate, enforcePasswordChange, async (req: AuthenticatedRequest, res: Response, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' } });
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id }, select: { requesterId: true } });
    if (!ticket || (req.user!.role === 'REQUESTER' && ticket.requesterId !== req.user!.id))
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found.' } });
    return next();
  } catch { return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to verify ticket.' } }); }
}, handleSingleUpload, async (req: AuthenticatedRequest, res: Response) => {
  res.on('finish', () => { if (res.statusCode >= 400 && req.file?.path) fs.unlink(req.file.path, () => {}); });
  try {
    const ticketId = parseInt(req.params.id as string, 10);

    const requesterId = req.user!.id;
    const isStaffOrAdmin = req.user!.role !== 'REQUESTER';

    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
      });
    }

    if (!requesterId || isNaN(requesterId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requesterId is required.',
          details: [{ field: 'requesterId', message: 'requesterId is required.' }],
        },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A file is required.',
          details: [{ field: 'file', message: 'Please select a file to upload.' }],
        },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        _count: {
          select: { attachments: { where: { isRemoved: false } } },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
    }

    // Ownership enforcement
    if (!isStaffOrAdmin && ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to modify this ticket.' },
      });
    }

    // Active attachment limit enforcement (BR-06)
    if (ticket._count.attachments >= 5) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'This ticket has reached the maximum of 5 active attachments.',
          details: [{ field: 'file', message: 'Maximum 5 active attachments per ticket allowed.' }],
        },
      });
    }

    const file = req.file;

    // Create attachment and bump parent Ticket updatedAt timestamp in transaction
    const [attachment] = await prisma.$transaction([
      prisma.attachment.create({
        data: {
          ticketId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          isRemoved: false,
        },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      }),
    ]);

    res.status(201).json({
      id: attachment.id,
      ticketId: attachment.ticketId,
      originalName: attachment.originalName,
      sizeBytes: attachment.sizeBytes,
      mimeType: attachment.mimeType,
      isRemoved: attachment.isRemoved,
      createdAt: attachment.createdAt,
    });
  } catch (error) {
    console.error('Failed to add attachment:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add attachment.' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/attachments/:id/download — Download active attachment binary
// ---------------------------------------------------------------------------
router.get('/attachments/:id/download', authenticate, enforcePasswordChange, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const attachmentId = attachmentIdFromPath(req.params.id);

    const requesterId = req.user!.id;
    const isStaffOrAdmin = req.user!.role !== 'REQUESTER';

    if (attachmentId === null) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid attachment ID.' },
      });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: { select: { requesterId: true } },
      },
    });

    if (!attachment) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Attachment not found.' },
      });
    }

    // Ownership check for non-staff
    if (!isStaffOrAdmin) {
      if (!requesterId || isNaN(requesterId)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'requesterId is required for ownership verification.',
          },
        });
      }

      if (attachment.ticket.requesterId !== requesterId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found.' } });
      }
    }

    // Soft-removed files cannot be downloaded (BR-08)
    if (attachment.isRemoved) {
      return res.status(410).json({
        error: { code: 'GONE', message: 'This attachment has been removed and is no longer available for download.' },
      });
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
    const filePath = path.join(uploadDir, attachment.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'File not found on server.' },
      });
    }

    // Use Express res.download for robust header handling, UTF-8 filenames, and streaming
    res.download(filePath, attachment.originalName, (err) => {
      if (err && !res.headersSent) {
        console.error('Error sending file via download:', err);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to download attachment.' },
        });
      }
    });
  } catch (error) {
    console.error('Failed to download attachment:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to download attachment.' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH/DELETE /api/attachments/:id/remove — Soft-remove attachment
// ---------------------------------------------------------------------------
const handleRemoveAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const attachmentId = attachmentIdFromPath(req.params.id);
    const { reason, removalReason } = req.body || {};
    const effectiveReason = removalReason || reason;

    const parsedRequesterId = req.user!.id;
    const isStaffOrAdmin = req.user!.role !== 'REQUESTER';

    if (attachmentId === null) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid attachment ID.' },
      });
    }

    if (!isStaffOrAdmin && (!parsedRequesterId || isNaN(parsedRequesterId))) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requesterId is required.',
          details: [{ field: 'requesterId', message: 'requesterId is required.' }],
        },
      });
    }

    // Validate removalReason (BR-07)
    if (!effectiveReason || typeof effectiveReason !== 'string' || effectiveReason.trim().length < 3) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A removal reason of at least 3 characters is required.',
          details: [{ field: 'removalReason', message: 'Removal reason must be at least 3 characters.' }],
        },
      });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: { select: { id: true, requesterId: true } },
      },
    });

    if (!attachment) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Attachment not found.' },
      });
    }

    // Ownership check (BR-04)
    if (!isStaffOrAdmin && attachment.ticket.requesterId !== parsedRequesterId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found.' } });
    }

    // Already removed check
    if (attachment.isRemoved) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'This attachment has already been removed.' },
      });
    }

    // Soft-remove attachment and bump parent Ticket updatedAt timestamp in transaction (BR-07)
    const [updated] = await prisma.$transaction([
      prisma.attachment.update({
        where: { id: attachmentId },
        data: {
          isRemoved: true,
          removedAt: new Date(),
          removalReason: effectiveReason.trim(),
        },
      }),
      prisma.ticket.update({
        where: { id: attachment.ticket.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    res.status(200).json({
      id: updated.id,
      ticketId: updated.ticketId,
      originalName: updated.originalName,
      isRemoved: updated.isRemoved,
      removedAt: updated.removedAt,
      removalReason: updated.removalReason,
    });
  } catch (error) {
    console.error('Failed to remove attachment:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove attachment.' },
    });
  }
};

router.patch('/attachments/:id/remove', authenticate, enforcePasswordChange, handleRemoveAttachment);
router.patch('/attachments/:id', authenticate, enforcePasswordChange, handleRemoveAttachment);
router.delete('/attachments/:id/remove', authenticate, enforcePasswordChange, handleRemoveAttachment);
router.delete('/attachments/:id', authenticate, enforcePasswordChange, handleRemoveAttachment);

export default router;
