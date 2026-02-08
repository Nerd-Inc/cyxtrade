import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import nacl from 'tweetnacl';
import { getOrCreateUser, findUserByPublicKey, createUserWithPublicKey } from '../services/userService';
import { findTraderByUserId } from '../services/traderService';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess, sendAppError } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import redisClient from '../config/redis';

const router = Router();

// Validate required environment variables at startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;

// Rate limiting for OTP requests (3 per minute per IP)
const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: { error: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for OTP verification (5 attempts per 15 minutes per IP)
const verifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for keypair challenge requests
const challengeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many challenge requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for signature verification
const signatureRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const CHALLENGE_EXPIRY_SECONDS = 300; // 5 minutes

// Generate cryptographically secure OTP
function generateSecureOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// POST /api/auth/otp - Send OTP to phone
router.post('/otp', otpRateLimiter, asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Phone number is required', { field: 'phone' });
  }

  // Validate phone format (basic check)
  const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
    throw new AppError(ErrorCode.INVALID_PHONE, 'Please enter a valid phone number');
  }

  // Generate cryptographically secure OTP
  const otp = generateSecureOTP();

  // Store OTP in Redis with expiry
  const otpKey = `otp:${phone}`;
  const attemptsKey = `otp_attempts:${phone}`;

  await redisClient.setEx(otpKey, OTP_EXPIRY_SECONDS, otp);
  await redisClient.del(attemptsKey); // Reset attempts on new OTP

  // TODO: Send via Twilio/SMS provider in production
  // For now, log OTP (remove in production)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📱 OTP for ${phone}: ${otp}`);
  }

  sendSuccess(res, { message: 'OTP sent', phone });
}));

// POST /api/auth/verify - Verify OTP and get JWT
router.post('/verify', verifyRateLimiter, asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Phone number is required', { field: 'phone' });
  }
  if (!otp) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Verification code is required', { field: 'otp' });
  }

  const otpKey = `otp:${phone}`;
  const attemptsKey = `otp_attempts:${phone}`;

  // Check attempt count
  const attempts = parseInt(await redisClient.get(attemptsKey) || '0');
  if (attempts >= OTP_MAX_ATTEMPTS) {
    await redisClient.del(otpKey); // Invalidate OTP after too many attempts
    throw new AppError(ErrorCode.TOO_MANY_ATTEMPTS, 'Too many failed attempts. Please request a new code');
  }

  // Get stored OTP from Redis
  const storedOtp = await redisClient.get(otpKey);
  if (!storedOtp) {
    throw new AppError(ErrorCode.INVALID_OTP, 'Verification code not found or expired. Please request a new one');
  }

  // Dev mode: accept "123456" as a bypass OTP
  const isDevBypass = process.env.NODE_ENV !== 'production' && otp === '123456';

  // Constant-time comparison to prevent timing attacks
  const isValid = isDevBypass || crypto.timingSafeEqual(
    Buffer.from(storedOtp.padEnd(6, '0')),
    Buffer.from(otp.padEnd(6, '0'))
  );

  if (!isValid) {
    // Increment attempt counter
    await redisClient.incr(attemptsKey);
    await redisClient.expire(attemptsKey, OTP_EXPIRY_SECONDS);
    throw new AppError(ErrorCode.INVALID_OTP, 'Invalid verification code');
  }

  // Clear used OTP and attempts
  await redisClient.del(otpKey);
  await redisClient.del(attemptsKey);

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
    // Database not available - fail in production
    if (process.env.NODE_ENV === 'production') {
      throw new AppError(ErrorCode.DATABASE_ERROR, 'Service temporarily unavailable');
    }
    // Development fallback
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

  // Generate unique token ID for blacklist tracking
  const tokenId = crypto.randomUUID();

  const token = jwt.sign(
    {
      jti: tokenId, // JWT ID for blacklist
      id: user.id,
      phone: user.phone || phone,
      isTrader,
      isAdmin: user.is_admin || isAdmin
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
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
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(ErrorCode.INVALID_TOKEN, 'No token provided');
  }

  const oldToken = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(oldToken, JWT_SECRET) as {
      jti: string;
      id: string;
      phone: string;
      isTrader: boolean;
      isAdmin: boolean;
    };

    // Check if token is blacklisted
    if (decoded.jti) {
      const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
      if (isBlacklisted) {
        throw new AppError(ErrorCode.INVALID_TOKEN, 'Token has been revoked');
      }
    }

    // Blacklist old token
    if (decoded.jti) {
      const exp = (decoded as any).exp;
      const ttl = exp ? exp - Math.floor(Date.now() / 1000) : 86400;
      if (ttl > 0) {
        await redisClient.setEx(`blacklist:${decoded.jti}`, ttl, '1');
      }
    }

    // Generate new token
    const newTokenId = crypto.randomUUID();
    const newToken = jwt.sign(
      {
        jti: newTokenId,
        id: decoded.id,
        phone: decoded.phone,
        isTrader: decoded.isTrader,
        isAdmin: decoded.isAdmin
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    sendSuccess(res, { token: newToken });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(ErrorCode.INVALID_TOKEN, 'Invalid or expired token');
  }
}));

