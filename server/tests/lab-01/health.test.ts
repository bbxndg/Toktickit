import request from 'supertest';
import app from '../../src/index';
import { describe, it, expect } from 'vitest';

describe('GET /api/health', () => {
  it('returns 200 with status ok and correct service name', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('TokTickIT API');
  });
});
