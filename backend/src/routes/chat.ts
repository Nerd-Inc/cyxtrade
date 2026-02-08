/**
 * Chat Routes - E2E Encrypted Messaging
 *
 * Messages are encrypted client-side using X25519 + ChaCha20-Poly1305.
 * Server stores encrypted payloads - cannot read message content.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { io } from '../index';

const router = Router();

// Message types
export type MessageType = 'text' | 'image' | 'system' | 'payment_confirmed' | 'payment_sent';

// Encrypted message format (from client)
interface EncryptedPayload {
  nonce: string;      // Base64 encoded nonce
  ciphertext: string; // Base64 encoded ciphertext
}

// Stored message format
interface ChatMessage {
  id: string;
  tradeId: string;
  senderId: string;
  messageType: MessageType;
  encrypted: EncryptedPayload | null;  // E2E encrypted content
  content?: string;                     // Only for system messages (not E2E)
  imageUrl?: string;                    // For image messages (encrypted separately)
  createdAt: string;
  readAt?: string;
}

// In-memory message store for development
const messageStore = new Map<string, ChatMessage[]>();

/**
 * Validate encrypted payload format
 */
function isValidEncryptedPayload(payload: unknown): payload is EncryptedPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.nonce === 'string' &&
    typeof p.ciphertext === 'string' &&
    p.nonce.length > 0 &&
    p.ciphertext.length > 0
  );
}

/**
 * GET /api/chat/trades/:tradeId/messages
 * Get chat messages for a trade
 */
router.get('/trades/:tradeId/messages', asyncHandler(async (req: AuthRequest, res) => {
  const tradeId = req.params.tradeId as string;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  // TODO: Verify user is participant in this trade

  // Get messages from memory store
  const messages = messageStore.get(tradeId) || [];

  // Filter out any sensitive server-side data
  const sanitizedMessages = messages.map(msg => ({
    id: msg.id,
    tradeId: msg.tradeId,
    senderId: msg.senderId,
    messageType: msg.messageType,
    encrypted: msg.encrypted,
    content: msg.content,  // Only populated for system messages
    imageUrl: msg.imageUrl,
    createdAt: msg.createdAt,
    readAt: msg.readAt,
  }));

  sendSuccess(res, {
    messages: sanitizedMessages,
    hasMore: false,
  });
}));

/**
 * POST /api/chat/trades/:tradeId/messages
 * Send an E2E encrypted message
 */
router.post('/trades/:tradeId/messages', asyncHandler(async (req: AuthRequest, res) => {
  const tradeId = req.params.tradeId as string;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const { encrypted, messageType = 'text', content } = req.body;

  // For text messages, require encrypted payload
  if (messageType === 'text') {
    if (!encrypted) {
      throw new AppError(
        ErrorCode.MISSING_FIELD,
        'Encrypted payload required for text messages',
        { field: 'encrypted' }
      );
    }

    if (!isValidEncryptedPayload(encrypted)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid encrypted message format. Expected { nonce, ciphertext }'
      );
    }
  }

  // TODO: Verify user is participant in this trade
  // TODO: Verify trade is in a state that allows messaging

  const message: ChatMessage = {
    id: uuidv4(),
    tradeId,
    senderId: userId,
    messageType: messageType as MessageType,
    encrypted: messageType === 'text' ? encrypted : null,
    content: messageType === 'system' ? content : undefined,
    createdAt: new Date().toISOString(),
  };

  // Store message
  if (!messageStore.has(tradeId)) {
    messageStore.set(tradeId, []);
  }
  messageStore.get(tradeId)!.push(message);

  // Emit to trade room via Socket.IO
  try {
    io.to(`trade:${tradeId}`).emit('chat:message', {
      id: message.id,
      tradeId: message.tradeId,
      senderId: message.senderId,
      messageType: message.messageType,
      encrypted: message.encrypted,
      content: message.content,
      createdAt: message.createdAt,
    });
  } catch (e) {
    // Socket emit failure shouldn't fail the message send
    console.error('Socket emit error:', e);
  }

  sendSuccess(res, {
    id: message.id,
    tradeId: message.tradeId,
    senderId: message.senderId,
    messageType: message.messageType,
    encrypted: message.encrypted,
    createdAt: message.createdAt,
  });
}));

/**
 * POST /api/chat/trades/:tradeId/messages/image
 * Send an encrypted image message
 */
