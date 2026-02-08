/**
 * Bootstrap Routes - P2P Peer Discovery
 *
 * Provides initial peer list for DHT bootstrap.
 * Also handles P2P node ID registration for users.
 *
 * Flow:
 * 1. App starts, registers node ID with bootstrap server
 * 2. App requests initial peer list
 * 3. Uses peers to bootstrap Kademlia DHT
 * 4. Once DHT has peers, no longer needs bootstrap server
 */

import { Router } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';

const router = Router();

// Max peers to return
const MAX_PEERS_RESPONSE = 20;

// Peer timeout (5 minutes)
const PEER_TIMEOUT_MS = 5 * 60 * 1000;

// Peer info
interface PeerInfo {
  userId: string;
  nodeId: string;          // Hex encoded 32-byte node ID
  onionPubkey?: string;    // Hex encoded X25519 public key for onion routing
  lastSeen: string;
  address?: string;        // Optional: IP:port if known
}

// In-memory peer registry (use Redis in production)
const peerRegistry = new Map<string, PeerInfo>();

// Get active peers (seen within timeout)
function getActivePeers(): PeerInfo[] {
  const now = Date.now();
  const active: PeerInfo[] = [];

  for (const [, peer] of peerRegistry) {
    const lastSeenTime = new Date(peer.lastSeen).getTime();
    if (now - lastSeenTime < PEER_TIMEOUT_MS) {
      active.push(peer);
    }
  }

  return active;
}

// Clean up stale peers
function cleanupStalePeers(): void {
  const now = Date.now();
  const staleTimeout = PEER_TIMEOUT_MS * 2;

  for (const [userId, peer] of peerRegistry) {
    const lastSeenTime = new Date(peer.lastSeen).getTime();
    if (now - lastSeenTime > staleTimeout) {
      peerRegistry.delete(userId);
    }
  }
}

/**
 * POST /api/bootstrap/register
 * Register node ID and onion public key
 */
router.post('/register', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const { nodeId, onionPubkey } = req.body;

  if (!nodeId) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Node ID is required', { field: 'nodeId' });
  }

  // Validate node ID format (64 hex chars = 32 bytes)
  if (!/^[0-9a-fA-F]{64}$/.test(nodeId)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Node ID must be 32 bytes (64 hex chars)');
  }

  // Validate onion pubkey if provided
  if (onionPubkey && !/^[0-9a-fA-F]{64}$/.test(onionPubkey)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Onion pubkey must be 32 bytes (64 hex chars)');
  }

  // Get client IP if available
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Register peer
  const peer: PeerInfo = {
    userId,
    nodeId: nodeId.toLowerCase(),
    onionPubkey: onionPubkey?.toLowerCase(),
    lastSeen: new Date().toISOString(),
    address: typeof clientIp === 'string' ? clientIp : undefined,
  };

  peerRegistry.set(userId, peer);

  console.log(`🌐 Registered P2P peer: ${userId} (node: ${nodeId.substring(0, 8)}...)`);

  sendSuccess(res, {
    registered: true,
    nodeId: peer.nodeId,
  });
}));

/**
 * POST /api/bootstrap/heartbeat
 * Update last seen time
 */
router.post('/heartbeat', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const peer = peerRegistry.get(userId);
  if (!peer) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Peer not registered. Call /register first.');
  }

  peer.lastSeen = new Date().toISOString();
  peerRegistry.set(userId, peer);

  sendSuccess(res, { ok: true });
}));

/**
 * GET /api/bootstrap/peers
 * Get initial peer list for DHT bootstrap
 */
router.get('/peers', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  // Clean up stale peers
  cleanupStalePeers();

  // Get active peers (excluding self)
  const activePeers = getActivePeers()
    .filter(p => p.userId !== userId)
    .slice(0, MAX_PEERS_RESPONSE);

  // Format for response (don't expose internal user IDs)
  const peers = activePeers.map(p => ({
    nodeId: p.nodeId,
    onionPubkey: p.onionPubkey,
    lastSeen: p.lastSeen,
  }));

  sendSuccess(res, {
    peers,
    count: peers.length,
  });
}));

/**
 * GET /api/bootstrap/peer/:userId
 * Get specific user's peer info
 */
router.get('/peer/:userId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const requesterId = req.user?.id;
  const targetUserId = req.params.userId as string;

  if (!requesterId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const peer = peerRegistry.get(targetUserId);
  if (!peer) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'User is not registered as P2P peer');
  }

  // Check if peer is active
  const lastSeenTime = new Date(peer.lastSeen).getTime();
  const isActive = Date.now() - lastSeenTime < PEER_TIMEOUT_MS;

  sendSuccess(res, {
    nodeId: peer.nodeId,
    onionPubkey: peer.onionPubkey,
    isActive,
    lastSeen: peer.lastSeen,
  });
}));

/**
 * DELETE /api/bootstrap/unregister
 * Unregister from P2P network
 */
router.delete('/unregister', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const existed = peerRegistry.delete(userId);

  if (existed) {
    console.log(`🌐 Unregistered P2P peer: ${userId}`);
  }

  sendSuccess(res, { unregistered: existed });
}));

/**
 * GET /api/bootstrap/stats
 * Get bootstrap server statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  cleanupStalePeers();
  const activePeers = getActivePeers();

  sendSuccess(res, {
    totalRegistered: peerRegistry.size,
    activeCount: activePeers.length,
    maxPeersResponse: MAX_PEERS_RESPONSE,
    peerTimeoutMs: PEER_TIMEOUT_MS,
  });
}));

export default router;
