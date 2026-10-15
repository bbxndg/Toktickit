const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const server = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(server, '.env'), quiet: true });
const database = 'toktickit_lab4_feature2_test';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL in server/.env first.');
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/postgres';
  const admin = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const exists = await admin.$queryRaw`SELECT datname FROM pg_database WHERE datname = ${database}`;
    if (!exists.length) await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  } finally { await admin.$disconnect(); }
  url.pathname = '/' + database;
  const env = { ...process.env, DATABASE_URL: url.toString() };
  console.log(`Running verification in isolated database: ${database}`);
  const run = args => {
    const result = spawnSync(process.execPath, args, { cwd: server, env, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  };
  run([require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
  run(['--import', 'tsx', 'prisma/seed.ts']);
  run([path.join(server, 'node_modules/vitest/vitest.mjs'), 'run', ...process.argv.slice(2)]);
}
main().catch(error => { console.error('Isolated verification failed:', error.message); process.exitCode = 1; });
