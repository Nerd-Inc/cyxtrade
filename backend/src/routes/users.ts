import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { findTraderByUserId } from '../services/traderService';
import {
  findUserById,
  type User,
  updateUser,
  isUsernameAvailable,
  validateUsername
} from '../services/userService';
import { query } from '../services/db';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';

const router = Router();

function mapUserResponse(user: User, traderId: string | null, traderAddress: string | null) {
  return {
    id: user.id,
    phone: user.phone,
    publicKey: user.public_key,
    fingerprint: user.public_key_fingerprint,
    displayName: user.display_name,
    username: user.username,
    avatarUrl: user.avatar_url,
    isTrader: traderId !== null || user.is_trader,
    isAdmin: user.is_admin,
    totpEnabled: user.totp_enabled,
    traderId,
    traderAddress,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

// GET /api/users/check-username/:username - Check if username is available
router.get('/check-username/:username', asyncHandler(async (req, res) => {
  const usernameParam = req.params.username;
  const username = Array.isArray(usernameParam) ? usernameParam[0] : usernameParam;

  if (!username) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Username is required');
  }

  // Validate format first
  const validation = validateUsername(username);
  if (!validation.valid) {
    sendSuccess(res, { available: false, reason: validation.error });
    return;
  }

  // Check availability
  const available = await isUsernameAvailable(username);
  sendSuccess(res, { available });
}));

// GET /api/users/check-displayname/:name - Check if display name is available
router.get('/check-displayname/:name', asyncHandler(async (req, res) => {
  const nameParam = req.params.name;
  const name = Array.isArray(nameParam) ? nameParam[0] : nameParam;

  if (!name || name.trim().length < 2) {
    sendSuccess(res, { available: false, reason: 'Display name must be at least 2 characters' });
    return;
  }

  const existing = await query<{ count: number }>(
    'SELECT COUNT(*)::int as count FROM users WHERE LOWER(display_name) = LOWER($1)',
    [name.trim()]
  );
  const available = (existing[0]?.count || 0) === 0;
  sendSuccess(res, { available, ...(available ? {} : { reason: 'This display name is already taken' }) });
}));

// GET /api/users/me - Get current user
router.get('/me', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, 'Not authenticated');
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  const trader = await findTraderByUserId(user.id);
  sendSuccess(res, mapUserResponse(user, trader?.id || null, trader?.wallet_address || null));
}));

// PUT /api/users/me - Update profile
router.put('/me', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, 'Not authenticated');
  }

  const { displayName, avatarUrl, username } = req.body as {
    displayName?: unknown;
    avatarUrl?: unknown;
    username?: unknown;
  };

  const updates: { display_name?: string | null; avatar_url?: string | null; username?: string | null } = {};

  if (displayName !== undefined) {
    if (typeof displayName !== 'string') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Display name must be a string');
    }
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Display name must be between 2 and 100 characters');
    }
    updates.display_name = trimmedName;
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== 'string') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Avatar URL must be a string');
    }
    if (typeof avatarUrl === 'string') {
      const trimmedUrl = avatarUrl.trim();
      if (trimmedUrl.length > 500) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Avatar URL is too long');
      }
      updates.avatar_url = trimmedUrl.length === 0 ? null : trimmedUrl;
    } else {
      updates.avatar_url = null;
    }
  }

  if (username !== undefined) {
    if (typeof username !== 'string') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Username must be a string');
    }
    const trimmedUsername = username.trim();

    // Validate username format
    const validation = validateUsername(trimmedUsername);
    if (!validation.valid) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, validation.error || 'Invalid username');
    }

    // Check if user already has this username (no change needed)
    const currentUser = await findUserById(userId);
    if (currentUser?.username?.toLowerCase() !== trimmedUsername.toLowerCase()) {
      // Check availability only if changing username
      const available = await isUsernameAvailable(trimmedUsername);
      if (!available) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Username is already taken');
      }
    }

    updates.username = trimmedUsername;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'No profile fields provided');
  }

  const updatedUser = await updateUser(userId, updates);
  if (!updatedUser) {
    throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  const trader = await findTraderByUserId(updatedUser.id);
  sendSuccess(res, mapUserResponse(updatedUser, trader?.id || null, trader?.wallet_address || null));
}));

// GET /api/users/:id - Get user public profile
router.get('/:id', asyncHandler(async (req, res) => {
  const idParam = req.params.id;
  const userId = Array.isArray(idParam) ? idParam[0] : idParam;
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  sendSuccess(res, {
    id: user.id,
    displayName: user.display_name || `User ${user.id.slice(0, 8)}`,
    avatarUrl: user.avatar_url,
    isTrader: user.is_trader,
    memberSince: user.created_at,
  });
}));

export default router;
