import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { PrismaClient, Role, Priority, TicketStatus } from '@prisma/client';
import { hashPassword, generateToken } from '../../src/utils/auth';

const prisma = new PrismaClient();

describe('Lab 3: Role-Based Authorization & Data Isolation APIs (API-06, API-07)', () => {
  let reqUser1: any;
  let reqUser2: any;
  let staffUser: any;
  let req1Token: string;
  let req2Token: string;
  let ticket1: any;
  let ticket2: any;

  beforeAll(async () => {
    reqUser1 = await prisma.user.upsert({
      where: { email: 'authz.test.req1@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Authz Requester One',
        email: 'authz.test.req1@toktickit.local',
        role: Role.REQUESTER,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    reqUser2 = await prisma.user.upsert({
      where: { email: 'authz.test.req2@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Authz Requester Two',
        email: 'authz.test.req2@toktickit.local',
        role: Role.REQUESTER,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: 'authz.test.staff@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Authz Staff',
        email: 'authz.test.staff@toktickit.local',
        role: Role.IT_STAFF,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    req1Token = generateToken({ id: reqUser1.id, email: reqUser1.email, role: reqUser1.role });
    req2Token = generateToken({ id: reqUser2.id, email: reqUser2.email, role: reqUser2.role });

    const category = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'Authz Cat' } });
    const system = await prisma.relatedSystem.findFirst() || await prisma.relatedSystem.create({ data: { name: 'Authz System' } });

    await prisma.ticket.deleteMany({
      where: {
        summary: { startsWith: '[Authz]' },
      },
    });

    ticket1 = await prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-AUTHZ-000001',
        summary: '[Authz] Requester 1 ticket',
        description: 'Personal ticket of requester 1.',
        requestedPriority: Priority.LOW,
        itPriority: Priority.LOW,
        status: TicketStatus.NEW,
        requesterId: reqUser1.id,
        categoryId: category.id,
        relatedSystemId: system.id,
      },
    });

    ticket2 = await prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-AUTHZ-000002',
        summary: '[Authz] Requester 2 ticket',
        description: 'Personal ticket of requester 2.',
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.MEDIUM,
        status: TicketStatus.NEW,
        requesterId: reqUser2.id,
        categoryId: category.id,
        relatedSystemId: system.id,
      },
    });
  });

  // API-06: Requester queries tickets with token: only owned tickets returned; client requesterId ignored
  it('API-06: should strictly return owned tickets and ignore client-supplied requesterId (BR-05, BR-06)', async () => {
    // Requester 1 sends query param requesterId=reqUser2.id attempting to view User 2 tickets
    const res = await request(app)
      .get(`/api/tickets?requesterId=${reqUser2.id}`)
      .set('Authorization', `Bearer ${req1Token}`);

    expect(res.status).toBe(200);
    // Must return tickets belonging to User 1 only
    expect(res.body.data.every((t: any) => t.requesterId === reqUser1.id || t.summary.includes('Requester 1'))).toBe(true);
    expect(res.body.data.some((t: any) => t.id === ticket2.id)).toBe(false);
  });

  // API-07: Requester accesses other requester ticket: HTTP 404 Not Found (without leaking existence)
  it('API-07: should return HTTP 404 Not Found when requester accesses another requester ticket (BR-06)', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket2.id}`)
      .set('Authorization', `Bearer ${req1Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // Requester accesses own ticket: HTTP 200 OK
  it('should allow requester to access their own ticket', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket1.id}`)
      .set('Authorization', `Bearer ${req1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticket1.id);
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: {
        summary: { startsWith: '[Authz]' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['authz.test.req1@toktickit.local', 'authz.test.req2@toktickit.local', 'authz.test.staff@toktickit.local'] },
      },
    });
    await prisma.$disconnect();
  });
});
