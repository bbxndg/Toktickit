import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  validatePasswordComplexity,
  hashPassword,
  comparePassword,
  generateToken,
} from '../utils/auth';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required.',
      },
    });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password, or account is deactivated.',
        },
      });
    }

    const isPasswordValid = comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password.',
        },
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPasswordChangeRequired: user.isPasswordChangeRequired,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login.',
      },
    });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', authenticate, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me
router.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  return res.status(200).json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    isPasswordChangeRequired: req.user.isPasswordChangeRequired,
    isActive: req.user.isActive,
  });
});

// POST /api/auth/change-password
router.post('/auth/change-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Current password, new password, and confirmation are required.',
      },
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'New password and confirmation do not match.',
      },
    });
  }

  const complexity = validatePasswordComplexity(newPassword);
  if (!complexity.valid) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: complexity.message || 'New password does not meet complexity requirements.',
        details: [{ field: 'newPassword', message: complexity.message }],
      },
    });
  }

  const isCurrentValid = comparePassword(currentPassword, req.user.passwordHash);
  if (!isCurrentValid) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Current password is incorrect.',
      },
    });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash: hashPassword(newPassword),
        isPasswordChangeRequired: false,
      },
    });

    return res.status(200).json({
      message: 'Password updated successfully',
      isPasswordChangeRequired: updated.isPasswordChangeRequired,
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update password.',
      },
    });
  }
});

export default router;

