import { describe, it, expect, vi } from 'vitest';
import { generateTicketNumber } from '../../src/utils/ticketNumber';

describe('Ticket Number Generator Utility (Unit Tests)', () => {
  it('should generate a ticket number matching TKT-YYYY-XXXXXX format with initial sequence 000001', async () => {
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const fixedDate = new Date(2026, 0, 1);
    const result = await generateTicketNumber(mockPrisma as any, fixedDate);

    expect(result).toBe('TKT-2026-000001');
    expect(result).toMatch(/^TKT-\d{4}-\d{6}$/);
  });

  it('should increment sequence from latest ticket number', async () => {
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue({
          id: 5,
          ticketNumber: 'TKT-2026-000042',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const fixedDate = new Date(2026, 5, 15);
    const result = await generateTicketNumber(mockPrisma as any, fixedDate);

    expect(result).toBe('TKT-2026-000043');
  });

  it('should resolve collision by advancing sequence when candidate already exists', async () => {
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue({
          id: 1,
          ticketNumber: 'TKT-2026-000001',
        }),
        // First check returns collision, second check returns null
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: 2 })
          .mockResolvedValueOnce(null),
      },
    };

    const fixedDate = new Date(2026, 0, 1);
    const result = await generateTicketNumber(mockPrisma as any, fixedDate);

    expect(result).toBe('TKT-2026-000003');
  });
});
