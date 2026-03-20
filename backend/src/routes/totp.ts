/**
 * TOTP Routes
 * Two-factor authentication setup, verification, and management
 */

import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import {
  generateSecret,
  generateQRCode,
  verifyToken,
  encryptTotpSecret,
  decryptTotpSecret,
  generateBackupCodes,
  saveBackupCodes,
  verifyBackupCode,
  getBackupCodeCount,
  recordVerification,
  hasValidVerification,
} from '../services/totpService';
import {
  findUserById,
  setTotpSecret,
  enableTotp,
  disableTotp,
  getTotpSecret,
} from '../services/userService';

const router = Router();

// Temporary storage for setup secrets (expires after 10 minutes)
// In production, use Redis instead
const pendingSetups = new Map<string, { secret: string; expiresAt: number }>();

// Clean up expired setups periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, setup] of pendingSetups.entries()) {
    if (setup.expiresAt < now) {
      pendingSetups.delete(userId);
    }
  }
}, 60000); // Every minute

/**
 * GET /api/totp/status
 * Check if TOTP is enabled for current user
 */
router.get('/status', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, 'Not authenticated');
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  const backupCodesRemaining = user.totp_enabled
    ? await getBackupCodeCount(userId)
    : 0;

  sendSuccess(res, {
    enabled: user.totp_enabled,
    enabledAt: user.totp_enabled_at,
    backupCodesRemaining,
  });
}));

/**
 * POST /api/totp/setup
 * Start TOTP setup - generates secret and QR code
 */
router.post('/setup', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, 'Not authenticated');
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  if (user.totp_enabled) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'TOTP is already enabled');
  }

  // Generate new secret
  const secret = generateSecret();

  // Store temporarily (10 minute expiry)
  pendingSetups.set(userId, {
    secret,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Generate QR code
  const label = user.username || user.display_name || `user_${user.id.slice(0, 8)}`;
  const qrCodeUrl = await generateQRCode(secret, label);

  sendSuccess(res, {
    qrCodeUrl,
    secret, // Allow manual entry
  });
}));

/**
 * POST /api/totp/verify-setup
 * Complete TOTP setup by verifying first code
 */
router.post('/verify-setup', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, 'Not authenticated');
  }

  const { code } = req.body as { code?: string };

  if (!code || typeof code !== 'string' || code.length !== 6) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid verification code');
  }

  // Get pending setup
  const pending = pendingSetups.get(userId);
  if (!pending || pending.expiresAt < Date.now()) {
    pendingSetups.delete(userId);
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Setup expired. Please start again.');
  }

  // Verify the code
  if (!verifyToken(pending.secret, code)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid code. Please try again.');
  }

  // Encrypt and save secret
  const encryptedSecret = encryptTotpSecret(pending.secret, userId);
  await setTotpSecret(userId, encryptedSecret);

  // Enable TOTP
  await enableTotp(userId);

  // Generate backup codes
  const backupCodes = generateBackupCodes();
  await saveBackupCodes(userId, backupCodes);

  // Clean up pending setup
  pendingSetups.delete(userId);

  sendSuccess(res, {
    enabled: true,
    backupCodes, // Only shown once!
  });
}));

/**
 * POST /api/totp/verify
 * Verify TOTP code for sensitive operations
 */
router.post('/verify', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, 'Not authenticated');
  }

  const { code, operation = 'general' } = req.body as {
    code?: string;
    operation?: string;
  };

  if (!code || typeof code !== 'string') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Code is required');
  }

  const user = await findUserById(userId);
  if (!user || !user.totp_enabled) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'TOTP is not enabled');
  }

  // Get and decrypt secret
  const encryptedSecret = await getTotpSecret(userId);
  if (!encryptedSecret) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'TOTP configuration error');
  }

  const secret = decryptTotpSecret(encryptedSecret, userId);

  // Try TOTP code first (6 digits)
  if (code.length === 6 && /^\d+$/.test(code)) {
    if (verifyToken(secret, code)) {
      // Record verification for operation
      await recordVerification(
        userId,
        operation,
        req.ip,
        req.get('user-agent')
      );

      sendSuccess(res, { valid: true });
      return;
    }
  }

  // Try backup code (8 chars)
  if (code.length === 8) {
    if (await verifyBackupCode(userId, code)) {
      await recordVerification(
        userId,
        operation,
        req.ip,
        req.get('user-agent')
      );

      sendSuccess(res, { valid: true, usedBackupCode: true });
      return;
    }
  }

  throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid code');
}));

/**
 * DELETE /api/totp
 * Disable TOTP (requires verification)
 */
router.delete('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, 'Not authenticated');
  }

  const { code } = req.body as { code?: string };

  if (!code || typeof code !== 'string') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Verification code is required');
  }

  const user = await findUserById(userId);
  if (!user || !user.totp_enabled) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'TOTP is not enabled');
  }

  // Get and decrypt secret
  const encryptedSecret = await getTotpSecret(userId);
  if (!encryptedSecret) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'TOTP configuration error');
  }

  const secret = decryptTotpSecret(encryptedSecret, userId);

  // Verify the code
  let verified = false;

  if (code.length === 6 && /^\d+$/.test(code)) {
    verified = verifyToken(secret, code);
  } else if (code.length === 8) {
    verified = await verifyBackupCode(userId, code);
  }

  if (!verified) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid code');
  }

  // Disable TOTP
  await disableTotp(userId);

  sendSuccess(res, { disabled: true });
}));

/**
 * POST /api/totp/backup-codes/regenerate
 * Generate new backup codes (requires verification)
 */
router.post('/backup-codes/regenerate', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, 'Not authenticated');
  }

  const { code } = req.body as { code?: string };

  if (!code || typeof code !== 'string') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Verification code is required');
  }

  const user = await findUserById(userId);
  if (!user || !user.totp_enabled) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'TOTP is not enabled');
  }

  // Get and decrypt secret
  const encryptedSecret = await getTotpSecret(userId);
  if (!encryptedSecret) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'TOTP configuration error');
  }

  const secret = decryptTotpSecret(encryptedSecret, userId);

  // Verify the code (only TOTP, not backup code for this operation)
  if (code.length !== 6 || !/^\d+$/.test(code) || !verifyToken(secret, code)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid TOTP code');
  }

  // Generate new backup codes
  const backupCodes = generateBackupCodes();
  await saveBackupCodes(userId, backupCodes);

  sendSuccess(res, { backupCodes });
}));

/**
 * GET /api/totp/check-verification/:operation
 * Check if user has valid verification for an operation
 */
router.get('/check-verification/:operation', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, 'Not authenticated');
  }

  const operation = Array.isArray(req.params.operation)
    ? req.params.operation[0]
    : req.params.operation;

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  // If TOTP not enabled, always valid
  if (!user.totp_enabled) {
    sendSuccess(res, { requiresVerification: false, hasValidVerification: true });
    return;
  }

  const hasValid = await hasValidVerification(userId, operation);

  sendSuccess(res, {
    requiresVerification: true,
    hasValidVerification: hasValid,
  });
}));

export default router;
