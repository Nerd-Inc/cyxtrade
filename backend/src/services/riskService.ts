import { query, queryOne } from './db';

// Risk levels
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskWarning {
  level: RiskLevel;
  code: string;
  message: string;
  details?: string;
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  score: number; // 0-100, higher = more risky
  warnings: RiskWarning[];
  canProceed: boolean;
  requiresConfirmation: boolean;
}

export interface BlacklistEntry {
  id: string;
  method_type: string;
  identifier: string;
  reason: string | null;
  evidence_url: string | null;
  reported_by: string | null;
  trade_id: string | null;
  created_at: Date;
}

export interface SuspiciousReport {
  tradeId: string;
  reportedBy: string;
  methodType: 'bank' | 'mobile_money' | 'cash';
  identifier: string;
  reason: string;
  evidenceUrl?: string;
}

/**
 * Check if a payment method identifier is blacklisted
 */
export async function checkBlacklist(
  methodType: string,
  identifier: string
): Promise<BlacklistEntry | null> {
  // Normalize identifier (remove spaces, dashes)
  const normalizedId = identifier.replace(/[\s\-]/g, '').toLowerCase();

  return queryOne<BlacklistEntry>(
    `SELECT * FROM payment_method_blacklist
     WHERE method_type = $1
     AND LOWER(REPLACE(REPLACE(identifier, ' ', ''), '-', '')) = $2`,
    [methodType, normalizedId]
  );
}

/**
 * Get all blacklist entries for a specific identifier pattern
 */
export async function getBlacklistMatches(
  identifier: string
): Promise<BlacklistEntry[]> {
  const normalizedId = identifier.replace(/[\s\-]/g, '').toLowerCase();

  // Check partial matches (last 6 digits for phone/account)
  const partialId = normalizedId.slice(-6);

  return query<BlacklistEntry>(
    `SELECT * FROM payment_method_blacklist
     WHERE LOWER(REPLACE(REPLACE(identifier, ' ', ''), '-', '')) = $1
     OR LOWER(REPLACE(REPLACE(identifier, ' ', ''), '-', '')) LIKE $2`,
    [normalizedId, `%${partialId}`]
  );
}

/**
 * Count disputes involving a trader
 */
export async function getTraderDisputeCount(traderId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM disputes d
     JOIN trades t ON d.trade_id = t.id
     WHERE t.trader_id = $1`,
    [traderId]
  );
  return parseInt(result?.count || '0', 10);
}

/**
 * Count disputes involving a user
 */
export async function getUserDisputeCount(userId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM disputes d
     JOIN trades t ON d.trade_id = t.id
     WHERE t.user_id = $1`,
    [userId]
  );
  return parseInt(result?.count || '0', 10);
}

/**
 * Check if a user/trader has recent failed trades
 */
