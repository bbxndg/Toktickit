import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { beforeAll as setupFixtures, afterAll } from 'vitest';
import { requesterFixtures } from './fixtures';

let fixtures: Awaited<ReturnType<typeof requesterFixtures>>;
setupFixtures(async () => { fixtures = await requesterFixtures(); });
afterAll(async () => { await fixtures?.cleanup(); });

describe('GET /api/tickets (My Tickets List API)', () => {
  let requester1Id: number;
  let requester2Id: number;
  const uniqueKeyword = `wifi-adaptor-${Date.now()}`;

  beforeAll(async () => {
    requester1Id = fixtures.users[0].id; requester2Id = fixtures.users[1].id;
    // Seed at least 2 tickets for requester 1 and 1 ticket for requester 2
    await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${fixtures.tokens[0]}`)
      .field('requesterId', requester1Id)
      .field('categoryId', fixtures.categories[1].id)
      .field('relatedSystemId', fixtures.systems[0].id)
      .field('requestedPriority', 'HIGH')
      .field('summary', `Laptop screen flicker ${uniqueKeyword}`)
      .field('description', 'Wi-Fi drops connection every 15 minutes reliably.');

    await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${fixtures.tokens[0]}`)
      .field('requesterId', requester1Id)
      .field('categoryId', fixtures.categories[0].id)
      .field('relatedSystemId', fixtures.systems[3].id)
      .field('requestedPriority', 'LOW')
      .field('summary', 'VPN certificate renewal required')
      .field('description', 'Need updated VPN certificate for remote connection.');

    await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${fixtures.tokens[1]}`)
      .field('requesterId', requester2Id)
      .field('categoryId', fixtures.categories[2].id)
      .field('relatedSystemId', fixtures.systems[4].id)
      .field('requestedPriority', 'MEDIUM')
      .field('summary', 'LEB2 score submission error')
      .field('description', 'Grade upload gives 500 server error on final step.');
  });

  it('rejects unauthenticated list access', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('API-05: should retrieve only tickets owned by the requesting user (Requester Isolation)', async () => {
    const res = await request(app).get(`/api/tickets?requesterId=${requester1Id}`).set('Authorization', `Bearer ${fixtures.tokens[0]}`);

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
      .get(`/api/tickets?requesterId=${requester1Id}&search=${uniqueKeyword}`).set('Authorization', `Bearer ${fixtures.tokens[0]}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].summary).toContain(uniqueKeyword);
  });

  it('should filter tickets by categoryId', async () => {
    const res = await request(app)
      .get(`/api/tickets?requesterId=${requester1Id}&categoryId=${fixtures.categories[0].id}`).set('Authorization', `Bearer ${fixtures.tokens[0]}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.category.id === fixtures.categories[0].id)).toBe(true);
  });

  it('should filter tickets by requestedPriority', async () => {
    const res = await request(app)
      .get(`/api/tickets?requesterId=${requester1Id}&requestedPriority=HIGH`).set('Authorization', `Bearer ${fixtures.tokens[0]}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.requestedPriority === 'HIGH')).toBe(true);
  });

  it('should support pagination controls and return correct pagination metadata', async () => {
    const res = await request(app)
      .get(`/api/tickets?requesterId=${requester1Id}&page=1&pageSize=1`).set('Authorization', `Bearer ${fixtures.tokens[0]}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(1);
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });
});
