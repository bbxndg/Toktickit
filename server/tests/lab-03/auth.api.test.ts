import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../../src/utils/auth';

const prisma = new PrismaClient();

describe('Lab 3: Authentication & Session APIs', () => {
  const testRequesterEmail = 'auth.test.requester@toktickit.local';
  const testInactiveEmail = 'auth.test.inactive@toktickit.local';
  const testPassword = 'Password123!';

  beforeAll(async () => {
    // Ensure clean state for test users
    await prisma.user.deleteMany({
      where: {
        email: { in: [testRequesterEmail, testInactiveEmail] },
      },
    });

    // Create test active requester
    await prisma.user.create({
      data: {
        name: 'Auth Test Requester',
        email: testRequesterEmail,
        department: 'QA Testing',
        role: Role.REQUESTER,
        passwordHash: hashPassword(testPassword),
        isActive: true,
        isPasswordChangeRequired: true,
      },
    });

    // Create test inactive requester
    await prisma.user.create({
      data: {
        name: 'Auth Test Inactive',
        email: testInactiveEmail,
        department: 'QA Testing',
        role: Role.REQUESTER,
        passwordHash: hashPassword(testPassword),
        isActive: false,
        isPasswordChangeRequired: true,
      },
    });
  });

  // API-01: Valid user login
  it('API-01: should return HTTP 200 and token on valid login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequesterEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testRequesterEmail);
    expect(res.body.user.role).toBe('REQUESTER');
    expect(res.body.user.isPasswordChangeRequired).toBe(true);
    expect(res.body.user.isActive).toBe(true);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  // API-02: Login with incorrect password
  it('API-02: should return HTTP 401 on incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequesterEmail,
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // API-03: Login with inactive user account
  it('API-03: should return HTTP 401 on inactive user login (BR-01)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testInactiveEmail,
        password: testPassword,
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // Validation: Missing fields
  it('should return HTTP 400 if email or password missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testRequesterEmail });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Profile retrieval: GET /api/auth/me
  it('should return profile on GET /api/auth/me with valid Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequesterEmail,
        password: testPassword,
      });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(testRequesterEmail);
    expect(meRes.body.name).toBe('Auth Test Requester');
    expect(meRes.body.role).toBe('REQUESTER');
  });

  it('should return HTTP 401 on GET /api/auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  // API-05: Password change failing complexity
  it('API-05: should reject password change failing complexity (min 8 chars, upper, lower, digit, symbol)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequesterEmail,
        password: testPassword,
      });

    const token = loginRes.body.token;

    // Simple password without special character or number
    const weakRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: testPassword,
        newPassword: 'weakpassword',
        confirmPassword: 'weakpassword',
      });

    expect(weakRes.status).toBe(400);
    expect(weakRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject password change when confirmation does not match', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequesterEmail,
        password: testPassword,
      });

    const token = loginRes.body.token;

    const mismatchRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: testPassword,
        newPassword: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword456!',
      });

    expect(mismatchRes.status).toBe(400);
    expect(mismatchRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  // API-04: First-login password change
  it('API-04: should successfully change password and update isPasswordChangeRequired to false', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequesterEmail,
        password: testPassword,
      });

    const token = loginRes.body.token;
    const newPassword = 'BrandNewPassword456!';

    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: testPassword,
        newPassword: newPassword,
        confirmPassword: newPassword,
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.isPasswordChangeRequired).toBe(false);

    // Verify subsequent login with new password works
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequesterEmail,
        password: newPassword,
      });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.user.isPasswordChangeRequired).toBe(false);

    // Old password should now fail
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequesterEmail,
        password: testPassword,
      });

    expect(oldLoginRes.status).toBe(401);
  });

  // Logout
  it('should return HTTP 200 on POST /api/auth/logout', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@toktickit.local',
        password: 'Password123!',
      });

    const token = loginRes.body.token;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toContain('Logged out');
  });
});

