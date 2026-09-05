import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Ticket Detail & Attachment Lifecycle API', () => {
  let ticketId: number;
  let attachmentId: number;

  const REQUESTER_1_ID = 1;
  const REQUESTER_2_ID = 2;

  // Seed one ticket with an attachment for testing
  beforeAll(async () => {
    // Create a ticket for requester 1
    const ticketRes = await request(app)
      .post('/api/tickets')
      .field('requesterId', REQUESTER_1_ID)
      .field('categoryId', 2)
      .field('relatedSystemId', 1)
      .field('requestedPriority', 'MEDIUM')
      .field('summary', 'Screen flickers after sleep')
      .field('description', 'Laptop screen flickers every time it wakes from sleep mode.');

    expect(ticketRes.status).toBe(201);
    ticketId = ticketRes.body.id;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/tickets/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/tickets/:id', () => {
    it('returns full ticket detail including attachments for the owner', async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}?requesterId=${REQUESTER_1_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticketId);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('description');
      expect(res.body).toHaveProperty('attachments');
      expect(Array.isArray(res.body.attachments)).toBe(true);
      expect(res.body).toHaveProperty('requester');
      expect(res.body).toHaveProperty('category');
      expect(res.body).toHaveProperty('relatedSystem');
    });

    it('returns 403 Forbidden when requesterId is not the ticket owner', async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}?requesterId=${REQUESTER_2_ID}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 Not Found for a non-existent ticket', async () => {
      const res = await request(app)
        .get(`/api/tickets/999999?requesterId=${REQUESTER_1_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 when requesterId is missing', async () => {
      const res = await request(app).get(`/api/tickets/${ticketId}`);
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/tickets/:id/attachments
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/tickets/:id/attachments', () => {
    it('adds a new attachment to an existing owned ticket', async () => {
      const pdfContent = Buffer.from('%PDF-1.4 test document');

      const res = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .field('requesterId', REQUESTER_1_ID)
        .attach('file', pdfContent, {
          filename: 'screenshot.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.originalName).toBe('screenshot.pdf');
      expect(res.body.isRemoved).toBe(false);
      attachmentId = res.body.id;
    });

    it('returns 403 Forbidden when non-owner tries to add attachment', async () => {
      const pdfContent = Buffer.from('%PDF-1.4 test');

      const res = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .field('requesterId', REQUESTER_2_ID)
        .attach('file', pdfContent, {
          filename: 'intruder.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(403);
    });

    it('returns 400 when no file is provided', async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .field('requesterId', REQUESTER_1_ID);

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/attachments/:id/remove
  // ─────────────────────────────────────────────────────────────────────────

  describe('PATCH /api/attachments/:id/remove', () => {
    it('returns 400 when removalReason is missing or too short', async () => {
      const res = await request(app)
        .patch(`/api/attachments/${attachmentId}/remove`)
        .send({ requesterId: REQUESTER_1_ID, removalReason: 'ab' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 403 Forbidden when non-owner tries to remove', async () => {
      const res = await request(app)
        .patch(`/api/attachments/${attachmentId}/remove`)
        .send({ requesterId: REQUESTER_2_ID, removalReason: 'Wrong file uploaded.' });

      expect(res.status).toBe(403);
    });

    it('API-07: soft-removes an attachment with a reason, preserving metadata', async () => {
      const res = await request(app)
        .patch(`/api/attachments/${attachmentId}/remove`)
        .send({ requesterId: REQUESTER_1_ID, removalReason: 'Uploaded wrong screenshot by mistake.' });

      expect(res.status).toBe(200);
      expect(res.body.isRemoved).toBe(true);
      expect(res.body.removalReason).toBe('Uploaded wrong screenshot by mistake.');
      expect(res.body.removedAt).not.toBeNull();
      expect(res.body.originalName).toBeDefined();
    });

    it('returns 400 when attempting to remove an already-removed attachment', async () => {
      const res = await request(app)
        .patch(`/api/attachments/${attachmentId}/remove`)
        .send({ requesterId: REQUESTER_1_ID, removalReason: 'Duplicate removal attempt.' });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/attachments/:id/download
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/attachments/:id/download', () => {
    it('API-08: returns 410 Gone when attempting to download a soft-removed attachment', async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}/download?requesterId=${REQUESTER_1_ID}`);

      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('GONE');
    });

    it('returns 403 Forbidden when non-owner tries to download', async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}/download?requesterId=${REQUESTER_2_ID}`);

      expect(res.status).toBe(403);
    });
  });
});
