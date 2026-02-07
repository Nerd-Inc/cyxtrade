import { query, queryOne, transaction } from './db';
import { updateTraderBond, updateTraderRating } from './traderService';

export interface Trade {
  id: string;
  user_id: string;
  trader_id: string;
  send_currency: string;
  send_amount: number;
  receive_currency: string;
  receive_amount: number;
  rate: number;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_method: string | null;
  status: 'pending' | 'accepted' | 'paid' | 'delivering' | 'completed' | 'disputed' | 'cancelled';
  bond_locked: number | null;
  created_at: Date;
  accepted_at: Date | null;
  paid_at: Date | null;
  delivered_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  // Joined fields
  trader_name?: string;
  trader_rating?: number;
  user_name?: string;
  user_phone?: string;
}

export async function findTradeById(id: string): Promise<Trade | null> {
  return queryOne<Trade>(
    `SELECT t.*,
            u.display_name as user_name, u.phone as user_phone,
            tr.id as trader_id, tu.display_name as trader_name, tr.rating as trader_rating
     FROM trades t
     JOIN users u ON t.user_id = u.id
     JOIN traders tr ON t.trader_id = tr.id
     JOIN users tu ON tr.user_id = tu.id
     WHERE t.id = $1`,
    [id]
  );
}

export async function listTradesForUser(
  userId: string,
  options: { status?: string; limit?: number; offset?: number }
): Promise<{ trades: Trade[]; total: number }> {
  const conditions = ['t.user_id = $1'];
  const values: any[] = [userId];
  let paramIndex = 2;

  if (options.status) {
    conditions.push(`t.status = $${paramIndex++}`);
    values.push(options.status);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM trades t ${whereClause}`,
    values
  );
  const total = parseInt(countResult[0]?.count || '0', 10);

  const trades = await query<Trade>(
    `SELECT t.*,
            tu.display_name as trader_name, tr.rating as trader_rating
     FROM trades t
     JOIN traders tr ON t.trader_id = tr.id
     JOIN users tu ON tr.user_id = tu.id
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, options.limit || 20, options.offset || 0]
  );

  return { trades, total };
}

export async function listTradesForTrader(
  traderUserId: string,
  options: { status?: string; limit?: number; offset?: number }
): Promise<{ trades: Trade[]; total: number }> {
  const conditions = ['tr.user_id = $1'];
  const values: any[] = [traderUserId];
  let paramIndex = 2;

  if (options.status) {
    conditions.push(`t.status = $${paramIndex++}`);
    values.push(options.status);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM trades t JOIN traders tr ON t.trader_id = tr.id ${whereClause}`,
    values
  );
  const total = parseInt(countResult[0]?.count || '0', 10);

  const trades = await query<Trade>(
    `SELECT t.*,
            u.display_name as user_name, u.phone as user_phone
     FROM trades t
     JOIN traders tr ON t.trader_id = tr.id
     JOIN users u ON t.user_id = u.id
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, options.limit || 20, options.offset || 0]
  );

  return { trades, total };
}

export async function createTrade(data: {
  userId: string;
  traderId: string;
  sendCurrency: string;
  sendAmount: number;
  receiveCurrency: string;
  receiveAmount: number;
  rate: number;
  recipientName?: string;
  recipientPhone?: string;
  recipientMethod?: string;
}): Promise<Trade> {
  const rows = await query<Trade>(
    `INSERT INTO trades (
       user_id, trader_id, send_currency, send_amount,
       receive_currency, receive_amount, rate,
       recipient_name, recipient_phone, recipient_method
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.userId,
      data.traderId,
      data.sendCurrency,
      data.sendAmount,
      data.receiveCurrency,
      data.receiveAmount,
      data.rate,
      data.recipientName || null,
      data.recipientPhone || null,
      data.recipientMethod || null,
    ]
  );
  return rows[0];
}

export async function acceptTrade(tradeId: string, traderId: string): Promise<Trade | null> {
  return transaction(async (client) => {
    // Get trade details
    const tradeResult = await client.query(
      'SELECT * FROM trades WHERE id = $1 AND trader_id = $2 AND status = $3',
      [tradeId, traderId, 'pending']
    );
    const trade = tradeResult.rows[0];

    if (!trade) return null;

    // Calculate bond to lock (e.g., 100% of trade value)
    const bondToLock = trade.send_amount;

    // Lock trader's bond
    await client.query(
      `UPDATE traders
       SET bond_locked = bond_locked + $2, updated_at = NOW()
       WHERE id = $1 AND bond_amount - bond_locked >= $2`,
      [traderId, bondToLock]
    );

    // Update trade status
    const result = await client.query(
      `UPDATE trades
       SET status = 'accepted', bond_locked = $2, accepted_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [tradeId, bondToLock]
    );

    return result.rows[0];
  });
}

