import { query, queryOne, transaction } from './db';
import { setUserAsTrader } from './userService';

export interface Corridor {
  from: string;
  to: string;
  buyRate: number;
  sellRate: number;
}

export interface Trader {
  id: string;
  user_id: string;
  wallet_address: string | null;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  bond_amount: number;
  bond_locked: number;
  corridors: Corridor[];
  rating: number;
  total_trades: number;
  completed_trades: number;
  is_online: boolean;
  approved_at: Date | null;
  approved_by: string | null;
  created_at: Date;
  updated_at: Date;
  // Scorecard fields
  avg_release_time_mins: number | null;
  avg_pay_time_mins: number | null;
  positive_feedback: number;
  negative_feedback: number;
  trades_30d: number;
  completion_rate_30d: number | null;
  total_volume: number;
  // Joined fields
  display_name?: string;
  phone?: string;
}

export interface TraderScorecard {
  traderId: string;
  displayName: string;
  rating: number;
  totalTrades: number;
  completedTrades: number;
  completionRate: number;
  avgReleaseTimeMins: number | null;
  avgPayTimeMins: number | null;
  positiveFeedback: number;
  negativeFeedback: number;
  feedbackScore: number; // percentage positive
  trades30d: number;
  completionRate30d: number | null;
  totalVolume: number;
  memberSince: Date;
  isVerified: boolean;
  trustIndicators: string[];
}

export async function findTraderById(id: string): Promise<Trader | null> {
  return queryOne<Trader>(
    `SELECT t.id, t.user_id, t.wallet_address, t.status, t.bond_amount, t.bond_locked,
            t.corridors, t.rating, t.total_trades, t.is_online, t.approved_at,
            t.approved_by, t.created_at, t.updated_at,
            COALESCE(t.completed_trades, t.total_trades) as completed_trades,
            t.avg_release_time_mins, t.avg_pay_time_mins,
            COALESCE(t.positive_feedback, 0) as positive_feedback,
            COALESCE(t.negative_feedback, 0) as negative_feedback,
            COALESCE(t.trades_30d, 0) as trades_30d,
            t.completion_rate_30d,
            COALESCE(t.total_volume, 0) as total_volume,
            u.display_name, u.phone
     FROM traders t
     JOIN users u ON t.user_id = u.id
     WHERE t.id = $1`,
    [id]
  );
}

export async function findTraderByUserId(userId: string): Promise<Trader | null> {
  return queryOne<Trader>(
    `SELECT t.*, u.display_name, u.phone
     FROM traders t
     JOIN users u ON t.user_id = u.id
     WHERE t.user_id = $1`,
    [userId]
  );
}

