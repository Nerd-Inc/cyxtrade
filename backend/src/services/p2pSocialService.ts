import { query, queryOne } from './db';
import { AppError, ErrorCode } from '../utils/errors';

// ============================================
// Trader Follows
// ============================================

export interface TraderFollow {
  id: string;
  follower_id: string;
  trader_id: string;
  created_at: Date;
  // Joined fields
  trader_display_name?: string;
  trader_rating?: number;
  trader_total_trades?: number;
}

export async function followTrader(userId: string, traderId: string): Promise<TraderFollow> {
  // Verify trader exists
  const traderResult = await queryOne(
    `SELECT t.id, t.user_id FROM traders t WHERE t.id = $1 AND t.status = 'active'`,
    [traderId]
  );
  if (!traderResult) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found');
  }

  // Cannot follow yourself
  if ((traderResult as any).user_id === userId) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot follow yourself');
  }

  const rows = await query<TraderFollow>(
    `INSERT INTO trader_follows (follower_id, trader_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, trader_id) DO NOTHING
     RETURNING *`,
    [userId, traderId]
  );

  // If already following, return existing
  if (!rows[0]) {
    const existing = await queryOne<TraderFollow>(
      `SELECT * FROM trader_follows WHERE follower_id = $1 AND trader_id = $2`,
      [userId, traderId]
    );
    if (existing) return existing;
  }

  return rows[0];
}

export async function unfollowTrader(userId: string, traderId: string): Promise<void> {
  await query(
    `DELETE FROM trader_follows WHERE follower_id = $1 AND trader_id = $2`,
    [userId, traderId]
  );
}

export async function isFollowingTrader(userId: string, traderId: string): Promise<boolean> {
  const result = await queryOne(
    `SELECT 1 FROM trader_follows WHERE follower_id = $1 AND trader_id = $2`,
    [userId, traderId]
  );
  return !!result;
}

export async function getFollowedTraders(
  userId: string,
  options: { limit?: number; offset?: number }
): Promise<{ follows: TraderFollow[]; total: number }> {
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM trader_follows WHERE follower_id = $1`,
    [userId]
  );
  const total = parseInt(countResult?.count || '0', 10);

  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const follows = await query<TraderFollow>(
    `SELECT tf.*, u.display_name as trader_display_name, t.rating as trader_rating, t.total_trades as trader_total_trades
     FROM trader_follows tf
     JOIN traders t ON tf.trader_id = t.id
     JOIN users u ON t.user_id = u.id
     WHERE tf.follower_id = $1
     ORDER BY tf.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return { follows, total };
}

export async function getTraderFollowerCount(traderId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM trader_follows WHERE trader_id = $1`,
    [traderId]
  );
  return parseInt(result?.count || '0', 10);
}

// ============================================
// Blocked Users
// ============================================

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: Date;
  // Joined fields
  blocked_display_name?: string;
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
  reason?: string
): Promise<BlockedUser> {
  // Cannot block yourself
  if (blockerId === blockedId) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot block yourself');
  }

  // Verify user exists
  const userResult = await queryOne('SELECT id FROM users WHERE id = $1', [blockedId]);
  if (!userResult) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'User not found');
  }

  const rows = await query<BlockedUser>(
    `INSERT INTO blocked_users (blocker_id, blocked_id, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET reason = $3
     RETURNING *`,
    [blockerId, blockedId, reason || null]
  );

  return rows[0];
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await query(
    `DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, blockedId]
  );
}

