import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const prisma = new PrismaClient();
describe('SEED-01: complete seed preserves data and credentials on rerun', () => {
  beforeAll(() => {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_lab4_feature2_test')) throw new Error('Dedicated Lab 4 test database required.');
  });
  afterAll(() => prisma.$disconnect());
  const seed = () => {
    const run = spawnSync(process.execPath, ['--import', 'tsx', path.resolve('prisma/seed.ts')], { env: process.env, encoding: 'utf8' });
    if (run.status !== 0) throw new Error(run.stderr);
  };
  async function withEditedFixtures(verify: (ids: { staffId: number; ticketId: number; initialVersion: number }) => Promise<void>, startingVersion?: number) {
    // Capture both originals before the first write so every failure path can restore them.
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: 'alex.thompson@toktickit.local' } });
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-2026-900001' } });
    const initialVersion = startingVersion ?? ticket.version;
    try {
      if (startingVersion !== undefined) await prisma.ticket.update({ where: { id: ticket.id }, data: { version: startingVersion } });
      await prisma.user.update({ where: { id: staff.id }, data: { passwordHash: 'changed-test-hash', isPasswordChangeRequired: false, name: 'Changed by student' } });
      await prisma.ticket.update({ where: { id: ticket.id }, data: { description: 'Edited demo work', version: { increment: 1 } } });
      await verify({ staffId: staff.id, ticketId: ticket.id, initialVersion });
    } finally {
      // Include @updatedAt values changed implicitly by the fixture writes.
      await prisma.$transaction([
        prisma.user.update({ where: { id: staff.id }, data: { passwordHash: staff.passwordHash, name: staff.name,
          isPasswordChangeRequired: staff.isPasswordChangeRequired, updatedAt: staff.updatedAt } }),
        prisma.ticket.update({ where: { id: ticket.id }, data: { description: ticket.description, version: ticket.version, updatedAt: ticket.updatedAt } }),
      ]);
    }
  }
  it.each([undefined, 7])('retains edits and fixture coverage from starting version %s', async startingVersion => {
    seed();
    await withEditedFixtures(async ({ staffId, ticketId, initialVersion }) => {
      const before = { users: await prisma.user.count(), tickets: await prisma.ticket.count(), actions: await prisma.actionTaken.count() };
      seed();
      expect({ users: await prisma.user.count(), tickets: await prisma.ticket.count(), actions: await prisma.actionTaken.count() }).toEqual(before);
      expect(await prisma.user.findUnique({ where: { id: staffId } })).toMatchObject({ passwordHash: 'changed-test-hash', name: 'Changed by student', isPasswordChangeRequired: false });
      expect(await prisma.ticket.findUnique({ where: { id: ticketId } })).toMatchObject({ description: 'Edited demo work', version: initialVersion + 1 });
      const fixtures = await prisma.ticket.findMany({ where: { summary: { startsWith: '[Lab 4 Demo]' } }, include: { actionsTaken: true } });
      expect(new Set(fixtures.map(t => t.status)).size).toBe(8);
      expect(new Set(fixtures.map(t => t.requestedPriority)).size).toBe(4);
      expect(fixtures.some(t => t.actionsTaken.length === 0)).toBe(true);
      expect(fixtures.some(t => t.actionsTaken.length > 1)).toBe(true);
      const empty = await prisma.user.findUniqueOrThrow({ where: { email: 'lab4.empty@toktickit.local' } });
      expect(await prisma.ticket.count({ where: { requesterId: empty.id } })).toBe(0);
    }, startingVersion);
  }, 30000);
  it('restores credentials, Ticket fields and timestamps when verification throws', async () => {
    seed();
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: 'alex.thompson@toktickit.local' } });
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-2026-900001' } });
    await expect(withEditedFixtures(async () => { throw new Error('Simulated verification failure'); })).rejects.toThrow('Simulated verification failure');
    expect(await prisma.user.findUniqueOrThrow({ where: { id: staff.id } })).toEqual(staff);
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toEqual(ticket);
  }, 30000);
});
