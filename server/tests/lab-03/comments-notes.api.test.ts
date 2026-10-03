import request from 'supertest';
import app from '../../src/index';
import { PrismaClient, Role, Priority, TicketStatus } from '@prisma/client';
import { hashPassword, generateToken } from '../../src/utils/auth';

const prisma = new PrismaClient();

describe('Lab 3: Comments, Notes & Requester Resolution APIs (API-08, API-16, API-17)', () => {
  let requesterUser: any;
  let otherRequester: any;
  let staffUser: any;
  let adminUser: any;

  let requesterToken: string;
  let otherRequesterToken: string;
  let staffToken: string;
  let adminToken: string;

  let testTicket: any;
  let otherTicket: any;

  beforeAll(async () => {
    // Seed users
    requesterUser = await prisma.user.upsert({
      where: { email: 'comment.test.req@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Comment Test Requester',
        email: 'comment.test.req@toktickit.local',
        role: Role.REQUESTER,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    otherRequester = await prisma.user.upsert({
      where: { email: 'comment.test.other@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Other Requester',
        email: 'comment.test.other@toktickit.local',
        role: Role.REQUESTER,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: 'comment.test.staff@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Comment Test Staff',
        email: 'comment.test.staff@toktickit.local',
        role: Role.IT_STAFF,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: 'comment.test.admin@toktickit.local' },
      update: { isActive: true, isPasswordChangeRequired: false },
      create: {
        name: 'Comment Test Admin',
        email: 'comment.test.admin@toktickit.local',
        role: Role.ADMINISTRATOR,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    requesterToken = generateToken({ id: requesterUser.id, email: requesterUser.email, role: requesterUser.role });
    otherRequesterToken = generateToken({ id: otherRequester.id, email: otherRequester.email, role: otherRequester.role });
    staffToken = generateToken({ id: staffUser.id, email: staffUser.email, role: staffUser.role });
    adminToken = generateToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    const category = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'Collab Cat' } });
    const system = await prisma.relatedSystem.findFirst() || await prisma.relatedSystem.create({ data: { name: 'Collab System' } });

    // Clean up existing test tickets
    await prisma.ticket.deleteMany({
      where: {
        summary: { startsWith: '[CollabTest]' },
      },
    });

    testTicket = await prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-COLLAB-000001',
        summary: '[CollabTest] Primary ticket for comments/notes',
        description: 'Testing comment thread and internal notes visibility.',
        requestedPriority: Priority.HIGH,
        itPriority: Priority.HIGH,
        status: TicketStatus.IN_PROGRESS,
        requesterId: requesterUser.id,
        categoryId: category.id,
        relatedSystemId: system.id,
      },
    });

    otherTicket = await prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-COLLAB-000002',
        summary: '[CollabTest] Other requester ticket',
        description: 'Belongs to other requester.',
        requestedPriority: Priority.LOW,
        itPriority: Priority.LOW,
        status: TicketStatus.NEW,
        requesterId: otherRequester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: {
        summary: { startsWith: '[CollabTest]' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'comment.test.req@toktickit.local',
            'comment.test.other@toktickit.local',
            'comment.test.staff@toktickit.local',
            'comment.test.admin@toktickit.local',
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  // ============================================================================
  // PUBLIC COMMENTS (API-16, BR-12, BR-14, BR-15)
  // ============================================================================
  describe('Public Comments', () => {
    it('API-16: should allow Requester to post a public comment on their ticket (BR-12, BR-14)', async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ content: 'I have attached the log file for switch port 12.' });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('I have attached the log file for switch port 12.');
      expect(res.body.author.id).toBe(requesterUser.id);
      expect(res.body.author.role).toBe('REQUESTER');
    });

    it('API-16: should allow IT Staff to post a public comment visible to requester (BR-12)', async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ content: 'Thanks! We are investigating the upstream interface.' });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Thanks! We are investigating the upstream interface.');
      expect(res.body.author.id).toBe(staffUser.id);
      expect(res.body.author.role).toBe('IT_STAFF');
    });

    it('should retrieve public comments in chronological order for both Requester and Staff (BR-12)', async () => {
      // Fetch as Requester
      const resReq = await request(app)
        .get(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(resReq.status).toBe(200);
      expect(Array.isArray(resReq.body)).toBe(true);
      expect(resReq.body.length).toBeGreaterThanOrEqual(2);
      expect(resReq.body[0].content).toContain('attached the log file');
      expect(resReq.body[1].content).toContain('investigating the upstream');

      // Fetch as Staff
      const resStaff = await request(app)
        .get(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(resStaff.status).toBe(200);
      expect(resStaff.body.length).toBe(resReq.body.length);
    });

    it('should reject comment with invalid content length (<2 or >2000 chars) with 400 Bad Request (BR-15)', async () => {
      // Too short
      const resShort = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ content: ' ' });

      expect(resShort.status).toBe(400);
      expect(resShort.body.error.code).toBe('VALIDATION_ERROR');

      // Too long (>2000 chars)
      const resLong = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ content: 'A'.repeat(2001) });

      expect(resLong.status).toBe(400);
      expect(resLong.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 Not Found when Requester attempts to comment on another requester ticket (BR-06)', async () => {
      const res = await request(app)
        .post(`/api/tickets/${otherTicket.id}/comments`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ content: 'Unauthorized comment attempt.' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================================
  // INTERNAL NOTES (API-08, API-17, BR-13, BR-14, BR-15)
  // ============================================================================
  describe('Internal Notes', () => {
    it('API-17: should allow IT Staff to post an internal note (BR-13, BR-14)', async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/notes`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ content: 'Escalated to Tier 2 Network team. Possible ASIC defect on switch.' });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Escalated to Tier 2 Network team. Possible ASIC defect on switch.');
      expect(res.body.author.id).toBe(staffUser.id);
      expect(res.body.author.role).toBe('IT_STAFF');
    });

    it('API-17: should allow Administrator to read internal notes', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/notes`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].content).toContain('Tier 2 Network team');
    });

    it('API-08: should reject Requester attempting to GET internal notes with HTTP 403 Forbidden (BR-13, AC-04)', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/notes`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('API-08: should reject Requester attempting to POST internal notes with HTTP 403 Forbidden (BR-13, AC-04)', async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/notes`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ content: 'Requester trying to write internal note.' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ============================================================================
  // REQUESTER RESOLUTION INDICATION (AC-12, BR-11, FR-08)
  // ============================================================================
  describe('Requester Resolution Indication', () => {
    it('should allow ticket owner to indicate resolved when ticket is IN_PROGRESS (BR-11)', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicket.id}/indicate-resolved`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.requesterResolvedIndication).toBe(true);
    });

    it('should reject indicating resolved when ticket is in invalid status with 422 Unprocessable Entity (BR-11)', async () => {
      // otherTicket is in NEW status
      const res = await request(app)
        .patch(`/api/tickets/${otherTicket.id}/indicate-resolved`)
        .set('Authorization', `Bearer ${otherRequesterToken}`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should return 404 Not Found when non-owner attempts to indicate resolved (BR-06)', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${otherTicket.id}/indicate-resolved`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
