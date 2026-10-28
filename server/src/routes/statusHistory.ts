import { Router } from 'express';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { authenticate, enforcePasswordChange, AuthenticatedRequest } from '../middleware/auth';
import { ApiError, invalid, pathId, sendApiError, ticketProjection } from '../utils/ticketWrites';

const router = Router();
const prisma = new PrismaClient();
router.get('/tickets/:id/status-history', authenticate, enforcePasswordChange, async (req: AuthenticatedRequest, res) => {
  try {
    const id = pathId(req.params.id);
    const page = req.query.page === undefined ? 1 : pathId(req.query.page, 'page');
    const pageSize = req.query.pageSize === undefined ? 20 : pathId(req.query.pageSize, 'pageSize');
    if (pageSize > 50 || !Number.isSafeInteger((page - 1) * pageSize)) invalid('pageSize', 'Use a page size from 1 to 50 and a valid page.');
    const result = await prisma.$transaction(async tx => {
      const ticket = await tx.ticket.findUnique({ where: { id } });
      if (!ticket || (req.user!.role === Role.REQUESTER && ticket.requesterId !== req.user!.id)) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
      const totalItems = await tx.ticketStatusEvent.count({ where: { ticketId: id } });
      const data = await tx.ticketStatusEvent.findMany({ where: { ticketId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize, take: pageSize, select: { id: true, ticketId: true, fromStatus: true, toStatus: true,
          reason: true, createdAt: true, actor: { select: { id: true, name: true, role: true } } } });
      return { data, ticket: ticketProjection(ticket), pagination: { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return res.json(result);
  } catch (error) { return sendApiError(res, error); }
});
export default router;
