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
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  bond_amount: number;
  bond_locked: number;
  corridors: Corridor[];
  rating: number;
  total_trades: number;
  is_online: boolean;
  approved_at: Date | null;
  approved_by: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  display_name?: string;
  phone?: string;
}

export async function findTraderById(id: string): Promise<Trader | null> {
  return queryOne<Trader>(
    `SELECT t.*, u.display_name, u.phone
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
    `SELECT t.*, u.display_name, u.phone
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
