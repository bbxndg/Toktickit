import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, isActive: true },
    });
    res.status(200).json(categories);
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    res.status(500).json({ error: 'Unable to fetch categories' });
  }
});

export default router;
