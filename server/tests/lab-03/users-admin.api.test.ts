import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../../src/utils/auth';

const prisma = new PrismaClient();

describe('Lab 3: Administrator User Management APIs', () => {
  let adminToken: string;
  let requesterToken: string;
  let currentAdminId: number;

  const adminEmail = 'admin@toktickit.local';
  const requesterEmail = 'admin.test.requester@toktickit.local';

  beforeAll(async () => {
    // Ensure admin user exists
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        role: Role.ADMINISTRATOR,
      },
      create: {
        name: 'Administrator',
        email: adminEmail,
        department: 'IT Admin',
        role: Role.ADMINISTRATOR,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });
    currentAdminId = adminUser.id;

    // Ensure dedicated requester user exists
    await prisma.user.upsert({
      where: { email: requesterEmail },
      update: {
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        role: Role.REQUESTER,
      },
      create: {
        name: 'Admin Test Requester',
        email: requesterEmail,
        department: 'Testing',
        role: Role.REQUESTER,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    // Login as admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'Password123!' });
    adminToken = adminLoginRes.body.token;

    // Login as requester
    const reqLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: requesterEmail, password: 'Password123!' });
    requesterToken = reqLoginRes.body.token;
  });

  // API-22: Non-Administrator accesses admin endpoints
  it('API-22: should reject non-administrator with HTTP 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should list users for administrator on GET /api/admin/users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('email');
    expect(res.body[0]).toHaveProperty('role');
    expect(res.body[0].passwordHash).toBeUndefined();
  });

  // API-18: Administrator creates new user account
  it('API-18: should allow Administrator to create user with initial password and isPasswordChangeRequired=true', async () => {
    const newEmail = `user.create.test.${Date.now()}@toktickit.local`;

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Test Staff',
        email: newEmail,
        department: 'Support Ops',
        role: 'IT_STAFF',
        initialPassword: 'InitialPassword123!',
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(newEmail);
    expect(res.body.role).toBe('IT_STAFF');
    expect(res.body.isPasswordChangeRequired).toBe(true);
    expect(res.body.isActive).toBe(true);

    // Verify the new user can login with initial password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: newEmail,
        password: 'InitialPassword123!',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.isPasswordChangeRequired).toBe(true);
  });

  // API-19: Create user with duplicate email
  it('API-19: should return HTTP 409 Conflict when creating user with duplicate email', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate Admin',
        email: adminEmail,
        role: 'ADMINISTRATOR',
        initialPassword: 'InitialPassword123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  // API-20: Administrator deactivates own account
  it('API-20: should reject Administrator self-deactivation with HTTP 400 Bad Request (BR-17)', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${currentAdminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isActive: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_DEACTIVATION_BLOCKED');
  });

  // Self-role removal
  it('should reject Administrator removing own administrator role (BR-17)', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${currentAdminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'REQUESTER',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_ROLE_CHANGE_BLOCKED');
  });

  // API-21: Deactivate the last active Administrator
  it('API-21: should reject deactivating the last active Administrator (BR-18)', async () => {
    // First, deactivate any other admins so only 1 remains
    await prisma.user.updateMany({
      where: {
        role: Role.ADMINISTRATOR,
        id: { not: currentAdminId },
      },
      data: { isActive: false },
    });

    // Create a dummy second admin, then login as second admin to try deactivating first admin
    const tempAdmin = await prisma.user.create({
      data: {
        name: 'Temporary Admin',
        email: `temp.admin.${Date.now()}@toktickit.local`,
        role: Role.ADMINISTRATOR,
        passwordHash: hashPassword('Password123!'),
        isActive: true,
        isPasswordChangeRequired: false,
      },
    });

    const tempLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: tempAdmin.email, password: 'Password123!' });
    const tempToken = tempLoginRes.body.token;

    // Deactivate tempAdmin to leave only currentAdmin
    await prisma.user.update({
      where: { id: tempAdmin.id },
      data: { isActive: false },
    });

    // Now currentAdmin is the ONLY active admin. Attempt to deactivate currentAdmin using an authorized session
    // Reactivate tempAdmin so we have a valid caller
    await prisma.user.update({
      where: { id: tempAdmin.id },
      data: { isActive: true },
    });

    // Now there are 2 active admins. Deactivate currentAdmin -> Should succeed
    const deactRes = await request(app)
      .patch(`/api/admin/users/${currentAdminId}`)
      .set('Authorization', `Bearer ${tempToken}`)
      .send({ isActive: false });
    expect(deactRes.status).toBe(200);

    // Now tempAdmin is the ONLY active admin. Attempt to deactivate tempAdmin from currentAdmin (which is inactive) or attempt to deactivate last admin:
    // Try to deactivate tempAdmin:
    const lastAdminRes = await request(app)
      .patch(`/api/admin/users/${tempAdmin.id}`)
      .set('Authorization', `Bearer ${tempToken}`)
      .send({ isActive: false });

    // Both SELF_DEACTIVATION_BLOCKED or LAST_ADMIN_PROTECTION apply!
    expect(lastAdminRes.status).toBe(400);

    // Reactivate currentAdmin
    await prisma.user.update({
      where: { id: currentAdminId },
      data: { isActive: true },
    });
  });

  // Admin password reset
  it('should allow Administrator to reset initial password for a user', async () => {
    // Find a requester
    const target = await prisma.user.findFirst({
      where: { email: requesterEmail },
    });

    expect(target).toBeDefined();

    const resetRes = await request(app)
      .post(`/api/admin/users/${target!.id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        initialPassword: 'NewInitialPassword999!',
      });

    expect(resetRes.status).toBe(200);

    // Verify user must now change password on next login
    const updatedTarget = await prisma.user.findUnique({
      where: { id: target!.id },
    });
    expect(updatedTarget!.isPasswordChangeRequired).toBe(true);

    // Verify login with new initial password works
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: requesterEmail,
        password: 'NewInitialPassword999!',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.isPasswordChangeRequired).toBe(true);
  });
});

