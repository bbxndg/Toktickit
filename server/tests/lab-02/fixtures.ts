import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { generateToken, hashPassword } from '../../src/utils/auth';

// Regression fixtures must not depend on the sequence positions of seeded rows.
export async function requesterFixtures() {
  const prisma = new PrismaClient(); const prefix = `lab2-regression-${randomUUID()}`;
  const users = await Promise.all([1, 2].map(n => prisma.user.create({ data: { email: `${prefix}-${n}@test.local`,
    name: `Regression Requester ${n}`, role: 'REQUESTER', passwordHash: hashPassword('Password123!'), isPasswordChangeRequired: false } })));
  const categories = await Promise.all(['Account', 'Hardware', 'Software'].map(name => prisma.category.create({ data: { name: `${name} ${prefix}` } })));
  const systems = await Promise.all(['Corporate Laptop', 'Email', 'Campus Wi-Fi', 'VPN', 'LEB2', 'Printer', 'Grades'].map(name => prisma.relatedSystem.create({ data: { name: `${name} ${prefix}` } })));
  return { users, categories, systems, tokens: users.map(user => generateToken({ id: user.id, email: user.email, role: user.role })),
    cleanup: async () => {
      await prisma.ticket.deleteMany({ where: { requesterId: { in: users.map(u => u.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
      await prisma.category.deleteMany({ where: { id: { in: categories.map(c => c.id) } } });
      await prisma.relatedSystem.deleteMany({ where: { id: { in: systems.map(s => s.id) } } });
      await prisma.$disconnect();
    } };
}
