import { Prisma, Ticket } from '@prisma/client';
import { Response } from 'express';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string,
    public details?: { field: string; message: string }[]) { super(message); }
}

export function invalid(field: string, message: string): never {
  throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed.', [{ field, message }]);
}

export function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
    invalid(field, 'A positive database integer is required.');
  }
  return value;
}

export function pathId(value: unknown, field = 'id'): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) invalid(field, 'A positive decimal ID is required.');
  return integer(Number(value), field);
}

export function bodyFields(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('body', 'A JSON object is required.');
  for (const key of Object.keys(value)) if (!fields.includes(key)) invalid(key, 'Unknown or read-only field.');
  return value as Record<string, unknown>;
}

// All work-item and workflow writes acquire this parent lock before touching children.
export async function lockTicket(tx: Prisma.TransactionClient, id: number): Promise<Ticket> {
  const rows = await tx.$queryRaw<Ticket[]>`SELECT * FROM "Ticket" WHERE "id" = ${id} FOR UPDATE`;
  if (!rows[0]) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
  return rows[0];
}

export function checkVersion(actual: number, expected: number, field = 'ticketVersion') {
  if (actual !== expected) throw new ApiError(409, 'STALE_UPDATE',
    'The Ticket or Action has changed. Reload and review before saving.', [{ field, message: 'A newer version is available.' }]);
}

export const ticketProjection = (ticket: Ticket) => ({ id: ticket.id, status: ticket.status,
  version: ticket.version, updatedAt: ticket.updatedAt });

export function sendApiError(res: Response, error: unknown) {
  if (error instanceof ApiError) return res.status(error.status).json({ error: {
    code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}),
  } });
  console.error('Ticket operation failed:', error);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to complete the Ticket operation.' } });
}