export async function declineTrade(tradeId: string, traderId: string): Promise<Trade | null> {
  const rows = await query<Trade>(
    `UPDATE trades
     SET status = 'cancelled', cancelled_at = NOW()
     WHERE id = $1 AND trader_id = $2 AND status = 'pending'
     RETURNING *`,
    [tradeId, traderId]
  );
  return rows[0] || null;
}

export async function markTradePaid(
  tradeId: string,
  userId: string,
  data: { reference?: string; proofUrl?: string }
): Promise<Trade | null> {
  const rows = await query<Trade>(
    `UPDATE trades
     SET status = 'paid', paid_at = NOW(),
         payment_reference = COALESCE($3, payment_reference),
         payment_proof_url = COALESCE($4, payment_proof_url)
     WHERE id = $1 AND user_id = $2 AND status = 'accepted'
     RETURNING *`,
    [tradeId, userId, data.reference || null, data.proofUrl || null]
  );
  return rows[0] || null;
}

export async function markTradeDelivered(tradeId: string, traderId: string): Promise<Trade | null> {
  const rows = await query<Trade>(
    `UPDATE trades
     SET status = 'delivering', delivered_at = NOW()
     WHERE id = $1 AND trader_id = $2 AND status = 'paid'
     RETURNING *`,
    [tradeId, traderId]
  );
  return rows[0] || null;
}

export async function completeTrade(tradeId: string, userId: string): Promise<Trade | null> {
  return transaction(async (client) => {
    // Get trade
    const tradeResult = await client.query(
      `SELECT * FROM trades WHERE id = $1 AND user_id = $2 AND status = 'delivering'`,
      [tradeId, userId]
    );
    const trade = tradeResult.rows[0];

    if (!trade) return null;

    // Update trade status
    const result = await client.query(
      `UPDATE trades SET status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`,
      [tradeId]
    );

    // Unlock trader's bond
    if (trade.bond_locked) {
      await client.query(
        `UPDATE traders SET bond_locked = bond_locked - $2, updated_at = NOW() WHERE id = $1`,
        [trade.trader_id, trade.bond_locked]
      );
    }

    // Update trader stats
    await client.query(
      `UPDATE traders
       SET total_trades = total_trades + 1, updated_at = NOW()
       WHERE id = $1`,
      [trade.trader_id]
    );

    return result.rows[0];
  });
}

export async function openDispute(
  tradeId: string,
  userId: string,
  reason: string
): Promise<{ trade: Trade; disputeId: string } | null> {
  return transaction(async (client) => {
    // Update trade status
    const tradeResult = await client.query(
      `UPDATE trades
       SET status = 'disputed'
       WHERE id = $1 AND (user_id = $2 OR trader_id IN (SELECT id FROM traders WHERE user_id = $2))
       AND status IN ('accepted', 'paid', 'delivering')
       RETURNING *`,
      [tradeId, userId]
    );
    const trade = tradeResult.rows[0];

    if (!trade) return null;

    // Create dispute
    const disputeResult = await client.query(
      `INSERT INTO disputes (trade_id, opened_by, reason)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [tradeId, userId, reason]
    );

    return { trade, disputeId: disputeResult.rows[0].id };
  });
}

export async function rateTrade(
  tradeId: string,
  userId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const trade = await findTradeById(tradeId);
  if (!trade || trade.user_id !== userId || trade.status !== 'completed') {
    throw new Error('Cannot rate this trade');
  }

  await query(
    `INSERT INTO ratings (trade_id, from_user_id, to_trader_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (trade_id, from_user_id) DO UPDATE SET rating = $4, comment = $5`,
    [tradeId, userId, trade.trader_id, rating, comment || null]
  );

  // Update trader's average rating
  await updateTraderRating(trade.trader_id);
}
