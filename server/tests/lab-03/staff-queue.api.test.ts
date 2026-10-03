import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { PrismaClient, Role, Priority, TicketStatus } from '@prisma/client';
import { hashPassword, generateToken } from '../../src/utils/auth';

const prisma = new PrismaClient();

describe('Lab 3: Staff Ticket Queue APIs (API-09, API-10)', () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let staffUser: any;
  let adminUser: any;
  let requester1: any;
  let requester2: any;
  let testCategory: any;
  let testSystem: any;

  beforeAll(async () => {
    // Setup test users
    staffUser = await prisma.user.upsert({
      where: { email: 'queue.test.staff@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Queue Test Staff',
        email: 'queue.test.staff@toktickit.local',
        role: Role.IT_STAFF,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: 'queue.test.admin@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Queue Test Admin',
        email: 'queue.test.admin@toktickit.local',
        role: Role.ADMINISTRATOR,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    requester1 = await prisma.user.upsert({
      where: { email: 'queue.test.req1@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Queue Test Requester One',
        email: 'queue.test.req1@toktickit.local',
        role: Role.REQUESTER,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    requester2 = await prisma.user.upsert({
      where: { email: 'queue.test.req2@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Queue Test Requester Two',
        email: 'queue.test.req2@toktickit.local',
        role: Role.REQUESTER,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    staffToken = generateToken({ id: staffUser.id, email: staffUser.email, role: staffUser.role });
    adminToken = generateToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });
    requesterToken = generateToken({ id: requester1.id, email: requester1.email, role: requester1.role });

    testCategory = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'Hardware Triage' } });
    testSystem = await prisma.relatedSystem.findFirst() || await prisma.relatedSystem.create({ data: { name: 'Workstation' } });

    // Seed dedicated test tickets
    await prisma.ticket.deleteMany({
      where: {
        summary: { startsWith: '[QueueTest]' },
      },
    });

    // 1. Unassigned ticket for Requester 1
    await prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-TEST-000001',
        summary: '[QueueTest] Broken display cable',
        description: 'External monitor flickers constantly.',
        requestedPriority: Priority.HIGH,
        itPriority: Priority.HIGH,
        status: TicketStatus.NEW,
        requesterId: requester1.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        ownerId: null,
      },
    });

    // 2. Assigned ticket for Requester 2 owned by staffUser
    await prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-TEST-000002',
        summary: '[QueueTest] VPN timeout on mobile hotspot',
        description: 'Cannot connect to company intranet from remote.',
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        requesterId: requester2.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        ownerId: staffUser.id,
      },
    });
  });

  it('API-09: should allow IT Staff to query ticket queue and receive queueCounts and multi-requester tickets', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body).toHaveProperty('queueCounts');

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty('totalItems');
    expect(res.body.pagination).toHaveProperty('page', 1);

    expect(res.body.queueCounts).toHaveProperty('total');
    expect(res.body.queueCounts).toHaveProperty('unassigned');
    expect(res.body.queueCounts).toHaveProperty('open');
    expect(res.body.queueCounts).toHaveProperty('inProgress');
    expect(res.body.queueCounts).toHaveProperty('waitingForRequester');

    // Both tickets from requester 1 and requester 2 should be accessible to staff
    const summaries = res.body.data.map((t: any) => t.summary);
    expect(summaries.some((s: string) => s.includes('Broken display cable'))).toBe(true);
    expect(summaries.some((s: string) => s.includes('VPN timeout'))).toBe(true);
  });

  it('API-09: should allow Administrator to query the ticket queue as well', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('API-09: should reject Requester role accessing IT Staff queue with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('API-10: should search tickets by keyword matching ticketNumber or summary', async () => {
    const res = await request(app)
      .get('/api/staff/tickets?search=Broken%20display')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].summary).toContain('Broken display cable');
  });

  it('API-10: should filter tickets by ownerId=unassigned', async () => {
    const res = await request(app)
      .get('/api/staff/tickets?ownerId=unassigned')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.owner === null)).toBe(true);
  });

  it('API-10: should filter tickets by status and ownerId', async () => {
    const res = await request(app)
      .get(`/api/staff/tickets?status=IN_PROGRESS&ownerId=${staffUser.id}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.status === 'IN_PROGRESS' && t.owner?.id === staffUser.id)).toBe(true);
  });
});

