import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { uploadAttachments } from '../utils/fileUpload';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/tickets/:id — Ticket Detail with all attachment metadata
// ---------------------------------------------------------------------------
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const requesterId = parseInt(req.query.requesterId as string, 10);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
      });
    }

    if (!req.query.requesterId || isNaN(requesterId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requesterId is required for ownership verification.',
          details: [{ field: 'requesterId', message: 'Valid requesterId query parameter is mandatory.' }],
        },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } },
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

    // Ownership enforcement (BR-04)
    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view this ticket.' },
      });
    }

    res.status(200).json(ticket);
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

router.post('/tickets/:id/attachments', handleSingleUpload, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const requesterId = parseInt(req.body.requesterId, 10);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
      });
    }

    if (!req.body.requesterId || isNaN(requesterId)) {
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
    if (ticket.requesterId !== requesterId) {
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
    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        isRemoved: false,
      },
    });

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
router.get('/attachments/:id/download', async (req: Request, res: Response) => {
  try {
    const attachmentId = parseInt(req.params.id, 10);
    const requesterId = parseInt(req.query.requesterId as string, 10);

    if (isNaN(attachmentId)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid attachment ID.' },
      });
    }

    if (!req.query.requesterId || isNaN(requesterId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requesterId is required for ownership verification.',
        },
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

    // Ownership check
    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to download this file.' },
      });
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

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Failed to download attachment:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to download attachment.' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/attachments/:id/remove — Soft-remove attachment
// ---------------------------------------------------------------------------
router.patch('/attachments/:id/remove', async (req: Request, res: Response) => {
  try {
    const attachmentId = parseInt(req.params.id, 10);
    const { requesterId, removalReason } = req.body;

    if (isNaN(attachmentId)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid attachment ID.' },
      });
    }

    const parsedRequesterId = parseInt(requesterId, 10);
    if (!requesterId || isNaN(parsedRequesterId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requesterId is required.',
          details: [{ field: 'requesterId', message: 'requesterId is required.' }],
        },
      });
    }

    // Validate removalReason (BR-07)
    if (!removalReason || typeof removalReason !== 'string' || removalReason.trim().length < 3) {
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
        ticket: { select: { requesterId: true } },
      },
    });

    if (!attachment) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Attachment not found.' },
      });
    }

    // Ownership check (BR-04)
    if (attachment.ticket.requesterId !== parsedRequesterId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to remove this attachment.' },
      });
    }

    // Already removed check
    if (attachment.isRemoved) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'This attachment has already been removed.' },
      });
    }

    // Soft-remove: set isRemoved, removedAt, removalReason (BR-07)
    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removalReason: removalReason.trim(),
      },
    });

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
});

export default router;
