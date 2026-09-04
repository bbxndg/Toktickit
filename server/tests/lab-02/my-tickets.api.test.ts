import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('GET /api/tickets (My Tickets List API)', () => {
  let requester1Id = 1;
  let requester2Id = 2;
  const uniqueKeyword = `wifi-adaptor-${Date.now()}`;

  beforeAll(async () => {
    // Seed at least 2 tickets for requester 1 and 1 ticket for requester 2
    await request(app)
      .post('/api/tickets')
      .field('requesterId', requester1Id)
      .field('categoryId', 2)
      .field('relatedSystemId', 1)
      .field('requestedPriority', 'HIGH')
      .field('summary', `Laptop screen flicker ${uniqueKeyword}`)
      .field('description', 'Wi-Fi drops connection every 15 minutes reliably.');

    await request(app)
      .post('/api/tickets')
      .field('requesterId', requester1Id)
      .field('categoryId', 1)
      .field('relatedSystemId', 4)
      .field('requestedPriority', 'LOW')
      .field('summary', 'VPN certificate renewal required')
      .field('description', 'Need updated VPN certificate for remote connection.');

    await request(app)
      .post('/api/tickets')
      .field('requesterId', requester2Id)
      .field('categoryId', 3)
      .field('relatedSystemId', 5)
      .field('requestedPriority', 'MEDIUM')
      .field('summary', 'LEB2 score submission error')
      .field('description', 'Grade upload gives 500 server error on final step.');
  });

  it('should reject requests missing requesterId with HTTP 400', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d: any) => d.field === 'requesterId')).toBe(true);
  });

  it('API-05: should retrieve only tickets owned by the requesting user (Requester Isolation)', async () => {
    const res = await request(app).get(`/api/tickets?requesterId=${requester1Id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    // Ensure none of requester 2's tickets appear in requester 1's list
    const hasRequester2Ticket = res.body.data.some(
      (t: any) => t.summary === 'LEB2 score submission error'
    );
    expect(hasRequester2Ticket).toBe(false);
  });

  it('API-06: should filter tickets by search keyword matching summary or ticketNumber', async () => {
    const res = await request(app)
      .get(`/api/tickets?requesterId=${requester1Id}&search=${uniqueKeyword}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].summary).toContain(uniqueKeyword);
  });

  it('should filter tickets by categoryId', async () => {
    const res = await request(app)
      .get(`/api/tickets?requesterId=${requester1Id}&categoryId=1`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.category.id === 1)).toBe(true);
  });

  it('should filter tickets by requestedPriority', async () => {
    const res = await request(app)
      .get(`/api/tickets?requesterId=${requester1Id}&requestedPriority=HIGH`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.requestedPriority === 'HIGH')).toBe(true);
  });

  it('should support pagination controls and return correct pagination metadata', async () => {
    const res = await request(app)
      .get(`/api/tickets?requesterId=${requester1Id}&page=1&pageSize=1`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(1);
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });
});
