import { PrismaClient } from '@prisma/client';

/**
 * Generates a unique sequential Ticket Number in the format TKT-YYYY-XXXXXX
 * Example: TKT-2026-000001
 */
export async function generateTicketNumber(
  prisma: PrismaClient | any,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const prefix = `TKT-${year}-`;

  // Find the ticket with highest ticket number for the current year
  const latestTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: 'desc',
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSequence = 1;
  if (latestTicket && latestTicket.ticketNumber) {
    const parts = latestTicket.ticketNumber.split('-');
    if (parts.length === 3) {
      const currentSeq = parseInt(parts[2], 10);
      if (!isNaN(currentSeq)) {
        nextSequence = currentSeq + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(6, '0');
  return `${prefix}${paddedSequence}`;
}