export async function listTraders(options: {
  from?: string;
  to?: string;
  online?: boolean;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ traders: Trader[]; total: number }> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Only show active traders by default
  conditions.push(`t.status = $${paramIndex++}`);
  values.push(options.status || 'active');

  if (options.online !== undefined) {
    conditions.push(`t.is_online = $${paramIndex++}`);
    values.push(options.online);
  }

  if (options.from && options.to) {
    conditions.push(`t.corridors @> $${paramIndex++}::jsonb`);
    values.push(JSON.stringify([{ from: options.from, to: options.to }]));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM traders t ${whereClause}`,
    values
  );
  const total = parseInt(countResult[0]?.count || '0', 10);

  // Get traders with pagination
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const traders = await query<Trader>(
    `SELECT t.id, t.user_id, t.wallet_address, t.status, t.bond_amount, t.bond_locked,
            t.corridors, t.rating, t.total_trades, t.is_online, t.approved_at,
            t.approved_by, t.created_at, t.updated_at,
            COALESCE(t.completed_trades, t.total_trades) as completed_trades,
            t.avg_release_time_mins, t.avg_pay_time_mins,
            COALESCE(t.positive_feedback, 0) as positive_feedback,
            COALESCE(t.negative_feedback, 0) as negative_feedback,
            COALESCE(t.trades_30d, 0) as trades_30d,
            t.completion_rate_30d,
            COALESCE(t.total_volume, 0) as total_volume,
            u.display_name, u.phone
     FROM traders t
     JOIN users u ON t.user_id = u.id
     ${whereClause}
     ORDER BY t.rating DESC, t.total_trades DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return { traders, total };
}

export async function createTraderApplication(
  userId: string,
  corridors: Corridor[]
): Promise<Trader> {
  const rows = await query<Trader>(
    `INSERT INTO traders (user_id, corridors, status)
     VALUES ($1, $2, 'pending')
     RETURNING *`,
    [userId, JSON.stringify(corridors)]
  );
  return rows[0];
}

export async function updateTraderWalletAddress(
  traderId: string,
  walletAddress: string
): Promise<Trader | null> {
  const rows = await query<Trader>(
    `UPDATE traders
     SET wallet_address = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [traderId, walletAddress]
  );
  return rows[0] || null;
}

export async function approveTrader(
  traderId: string,
  approvedBy: string
): Promise<Trader | null> {
  return transaction(async (client) => {
    // Update trader status
    const result = await client.query(
      `UPDATE traders
       SET status = 'active', approved_at = NOW(), approved_by = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [traderId, approvedBy]
    );
    const trader = result.rows[0];

    if (trader) {
      // Mark user as trader
      await client.query(
        `UPDATE users SET is_trader = TRUE, updated_at = NOW() WHERE id = $1`,
        [trader.user_id]
      );
    }

    return trader;
  });
}

export async function rejectTrader(traderId: string, reason?: string): Promise<Trader | null> {
  const rows = await query<Trader>(
    `UPDATE traders
     SET status = 'rejected', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [traderId]
  );
  return rows[0] || null;
}

export async function updateTraderStatus(
  traderId: string,
  isOnline: boolean
): Promise<Trader | null> {
  const rows = await query<Trader>(
    `UPDATE traders
     SET is_online = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [traderId, isOnline]
  );
  return rows[0] || null;
}

export async function updateTraderCorridors(
  traderId: string,
  corridors: Corridor[]
): Promise<Trader | null> {
  const rows = await query<Trader>(
    `UPDATE traders
     SET corridors = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [traderId, JSON.stringify(corridors)]
  );
  return rows[0] || null;
}

export async function updateTraderBond(
  traderId: string,
  amount: number,
  type: 'deposit' | 'withdrawal' | 'lock' | 'unlock' | 'forfeit'
): Promise<Trader | null> {
  let updateField: string;

  switch (type) {
    case 'deposit':
      updateField = 'bond_amount = bond_amount + $2';
      break;
    case 'withdrawal':
      updateField = 'bond_amount = bond_amount - $2';
      break;
    case 'lock':
      updateField = 'bond_locked = bond_locked + $2';
      break;
    case 'unlock':
      updateField = 'bond_locked = bond_locked - $2';
      break;
    case 'forfeit':
      updateField = 'bond_amount = bond_amount - $2, bond_locked = bond_locked - $2';
      break;
  }

  const rows = await query<Trader>(
    `UPDATE traders
     SET ${updateField}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [traderId, amount]
  );
  return rows[0] || null;
}

export async function updateTraderRating(traderId: string): Promise<void> {
  await query(
    `UPDATE traders t
     SET rating = (
       SELECT COALESCE(AVG(r.rating), 0)
       FROM ratings r
       WHERE r.to_trader_id = t.id
     ),
     total_trades = (
       SELECT COUNT(*)
       FROM trades tr
       WHERE tr.trader_id = t.id AND tr.status = 'completed'
     ),
     updated_at = NOW()
     WHERE t.id = $1`,
    [traderId]
  );
}

/**
 * Update trader's average release time (called when trader releases funds)
 */
