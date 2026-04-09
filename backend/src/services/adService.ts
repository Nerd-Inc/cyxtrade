import { query, queryOne, transaction } from './db';
import { AppError, ErrorCode } from '../utils/errors';

export interface Ad {
  id: string;
  trader_id: string;
  type: 'buy' | 'sell';
  asset: string;
  fiat_currency: string;
  price_type: 'fixed' | 'floating';
  price: number;
  floating_margin: number | null;
  total_amount: number;
  available_amount: number;
  min_limit: number;
  max_limit: number;
  payment_time_limit: number;
  terms_tags: string[] | null;
  terms: string | null;
  auto_reply: string | null;
  remarks: string | null;
  status: 'online' | 'offline' | 'closed';
  is_promoted: boolean;
  promoted_until: Date | null;
  region_restrictions: string[] | null;
  counterparty_conditions: CounterpartyConditions | null;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
  // Joined fields
  trader_display_name?: string;
  trader_rating?: number;
  trader_total_trades?: number;
  trader_completion_rate?: number;
  payment_methods?: AdPaymentMethod[];
}

export interface CounterpartyConditions {
  minTrades?: number;
  minCompletionRate?: number;
  kycRequired?: boolean;
}

export interface AdPaymentMethod {
  id: string;
  ad_id: string;
  payment_method_id: string;
  is_recommended: boolean;
  // Joined from trader_payment_methods
  method_type?: string;
  provider?: string;
  account_holder_name?: string;
}

export interface CreateAdDTO {
  type: 'buy' | 'sell';
  asset?: string;
  fiat_currency: string;
  price_type?: 'fixed' | 'floating';
  price: number;
  floating_margin?: number;
  total_amount: number;
  min_limit: number;
  max_limit: number;
  payment_time_limit?: number;
  terms_tags?: string[];
  terms?: string;
  auto_reply?: string;
  remarks?: string;
  region_restrictions?: string[];
  counterparty_conditions?: CounterpartyConditions;
  payment_method_ids: string[];
}

