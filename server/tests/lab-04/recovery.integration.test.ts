import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { generateToken } from '../../src/utils/auth';

const suffix = randomUUID().replaceAll('-', '');
const schema = `lab4_recovery_${suffix}`;
const targetName = `toktickit_lab4_restore_${suffix}`;
let admin: PrismaClient | undefined, source: PrismaClient | undefined, target: PrismaClient | undefined;
let directory: string | undefined, schemaCreated = false, databaseCreated = false;
const checksum = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

describe('MIG-02 isolated database and upload recovery', () => {
  it('backs up a populated schema and restores its records and upload into a separate database', async () => {
    const sourceUrl = new URL(process.env.DATABASE_URL!);
    if (sourceUrl.pathname !== '/toktickit_lab4_feature2_test') throw Error('Dedicated test database required');
    const adminUrl = new URL(sourceUrl); adminUrl.pathname = '/postgres'; adminUrl.searchParams.delete('schema');
    admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    const schemaAdmin = new PrismaClient({ datasources: { db: { url: sourceUrl.toString() } } });
    try { await schemaAdmin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); schemaCreated = true; }
    finally { await schemaAdmin.$disconnect(); }
    await admin.$executeRawUnsafe(`CREATE DATABASE "${targetName}"`); databaseCreated = true;
    sourceUrl.searchParams.set('schema', schema);
    source = new PrismaClient({ datasources: { db: { url: sourceUrl.toString() } } });
    const targetUrl = new URL(sourceUrl); targetUrl.pathname = `/${targetName}`;
    target = new PrismaClient({ datasources: { db: { url: targetUrl.toString() } } });
    directory = mkdtempSync(path.join(tmpdir(), 'toktickit-recovery-'));
    const run = (command: string, args: string[], env: NodeJS.ProcessEnv) => {
      const result = spawnSync(command, args, { env, encoding: 'utf8', timeout: 60000 });
      if (result.status !== 0) throw Error(`${command} failed: ${result.stderr}`);
    };
    run(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { ...process.env, DATABASE_URL: sourceUrl.toString() });
    const user = await source.user.create({ data: { name: 'Recovery user', email: `${schema}@test.local`, passwordHash: 'fixture-hash', isPasswordChangeRequired: false } });
    const category = await source.category.create({ data: { name: schema } });
    const system = await source.relatedSystem.create({ data: { name: schema } });
    const ticket = await source.ticket.create({ data: { ticketNumber: schema, summary: 'Recovery fixture', description: 'Recover representative records',
      requestedPriority: 'HIGH', requesterId: user.id, categoryId: category.id, relatedSystemId: system.id } });
    const attachment = await source.attachment.create({ data: { ticketId: ticket.id, filename: 'fixture.pdf', originalName: 'fixture.pdf', mimeType: 'application/pdf', sizeBytes: 17 } });
    await source.publicComment.create({ data: { ticketId: ticket.id, authorId: user.id, content: 'Public fixture' } });
    await source.internalNote.create({ data: { ticketId: ticket.id, authorId: user.id, content: 'Private fixture' } });
    const originalDir = path.join(directory, 'original'); const restoredDir = path.join(directory, 'restored');
    mkdirSync(originalDir); mkdirSync(restoredDir);
    const upload = path.join(originalDir, 'fixture.pdf'); writeFileSync(upload, '%PDF-1.4 fixture\n');
    const dump = path.join(directory, 'backup.dump');
    const pgSource = new URL(sourceUrl); pgSource.searchParams.delete('schema');
    const pgTarget = new URL(targetUrl); pgTarget.searchParams.delete('schema');
    const pgEnv = (url: URL) => ({ ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432',
      PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1) });
    const [{ server_version_num }] = await source.$queryRaw<{ server_version_num: string }[]>`SELECT current_setting('server_version_num') AS server_version_num`;
    const major = Math.floor(Number(server_version_num) / 10000);
    const bin = (name: string) => {
      const versioned = `/usr/lib/postgresql/${major}/bin/${name}`;
      return existsSync(versioned) ? versioned : name;
    };
    run(bin('pg_dump'), ['--format=custom', '--schema', schema, '--file', dump], pgEnv(pgSource));
    run(bin('pg_restore'), ['--no-owner', '--no-privileges', '--dbname', pgTarget.pathname.slice(1), dump], pgEnv(pgTarget));
    const restoredUploads = path.join(restoredDir, 'uploads', 'attachments'); mkdirSync(restoredUploads, { recursive: true });
    const restoredUpload = path.join(restoredUploads, 'fixture.pdf'); copyFileSync(upload, restoredUpload);
    const manifest = async (client: PrismaClient) => ({
      users: await client.user.findMany({ orderBy: { id: 'asc' } }), tickets: await client.ticket.findMany({ orderBy: { id: 'asc' } }),
      attachments: await client.attachment.findMany({ orderBy: { id: 'asc' } }), comments: await client.publicComment.findMany({ orderBy: { id: 'asc' } }),
      notes: await client.internalNote.findMany({ orderBy: { id: 'asc' } }),
    });
    expect(await manifest(target)).toEqual(await manifest(source));
    expect(checksum(restoredUpload)).toBe(checksum(upload));
    const port = await new Promise<number>((resolve, reject) => {
      const socket = net.createServer(); socket.once('error', reject);
      socket.listen(0, '127.0.0.1', () => { const address = socket.address();
        if (!address || typeof address === 'string') return reject(Error('Cannot allocate test port'));
        socket.close(() => resolve(address.port)); });
    });
    const server = spawn(process.execPath, ['--import', path.resolve('node_modules/tsx/dist/loader.mjs'), path.resolve('src/index.ts')], {
      cwd: restoredDir, env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: targetUrl.toString(), PORT: String(port) }, stdio: 'ignore',
    });
    try {
      const base = `http://127.0.0.1:${port}`;
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (server.exitCode !== null) throw Error('Restored test server exited before becoming ready');
        try { await fetch(`${base}/api/health`); ready = true; break; }
        catch { await new Promise(resolve => setTimeout(resolve, 100)); }
      }
      if (!ready) throw Error('Restored test server did not start');
      const authorization = `Bearer ${generateToken({ id: user.id, email: user.email, role: 'REQUESTER' })}`;
      const detail = await fetch(`${base}/api/tickets/${ticket.id}`, { headers: { authorization } });
      expect(detail.status).toBe(200);
      expect(await detail.json()).toMatchObject({ ticketNumber: schema });
      const download = await fetch(`${base}/api/attachments/${attachment.id}/download`, { headers: { authorization } });
      expect(download.status).toBe(200);
      expect(Buffer.from(await download.arrayBuffer())).toEqual(readFileSync(upload));
    } finally {
      server.kill('SIGTERM');
      await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', () => resolve()); });
    }
  }, 120000);
  afterAll(async () => {
    await source?.$disconnect(); await target?.$disconnect();
    if (admin && databaseCreated) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${targetName}"`);
    if (admin && schemaCreated) {
      const url = new URL(process.env.DATABASE_URL!);
      const sourceAdmin = new PrismaClient({ datasources: { db: { url: url.toString() } } });
      try { await sourceAdmin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await sourceAdmin.$disconnect(); }
    }
    await admin?.$disconnect();
    if (directory) rmSync(directory, { recursive: true, force: true });
  });
});
