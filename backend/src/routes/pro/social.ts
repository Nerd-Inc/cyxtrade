import { Router } from 'express';
import { AuthRequest, authMiddleware } from '../../middleware/auth';
import {
  followTrader,
  unfollowTrader,
  isFollowingTrader,
  getFollowedTraders,
  getTraderFollowerCount,
  blockUser,
  unblockUser,
  isUserBlocked,
  getBlockedUsers,
  getTraderFeedback,
} from '../../services/p2pSocialService';
import { getTotalUnreadCount } from '../../services/p2pChatService';
import { AppError, ErrorCode } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// Helper to ensure param is string
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

// ============================================
// Trader Follows
// ============================================

// GET /api/pro/social/following - Get list of followed traders
router.get('/following', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { limit, offset } = req.query;

  const result = await getFollowedTraders(userId, {
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  sendSuccess(res, {
    following: result.follows.map((f) => ({
      id: f.id,
      traderId: f.trader_id,
      traderName: f.trader_display_name,
      traderRating: f.trader_rating,
      traderTrades: f.trader_total_trades,
      followedAt: f.created_at,
    })),
    total: result.total,
  });
}));

// POST /api/pro/social/follow/:traderId - Follow a trader
router.post('/follow/:traderId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const traderId = getParam(req.params.traderId);
  await followTrader(userId, traderId);

  sendSuccess(res, { message: 'Trader followed' }, 201);
}));

// DELETE /api/pro/social/follow/:traderId - Unfollow a trader
router.delete('/follow/:traderId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const traderId = getParam(req.params.traderId);
  await unfollowTrader(userId, traderId);

  sendSuccess(res, { message: 'Trader unfollowed' });
}));

// GET /api/pro/social/follow/:traderId/status - Check if following
router.get('/follow/:traderId/status', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const traderId = getParam(req.params.traderId);
  const isFollowing = await isFollowingTrader(userId, traderId);

  sendSuccess(res, { isFollowing });
}));

// GET /api/pro/social/traders/:traderId/followers - Get trader's follower count
router.get('/traders/:traderId/followers', asyncHandler(async (req, res) => {
  const traderId = getParam(req.params.traderId);
  const count = await getTraderFollowerCount(traderId);

  sendSuccess(res, { followerCount: count });
}));

// ============================================
// Blocked Users
// ============================================

// GET /api/pro/social/blocked - Get list of blocked users
router.get('/blocked', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { limit, offset } = req.query;

  const result = await getBlockedUsers(userId, {
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  sendSuccess(res, {
    blocked: result.blocked.map((b) => ({
      id: b.id,
      userId: b.blocked_id,
      userName: b.blocked_display_name,
      reason: b.reason,
      blockedAt: b.created_at,
    })),
    total: result.total,
  });
}));

// POST /api/pro/social/block/:userId - Block a user
router.post('/block/:userId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const blockerId = req.user?.id;
  if (!blockerId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const blockedId = getParam(req.params.userId);
  const { reason } = req.body;

  await blockUser(blockerId, blockedId, reason);

  sendSuccess(res, { message: 'User blocked' }, 201);
}));

// DELETE /api/pro/social/block/:userId - Unblock a user
router.delete('/block/:userId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const blockerId = req.user?.id;
  if (!blockerId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const blockedId = getParam(req.params.userId);
  await unblockUser(blockerId, blockedId);

  sendSuccess(res, { message: 'User unblocked' });
}));

// GET /api/pro/social/block/:userId/status - Check if user is blocked
router.get('/block/:userId/status', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const blockerId = req.user?.id;
  if (!blockerId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const blockedId = getParam(req.params.userId);
  const blocked = await isUserBlocked(blockerId, blockedId);

  sendSuccess(res, { isBlocked: blocked });
}));

// ============================================
// Trader Feedback
// ============================================

// GET /api/pro/social/traders/:traderId/feedback - Get trader's feedback
router.get('/traders/:traderId/feedback', asyncHandler(async (req, res) => {
  const traderId = getParam(req.params.traderId);
  const { rating, limit, offset } = req.query;

  const result = await getTraderFeedback(traderId, {
    rating: rating as 'positive' | 'negative' | undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  sendSuccess(res, {
    feedback: result.feedback.map((f) => ({
      id: f.id,
      orderId: f.order_id,
      orderNumber: f.order_number,
      orderAmount: f.order_total_fiat,
      orderCurrency: f.order_fiat_currency,
      fromUserId: f.from_user_id,
      fromUserName: f.from_user_display_name,
      rating: f.rating,
      comment: f.comment,
      createdAt: f.created_at,
    })),
    total: result.total,
    positive: result.positive,
    negative: result.negative,
    positiveRate: result.total > 0 ? (result.positive / result.total) * 100 : 100,
  });
}));

// ============================================
// Notifications
// ============================================

// GET /api/pro/social/unread - Get total unread message count
router.get('/unread', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const count = await getTotalUnreadCount(userId);

  sendSuccess(res, { unreadCount: count });
}));

export default router;
