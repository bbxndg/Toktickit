import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/staff/members - Retrieves active IT Staff and Administrator users for ticket assignment
router.get('/staff/members', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
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

export default router;

