import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { PrismaClient, Role, Priority, TicketStatus } from '@prisma/client';
import { hashPassword, generateToken } from '../../src/utils/auth';

const prisma = new PrismaClient();

describe('Lab 3: Staff Ticket Detail & Operational Workflow APIs (API-11, API-12, API-13, API-14, API-15)', () => {
  let staff1: any;
  let staff2: any;
  let inactiveStaff: any;
  let requester: any;
  let staff1Token: string;
  let requesterToken: string;
  let testTicket: any;

  beforeAll(async () => {
    staff1 = await prisma.user.upsert({
      where: { email: 'detail.test.staff1@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Staff One',
        email: 'detail.test.staff1@toktickit.local',
        role: Role.IT_STAFF,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    staff2 = await prisma.user.upsert({
      where: { email: 'detail.test.staff2@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Staff Two',
        email: 'detail.test.staff2@toktickit.local',
        role: Role.IT_STAFF,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    inactiveStaff = await prisma.user.upsert({
      where: { email: 'detail.test.inactive.staff@toktickit.local' },
      update: { isActive: false, isPasswordChangeRequired: false },
      create: {
        name: 'Inactive Staff',
        email: 'detail.test.inactive.staff@toktickit.local',
        role: Role.IT_STAFF,
        passwordHash: hashPassword('Password123!'),
        isActive: false,
        isPasswordChangeRequired: false,
      },
    });

    requester = await prisma.user.upsert({
      where: { email: 'detail.test.req@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Detail Requester',
        email: 'detail.test.req@toktickit.local',
        role: Role.REQUESTER,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    staff1Token = generateToken({ id: staff1.id, email: staff1.email, role: staff1.role });
    requesterToken = generateToken({ id: requester.id, email: requester.email, role: requester.role });

    const category = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'IT Detail Cat' } });
    const system = await prisma.relatedSystem.findFirst() || await prisma.relatedSystem.create({ data: { name: 'IT Detail System' } });

    await prisma.ticket.deleteMany({
      where: {
        summary: { startsWith: '[Operational]' },
      },
    });

    testTicket = await prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-OP-000001',
        summary: '[Operational] Switch port 12 flapping',
        description: 'Intermittent link drops logged on switch core 2.',
        requestedPriority: Priority.HIGH,
        itPriority: Priority.HIGH,
        status: TicketStatus.NEW,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        ownerId: null,
      },
    });
  });

  // GET /api/staff/tickets/:id
  it('should retrieve full operational ticket details for staff', async () => {
    const res = await request(app)
      .get(`/api/staff/tickets/${testTicket.id}`)
      .set('Authorization', `Bearer ${staff1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testTicket.id);
    expect(res.body.ticketNumber).toBe('TKT-OP-000001');
    expect(res.body).toHaveProperty('requester');
    expect(res.body).toHaveProperty('category');
    expect(res.body).toHaveProperty('relatedSystem');
  });

  // API-11: IT Staff claims unassigned ticket
  it('API-11: should claim unassigned ticket, set ownerId to authenticated staff, and advance status to OPEN', async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${testTicket.id}/claim`)
      .set('Authorization', `Bearer ${staff1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.ownerId).toBe(staff1.id);
    expect(res.body.owner.id).toBe(staff1.id);
    expect(res.body.status).toBe('OPEN');
  });

  // API-12: IT Staff reassigns ticket to another active staff member
  it('API-12: should reassign ticket to another active staff member', async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${testTicket.id}/assign`)
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({ ownerId: staff2.id });

    expect(res.status).toBe(200);
    expect(res.body.ownerId).toBe(staff2.id);
    expect(res.body.owner.id).toBe(staff2.id);
  });

  // API-13: Reassign ticket to inactive user or requester
  it('API-13: should reject assigning ticket to inactive user with 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${testTicket.id}/assign`)
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({ ownerId: inactiveStaff.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OWNER');
  });

  it('API-13: should reject assigning ticket to a requester with 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${testTicket.id}/assign`)
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({ ownerId: requester.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OWNER');
  });

  // IT Priority update
  it('should update IT Priority independently from requested priority (BR-09)', async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${testTicket.id}/priority`)
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({ itPriority: 'CRITICAL' });

    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe('CRITICAL');
  });

  // API-14: Valid status transition
  it('API-14: should allow valid status transition from OPEN to IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${testTicket.id}/status`)
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  // API-15: Invalid status transition (NEW to CLOSED or IN_PROGRESS to CLOSED)
  it('API-15: should reject invalid status transition from IN_PROGRESS directly to CLOSED with 422 Unprocessable Entity', async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${testTicket.id}/status`)
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({ status: 'CLOSED' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: {
        summary: { startsWith: '[Operational]' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['detail.test.staff1@toktickit.local', 'detail.test.staff2@toktickit.local', 'detail.test.req@toktickit.local'] },
      },
    });
    await prisma.$disconnect();
  });
});
