// Run separately from npm test: it intentionally needs ports 4000 and 5173 to be free.
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const net = require('node:net');
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const server = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(server, '.env'), quiet: true });
if (!process.env.DATABASE_URL) throw Error('Configure DATABASE_URL first.');
const url = new URL(process.env.DATABASE_URL); url.pathname = '/toktickit_lab4_feature2_test';
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
function portFree(port) {
  return new Promise((resolve, reject) => {
    const listener = net.createServer(); listener.once('error', reject);
    listener.listen(port, '127.0.0.1', () => listener.close(resolve));
  });
}
async function check(signal) {
  await portFree(4000); await portFree(5173);
  const id = randomUUID();
  const chrome = process.env.CHROME_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '');
  const child = spawn(process.execPath, ['scripts/e2e-isolated.cjs', 'dashboard.spec.ts'], {
    cwd: server, env: { ...process.env, NODE_ENV: 'test', E2E_TEST_RUN_ID: id, ...(chrome ? { CHROME_EXECUTABLE_PATH: chrome } : {}) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '', sent = false;
  const exit = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(Error(`${signal}: timed out`)); }, 30000);
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
      output += chunk.toString();
      if (!sent && /Running \d+ tests? using/.test(output)) { sent = true; child.kill(signal); }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', (code, terminatedBy) => { clearTimeout(timer); resolve({ code, terminatedBy }); });
  });
  const result = await exit;
  if (!sent || result.code !== (signal === 'SIGINT' ? 130 : 143)) throw Error(`${signal}: unexpected runner exit ${JSON.stringify(result)}`);
  const leftovers = await db.user.count({ where: { email: { contains: id } } });
  const tickets = await db.ticket.count({ where: { ticketNumber: { contains: id } } });
  if (leftovers || tickets) throw Error(`${signal}: fixtures remain`);
  await portFree(4000); await portFree(5173);
  console.log(`${signal}: runner exited cleanly; its fixtures and ports were released`);
}
(async () => { try { await check('SIGINT'); await check('SIGTERM'); } finally { await db.$disconnect(); } })()
  .catch(error => { console.error(error.message); process.exitCode = 1; });
