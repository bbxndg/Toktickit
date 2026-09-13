import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('GET /api/requesters (Development Requester Selector API)', () => {
  it('should return HTTP 200 and an array of active development requesters', async () => {
    const res = await request(app).get('/api/requesters');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    // Verify all returned requesters have isActive === true
    for (const requester of res.body) {
      expect(requester).toHaveProperty('id');
      expect(requester).toHaveProperty('name');
      expect(requester).toHaveProperty('email');
      expect(requester).toHaveProperty('department');
      expect(requester.isActive).toBe(true);
    }
  });

  it('should exclude inactive requesters from the response (BR-05)', async () => {
    const res = await request(app).get('/api/requesters');

    expect(res.status).toBe(200);
    const inactiveUser = res.body.find(
      (u: { email: string; isActive: boolean }) =>
        u.email === 'john.doe@toktickit.local' || u.isActive === false
    );
    expect(inactiveUser).toBeUndefined();
  });
});
