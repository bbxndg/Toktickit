import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validatePasswordComplexity, hashPassword } from '../utils/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/users
router.get(
  '/admin/users',
  authenticate,
  requireRole(Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, role } = req.query;

      const whereClause: any = {};

      if (search && typeof search === 'string' && search.trim() !== '') {
        const query = search.trim();
        whereClause.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (role && typeof role === 'string' && Object.values(Role).includes(role as Role)) {
        whereClause.role = role as Role;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          role: true,
          isActive: true,
          isPasswordChangeRequired: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.status(200).json(users);
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user accounts.',
        },
      });
    }
  }
);

// POST /api/admin/users
router.post(
  '/admin/users',
  authenticate,
  requireRole(Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, email, department, role, initialPassword, isActive } = req.body;

      const validationErrors: { field: string; message: string }[] = [];

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        validationErrors.push({ field: 'name', message: 'Name is required.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
        validationErrors.push({ field: 'email', message: 'A valid email address is required.' });
      }

      if (!role || !Object.values(Role).includes(role)) {
        validationErrors.push({
          field: 'role',
          message: `Role must be one of: ${Object.values(Role).join(', ')}.`,
        });
      }

      if (!initialPassword) {
        validationErrors.push({ field: 'initialPassword', message: 'Initial password is required.' });
      } else {
        const complexity = validatePasswordComplexity(initialPassword);
        if (!complexity.valid) {
          validationErrors.push({
            field: 'initialPassword',
            message: complexity.message || 'Password does not meet complexity rules.',
          });
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user parameters.',
            details: validationErrors,
          },
        });
      }

      // Check email uniqueness (case-insensitive)
      const existingUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: email.trim(),
            mode: 'insensitive',
          },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'User with this email already exists.',
          },
        });
      }

      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          department: department ? department.trim() : null,
          role: role as Role,
          passwordHash: hashPassword(initialPassword),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          isPasswordChangeRequired: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          role: true,
          isActive: true,
          isPasswordChangeRequired: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.status(201).json(newUser);
    } catch (error) {
      console.error('Failed to create user:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user account.',
        },
      });
    }
  }
);

// PATCH /api/admin/users/:id
router.patch(
  '/admin/users/:id',
  authenticate,
  requireRole(Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.id as string, 10);
      if (isNaN(targetUserId)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID.',
          },
        });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found.',
          },
        });
      }

      const { name, email, department, role, isActive } = req.body;

      // BR-17: Self-deactivation and self-role change prevention
      if (req.user && req.user.id === targetUserId) {
        if (isActive === false) {
          return res.status(400).json({
            error: {
              code: 'SELF_DEACTIVATION_BLOCKED',
              message: 'Administrators cannot deactivate their own account.',
            },
          });
        }
        if (role && role !== Role.ADMINISTRATOR) {
          return res.status(400).json({
            error: {
              code: 'SELF_ROLE_CHANGE_BLOCKED',
              message: 'Administrators cannot remove their own administrator role.',
            },
          });
        }
      }

      // BR-18: Last active administrator protection
      const isDeactivatingAdmin =
        targetUser.role === Role.ADMINISTRATOR &&
        targetUser.isActive &&
        (isActive === false || (role && role !== Role.ADMINISTRATOR));

      if (isDeactivatingAdmin) {
        const activeAdminCount = await prisma.user.count({
          where: {
            role: Role.ADMINISTRATOR,
            isActive: true,
          },
        });

        if (activeAdminCount <= 1) {
          return res.status(400).json({
            error: {
              code: 'LAST_ADMIN_PROTECTION',
              message: 'Cannot deactivate or reassign the role of the last active administrator.',
            },
          });
        }
      }

      // Check email conflict if email changed
      if (email && email.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
        const existingEmail = await prisma.user.findFirst({
          where: {
            email: {
              equals: email.trim(),
              mode: 'insensitive',
            },
            id: { not: targetUserId },
          },
        });

        if (existingEmail) {
          return res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: 'Email is already in use by another account.',
            },
          });
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (email !== undefined) updateData.email = email.trim().toLowerCase();
      if (department !== undefined) updateData.department = department ? department.trim() : null;
      if (role !== undefined && Object.values(Role).includes(role)) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          role: true,
          isActive: true,
          isPasswordChangeRequired: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user account.',
        },
      });
    }
  }
);

// POST /api/admin/users/:id/reset-password
router.post(
  '/admin/users/:id/reset-password',
  authenticate,
  requireRole(Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.id as string, 10);
      if (isNaN(targetUserId)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID.',
          },
        });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found.',
          },
        });
      }

      const { initialPassword } = req.body;
      if (!initialPassword) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Initial password is required.',
          },
        });
      }

      const complexity = validatePasswordComplexity(initialPassword);
      if (!complexity.valid) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: complexity.message || 'Password does not meet complexity rules.',
          },
        });
      }

      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          passwordHash: hashPassword(initialPassword),
          isPasswordChangeRequired: true,
        },
      });

      return res.status(200).json({
        message: 'Initial password set successfully; user must change password upon next login',
      });
    } catch (error) {
      console.error('Failed to reset user password:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reset password.',
        },
      });
    }
  }
);

export default router;

