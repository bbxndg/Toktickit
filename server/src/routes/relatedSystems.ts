import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/related-systems - Return all active related systems
router.get('/related-systems', async (_req: Request, res: Response) => {
  try {
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, isActive: true },
    });
    res.status(200).json(systems);
  } catch (err) {
    console.error('Failed to fetch related systems:', err);
    res.status(500).json({ error: 'Unable to fetch related systems' });
  }
});

export default router;
