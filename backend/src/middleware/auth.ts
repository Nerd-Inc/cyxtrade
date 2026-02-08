import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import redisClient from '../config/redis';

// Validate JWT_SECRET at startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    isTrader: boolean;
    isAdmin: boolean;
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
      phone: string;
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

    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      isTrader: decoded.isTrader,
      isAdmin: decoded.isAdmin
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

export const traderMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isTrader) {
    return res.status(403).json({ error: 'Trader access required' });
  }
  next();
};