// DELETE /api/auth/logout - Logout (blacklist token)
router.delete('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Already logged out
    sendSuccess(res, { message: 'Logged out' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as {
      jti: string;
      exp: number;
    };

    // Blacklist the token until its expiry
    if (decoded.jti) {
      const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;
      if (ttl > 0) {
        await redisClient.setEx(`blacklist:${decoded.jti}`, ttl, '1');
      }
    }
  } catch (error) {
    // Token invalid, nothing to blacklist
  }

  sendSuccess(res, { message: 'Logged out' });
}));

// ============================================
// KEYPAIR-BASED AUTHENTICATION
// ============================================

// POST /api/auth/challenge - Get challenge to sign with private key
router.post('/challenge', challengeRateLimiter, asyncHandler(async (req, res) => {
  const { publicKey } = req.body;

  if (!publicKey) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Public key is required', { field: 'publicKey' });
  }

  // Validate public key format (64 hex chars = 32 bytes Ed25519 public key)
  if (!/^[a-f0-9]{64}$/i.test(publicKey)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid public key format. Expected 64 hex characters.');
  }

  // Generate random challenge
  const challenge = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + CHALLENGE_EXPIRY_SECONDS * 1000;

  // Store challenge in Redis
  const challengeKey = `challenge:${publicKey.toLowerCase()}`;
  await redisClient.setEx(challengeKey, CHALLENGE_EXPIRY_SECONDS, JSON.stringify({
    challenge,
    expiresAt
  }));

  sendSuccess(res, {
    challenge,
    expiresAt
  });
}));

// POST /api/auth/verify-signature - Verify signed challenge and issue JWT
router.post('/verify-signature', signatureRateLimiter, asyncHandler(async (req, res) => {
  const { publicKey, signature } = req.body;

  if (!publicKey) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Public key is required', { field: 'publicKey' });
  }
  if (!signature) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Signature is required', { field: 'signature' });
  }

  // Validate formats
  if (!/^[a-f0-9]{64}$/i.test(publicKey)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid public key format');
  }
  if (!/^[a-f0-9]{128}$/i.test(signature)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid signature format. Expected 128 hex characters.');
  }

  const normalizedPublicKey = publicKey.toLowerCase();
  const challengeKey = `challenge:${normalizedPublicKey}`;

  // Get stored challenge
  const storedData = await redisClient.get(challengeKey);
  if (!storedData) {
    throw new AppError(ErrorCode.INVALID_TOKEN, 'Challenge not found or expired. Please request a new challenge.');
  }

  const { challenge, expiresAt } = JSON.parse(storedData);

  // Check if challenge expired
  if (Date.now() > expiresAt) {
    await redisClient.del(challengeKey);
    throw new AppError(ErrorCode.EXPIRED_TOKEN, 'Challenge has expired. Please request a new challenge.');
  }

  // Verify Ed25519 signature
  const messageBytes = Buffer.from(challenge, 'hex');
  const signatureBytes = Buffer.from(signature, 'hex');
  const publicKeyBytes = Buffer.from(normalizedPublicKey, 'hex');

  const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

  if (!isValid) {
    throw new AppError(ErrorCode.INVALID_TOKEN, 'Invalid signature');
  }

  // Clear used challenge (single use)
  await redisClient.del(challengeKey);

  // Get or create user by public key
  const fingerprint = normalizedPublicKey.substring(0, 16);
  let user: any;
  let trader: any = null;
  let isTrader = false;

  try {
    user = await findUserByPublicKey(normalizedPublicKey);

    if (!user) {
      user = await createUserWithPublicKey(normalizedPublicKey, fingerprint);
    }

    trader = await findTraderByUserId(user.id);
    isTrader = trader?.status === 'active';
  } catch (dbError) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError(ErrorCode.DATABASE_ERROR, 'Service temporarily unavailable');
    }
    // Development fallback
    console.log('⚠️ Database not available, using mock user');
    const { v4: uuidv4 } = await import('uuid');
    user = {
      id: uuidv4(),
      public_key: normalizedPublicKey,
      public_key_fingerprint: fingerprint,
      display_name: null,
      avatar_url: null,
      is_admin: false,
      is_trader: false
    };
  }

  // Generate JWT token
  const tokenId = crypto.randomUUID();
  const token = jwt.sign(
    {
      jti: tokenId,
      id: user.id,
      publicKey: fingerprint,
      isTrader,
      isAdmin: user.is_admin || false
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  sendSuccess(res, {
    token,
    user: {
      id: user.id,
      publicKey: normalizedPublicKey,
      fingerprint,
      phone: user.phone || null,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      isTrader,
      isAdmin: user.is_admin || false,
      traderId: trader?.id
    }
  });
}));

// Helper to check if token is blacklisted (exported for middleware)
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const result = await redisClient.get(`blacklist:${jti}`);
  return result !== null;
}

export default router;
