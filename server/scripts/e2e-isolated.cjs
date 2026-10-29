const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '../..');
const serverDir = path.join(root, 'server');
const clientDir = path.join(root, 'client');
require('dotenv').config({ path: path.join(serverDir, '.env'), quiet: true });
const database = 'toktickit_lab4_feature2_test';
const children = [];
const password = `E2e-${randomUUID()}aA1!`;
const suffix = randomUUID();
const users = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'].map(role => ({ role, email: `e2e-${role.toLowerCase()}-${suffix}@test.local` }));

function available(port) {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once('error', () => reject(new Error(`Port ${port} is in use; stop the existing service before running E2E.`)));
    listener.listen(port, '127.0.0.1', () => listener.close(resolve));
  });
}
async function ready(url, child) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Test service exited before starting: ${url}`);
    try { await fetch(url); return; } catch { await new Promise(resolve => setTimeout(resolve, 200)); }
  }
  throw new Error(`Test service did not start: ${url}`);
}
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Configure server/.env DATABASE_URL first.');
  await available(4000); await available(5173);
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/' + database;
  if (url.pathname !== '/' + database) throw new Error('Dedicated test database required.');
  const env = { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'development', PORT: '4000', E2E_PASSWORD: password, E2E_RUN_ID: suffix };
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const ticketIds = [];
  let inactiveUserId;
  try {
    for (const user of users) {
      await db.user.create({ data: { ...user, name: `E2E ${user.role}`, passwordHash: bcrypt.hashSync(password, 10), isActive: true, isPasswordChangeRequired: false } });
      env[`E2E_${user.role}_EMAIL`] = user.email;
    }
    const requester = await db.user.findUniqueOrThrow({ where: { email: users[0].email } });
    const category = await db.category.findFirstOrThrow();
    const system = await db.relatedSystem.findFirstOrThrow();
    const ticket = await db.ticket.create({ data: { ticketNumber: `E2E-${suffix}`, summary: 'Browser workflow fixture',
      description: 'Isolated workflow fixture', requestedPriority: 'HIGH', requesterId: requester.id,
      categoryId: category.id, relatedSystemId: system.id } });
    ticketIds.push(ticket.id); env.E2E_TICKET_NUMBER = ticket.ticketNumber;
    const failureTicket = await db.ticket.create({ data: { ticketNumber: `E2E-FAIL-${suffix}`, summary: 'Browser failure fixture',
      description: 'Isolated failure fixture', requestedPriority: 'HIGH', requesterId: requester.id,
      categoryId: category.id, relatedSystemId: system.id } });
    ticketIds.push(failureTicket.id); env.E2E_FAILURE_TICKET_NUMBER = failureTicket.ticketNumber;
    const staff = await db.user.findUniqueOrThrow({ where: { email: users[1].email } });
    const inactive = await db.user.create({ data: { role: 'IT_STAFF', name: 'Inactive fixture staff', email: `e2e-inactive-${suffix}@test.local`,
      passwordHash: bcrypt.hashSync(password, 10), isActive: false, isPasswordChangeRequired: false } });
    inactiveUserId = inactive.id;
    const inactiveTicket = await db.ticket.create({ data: { ticketNumber: `E2E-INACTIVE-${suffix}`, summary: 'Inactive assignee fixture',
      description: 'Isolated historical assignee fixture', requestedPriority: 'HIGH', requesterId: requester.id,
      categoryId: category.id, relatedSystemId: system.id } });
    ticketIds.push(inactiveTicket.id); env.E2E_INACTIVE_TICKET_NUMBER = inactiveTicket.ticketNumber;
    await db.actionTaken.create({ data: { ticketId: inactiveTicket.id, assigneeId: inactive.id, createdById: staff.id,
      updatedById: staff.id, description: 'Historical inactive assignee action', clientRequestId: randomUUID(), requestFingerprint: suffix } });
    const api = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], { cwd: serverDir, env, stdio: 'inherit' }); children.push(api);
    await ready('http://127.0.0.1:4000/api/health', api);
    const ui = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: clientDir, env, stdio: 'inherit' }); children.push(ui);
    await ready('http://127.0.0.1:5173/', ui);
    const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], { cwd: clientDir, env, stdio: 'inherit' });
    if (result.status !== 0) process.exitCode = result.status || 1;
  } finally {
    for (const child of children.reverse()) child.kill('SIGTERM');
    if (ticketIds.length) {
      await db.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await db.ticketStatusEvent.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await db.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    }
    await db.user.deleteMany({ where: { email: { in: users.map(user => user.email) } } });
    if (inactiveUserId) await db.user.deleteMany({ where: { id: inactiveUserId } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error('Isolated E2E failed:', error.message); process.exitCode = 1; });