export async function getRecentFailedTrades(
  id: string,
  isTrader: boolean,
  days: number = 7
): Promise<number> {
  const field = isTrader ? 't.trader_id' : 't.user_id';
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM trades t
     WHERE ${field} = $1
     AND t.status IN ('cancelled', 'disputed')
     AND t.created_at >= NOW() - INTERVAL '${days} days'`,
    [id]
  );
  return parseInt(result?.count || '0', 10);
}

/**
 * Check if this is a new account (created within last 7 days)
 */
export async function isNewAccount(userId: string): Promise<boolean> {
  const result = await queryOne<{ is_new: boolean }>(
    `SELECT created_at > NOW() - INTERVAL '7 days' as is_new
     FROM users WHERE id = $1`,
    [userId]
  );
  return result?.is_new || false;
}

/**
 * Get trader's account age in days
 */
export async function getAccountAgeDays(userId: string): Promise<number> {
  const result = await queryOne<{ days: string }>(
    `SELECT EXTRACT(DAY FROM NOW() - created_at) as days
     FROM users WHERE id = $1`,
    [userId]
  );
  return parseInt(result?.days || '0', 10);
}

/**
 * Comprehensive risk assessment for a trade
 */
export async function assessTradeRisk(params: {
  traderId: string;
  userId: string;
  paymentMethodType?: string;
  paymentIdentifier?: string;
  amount?: number;
}): Promise<RiskAssessment> {
  const warnings: RiskWarning[] = [];
  let score = 0;

  // 1. Check payment method blacklist
  if (params.paymentMethodType && params.paymentIdentifier) {
    const blacklisted = await checkBlacklist(
      params.paymentMethodType,
      params.paymentIdentifier
    );

    if (blacklisted) {
      score += 50;
      warnings.push({
        level: 'critical',
        code: 'BLACKLISTED_PAYMENT',
        message: 'This payment method has been reported for fraud',
        details: blacklisted.reason || 'Previously reported in a dispute'
      });
    }
  }

  // 2. Check trader dispute history
  const traderDisputes = await getTraderDisputeCount(params.traderId);
  if (traderDisputes > 0) {
    score += Math.min(traderDisputes * 10, 30);
    if (traderDisputes >= 3) {
      warnings.push({
        level: 'high',
        code: 'TRADER_DISPUTE_HISTORY',
        message: `Trader has ${traderDisputes} past disputes`,
        details: 'Consider verifying payment details carefully'
      });
    } else if (traderDisputes >= 1) {
      warnings.push({
        level: 'medium',
        code: 'TRADER_DISPUTE_HISTORY',
        message: `Trader has ${traderDisputes} past dispute(s)`,
        details: 'Proceed with caution'
      });
    }
  }

  // 3. Check user dispute history
  const userDisputes = await getUserDisputeCount(params.userId);
  if (userDisputes > 0) {
    score += Math.min(userDisputes * 10, 30);
    if (userDisputes >= 3) {
      warnings.push({
        level: 'high',
        code: 'USER_DISPUTE_HISTORY',
        message: `User has ${userDisputes} past disputes`,
        details: 'Consider verifying payment proof carefully'
      });
    }
  }

  // 4. Check for recent failed trades
  const traderFailedTrades = await getRecentFailedTrades(params.traderId, true);
  if (traderFailedTrades >= 3) {
    score += 15;
    warnings.push({
      level: 'medium',
      code: 'RECENT_FAILED_TRADES',
      message: `Trader has ${traderFailedTrades} cancelled trades this week`,
      details: 'Higher than normal cancellation rate'
    });
  }

  // 5. Check if new account
  const isUserNew = await isNewAccount(params.userId);
  if (isUserNew) {
    score += 10;
    warnings.push({
      level: 'low',
      code: 'NEW_ACCOUNT',
      message: 'This is a new account (less than 7 days old)',
      details: 'New accounts have limited trading history'
    });
  }

  // 6. High amount warning
  if (params.amount && params.amount > 5000) {
    score += 5;
    warnings.push({
      level: 'low',
      code: 'HIGH_AMOUNT',
      message: 'Large trade amount',
      details: 'Consider splitting into smaller trades for first-time counterparties'
    });
  }

  // Calculate overall risk level
  let overallRisk: RiskLevel;
  if (score >= 50) {
    overallRisk = 'critical';
  } else if (score >= 30) {
    overallRisk = 'high';
  } else if (score >= 15) {
    overallRisk = 'medium';
  } else {
    overallRisk = 'low';
  }

  return {
    overallRisk,
    score,
    warnings,
    canProceed: overallRisk !== 'critical',
    requiresConfirmation: overallRisk === 'high' || overallRisk === 'critical'
  };
}

/**
 * Report a suspicious payment method
 */
export async function reportSuspicious(report: SuspiciousReport): Promise<{ id: string; isNew: boolean }> {
  // Check if already blacklisted
  const existing = await checkBlacklist(report.methodType, report.identifier);

  if (existing) {
    return { id: existing.id, isNew: false };
  }

  // Add to blacklist
  const result = await query<{ id: string }>(
    `INSERT INTO payment_method_blacklist
     (method_type, identifier, reason, evidence_url, reported_by, trade_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      report.methodType,
      report.identifier,
      report.reason,
      report.evidenceUrl || null,
      report.reportedBy,
      report.tradeId
    ]
  );

  return { id: result[0].id, isNew: true };
}

/**
 * Get risk warnings for display (simplified version for frontend)
 */
export async function getQuickRiskCheck(
  traderId: string,
  userId: string
): Promise<{ hasWarnings: boolean; warnings: RiskWarning[] }> {
  const warnings: RiskWarning[] = [];

  // Quick checks without payment method
  const traderDisputes = await getTraderDisputeCount(traderId);
  if (traderDisputes >= 2) {
    warnings.push({
      level: traderDisputes >= 3 ? 'high' : 'medium',
      code: 'TRADER_DISPUTES',
      message: `${traderDisputes} past disputes`
    });
  }

  const traderFailedTrades = await getRecentFailedTrades(traderId, true);
  if (traderFailedTrades >= 3) {
    warnings.push({
      level: 'medium',
      code: 'RECENT_CANCELLATIONS',
      message: `${traderFailedTrades} cancelled this week`
    });
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings
  };
}
