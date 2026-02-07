import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getOrCreateUser } from '../services/userService';
import { findTraderByUserId } from '../services/traderService';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess, sendAppError } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expires: number }>();

// POST /api/auth/otp - Send OTP to phone
router.post('/otp', asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Phone number is required', { field: 'phone' });
  }

  // Validate phone format (basic check)
  const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
    throw new AppError(ErrorCode.INVALID_PHONE, 'Please enter a valid phone number');
  }

  // Generate OTP (fixed in dev, random in prod)
  const otp = process.env.NODE_ENV === 'development' ? '123456' : Math.random().toString().slice(2, 8);

  // Store OTP with 5 minute expiry
  otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });

  // TODO: Send via Twilio in production
  console.log(`📱 OTP for ${phone}: ${otp}`);

  sendSuccess(res, { message: 'OTP sent', phone });
}));

// POST /api/auth/verify - Verify OTP and get JWT
router.post('/verify', asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Phone number is required', { field: 'phone' });
  }
  if (!otp) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Verification code is required', { field: 'otp' });
  }

  // Verify OTP
  const stored = otpStore.get(phone);
  if (!stored) {
    throw new AppError(ErrorCode.INVALID_OTP, 'Verification code not found. Please request a new one');
  }
  if (stored.expires < Date.now()) {
    otpStore.delete(phone);
    throw new AppError(ErrorCode.OTP_EXPIRED, 'Verification code has expired. Please request a new one');
  }
  if (stored.otp !== otp) {
    throw new AppError(ErrorCode.INVALID_OTP, 'Invalid verification code');
  }

  // Clear used OTP
  otpStore.delete(phone);

  const isAdmin = (process.env.ADMIN_PHONE_NUMBERS || '').includes(phone);

  let user: any;
  let trader: any = null;
  let isTrader = false;

  try {
    // Try to get or create user in database
    user = await getOrCreateUser(phone, isAdmin);
    trader = await findTraderByUserId(user.id);
    isTrader = trader?.status === 'active';
  } catch (dbError) {
    // Database not available - use mock user for development
    console.log('⚠️ Database not available, using mock user');
    const { v4: uuidv4 } = await import('uuid');
    user = {
      id: uuidv4(),
      phone,
      display_name: null,
      avatar_url: null,
      is_admin: isAdmin,
      is_trader: false
    };
  }

  const secret = process.env.JWT_SECRET || 'dev-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const token = jwt.sign(
    {
      id: user.id,
      phone: user.phone || phone,
      isTrader,
      isAdmin: user.is_admin || isAdmin
    },
    secret,
    { expiresIn } as jwt.SignOptions
  );

  sendSuccess(res, {
    token,
    user: {
      id: user.id,
      phone: user.phone || phone,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      isTrader,
      isAdmin: user.is_admin || isAdmin,
      traderId: trader?.id
    }
  });
}));

// POST /api/auth/refresh - Refresh JWT
router.post('/refresh', asyncHandler(async (req, res) => {
  // TODO: Implement token refresh
  throw new AppError(ErrorCode.INTERNAL_ERROR, 'Not implemented', { feature: 'token_refresh' });
}));

// DELETE /api/auth/logout - Logout
router.delete('/logout', asyncHandler(async (req, res) => {
  // TODO: Invalidate token in Redis
  sendSuccess(res, { message: 'Logged out' });
}));

export default router;
