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
  it('retains changed accounts/work and supplies status/priority/action/empty cases', async () => {
    seed();
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: 'alex.thompson@toktickit.local' } });
    await prisma.user.update({ where: { id: staff.id }, data: { passwordHash: 'changed-test-hash', isPasswordChangeRequired: false, name: 'Changed by student' } });
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-2026-900001' } });
    await prisma.ticket.update({ where: { id: ticket.id }, data: { description: 'Edited demo work', version: { increment: 1 } } });
    const before = { users: await prisma.user.count(), tickets: await prisma.ticket.count(), actions: await prisma.actionTaken.count() };
    seed();
    expect({ users: await prisma.user.count(), tickets: await prisma.ticket.count(), actions: await prisma.actionTaken.count() }).toEqual(before);
    expect(await prisma.user.findUnique({ where: { id: staff.id } })).toMatchObject({ passwordHash: 'changed-test-hash', name: 'Changed by student', isPasswordChangeRequired: false });
    expect(await prisma.ticket.findUnique({ where: { id: ticket.id } })).toMatchObject({ description: 'Edited demo work', version: 2 });
    const fixtures = await prisma.ticket.findMany({ where: { summary: { startsWith: '[Lab 4 Demo]' } }, include: { actionsTaken: true } });
    expect(new Set(fixtures.map(t => t.status)).size).toBe(8);
    expect(new Set(fixtures.map(t => t.requestedPriority)).size).toBe(4);
    expect(fixtures.some(t => t.actionsTaken.length === 0)).toBe(true);
    expect(fixtures.some(t => t.actionsTaken.length > 1)).toBe(true);
    const empty = await prisma.user.findUniqueOrThrow({ where: { email: 'lab4.empty@toktickit.local' } });
    expect(await prisma.ticket.count({ where: { requesterId: empty.id } })).toBe(0);
    // Restore only this test's deliberate edits so the disposable demo remains usable.
    await prisma.user.update({ where: { id: staff.id }, data: { passwordHash: staff.passwordHash, name: staff.name, isPasswordChangeRequired: staff.isPasswordChangeRequired } });
    await prisma.ticket.update({ where: { id: ticket.id }, data: { description: ticket.description, version: ticket.version } });
  });
});
