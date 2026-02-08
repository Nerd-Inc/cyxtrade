/**
 * Relay Routes - Offline Message Queue
 *
 * Stores encrypted messages for offline delivery when P2P is unavailable.
 * Messages are E2E encrypted - server cannot read content.
 *
 * Flow:
 * 1. User A tries P2P delivery to User B
 * 2. P2P fails (User B offline or NAT issues)
 * 3. User A posts message to relay queue
 * 4. User B comes online, fetches pending messages
 * 5. Messages are deleted after delivery
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';

const router = Router();

// Offline message TTL (72 hours)
const MESSAGE_TTL_MS = 72 * 60 * 60 * 1000;

// Max messages per user
const MAX_MESSAGES_PER_USER = 100;

// Max total message size per user (1MB)
const MAX_TOTAL_SIZE_PER_USER = 1024 * 1024;

// Offline message format
interface OfflineMessage {
  id: string;
  senderId: string;
  tradeId: string;
  encrypted: {
    nonce: string;
    ciphertext: string;
  };
  createdAt: string;
  expiresAt: string;
  size: number;
}

// In-memory message queue (use Redis in production)
const messageQueue = new Map<string, OfflineMessage[]>();

// Get user's total message size
function getUserTotalSize(userId: string): number {
  const messages = messageQueue.get(userId) || [];
  return messages.reduce((sum, msg) => sum + msg.size, 0);
}

// Clean up expired messages
function cleanupExpiredMessages(userId: string): void {
  const messages = messageQueue.get(userId);
  if (!messages) return;

  const now = new Date();
  const validMessages = messages.filter(msg => new Date(msg.expiresAt) > now);

  if (validMessages.length === 0) {
    messageQueue.delete(userId);
  } else {
    messageQueue.set(userId, validMessages);
  }
}

/**
 * POST /api/relay/queue
 * Queue a message for offline delivery
 */
router.post('/queue', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const senderId = req.user?.id;
  if (!senderId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const { recipientId, tradeId, encrypted } = req.body;

  // Validate required fields
  if (!recipientId) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Recipient ID is required', { field: 'recipientId' });
  }
  if (!tradeId) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Trade ID is required', { field: 'tradeId' });
  }
  if (!encrypted || !encrypted.nonce || !encrypted.ciphertext) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Encrypted payload is required', { field: 'encrypted' });
  }

  // Calculate message size
  const messageSize = JSON.stringify(encrypted).length;

  // Clean up expired messages first
  cleanupExpiredMessages(recipientId);

  // Check limits
  const existingMessages = messageQueue.get(recipientId) || [];
  if (existingMessages.length >= MAX_MESSAGES_PER_USER) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Recipient message queue is full');
  }

  const totalSize = getUserTotalSize(recipientId);
  if (totalSize + messageSize > MAX_TOTAL_SIZE_PER_USER) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Recipient message queue size limit exceeded');
  }

  // Create message
  const now = new Date();
  const message: OfflineMessage = {
    id: uuidv4(),
    senderId,
    tradeId,
    encrypted,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + MESSAGE_TTL_MS).toISOString(),
    size: messageSize,
  };

  // Add to queue
  existingMessages.push(message);
  messageQueue.set(recipientId, existingMessages);

  console.log(`📬 Queued message for ${recipientId} from ${senderId} (trade: ${tradeId})`);

  sendSuccess(res, {
    queued: true,
    messageId: message.id,
    expiresAt: message.expiresAt,
  });
}));

/**
 * GET /api/relay/pending
 * Get pending messages for current user
 */
router.get('/pending', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  // Clean up expired messages
  cleanupExpiredMessages(userId);

  // Get pending messages
  const messages = messageQueue.get(userId) || [];

  // Format for response (exclude internal fields)
  const pendingMessages = messages.map(msg => ({
    id: msg.id,
    senderId: msg.senderId,
    tradeId: msg.tradeId,
    encrypted: msg.encrypted,
    createdAt: msg.createdAt,
  }));

  sendSuccess(res, {
    messages: pendingMessages,
    count: pendingMessages.length,
  });
}));

/**
 * DELETE /api/relay/pending/:messageId
 * Acknowledge message delivery (delete from queue)
 */
router.delete('/pending/:messageId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const messageId = req.params.messageId as string;

  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const messages = messageQueue.get(userId);
  if (!messages) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Message not found');
  }

  const index = messages.findIndex(m => m.id === messageId);
  if (index === -1) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Message not found');
  }

  // Remove message
  messages.splice(index, 1);

  if (messages.length === 0) {
    messageQueue.delete(userId);
  } else {
    messageQueue.set(userId, messages);
  }

  console.log(`📭 Delivered message ${messageId} to ${userId}`);

  sendSuccess(res, { deleted: true });
}));

/**
 * DELETE /api/relay/pending
 * Acknowledge all messages (clear queue)
 */
router.delete('/pending', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const count = (messageQueue.get(userId) || []).length;
  messageQueue.delete(userId);

  console.log(`📭 Cleared ${count} messages for ${userId}`);

  sendSuccess(res, { deleted: count });
}));

/**
 * GET /api/relay/status
 * Get relay queue status for current user
 */
router.get('/status', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  // Clean up expired messages
  cleanupExpiredMessages(userId);

  const messages = messageQueue.get(userId) || [];
  const totalSize = messages.reduce((sum, msg) => sum + msg.size, 0);

  sendSuccess(res, {
    pendingCount: messages.length,
    totalSize,
    maxMessages: MAX_MESSAGES_PER_USER,
    maxSize: MAX_TOTAL_SIZE_PER_USER,
    ttlHours: MESSAGE_TTL_MS / (60 * 60 * 1000),
  });
}));

export default router;