export interface ListAdsOptions {
  type?: 'buy' | 'sell';
  asset?: string;
  fiat_currency?: string;
  status?: 'online' | 'offline' | 'closed';
  trader_id?: string;
  min_amount?: number;
  max_amount?: number;
  payment_method?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'price' | 'rating' | 'trades' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// ============================================
// Ad CRUD Operations
// ============================================

export async function createAd(traderId: string, data: CreateAdDTO): Promise<Ad> {
  return transaction(async (client) => {
    // Validate trader exists and is active
    const traderResult = await client.query(
      'SELECT id, status FROM traders WHERE id = $1',
      [traderId]
    );
    if (!traderResult.rows[0]) {
      throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found');
    }
    if (traderResult.rows[0].status !== 'active') {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Trader is not active');
    }

    // Validate payment methods belong to trader
    if (data.payment_method_ids.length === 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'At least one payment method is required');
    }

    const pmResult = await client.query(
      'SELECT id FROM trader_payment_methods WHERE id = ANY($1) AND trader_id = $2 AND is_active = TRUE',
      [data.payment_method_ids, traderId]
    );
    if (pmResult.rows.length !== data.payment_method_ids.length) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid payment methods');
    }

    // Create the ad
    const adResult = await client.query(
      `INSERT INTO ads (
        trader_id, type, asset, fiat_currency, price_type, price, floating_margin,
        total_amount, available_amount, min_limit, max_limit, payment_time_limit,
        terms_tags, terms, auto_reply, remarks, region_restrictions, counterparty_conditions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        traderId,
        data.type,
        data.asset || 'USDT',
        data.fiat_currency,
        data.price_type || 'fixed',
        data.price,
        data.floating_margin || null,
        data.total_amount,
        data.min_limit,
        data.max_limit,
        data.payment_time_limit || 15,
        data.terms_tags || null,
        data.terms || null,
        data.auto_reply || null,
        data.remarks || null,
        data.region_restrictions || null,
        data.counterparty_conditions ? JSON.stringify(data.counterparty_conditions) : null,
      ]
    );
    const ad = adResult.rows[0];

    // Link payment methods
    for (const pmId of data.payment_method_ids) {
      await client.query(
        `INSERT INTO ad_payment_methods (ad_id, payment_method_id, is_recommended)
         VALUES ($1, $2, $3)`,
        [ad.id, pmId, pmId === data.payment_method_ids[0]]
      );
    }

    return ad;
  });
}

export async function findAdById(id: string): Promise<Ad | null> {
  const ad = await queryOne<Ad>(
    `SELECT a.*,
            u.display_name as trader_display_name,
            t.rating as trader_rating,
            t.total_trades as trader_total_trades,
            t.completion_rate_30d as trader_completion_rate
     FROM ads a
     JOIN traders t ON a.trader_id = t.id
     JOIN users u ON t.user_id = u.id
     WHERE a.id = $1`,
    [id]
  );

  if (ad) {
    // Get payment methods
    const paymentMethods = await query<AdPaymentMethod>(
      `SELECT apm.*, pm.method_type, pm.provider, pm.account_holder_name
       FROM ad_payment_methods apm
       JOIN trader_payment_methods pm ON apm.payment_method_id = pm.id
       WHERE apm.ad_id = $1`,
      [id]
    );
    ad.payment_methods = paymentMethods;
  }

  return ad;
}

export async function listAds(options: ListAdsOptions): Promise<{ ads: Ad[]; total: number }> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Default to online ads only
  if (options.status) {
    conditions.push(`a.status = $${paramIndex++}`);
    values.push(options.status);
  } else {
    conditions.push(`a.status = 'online'`);
  }

  // Filter by type (buy/sell)
  if (options.type) {
    conditions.push(`a.type = $${paramIndex++}`);
    values.push(options.type);
  }

  // Filter by asset
  if (options.asset) {
    conditions.push(`a.asset = $${paramIndex++}`);
    values.push(options.asset);
  }

  // Filter by fiat currency
  if (options.fiat_currency) {
    conditions.push(`a.fiat_currency = $${paramIndex++}`);
    values.push(options.fiat_currency);
  }

  // Filter by trader
  if (options.trader_id) {
    conditions.push(`a.trader_id = $${paramIndex++}`);
    values.push(options.trader_id);
  }

  // Filter by available amount range
  if (options.min_amount !== undefined) {
    conditions.push(`a.available_amount >= $${paramIndex++}`);
    values.push(options.min_amount);
  }

  // Only show ads with available amount > 0
  conditions.push(`a.available_amount > 0`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ads a ${whereClause}`,
    values
  );
  const total = parseInt(countResult[0]?.count || '0', 10);

  // Determine sort
  let orderBy = 'a.is_promoted DESC, ';
  const sortOrder = options.sort_order === 'desc' ? 'DESC' : 'ASC';
  switch (options.sort_by) {
    case 'price':
      orderBy += `a.price ${sortOrder}`;
      break;
    case 'rating':
      orderBy += `t.rating ${sortOrder}`;
      break;
    case 'trades':
      orderBy += `t.total_trades ${sortOrder}`;
      break;
    default:
      orderBy += `a.created_at DESC`;
  }

  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const ads = await query<Ad>(
    `SELECT a.*,
            u.display_name as trader_display_name,
            t.rating as trader_rating,
            t.total_trades as trader_total_trades,
            t.completion_rate_30d as trader_completion_rate
     FROM ads a
     JOIN traders t ON a.trader_id = t.id
     JOIN users u ON t.user_id = u.id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  // Get payment methods for all ads
  if (ads.length > 0) {
    const adIds = ads.map((a) => a.id);
    const paymentMethods = await query<AdPaymentMethod & { ad_id: string }>(
      `SELECT apm.*, pm.method_type, pm.provider
       FROM ad_payment_methods apm
       JOIN trader_payment_methods pm ON apm.payment_method_id = pm.id
       WHERE apm.ad_id = ANY($1)`,
      [adIds]
    );

    // Group by ad_id
    const pmByAd = new Map<string, AdPaymentMethod[]>();
    for (const pm of paymentMethods) {
      if (!pmByAd.has(pm.ad_id)) {
        pmByAd.set(pm.ad_id, []);
      }
      pmByAd.get(pm.ad_id)!.push(pm);
    }

    for (const ad of ads) {
      ad.payment_methods = pmByAd.get(ad.id) || [];
    }
  }

  return { ads, total };
}

export async function listTraderAds(
  traderId: string,
  options: { status?: 'online' | 'offline' | 'closed'; limit?: number; offset?: number }
): Promise<{ ads: Ad[]; total: number }> {
  return listAds({ ...options, trader_id: traderId });
}

export async function updateAd(
  adId: string,
  traderId: string,
  data: Partial<CreateAdDTO>
): Promise<Ad | null> {
  return transaction(async (client) => {
    // Verify ad belongs to trader
    const existing = await client.query(
      'SELECT * FROM ads WHERE id = $1 AND trader_id = $2',
      [adId, traderId]
    );
    if (!existing.rows[0]) {
      return null;
    }

    const ad = existing.rows[0];

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(data.price);
    }
    if (data.floating_margin !== undefined) {
      updates.push(`floating_margin = $${paramIndex++}`);
      values.push(data.floating_margin);
    }
    if (data.total_amount !== undefined) {
      // Adjust available amount proportionally
      const ratio = data.total_amount / ad.total_amount;
      updates.push(`total_amount = $${paramIndex++}`);
      values.push(data.total_amount);
      updates.push(`available_amount = available_amount * $${paramIndex++}`);
      values.push(ratio);
    }
    if (data.min_limit !== undefined) {
      updates.push(`min_limit = $${paramIndex++}`);
      values.push(data.min_limit);
    }
    if (data.max_limit !== undefined) {
      updates.push(`max_limit = $${paramIndex++}`);
      values.push(data.max_limit);
    }
    if (data.payment_time_limit !== undefined) {
      updates.push(`payment_time_limit = $${paramIndex++}`);
      values.push(data.payment_time_limit);
    }
    if (data.terms_tags !== undefined) {
      updates.push(`terms_tags = $${paramIndex++}`);
      values.push(data.terms_tags);
    }
    if (data.terms !== undefined) {
      updates.push(`terms = $${paramIndex++}`);
      values.push(data.terms);
    }
    if (data.auto_reply !== undefined) {
      updates.push(`auto_reply = $${paramIndex++}`);
      values.push(data.auto_reply);
    }
    if (data.remarks !== undefined) {
      updates.push(`remarks = $${paramIndex++}`);
      values.push(data.remarks);
    }
    if (data.region_restrictions !== undefined) {
      updates.push(`region_restrictions = $${paramIndex++}`);
      values.push(data.region_restrictions);
    }
    if (data.counterparty_conditions !== undefined) {
      updates.push(`counterparty_conditions = $${paramIndex++}`);
      values.push(JSON.stringify(data.counterparty_conditions));
    }

    updates.push('updated_at = NOW()');

    if (updates.length === 1) {
      // Only updated_at, nothing to change
      return findAdById(adId);
    }

    const result = await client.query(
      `UPDATE ads SET ${updates.join(', ')} WHERE id = $${paramIndex++} RETURNING *`,
      [...values, adId]
    );

    // Update payment methods if provided
    if (data.payment_method_ids && data.payment_method_ids.length > 0) {
      // Remove existing
      await client.query('DELETE FROM ad_payment_methods WHERE ad_id = $1', [adId]);

      // Add new
      for (const pmId of data.payment_method_ids) {
        await client.query(
          `INSERT INTO ad_payment_methods (ad_id, payment_method_id, is_recommended)
           VALUES ($1, $2, $3)`,
          [adId, pmId, pmId === data.payment_method_ids[0]]
        );
      }
    }

    return findAdById(adId);
  });
}

export async function setAdStatus(
  adId: string,
  traderId: string,
  status: 'online' | 'offline'
): Promise<Ad | null> {
  const rows = await query<Ad>(
    `UPDATE ads
     SET status = $3, updated_at = NOW()
     WHERE id = $1 AND trader_id = $2 AND status != 'closed'
     RETURNING *`,
    [adId, traderId, status]
  );
  return rows[0] || null;
}

export async function closeAd(adId: string, traderId: string): Promise<Ad | null> {
  const rows = await query<Ad>(
    `UPDATE ads
     SET status = 'closed', closed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND trader_id = $2
     RETURNING *`,
    [adId, traderId]
  );
  return rows[0] || null;
}

// ============================================
// Ad Statistics
// ============================================

export async function getTraderAdStats(traderId: string): Promise<{
  total_ads: number;
  online_ads: number;
  offline_ads: number;
  total_volume: number;
  available_volume: number;
}> {
  const result = await queryOne<{
    total_ads: string;
    online_ads: string;
    offline_ads: string;
    total_volume: string;
    available_volume: string;
  }>(
    `SELECT
       COUNT(*) as total_ads,
       COUNT(*) FILTER (WHERE status = 'online') as online_ads,
       COUNT(*) FILTER (WHERE status = 'offline') as offline_ads,
       COALESCE(SUM(total_amount), 0) as total_volume,
       COALESCE(SUM(available_amount) FILTER (WHERE status = 'online'), 0) as available_volume
     FROM ads
     WHERE trader_id = $1 AND status != 'closed'`,
    [traderId]
  );

  return {
    total_ads: parseInt(result?.total_ads || '0', 10),
    online_ads: parseInt(result?.online_ads || '0', 10),
    offline_ads: parseInt(result?.offline_ads || '0', 10),
    total_volume: parseFloat(result?.total_volume || '0'),
    available_volume: parseFloat(result?.available_volume || '0'),
  };
}
