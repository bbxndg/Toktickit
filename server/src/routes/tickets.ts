import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, Priority, TicketStatus } from '@prisma/client';
import multer from 'multer';
import { uploadAttachments } from '../utils/fileUpload';
import { generateTicketNumber } from '../utils/ticketNumber';

const router = Router();
const prisma = new PrismaClient();

// Middleware to handle multer file upload and catch errors safely
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadAttachments.array('attachments', 5)(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File size exceeds maximum allowed limit of 5 MB per file.',
            details: [{ field: 'attachments', message: 'File size must not exceed 5 MB.' }],
          },
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot upload more than 5 attachments.',
            details: [{ field: 'attachments', message: 'Maximum 5 files allowed.' }],
          },
        });
      }
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
        },
      });
    } else if (err) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: [{ field: 'attachments', message: err.message }],
        },
      });
    }
    next();
  });
};

// GET /api/tickets - Query paginated tickets with filtering, searching, and sorting
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const {
      requesterId,
      search,
      categoryId,
      requestedPriority,
      status,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    // 1. Mandatory requesterId check for strict data isolation (BR-04)
    const parsedRequesterId = parseInt(requesterId as string, 10);
    if (!requesterId || isNaN(parsedRequesterId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requesterId is required to retrieve tickets.',
          details: [{ field: 'requesterId', message: 'Valid requesterId query parameter is mandatory.' }],
        },
      });
    }

    // 2. Build where filter clause
    const where: any = {
      requesterId: parsedRequesterId,
    };

    if (search && typeof search === 'string' && search.trim() !== '') {
      const trimmedSearch = search.trim();
      where.OR = [
        { ticketNumber: { contains: trimmedSearch, mode: 'insensitive' } },
        { summary: { contains: trimmedSearch, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      const parsedCatId = parseInt(categoryId as string, 10);
      if (!isNaN(parsedCatId)) {
        where.categoryId = parsedCatId;
      }
    }

    if (requestedPriority && typeof requestedPriority === 'string') {
      const prioUpper = requestedPriority.toUpperCase() as Priority;
      const validPriorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      if (validPriorities.includes(prioUpper)) {
        where.requestedPriority = prioUpper;
      }
    }

    if (status && typeof status === 'string') {
      const statusUpper = status.toUpperCase() as TicketStatus;
      const validStatuses: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      if (validStatuses.includes(statusUpper)) {
        where.status = statusUpper;
      }
    }

    // 3. Sorting and pagination parameters
    const validSortFields = ['createdAt', 'ticketNumber', 'summary', 'status', 'requestedPriority', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const sortDirection: 'asc' | 'desc' = (sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(pageSize as string, 10) || 8));
    const skip = (pageNum - 1) * limitNum;

    // 4. Query database
    const [totalItems, rawTickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: {
            where: { isRemoved: false },
            select: { id: true },
          },
        },
      }),
    ]);

    const data = rawTickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      category: t.category,
      relatedSystem: t.relatedSystem,
      activeAttachmentsCount: t.attachments.length,
    }));

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    res.status(200).json({
      data,
      pagination: {
        page: pageNum,
        pageSize: limitNum,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve tickets. Please try again later.',
      },
    });
  }
});

// POST /api/tickets - Create a new support ticket
router.post('/tickets', handleUpload, async (req: Request, res: Response) => {
  try {
    const {
      requesterId,
      categoryId,
      relatedSystemId,
      requestedPriority,
      summary,
      description,
    } = req.body;

    const validationErrors: { field: string; message: string }[] = [];

    // 1. Validate requesterId
    const parsedRequesterId = parseInt(requesterId, 10);
    if (!requesterId || isNaN(parsedRequesterId)) {
      validationErrors.push({ field: 'requesterId', message: 'Requester ID is required.' });
    } else {
      const requester = await prisma.requesterUser.findUnique({
        where: { id: parsedRequesterId },
      });
      if (!requester || !requester.isActive) {
        validationErrors.push({ field: 'requesterId', message: 'Selected requester is invalid or inactive.' });
      }
    }

    // 2. Validate categoryId
    const parsedCategoryId = parseInt(categoryId, 10);
    if (!categoryId || isNaN(parsedCategoryId)) {
      validationErrors.push({ field: 'categoryId', message: 'Category is required.' });
    } else {
      const category = await prisma.category.findUnique({
        where: { id: parsedCategoryId },
      });
      if (!category || !category.isActive) {
        validationErrors.push({ field: 'categoryId', message: 'Selected category is invalid or inactive.' });
      }
    }

    // 3. Validate relatedSystemId
    const parsedSystemId = parseInt(relatedSystemId, 10);
    if (!relatedSystemId || isNaN(parsedSystemId)) {
      validationErrors.push({ field: 'relatedSystemId', message: 'Related System is required.' });
    } else {
      const system = await prisma.relatedSystem.findUnique({
        where: { id: parsedSystemId },
      });
      if (!system || !system.isActive) {
        validationErrors.push({ field: 'relatedSystemId', message: 'Selected related system is invalid or inactive.' });
      }
    }

    // 4. Validate requestedPriority
    const validPriorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const priorityUpper = (requestedPriority || '').toString().toUpperCase() as Priority;
    if (!validPriorities.includes(priorityUpper)) {
      validationErrors.push({
        field: 'requestedPriority',
        message: 'Priority must be LOW, MEDIUM, HIGH, or CRITICAL.',
      });
    }

    // 5. Validate summary
    const trimmedSummary = (summary || '').trim();
    if (!trimmedSummary || trimmedSummary.length < 5) {
      validationErrors.push({
        field: 'summary',
        message: 'Summary must be at least 5 characters long.',
      });
    } else if (trimmedSummary.length > 100) {
      validationErrors.push({
        field: 'summary',
        message: 'Summary must not exceed 100 characters.',
      });
    }

    // 6. Validate description
    const trimmedDescription = (description || '').trim();
    if (!trimmedDescription || trimmedDescription.length < 10) {
      validationErrors.push({
        field: 'description',
        message: 'Description must be at least 10 characters long.',
      });
    } else if (trimmedDescription.length > 2000) {
      validationErrors.push({
        field: 'description',
        message: 'Description must not exceed 2000 characters.',
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input parameters.',
          details: validationErrors,
        },
      });
    }

    // Process uploaded files if any
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];

    // Transaction to create ticket and attachments atomically
    const newTicket = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(tx);

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          summary: trimmedSummary,
          description: trimmedDescription,
          requestedPriority: priorityUpper,
          itPriority: priorityUpper, // default initial IT priority matches requested
          status: 'NEW',
          requesterId: parsedRequesterId,
          categoryId: parsedCategoryId,
          relatedSystemId: parsedSystemId,
        },
        include: {
          requester: { select: { id: true, name: true, email: true, department: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
        },
      });

      let attachments: any[] = [];
      if (uploadedFiles.length > 0) {
        attachments = await Promise.all(
          uploadedFiles.map((file) =>
            tx.attachment.create({
              data: {
                ticketId: ticket.id,
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                isRemoved: false,
              },
            })
          )
        );
      }

      return {
        ...ticket,
        attachments,
      };
    });

    res.status(201).json(newTicket);
  } catch (error) {
    console.error('Failed to create ticket:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create ticket. Please try again later.',
      },
    });
  }
});

export default router;
