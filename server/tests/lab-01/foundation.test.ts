import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('TokTickIT Server Foundation', () => {
  it('instantiates the express app without errors', () => {
    expect(app).toBeDefined();
  });
});