router.post('/trades/:tradeId/messages/image', asyncHandler(async (req: AuthRequest, res) => {
  const tradeId = req.params.tradeId as string;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const { encrypted, imageUrl } = req.body;

  // Image URL is required (uploaded separately, possibly encrypted)
  if (!imageUrl) {
    throw new AppError(
      ErrorCode.MISSING_FIELD,
      'Image URL is required',
      { field: 'imageUrl' }
    );
  }

  // Optional encrypted caption/metadata
  if (encrypted && !isValidEncryptedPayload(encrypted)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid encrypted payload format'
    );
  }

  const message: ChatMessage = {
    id: uuidv4(),
    tradeId,
    senderId: userId,
    messageType: 'image',
    encrypted: encrypted || null,
    imageUrl,
    createdAt: new Date().toISOString(),
  };

  // Store message
  if (!messageStore.has(tradeId)) {
    messageStore.set(tradeId, []);
  }
  messageStore.get(tradeId)!.push(message);

  // Emit to trade room
  try {
    io.to(`trade:${tradeId}`).emit('chat:message', {
      id: message.id,
      tradeId: message.tradeId,
      senderId: message.senderId,
      messageType: message.messageType,
      encrypted: message.encrypted,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt,
    });
  } catch (e) {
    console.error('Socket emit error:', e);
  }

  sendSuccess(res, {
    id: message.id,
    tradeId: message.tradeId,
    senderId: message.senderId,
    messageType: message.messageType,
    imageUrl: message.imageUrl,
    createdAt: message.createdAt,
  });
}));

/**
 * PUT /api/chat/trades/:tradeId/messages/read
 * Mark all messages as read
 */
router.put('/trades/:tradeId/messages/read', asyncHandler(async (req: AuthRequest, res) => {
  const tradeId = req.params.tradeId as string;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  // Mark all messages from other party as read
  const messages = messageStore.get(tradeId);
  const now = new Date().toISOString();

  if (messages) {
    messages.forEach(msg => {
      if (msg.senderId !== userId && !msg.readAt) {
        msg.readAt = now;
      }
    });
  }

  // Emit read receipt
  try {
    io.to(`trade:${tradeId}`).emit('chat:read', {
      tradeId,
      readBy: userId,
      readAt: now,
    });
  } catch (e) {
    console.error('Socket emit error:', e);
  }

  sendSuccess(res, { message: 'Messages marked as read' });
}));

/**
 * POST /api/chat/trades/:tradeId/typing
 * Send typing indicator
 */
router.post('/trades/:tradeId/typing', asyncHandler(async (req: AuthRequest, res) => {
  const tradeId = req.params.tradeId as string;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  // Emit typing event
  try {
    io.to(`trade:${tradeId}`).emit('chat:typing', {
      tradeId,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Socket emit error:', e);
  }

  sendSuccess(res, { ok: true });
}));

/**
 * POST /api/chat/trades/:tradeId/system
 * Send a system message (not E2E encrypted - visible to server)
 * Used for trade state changes, payment confirmations, etc.
 */
router.post('/trades/:tradeId/system', asyncHandler(async (req: AuthRequest, res) => {
  const tradeId = req.params.tradeId as string;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const { content, messageType = 'system' } = req.body;

  if (!content) {
    throw new AppError(
      ErrorCode.MISSING_FIELD,
      'Content is required for system messages',
      { field: 'content' }
    );
  }

  // Validate message type
  const validSystemTypes: MessageType[] = ['system', 'payment_confirmed', 'payment_sent'];
  if (!validSystemTypes.includes(messageType as MessageType)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Invalid message type. Must be one of: ${validSystemTypes.join(', ')}`
    );
  }

  const message: ChatMessage = {
    id: uuidv4(),
    tradeId,
    senderId: userId,
    messageType: messageType as MessageType,
    encrypted: null,
    content,
    createdAt: new Date().toISOString(),
  };

  // Store message
  if (!messageStore.has(tradeId)) {
    messageStore.set(tradeId, []);
  }
  messageStore.get(tradeId)!.push(message);

  // Emit to trade room
  try {
    io.to(`trade:${tradeId}`).emit('chat:message', {
      id: message.id,
      tradeId: message.tradeId,
      senderId: message.senderId,
      messageType: message.messageType,
      content: message.content,
      createdAt: message.createdAt,
    });
  } catch (e) {
    console.error('Socket emit error:', e);
  }

  sendSuccess(res, {
    id: message.id,
    tradeId: message.tradeId,
    senderId: message.senderId,
    messageType: message.messageType,
    content: message.content,
    createdAt: message.createdAt,
  });
}));

export default router;
