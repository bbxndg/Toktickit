import request from 'supertest';
import app from '../../src/index';
import { describe, it, expect } from 'vitest';

describe('GET /api/categories', () => {
  it('returns the four seeded categories in order', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body.map((c: any) => c.name)).toEqual([
      'Account and Access',
      'Hardware',
      'Software',
      'Network',
    ]);
  });
});