export async function updateTraderReleaseTime(traderId: string): Promise<void> {
  await query(
    `UPDATE traders t
     SET avg_release_time_mins = (
       SELECT COALESCE(
         AVG(EXTRACT(EPOCH FROM (tr.delivered_at - tr.paid_at)) / 60),
         NULL
       )
       FROM trades tr
       WHERE tr.trader_id = t.id
         AND tr.status = 'completed'
         AND tr.paid_at IS NOT NULL
         AND tr.delivered_at IS NOT NULL
     ),
     updated_at = NOW()
     WHERE t.id = $1`,
    [traderId]
  );
}

/**
 * Update all trader stats (30d metrics, completion rate, volume)
 */
export async function updateTraderStats(traderId: string): Promise<void> {
  await query(
    `UPDATE traders t
     SET
       -- Total completed trades
       completed_trades = (
         SELECT COUNT(*)
         FROM trades tr
         WHERE tr.trader_id = t.id AND tr.status = 'completed'
       ),
       -- Trades in last 30 days
       trades_30d = (
         SELECT COUNT(*)
         FROM trades tr
         WHERE tr.trader_id = t.id
           AND tr.status = 'completed'
           AND tr.completed_at >= NOW() - INTERVAL '30 days'
       ),
       -- Completion rate in last 30 days
       completion_rate_30d = (
         SELECT
           CASE
             WHEN COUNT(*) = 0 THEN NULL
             ELSE (COUNT(*) FILTER (WHERE tr.status = 'completed')::DECIMAL / COUNT(*) * 100)
           END
         FROM trades tr
         WHERE tr.trader_id = t.id
           AND tr.created_at >= NOW() - INTERVAL '30 days'
           AND tr.status IN ('completed', 'cancelled', 'disputed')
       ),
       -- Total volume
       total_volume = (
         SELECT COALESCE(SUM(tr.send_amount), 0)
         FROM trades tr
         WHERE tr.trader_id = t.id AND tr.status = 'completed'
       ),
       updated_at = NOW()
     WHERE t.id = $1`,
    [traderId]
  );
}

/**
 * Get detailed trader scorecard
 */
export async function getTraderScorecard(traderId: string): Promise<TraderScorecard | null> {
  const trader = await findTraderById(traderId);
  if (!trader) return null;

  const totalFeedback = trader.positive_feedback + trader.negative_feedback;
  const feedbackScore = totalFeedback > 0
    ? Math.round((trader.positive_feedback / totalFeedback) * 100)
    : 100;

  const completionRate = trader.total_trades > 0
    ? Math.round((trader.completed_trades / trader.total_trades) * 100)
    : 100;

  // Calculate trust indicators
  const trustIndicators: string[] = [];

  // Verified trader (approved)
  if (trader.approved_at) {
    trustIndicators.push('verified');
  }

  // Active for 6+ months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  if (trader.created_at && new Date(trader.created_at) < sixMonthsAgo) {
    trustIndicators.push('6_months_active');
  }

  // 10+ positive reviews
  if (trader.positive_feedback >= 10) {
    trustIndicators.push('10_positive_reviews');
  }

  // High completion rate
  if (completionRate >= 95 && trader.total_trades >= 10) {
    trustIndicators.push('high_completion');
  }

  // Fast release time (under 10 mins average)
  if (trader.avg_release_time_mins !== null && trader.avg_release_time_mins < 10) {
    trustIndicators.push('fast_release');
  }

  return {
    traderId: trader.id,
    displayName: trader.display_name || 'Unknown',
    rating: trader.rating,
    totalTrades: trader.total_trades,
    completedTrades: trader.completed_trades || 0,
    completionRate,
    avgReleaseTimeMins: trader.avg_release_time_mins,
    avgPayTimeMins: trader.avg_pay_time_mins,
    positiveFeedback: trader.positive_feedback || 0,
    negativeFeedback: trader.negative_feedback || 0,
    feedbackScore,
    trades30d: trader.trades_30d || 0,
    completionRate30d: trader.completion_rate_30d,
    totalVolume: trader.total_volume || 0,
    memberSince: trader.created_at,
    isVerified: !!trader.approved_at,
    trustIndicators
  };
}
