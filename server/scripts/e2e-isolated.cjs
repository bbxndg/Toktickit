const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
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
const requestedTestId = process.env.NODE_ENV === 'test' ? process.env.E2E_TEST_RUN_ID : undefined;
if (requestedTestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedTestId)) throw new Error('Invalid test run ID');
const suffix = requestedTestId || randomUUID();
const users = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'].map(role => ({ role, email: `e2e-${role.toLowerCase()}-${suffix}@test.local` }));

let interrupted;
function checkInterrupted() { if (interrupted) throw new Error(`Interrupted by ${interrupted}`); }
function stopChild(child, signal = 'SIGTERM') {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  try { if (process.platform !== 'win32') process.kill(-child.pid, signal); else child.kill(signal); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
}
function start(command, args, options) {
  checkInterrupted();
  const child = spawn(command, args, { ...options, detached: process.platform !== 'win32' });
  child.finished = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal })); });
  children.push(child);
  return child;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (interrupted) return;
  interrupted = signal; process.exitCode = signal === 'SIGINT' ? 130 : 143;
  for (const child of children) stopChild(child);
});

function available(port) {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once('error', () => reject(new Error(`Port ${port} is in use; stop the existing service before running E2E.`)));
    listener.listen(port, '127.0.0.1', () => listener.close(resolve));
  });
}
async function ready(url, child) {
  for (let i = 0; i < 100; i++) {
    checkInterrupted();
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Test service exited before starting: ${url}`);
    try { await fetch(url); return; } catch { await new Promise(resolve => setTimeout(resolve, 200)); }
  }
  throw new Error(`Test service did not start: ${url}`);
}
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Configure server/.env DATABASE_URL first.');
  await available(4000); checkInterrupted(); await available(5173); checkInterrupted();
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/' + database;
  if (url.pathname !== '/' + database) throw new Error('Dedicated test database required.');
  const production = process.env.E2E_PRODUCTION === '1';
  const env = { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: production ? 'production' : 'development', PORT: '4000', E2E_PASSWORD: password, E2E_RUN_ID: suffix };
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const ticketIds = [];
  try {
    for (const user of users) {
      await db.user.create({ data: { ...user, name: `E2E ${user.role}`, passwordHash: bcrypt.hashSync(password, 10), isActive: true, isPasswordChangeRequired: false } });
      env[`E2E_${user.role}_EMAIL`] = user.email; checkInterrupted();
    }
    checkInterrupted();
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
    const inactive = await db.user.create({ data: { role: 'IT_STAFF', name: 'Historical fixture staff', email: `e2e-inactive-${suffix}@test.local`,
      passwordHash: bcrypt.hashSync(password, 10), isActive: false, isPasswordChangeRequired: false } });
    const inactiveTicket = await db.ticket.create({ data: { ticketNumber: `E2E-INACTIVE-${suffix}`, summary: 'Inactive assignee fixture',
      description: 'Isolated historical assignee fixture', requestedPriority: 'HIGH', requesterId: requester.id,
      categoryId: category.id, relatedSystemId: system.id } });
    ticketIds.push(inactiveTicket.id); env.E2E_INACTIVE_TICKET_NUMBER = inactiveTicket.ticketNumber;
    await db.actionTaken.create({ data: { ticketId: inactiveTicket.id, assigneeId: inactive.id, createdById: staff.id,
      updatedById: staff.id, description: 'Historical inactive assignee action', clientRequestId: randomUUID(), requestFingerprint: suffix } });
    checkInterrupted();
    const api = start(process.execPath, production ? ['dist/index.js'] : ['--import', 'tsx', 'src/index.ts'], { cwd: serverDir, env, stdio: 'inherit' });
    await ready('http://127.0.0.1:4000/api/health', api);
    const ui = start(process.execPath, ['node_modules/vite/bin/vite.js', ...(production ? ['preview'] : []), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: clientDir, env, stdio: 'inherit' });
    await ready('http://127.0.0.1:5173/', ui);
    const playwright = start(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], { cwd: clientDir, env, stdio: 'inherit' });
    const result = await playwright.finished;
    checkInterrupted();
    if (result.code !== 0) process.exitCode = result.code || 1;
  } finally {
    for (const child of [...children].reverse()) stopChild(child);
    // Bound cleanup if a child does not respond to graceful termination.
    const timeout = setTimeout(() => { for (const child of children) stopChild(child, 'SIGKILL'); }, 5000);
    try { await Promise.allSettled(children.map(child => child.finished)); }
    finally { clearTimeout(timeout); }
    // Include records created during browser journeys, even if a worker was
    // interrupted before its afterEach cleanup. Scope every row to this run.
    const fixtureUsers = await db.user.findMany({ where: { OR: [
      { email: { in: [...users.map(user => user.email), `e2e-inactive-${suffix}@test.local`] } },
      { email: { startsWith: `browser-created-${suffix}-` } },
    ] }, select: { id: true } });
    const fixtureUserIds = fixtureUsers.map(user => user.id);
    const fixtureTickets = await db.ticket.findMany({ where: { OR: [
      { id: { in: ticketIds } }, { requesterId: { in: fixtureUserIds } },
    ] }, select: { id: true } });
    const fixtureTicketIds = fixtureTickets.map(ticket => ticket.id);
    const files = await db.attachment.findMany({ where: { ticketId: { in: fixtureTicketIds } }, select: { filename: true } });
    if (fixtureTicketIds.length) {
      await db.actionTaken.deleteMany({ where: { ticketId: { in: fixtureTicketIds } } });
      await db.ticketStatusEvent.deleteMany({ where: { ticketId: { in: fixtureTicketIds } } });
      await db.ticket.deleteMany({ where: { id: { in: fixtureTicketIds } } });
    }
    for (const file of files) fs.rmSync(path.join(serverDir, 'uploads', 'attachments', path.basename(file.filename)), { force: true });
    await db.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error('Isolated E2E failed:', error.message); if (!interrupted) process.exitCode = 1; });
