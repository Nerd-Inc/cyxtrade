/**
 * Key Exchange Routes
 *
 * Handles public key registration and retrieval for E2E encryption.
 * Keys are X25519 public keys used for ECDH key agreement.
 */

import { Router } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { keyToHex, hexToKey, fromBase64, toBase64 } from '../services/crypto';

const router = Router();

// In-memory key store (replace with database in production)
const keyStore = new Map<string, {
  publicKey: string;      // Base64 encoded X25519 public key
  identityKey: string;    // Base64 encoded Ed25519 identity key (for signing)
  updatedAt: string;
  keyId: number;          // Incremented on key rotation for verification
}>();

// Per-trade session keys (ephemeral keys for each trade)
const tradeKeyStore = new Map<string, Map<string, {
  publicKey: string;      // User's public key for this trade
  createdAt: string;
}>>();

/**
 * Register or update user's public key
 * POST /api/keys/register
 */
router.post('/register', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const { publicKey, identityKey } = req.body;

  if (!publicKey) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Public key is required', { field: 'publicKey' });
  }

  // Validate key format (should be 32 bytes, Base64 encoded = 44 chars)
  try {
    const keyBytes = fromBase64(publicKey);
    if (keyBytes.length !== 32) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Public key must be 32 bytes');
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid public key format');
  }

  // Get existing key to increment keyId
  const existing = keyStore.get(userId);
  const keyId = existing ? existing.keyId + 1 : 1;

  keyStore.set(userId, {
    publicKey,
    identityKey: identityKey || '',
    updatedAt: new Date().toISOString(),
    keyId,
  });

  console.log(`🔑 Key registered for user ${userId} (keyId: ${keyId})`);

  sendSuccess(res, {
    message: 'Public key registered',
    keyId,
  });
}));

/**
 * Get a user's public key
 * GET /api/keys/:userId
 */
router.get('/:userId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const targetUserId = req.params.userId as string;

  const keyData = keyStore.get(targetUserId);

  if (!keyData) {
    throw new AppError(ErrorCode.KEY_NOT_FOUND, 'User has not registered a public key');
  }

  sendSuccess(res, {
    userId: targetUserId,
    publicKey: keyData.publicKey,
    identityKey: keyData.identityKey,
    keyId: keyData.keyId,
  });
}));

/**
 * Get my own public key
 * GET /api/keys/me
 */
router.get('/me', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const keyData = keyStore.get(userId);

  if (!keyData) {
    sendSuccess(res, {
      registered: false,
      publicKey: null,
    });
    return;
  }

  sendSuccess(res, {
    registered: true,
    publicKey: keyData.publicKey,
    identityKey: keyData.identityKey,
    keyId: keyData.keyId,
    updatedAt: keyData.updatedAt,
  });
}));

/**
 * Register ephemeral key for a specific trade
 * POST /api/keys/trade/:tradeId
 *
 * Each trade gets its own key pair for forward secrecy.
 * If trade is compromised, other trades remain secure.
 */
router.post('/trade/:tradeId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const tradeId = req.params.tradeId as string;

  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const { publicKey } = req.body;

  if (!publicKey) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Public key is required', { field: 'publicKey' });
  }

  // Validate key format
  try {
    const keyBytes = fromBase64(publicKey);
    if (keyBytes.length !== 32) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Public key must be 32 bytes');
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid public key format');
  }

  // Get or create trade key map
  if (!tradeKeyStore.has(tradeId)) {
    tradeKeyStore.set(tradeId, new Map());
  }

  const tradeKeys = tradeKeyStore.get(tradeId)!;
  tradeKeys.set(userId, {
    publicKey,
    createdAt: new Date().toISOString(),
  });

  console.log(`🔑 Trade key registered: user ${userId} for trade ${tradeId}`);

  sendSuccess(res, {
    message: 'Trade key registered',
    tradeId,
  });
}));

/**
 * Get trade keys for a specific trade
 * GET /api/keys/trade/:tradeId
 *
 * Returns all participant keys for this trade.
 */
router.get('/trade/:tradeId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const tradeId = req.params.tradeId as string;

  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const tradeKeys = tradeKeyStore.get(tradeId);

  if (!tradeKeys) {
    sendSuccess(res, {
      tradeId,
      keys: {},
    });
    return;
  }

  // Convert Map to object
  const keys: Record<string, { publicKey: string; createdAt: string }> = {};
  for (const [participantId, keyData] of tradeKeys.entries()) {
    keys[participantId] = keyData;
  }

  sendSuccess(res, {
    tradeId,
    keys,
  });
}));

/**
 * Pre-key bundle for async encryption (Signal-style)
 * POST /api/keys/prekeys
 *
 * Upload multiple one-time prekeys for offline message encryption.
 */
router.post('/prekeys', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const { prekeys } = req.body;

  if (!Array.isArray(prekeys) || prekeys.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Prekeys array is required');
  }

  // TODO: Store prekeys in database
  // For now, just acknowledge receipt

  console.log(`🔑 Received ${prekeys.length} prekeys from user ${userId}`);

  sendSuccess(res, {
    message: 'Prekeys uploaded',
    count: prekeys.length,
  });
}));

export default router;
