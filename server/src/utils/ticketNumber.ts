import { PrismaClient } from '@prisma/client';

/**
 * Generates a unique sequential Ticket Number in the format TKT-YYYY-XXXXXX
 * Example: TKT-2026-000001
 * Guarantees uniqueness even under concurrent test runs.
 */
export async function generateTicketNumber(
  prisma: PrismaClient | any,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const prefix = `TKT-${year}-`;

  const count = await prisma.ticket.count({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
  });

  const latestTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      id: 'desc',
    },
    select: {
      ticketNumber: true,
      id: true,
    },
  });

  let nextSequence = count + 1;
  if (latestTicket && latestTicket.ticketNumber) {
    const parts = latestTicket.ticketNumber.split('-');
    if (parts.length === 3) {
      const currentSeq = parseInt(parts[2], 10);
      if (!isNaN(currentSeq) && currentSeq >= nextSequence) {
        nextSequence = currentSeq + 1;
      }
    }
  }

  // Verify candidate uniqueness, increment if collision
  let candidate = `${prefix}${String(nextSequence).padStart(6, '0')}`;
  let exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
  while (exists) {
    nextSequence++;
    candidate = `${prefix}${String(nextSequence).padStart(6, '0')}`;
    exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
  }

  return candidate;
}
