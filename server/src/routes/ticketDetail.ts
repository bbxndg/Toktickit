import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { uploadAttachments } from '../utils/fileUpload';
import { verifyToken } from '../utils/auth';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/tickets/:id — Ticket Detail with all attachment metadata
// ---------------------------------------------------------------------------
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    const requesterId = parseInt(req.query.requesterId as string, 10);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
      });
    }

    let authRequesterId: number | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (payload && payload.role === 'REQUESTER') {
        authRequesterId = payload.id;
      }
    }

    if (!authHeader && (!req.query.requesterId || isNaN(requesterId))) {
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

    // Lab 3 Requester isolation (BR-06): Requesters can only access owned tickets; 404 to avoid leaking existence
    if (authRequesterId !== null && ticket.requesterId !== authRequesterId) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
    }

    // Lab 2 Legacy ownership enforcement (BR-04 without token)
    if (authRequesterId === null && ticket.requesterId !== requesterId) {
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
    const ticketId = parseInt(req.params.id as string, 10);

    let authRequesterId: number | null = null;
    let isStaffOrAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (payload) {
        if (payload.role === 'REQUESTER') {
          authRequesterId = payload.id;
        } else if (payload.role === 'IT_STAFF' || payload.role === 'ADMIN') {
          isStaffOrAdmin = true;
          authRequesterId = payload.id;
        }
      }
    }

    const requesterId = authRequesterId || parseInt(req.body.requesterId || (req.query.requesterId as string), 10);

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
router.get('/attachments/:id/download', async (req: Request, res: Response) => {
  try {
    const attachmentId = parseInt(req.params.id as string, 10);

    let authRequesterId: number | null = null;
    let isStaffOrAdmin = false;
    const token =
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null) || (req.query.token as string);

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        if (payload.role === 'REQUESTER') {
          authRequesterId = payload.id;
        } else if (payload.role === 'IT_STAFF' || payload.role === 'ADMIN') {
          isStaffOrAdmin = true;
        }
      }
    }

    const requesterId = authRequesterId || parseInt(req.query.requesterId as string, 10);

    if (isNaN(attachmentId)) {
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
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You do not have permission to download this file.' },
        });
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
const handleRemoveAttachment = async (req: Request, res: Response) => {
  try {
    const attachmentId = parseInt(req.params.id as string, 10);
    const { requesterId, reason, removalReason } = req.body || {};
    const effectiveReason = removalReason || reason;

    let authRequesterId: number | null = null;
    let isStaffOrAdmin = false;
    const token =
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null) || (req.query.token as string);

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        if (payload.role === 'REQUESTER') {
          authRequesterId = payload.id;
        } else if (payload.role === 'IT_STAFF' || payload.role === 'ADMIN') {
          isStaffOrAdmin = true;
        }
      }
    }

    const parsedRequesterId = authRequesterId || parseInt(requesterId || (req.query.requesterId as string), 10);

    if (isNaN(attachmentId)) {
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

router.patch('/attachments/:id/remove', handleRemoveAttachment);
router.patch('/attachments/:id', handleRemoveAttachment);
router.delete('/attachments/:id/remove', handleRemoveAttachment);
router.delete('/attachments/:id', handleRemoveAttachment);

export default router;