export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const result = await queryOne(
    `SELECT 1 FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, blockedId]
  );
  return !!result;
}

export async function getBlockedUsers(
  userId: string,
  options: { limit?: number; offset?: number }
): Promise<{ blocked: BlockedUser[]; total: number }> {
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM blocked_users WHERE blocker_id = $1`,
    [userId]
  );
  const total = parseInt(countResult?.count || '0', 10);

  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const blocked = await query<BlockedUser>(
    `SELECT b.*, u.display_name as blocked_display_name
     FROM blocked_users b
     JOIN users u ON b.blocked_id = u.id
     WHERE b.blocker_id = $1
     ORDER BY b.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return { blocked, total };
}

// ============================================
// Feedback (Unified)
// ============================================

export interface P2PFeedback {
  id: string;
  order_id: string;
  from_user_id: string;
  to_trader_id: string;
  rating: 'positive' | 'negative';
  rating_value: number;
  comment: string | null;
  created_at: Date;
  // Joined fields
  from_user_display_name?: string;
  order_number?: string;
  order_total_fiat?: number;
  order_fiat_currency?: string;
}

export async function submitFeedback(
  userId: string,
  orderId: string,
  rating: 'positive' | 'negative',
  comment?: string
): Promise<P2PFeedback> {
  // Verify order exists and user is the buyer
  const orderResult = await queryOne<{
    id: string;
    user_id: string;
    trader_id: string;
    status: string;
  }>(
    `SELECT id, user_id, trader_id, status FROM orders WHERE id = $1`,
    [orderId]
  );

  if (!orderResult) {
    throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
  }

  if (orderResult.user_id !== userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Only the buyer can leave feedback');
  }

  if (orderResult.status !== 'completed') {
    throw new AppError(ErrorCode.INVALID_ORDER_STATE, 'Can only leave feedback for completed orders');
  }

  // Convert positive/negative to rating value (1 for positive, 0 for negative)
  const ratingValue = rating === 'positive' ? 1 : 0;

  const rows = await query<P2PFeedback>(
    `INSERT INTO feedback (order_id, from_user_id, to_trader_id, rating_type, rating_value, comment)
     VALUES ($1, $2, $3, 'binary', $4, $5)
     ON CONFLICT (order_id, from_user_id) DO UPDATE SET rating_value = $4, comment = $5
     RETURNING *`,
    [orderId, userId, orderResult.trader_id, ratingValue, comment || null]
  );

  // Update trader feedback counts
  await updateTraderFeedbackCounts(orderResult.trader_id);

  // Add rating field for backward compatibility
  const result = rows[0] as any;
  result.rating = rating;

  return result;
}

export async function getTraderFeedback(
  traderId: string,
  options: { rating?: 'positive' | 'negative'; limit?: number; offset?: number }
): Promise<{ feedback: P2PFeedback[]; total: number; positive: number; negative: number }> {
  const conditions: string[] = ['f.to_trader_id = $1', "f.rating_type = 'binary'"];
  const values: any[] = [traderId];
  let paramIndex = 2;

  if (options.rating) {
    const ratingValue = options.rating === 'positive' ? 1 : 0;
    conditions.push(`f.rating_value = $${paramIndex++}`);
    values.push(ratingValue);
  }

  const whereClause = conditions.join(' AND ');

  // Get counts
  const countResult = await queryOne<{
    total: string;
    positive: string;
    negative: string;
  }>(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE rating_value = 1) as positive,
       COUNT(*) FILTER (WHERE rating_value = 0) as negative
     FROM feedback
     WHERE to_trader_id = $1 AND rating_type = 'binary'`,
    [traderId]
  );

  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const feedback = await query<P2PFeedback>(
    `SELECT f.*, u.display_name as from_user_display_name,
            o.order_number, o.send_amount as order_total_fiat, o.send_currency as order_fiat_currency
     FROM feedback f
     JOIN users u ON f.from_user_id = u.id
     JOIN orders o ON f.order_id = o.id
     WHERE ${whereClause}
     ORDER BY f.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  // Add rating field for backward compatibility
  const feedbackWithRating = feedback.map(f => ({
    ...f,
    rating: (f as any).rating_value === 1 ? 'positive' : 'negative'
  })) as P2PFeedback[];

  return {
    feedback: feedbackWithRating,
    total: parseInt(countResult?.total || '0', 10),
    positive: parseInt(countResult?.positive || '0', 10),
    negative: parseInt(countResult?.negative || '0', 10),
  };
}

export async function hasUserLeftFeedback(userId: string, orderId: string): Promise<boolean> {
  const result = await queryOne(
    `SELECT 1 FROM feedback WHERE from_user_id = $1 AND order_id = $2`,
    [userId, orderId]
  );
  return !!result;
}

async function updateTraderFeedbackCounts(traderId: string): Promise<void> {
  await query(
    `UPDATE traders
     SET positive_feedback = (
           SELECT COUNT(*) FROM feedback WHERE to_trader_id = $1 AND rating_type = 'binary' AND rating_value = 1
         ),
         negative_feedback = (
           SELECT COUNT(*) FROM feedback WHERE to_trader_id = $1 AND rating_type = 'binary' AND rating_value = 0
         ),
         updated_at = NOW()
     WHERE id = $1`,
    [traderId]
  );
}
