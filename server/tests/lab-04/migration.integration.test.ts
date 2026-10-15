import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mkdtempSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const schema = `lab4_migration_${randomUUID().replaceAll('-', '')}`;
let client: PrismaClient | undefined;
const admin = new PrismaClient();
let directory: string | undefined;

describe('MIG-01: additive Actions Taken migration preserves Lab 3 data', () => {
  it('backfills version 1 without changing old users/tickets/attachments/comments/notes or inventing work', async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!url.pathname.endsWith('_lab4_feature2_test')) throw new Error('Dedicated Lab 4 test database required.');
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    url.searchParams.set('schema', schema);
    client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    directory = mkdtempSync(path.join(tmpdir(), 'toktickit-lab4-migration-'));
    const source = path.resolve('prisma');
    // migrate deploy executes the copied SQL history; no local Git branch is required.
    copyFileSync(path.join(source, 'schema.prisma'), path.join(directory, 'schema.prisma'));
    mkdirSync(path.join(directory, 'migrations'));
    copyFileSync(path.join(source, 'migrations/migration_lock.toml'), path.join(directory, 'migrations/migration_lock.toml'));
    const copyMigration = (name: string) => {
      const target = path.join(directory!, 'migrations', name); mkdirSync(target, { recursive: true });
      copyFileSync(path.join(source, 'migrations', name, 'migration.sql'), path.join(target, 'migration.sql'));
    };
    const migrations = readdirSync(path.join(source, 'migrations')).filter(name => /^\d/.test(name)).sort();
    migrations.filter(name => name < '20261014090000').forEach(copyMigration);
    const migrate = () => {
      const run = spawnSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', path.join(directory!, 'schema.prisma')], {
        env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8', timeout: 30000,
      });
      if (run.status !== 0) throw new Error('Isolated migration failed: ' + run.stderr);
    };
    migrate();
    const [user] = await client.$queryRaw<{ id: number }[]>`INSERT INTO "User" (name,email,"passwordHash","updatedAt") VALUES ('Legacy User','legacy@test.local','fixture-hash',NOW()) RETURNING id`;
    const [category] = await client.$queryRaw<{ id: number }[]>`INSERT INTO "Category" (name) VALUES ('Legacy category') RETURNING id`;
    const [system] = await client.$queryRaw<{ id: number }[]>`INSERT INTO "RelatedSystem" (name) VALUES ('Legacy system') RETURNING id`;
    const [ticket] = await client.$queryRaw<{ id: number }[]>`INSERT INTO "Ticket" ("ticketNumber",summary,description,"requestedPriority","requesterId","categoryId","relatedSystemId","updatedAt",status) VALUES ('TKT-2026-000099','Legacy support','Keep existing work','HIGH',${user.id},${category.id},${system.id},NOW(),'RESOLVED') RETURNING id`;
    await client.$executeRaw`INSERT INTO "Attachment" ("ticketId",filename,"originalName","mimeType","sizeBytes","isRemoved","removalReason","removedAt") VALUES (${ticket.id},'legacy.pdf','report.pdf','application/pdf',123,true,'Wrong file',NOW())`;
    await client.$executeRaw`INSERT INTO "PublicComment" ("ticketId","authorId",content) VALUES (${ticket.id},${user.id},'Legacy public conversation')`;
    await client.$executeRaw`INSERT INTO "InternalNote" ("ticketId","authorId",content) VALUES (${ticket.id},${user.id},'Legacy private note')`;
    const manifest = async () => {
      const result: Record<string, unknown> = {};
      for (const table of ['User', 'Ticket', 'Attachment', 'Category', 'RelatedSystem', 'PublicComment', 'InternalNote']) {
        result[table] = await client!.$queryRawUnsafe(`SELECT to_jsonb(t) - 'version' AS record FROM "${table}" t ORDER BY id`);
      }
      return result;
    };
    const before = await manifest();
    copyMigration('20261014090000_lab4_actions_taken'); migrate();
    expect(await manifest()).toEqual(before);
    expect(await client.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ version: 1, status: 'RESOLVED', itPriority: null });
    expect(await client.actionTaken.count()).toBe(0);
  }, 60000);
  afterAll(async () => {
    await client?.$disconnect();
    if (client) await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    if (directory) rmSync(directory, { recursive: true, force: true });
  });
});
