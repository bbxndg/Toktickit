import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role, User } from '@prisma/client';
import { verifyToken } from '../utils/auth';

const prisma = new PrismaClient();

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  department: string | null;
  role: Role;
  isActive: boolean;
  isPasswordChangeRequired: boolean;
  passwordHash: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is missing or malformed.',
      },
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token.',
      },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Account is deactivated or does not exist.',
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during authentication.',
      },
    });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: insufficient permissions.',
        },
      });
    }

    next();
  };
}

export function enforcePasswordChange(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user && req.user.isPasswordChangeRequired) {
    // Exempt password change, logout, and me endpoints
    const exemptedPaths = [
      '/api/auth/change-password',
      '/api/auth/logout',
      '/api/auth/me',
      '/auth/change-password',
      '/auth/logout',
      '/auth/me',
    ];
    if (!exemptedPaths.some(p => req.originalUrl?.includes(p) || req.path?.includes(p))) {
      return res.status(403).json({
        error: {
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Password change is required before accessing application features.',
        },
      });
    }
  }
  next();
}

