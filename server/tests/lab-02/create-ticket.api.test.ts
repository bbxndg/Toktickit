import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('POST /api/tickets (Ticket Creation API)', () => {
  it('API-01: should create a valid ticket and return HTTP 201 with generated Ticket Number', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .field('requesterId', 1)
      .field('categoryId', 2)
      .field('relatedSystemId', 1)
      .field('requestedPriority', 'MEDIUM')
      .field('summary', 'Laptop screen flickering intermittently')
      .field('description', 'The screen flashes black for a split second every few minutes.');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('ticketNumber');
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.summary).toBe('Laptop screen flickering intermittently');
    expect(res.body.status).toBe('NEW');
    expect(res.body.requestedPriority).toBe('MEDIUM');
    expect(res.body.requesterId).toBe(1);
    expect(res.body.category.name).toBe('Hardware');
    expect(res.body.relatedSystem.name).toBe('Corporate Laptop');
  });

  it('API-02: should reject submission when summary is too short (< 5 chars) with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .field('requesterId', 1)
      .field('categoryId', 1)
      .field('relatedSystemId', 1)
      .field('requestedPriority', 'LOW')
      .field('summary', 'Bad')
      .field('description', 'This is a sufficiently long description for the test.');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(
      res.body.error.details.some((d: any) => d.field === 'summary')
    ).toBe(true);
  });

  it('API-03: should reject file attachments exceeding 5 MB with HTTP 400', async () => {
    // 6 MB buffer to trigger LIMIT_FILE_SIZE
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024);

    const res = await request(app)
      .post('/api/tickets')
      .field('requesterId', 1)
      .field('categoryId', 2)
      .field('relatedSystemId', 1)
      .field('requestedPriority', 'HIGH')
      .field('summary', 'Large log file upload test')
      .field('description', 'Attaching a file that exceeds the 5 megabyte limit.')
      .attach('attachments', oversizedBuffer, 'oversized_log.pdf');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/exceeds maximum allowed limit/i);
  });

  it('API-04: should reject invalid file types (.exe) with HTTP 400', async () => {
    const exeBuffer = Buffer.from('MZ fake binary data');

    const res = await request(app)
      .post('/api/tickets')
      .field('requesterId', 1)
      .field('categoryId', 2)
      .field('relatedSystemId', 1)
      .field('requestedPriority', 'LOW')
      .field('summary', 'Invalid attachment type test')
      .field('description', 'Attaching an executable file to verify rejection.')
      .attach('attachments', exeBuffer, {
        filename: 'malicious.exe',
        contentType: 'application/x-msdownload',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/Invalid file type/i);
  });

  it('should accept valid attachments (e.g. PDF) and create attachment records', async () => {
    const samplePdfBuffer = Buffer.from('%PDF-1.4 sample pdf content');

    const res = await request(app)
      .post('/api/tickets')
      .field('requesterId', 1)
      .field('categoryId', 3)
      .field('relatedSystemId', 2)
      .field('requestedPriority', 'CRITICAL')
      .field('summary', 'Email sync configuration issue')
      .field('description', 'Outlook client fails to connect with corporate exchange.')
      .attach('attachments', samplePdfBuffer, {
        filename: 'error_screenshot.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.attachments)).toBe(true);
    expect(res.body.attachments.length).toBe(1);
    expect(res.body.attachments[0].originalName).toBe('error_screenshot.pdf');
    expect(res.body.attachments[0].isRemoved).toBe(false);
  });

  it('GET /api/related-systems should return active related systems', async () => {
    const res = await request(app).get('/api/related-systems');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(6);
    expect(res.body.some((s: any) => s.name === 'Corporate Laptop')).toBe(true);
  });
});
