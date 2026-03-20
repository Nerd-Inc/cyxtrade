import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import redisClient from '../config/redis';
import { findTraderByUserId } from '../services/traderService';
import { hasPermission, Resource, Permission, RoleId } from '../services/rbacService';
import { queryOne } from '../services/db';

// Validate JWT_SECRET at startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string | null;
    publicKeyFingerprint?: string;
    isTrader: boolean;
    isAdmin: boolean;
    adminRole?: RoleId;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET) as {
      jti?: string;
      id: string;
      phone?: string;
      publicKey?: string;
      publicKeyFingerprint?: string;
      isTrader: boolean;
      isAdmin: boolean;
    };

    // Check if token is blacklisted
    if (decoded.jti) {
      const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
    }

    // Fetch admin role from database if user is admin
    let adminRole: RoleId | undefined;
    if (decoded.isAdmin) {
      const userRow = await queryOne<{ admin_role: RoleId | null }>(
        'SELECT admin_role FROM users WHERE id = $1',
        [decoded.id]
      );
      adminRole = userRow?.admin_role || undefined;
    }

    req.user = {
      id: decoded.id,
      phone: decoded.phone || null,
      // Legacy JWT claim kept the fingerprint in "publicKey".
      publicKeyFingerprint: decoded.publicKeyFingerprint || decoded.publicKey,
      isTrader: decoded.isTrader,
      isAdmin: decoded.isAdmin,
      adminRole
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const traderMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.isTrader) {
    return next();
  }

  if (!req.user?.id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Handle stale JWT claims: verify trader status from DB.
    const trader = await findTraderByUserId(req.user.id);
    if (trader && (trader.status === 'active' || trader.status === 'pending')) {
      req.user.isTrader = true;
      return next();
    }
  } catch (error) {
    // Fall through to forbidden response below.
  }

  return res.status(403).json({ error: 'Trader access required' });
};

/**
 * Role-based permission middleware
 * Checks if the user has a specific permission on a resource
 */
export const roleMiddleware = (resource: Resource, action: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.user.adminRole) {
      return res.status(403).json({ error: 'No admin role assigned' });
    }

    if (!hasPermission(req.user.adminRole, resource, action)) {
      return res.status(403).json({
        error: `Permission denied: ${action} on ${resource}`,
        required: { resource, action },
        role: req.user.adminRole
      });
    }

    next();
  };
};

/**
 * Check multiple permissions (user must have ALL specified permissions)
 */
export const requirePermissions = (permissions: Array<{ resource: Resource; action: Permission }>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.user.isAdmin || !req.user.adminRole) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    for (const { resource, action } of permissions) {
      if (!hasPermission(req.user.adminRole, resource, action)) {
        return res.status(403).json({
          error: `Permission denied: ${action} on ${resource}`,
          required: permissions,
          role: req.user.adminRole
        });
      }
    }

    next();
  };
};

/**
 * Check if user has any of the specified permissions
 */
export const requireAnyPermission = (permissions: Array<{ resource: Resource; action: Permission }>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.user.isAdmin || !req.user.adminRole) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const hasAny = permissions.some(({ resource, action }) =>
      hasPermission(req.user!.adminRole, resource, action)
    );

    if (!hasAny) {
      return res.status(403).json({
        error: 'Permission denied',
        requiredAnyOf: permissions,
        role: req.user.adminRole
      });
    }

    next();
  };
};
