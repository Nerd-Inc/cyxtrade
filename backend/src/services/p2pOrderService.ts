import { query, queryOne, transaction } from './db';
import { AppError, ErrorCode } from '../utils/errors';
import { findAdById, Ad } from './adService';
import { lockEscrow, releaseEscrow, refundEscrow, getWalletBalance } from './walletService';

export interface P2POrder {
  id: string;
  order_number: string;
  ad_id: string;
  user_id: string;
  trader_id: string;
  type: 'buy' | 'sell';
  asset: string;
  fiat_currency: string;
  amount: number;
  price: number;
  total_fiat: number;
  payment_method_id: string | null;
  status: 'pending' | 'paid' | 'releasing' | 'released' | 'completed' | 'canceled' | 'disputed' | 'expired';
  payment_reference: string | null;
  payment_proof_url: string | null;
  auto_reply_sent: boolean;
  expires_at: Date | null;
  created_at: Date;
  paid_at: Date | null;
  released_at: Date | null;
  completed_at: Date | null;
  canceled_at: Date | null;
  canceled_by: string | null;
  cancel_reason: string | null;
  // Escrow fields
  escrow_asset: string | null;
  escrow_amount: number | null;
  escrow_locked_at: Date | null;
  escrow_released_at: Date | null;
  escrow_tx_id: string | null;
  // Joined fields
  trader_display_name?: string;
  trader_rating?: number;
  user_display_name?: string;
  ad?: Partial<Ad>;
  payment_method?: {
    id: string;
    method_type: string;
    provider: string;
    account_holder_name: string;
  };
}

export interface CreateOrderDTO {
  ad_id: string;
  amount: number;
  payment_method_id?: string;
}

export interface ListOrdersOptions {
  user_id?: string;
  trader_id?: string;
  status?: string | string[];
  type?: 'buy' | 'sell';
  limit?: number;
  offset?: number;
}

// ============================================
// Order CRUD Operations
// ============================================

export async function createOrder(userId: string, data: CreateOrderDTO): Promise<P2POrder> {
  return transaction(async (client) => {
    // Get ad details
    const adResult = await client.query(
      `SELECT a.*, t.user_id as trader_user_id
       FROM ads a
       JOIN traders t ON a.trader_id = t.id
       WHERE a.id = $1 AND a.status = 'online' AND a.available_amount > 0`,
      [data.ad_id]
    );
    const ad = adResult.rows[0];

    if (!ad) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Ad not found or unavailable');
    }

    // Validate user is not the trader
    if (ad.trader_user_id === userId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot trade with your own ad');
    }

    // Validate amount within limits
    if (data.amount < ad.min_limit || data.amount > ad.max_limit) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Amount must be between ${ad.min_limit} and ${ad.max_limit}`
      );
    }

    // Calculate crypto amount based on fiat amount and price
    const cryptoAmount = data.amount / ad.price;

    // Check available amount
    if (cryptoAmount > ad.available_amount) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Insufficient available amount');
    }

    // Validate payment method if provided
    if (data.payment_method_id) {
      const pmResult = await client.query(
        `SELECT pm.id FROM ad_payment_methods apm
         JOIN trader_payment_methods pm ON apm.payment_method_id = pm.id
         WHERE apm.ad_id = $1 AND pm.id = $2`,
        [data.ad_id, data.payment_method_id]
      );
      if (!pmResult.rows[0]) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid payment method for this ad');
      }
    }

    // Check counterparty conditions
    if (ad.counterparty_conditions) {
      const conditions = typeof ad.counterparty_conditions === 'string'
        ? JSON.parse(ad.counterparty_conditions)
        : ad.counterparty_conditions;

      if (conditions.minTrades) {
        // Check user's completed trades count
        const userTradesResult = await client.query(
          `SELECT COUNT(*) as count FROM p2p_orders
           WHERE user_id = $1 AND status = 'completed'`,
          [userId]
        );
        const userTrades = parseInt(userTradesResult.rows[0]?.count || '0', 10);
        if (userTrades < conditions.minTrades) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            `Minimum ${conditions.minTrades} completed trades required`
          );
        }
      }
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + ad.payment_time_limit * 60 * 1000);

    // Determine who needs to lock escrow:
    // - Sell ad: Trader is selling crypto → lock trader's crypto
    // - Buy ad: Trader wants to buy crypto → user is selling → lock user's crypto
    const sellerId = ad.type === 'sell' ? ad.trader_user_id : userId;
    const escrowAsset = ad.asset;
    const escrowAmount = cryptoAmount;

    // Verify seller has sufficient balance
    const sellerBalance = await getWalletBalance(sellerId, escrowAsset);
    if (sellerBalance.available < escrowAmount) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Insufficient ${escrowAsset} balance. Available: ${sellerBalance.available}, Required: ${escrowAmount}`
      );
    }

    // Create the order (order_number is auto-generated by trigger)
    const orderResult = await client.query(
      `INSERT INTO p2p_orders (
        ad_id, user_id, trader_id, type, asset, fiat_currency,
        amount, price, total_fiat, payment_method_id, expires_at,
        escrow_asset, escrow_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.ad_id,
        userId,
        ad.trader_id,
        ad.type,
        ad.asset,
        ad.fiat_currency,
        cryptoAmount,
        ad.price,
        data.amount,
        data.payment_method_id || null,
        expiresAt,
        escrowAsset,
        escrowAmount,
      ]
    );

    const order = orderResult.rows[0];

    // Lock seller's escrow
    const escrowTx = await lockEscrow(sellerId, escrowAsset, escrowAmount, order.id);

    // Update order with escrow info
    await client.query(
      `UPDATE p2p_orders SET escrow_locked_at = NOW(), escrow_tx_id = $2 WHERE id = $1`,
      [order.id, escrowTx.id]
    );

    order.escrow_locked_at = new Date();
    order.escrow_tx_id = escrowTx.id;

    // Note: available_amount is updated by database trigger

    return order;
  });
}

export async function findOrderById(id: string): Promise<P2POrder | null> {
  const order = await queryOne<P2POrder>(
    `SELECT o.*,
            tu.display_name as trader_display_name,
            t.rating as trader_rating,
            u.display_name as user_display_name
     FROM p2p_orders o
     JOIN traders t ON o.trader_id = t.id
     JOIN users tu ON t.user_id = tu.id
     JOIN users u ON o.user_id = u.id
     WHERE o.id = $1`,
    [id]
  );

  if (order && order.payment_method_id) {
    const pm = await queryOne<{
      id: string;
      method_type: string;
      provider: string;
      account_holder_name: string;
    }>(
      `SELECT id, method_type, provider, account_holder_name
       FROM trader_payment_methods WHERE id = $1`,
      [order.payment_method_id]
    );
    order.payment_method = pm || undefined;
  }

  return order;
}

export async function findOrderByNumber(orderNumber: string): Promise<P2POrder | null> {
  const order = await queryOne<P2POrder>(
    `SELECT o.*,
            tu.display_name as trader_display_name,
            t.rating as trader_rating,
            u.display_name as user_display_name
     FROM p2p_orders o
     JOIN traders t ON o.trader_id = t.id
     JOIN users tu ON t.user_id = tu.id
     JOIN users u ON o.user_id = u.id
     WHERE o.order_number = $1`,
    [orderNumber]
  );

  return order;
}

export async function listOrders(options: ListOrdersOptions): Promise<{ orders: P2POrder[]; total: number }> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (options.user_id) {
    conditions.push(`o.user_id = $${paramIndex++}`);
    values.push(options.user_id);
  }

  if (options.trader_id) {
    conditions.push(`o.trader_id = $${paramIndex++}`);
    values.push(options.trader_id);
  }

  if (options.status) {
    if (Array.isArray(options.status)) {
      conditions.push(`o.status = ANY($${paramIndex++})`);
      values.push(options.status);
    } else {
      conditions.push(`o.status = $${paramIndex++}`);
      values.push(options.status);
    }
  }

  if (options.type) {
    conditions.push(`o.type = $${paramIndex++}`);
    values.push(options.type);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM p2p_orders o ${whereClause}`,
    values
  );
  const total = parseInt(countResult[0]?.count || '0', 10);

  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const orders = await query<P2POrder>(
    `SELECT o.*,
            tu.display_name as trader_display_name,
            t.rating as trader_rating,
            u.display_name as user_display_name
     FROM p2p_orders o
     JOIN traders t ON o.trader_id = t.id
     JOIN users tu ON t.user_id = tu.id
     JOIN users u ON o.user_id = u.id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return { orders, total };
}

export async function listUserOrders(
  userId: string,
  options: { status?: string | string[]; limit?: number; offset?: number }
): Promise<{ orders: P2POrder[]; total: number }> {
  return listOrders({ ...options, user_id: userId });
}

export async function listTraderOrders(
  traderId: string,
  options: { status?: string | string[]; limit?: number; offset?: number }
): Promise<{ orders: P2POrder[]; total: number }> {
  return listOrders({ ...options, trader_id: traderId });
}

// ============================================
// Order State Transitions
// ============================================

export async function markOrderPaid(
  orderId: string,
  userId: string,
  data: { reference?: string; proofUrl?: string }
): Promise<P2POrder | null> {
  const rows = await query<P2POrder>(
    `UPDATE p2p_orders
     SET status = 'paid',
         paid_at = NOW(),
         payment_reference = COALESCE($3, payment_reference),
         payment_proof_url = COALESCE($4, payment_proof_url)
     WHERE id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING *`,
    [orderId, userId, data.reference || null, data.proofUrl || null]
  );
  return rows[0] || null;
}

export async function releaseOrder(orderId: string, traderId: string): Promise<P2POrder | null> {
  return transaction(async (client) => {
    // Verify order belongs to trader and is in paid status
    const orderResult = await client.query(
      `SELECT o.*, t.user_id as trader_user_id FROM p2p_orders o
       JOIN traders t ON o.trader_id = t.id
       WHERE o.id = $1 AND t.id = $2 AND o.status = 'paid'`,
      [orderId, traderId]
    );

    if (!orderResult.rows[0]) {
      return null;
    }

    const order = orderResult.rows[0];

    // Determine seller and buyer based on order type
    // - Sell order: trader sells crypto to user
    // - Buy order: user sells crypto to trader
    const sellerId = order.type === 'sell' ? order.trader_user_id : order.user_id;
    const buyerId = order.type === 'sell' ? order.user_id : order.trader_user_id;

    // Release escrow: transfer from seller to buyer
    if (order.escrow_asset && order.escrow_amount) {
      await releaseEscrow(
        sellerId,
        buyerId,
        order.escrow_asset,
        Number(order.escrow_amount),
        orderId,
        0 // fee - could add trading fee here
      );
    }

    // Update order status to released
    const result = await client.query(
      `UPDATE p2p_orders
       SET status = 'released', released_at = NOW(), escrow_released_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [orderId]
    );

    return result.rows[0];
  });
}

export async function completeOrder(orderId: string, userId: string): Promise<P2POrder | null> {
  return transaction(async (client) => {
    // Verify order belongs to user and is in released status
    const orderResult = await client.query(
      `SELECT * FROM p2p_orders WHERE id = $1 AND user_id = $2 AND status = 'released'`,
      [orderId, userId]
    );

    if (!orderResult.rows[0]) {
      return null;
    }

    const order = orderResult.rows[0];

    // Update order status
    const result = await client.query(
      `UPDATE p2p_orders
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [orderId]
    );

    // Update trader stats
    await client.query(
      `UPDATE traders
       SET total_trades = total_trades + 1,
           trades_30d = trades_30d + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [order.trader_id]
    );

    return result.rows[0];
  });
}

export async function cancelOrder(
  orderId: string,
  canceledBy: string,
  reason?: string
): Promise<P2POrder | null> {
  return transaction(async (client) => {
    // Get order details
    const orderResult = await client.query(
      `SELECT o.*, t.user_id as trader_user_id
       FROM p2p_orders o
       JOIN traders t ON o.trader_id = t.id
       WHERE o.id = $1 AND o.status IN ('pending', 'paid')`,
      [orderId]
    );

    if (!orderResult.rows[0]) {
      return null;
    }

    const order = orderResult.rows[0];

    // Verify canceler is either user or trader
    if (order.user_id !== canceledBy && order.trader_user_id !== canceledBy) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized to cancel this order');
    }

    // Refund escrow to seller
    if (order.escrow_asset && order.escrow_amount && !order.escrow_released_at) {
      // Determine seller based on order type
      const sellerId = order.type === 'sell' ? order.trader_user_id : order.user_id;
      await refundEscrow(sellerId, order.escrow_asset, Number(order.escrow_amount), orderId);
    }

    // Update order status
    const result = await client.query(
      `UPDATE p2p_orders
       SET status = 'canceled',
           canceled_at = NOW(),
           canceled_by = $2,
           cancel_reason = $3
       WHERE id = $1
       RETURNING *`,
      [orderId, canceledBy, reason || null]
    );

    // Note: available_amount is restored by database trigger

    return result.rows[0];
  });
}

export async function expireOrder(orderId: string): Promise<P2POrder | null> {
  return transaction(async (client) => {
    // Get order details
    const orderResult = await client.query(
      `SELECT o.*, t.user_id as trader_user_id
       FROM p2p_orders o
       JOIN traders t ON o.trader_id = t.id
       WHERE o.id = $1 AND o.status = 'pending' AND o.expires_at < NOW()
       FOR UPDATE`,
      [orderId]
    );

    if (!orderResult.rows[0]) {
      return null;
    }

    const order = orderResult.rows[0];

    // Refund escrow to seller
    if (order.escrow_asset && order.escrow_amount && !order.escrow_released_at) {
      const sellerId = order.type === 'sell' ? order.trader_user_id : order.user_id;
      await refundEscrow(sellerId, order.escrow_asset, Number(order.escrow_amount), orderId);
    }

    // Update order status
    const result = await client.query(
      `UPDATE p2p_orders SET status = 'expired' WHERE id = $1 RETURNING *`,
      [orderId]
    );

    return result.rows[0];
  });
}

export async function openOrderDispute(
  orderId: string,
  userId: string,
  reason: string
): Promise<{ order: P2POrder; disputeId: string } | null> {
  return transaction(async (client) => {
    // Get order and verify user can open dispute
    const orderResult = await client.query(
      `SELECT o.*, t.user_id as trader_user_id
       FROM p2p_orders o
       JOIN traders t ON o.trader_id = t.id
       WHERE o.id = $1 AND o.status IN ('paid', 'releasing')`,
      [orderId]
    );

    if (!orderResult.rows[0]) {
      return null;
    }

    const order = orderResult.rows[0];

    // Verify user is participant
    if (order.user_id !== userId && order.trader_user_id !== userId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized to open dispute');
    }

    // Update order status
    const result = await client.query(
      `UPDATE p2p_orders SET status = 'disputed' WHERE id = $1 RETURNING *`,
      [orderId]
    );

    // Create dispute record
    const disputeResult = await client.query(
      `INSERT INTO disputes (trade_id, opened_by, reason)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [orderId, userId, reason]
    );

    return {
      order: result.rows[0],
      disputeId: disputeResult.rows[0].id,
    };
  });
}

// ============================================
// Order Statistics
// ============================================

export async function getUserOrderStats(userId: string): Promise<{
  total_orders: number;
  completed_orders: number;
  total_volume: number;
  completion_rate: number;
}> {
  const result = await queryOne<{
    total_orders: string;
    completed_orders: string;
    total_volume: string;
  }>(
    `SELECT
       COUNT(*) as total_orders,
       COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
       COALESCE(SUM(total_fiat) FILTER (WHERE status = 'completed'), 0) as total_volume
     FROM p2p_orders
     WHERE user_id = $1`,
    [userId]
  );

  const totalOrders = parseInt(result?.total_orders || '0', 10);
  const completedOrders = parseInt(result?.completed_orders || '0', 10);

  return {
    total_orders: totalOrders,
    completed_orders: completedOrders,
    total_volume: parseFloat(result?.total_volume || '0'),
    completion_rate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 100,
  };
}

export async function getTraderOrderStats(traderId: string): Promise<{
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  total_volume: number;
  avg_release_time_minutes: number;
}> {
  const result = await queryOne<{
    total_orders: string;
    active_orders: string;
    completed_orders: string;
    total_volume: string;
    avg_release_time: string;
  }>(
    `SELECT
       COUNT(*) as total_orders,
       COUNT(*) FILTER (WHERE status IN ('pending', 'paid', 'releasing')) as active_orders,
       COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
       COALESCE(SUM(total_fiat) FILTER (WHERE status = 'completed'), 0) as total_volume,
       COALESCE(AVG(EXTRACT(EPOCH FROM (released_at - paid_at)) / 60) FILTER (WHERE released_at IS NOT NULL), 0) as avg_release_time
     FROM p2p_orders
     WHERE trader_id = $1`,
    [traderId]
  );

  return {
    total_orders: parseInt(result?.total_orders || '0', 10),
    active_orders: parseInt(result?.active_orders || '0', 10),
    completed_orders: parseInt(result?.completed_orders || '0', 10),
    total_volume: parseFloat(result?.total_volume || '0'),
    avg_release_time_minutes: parseFloat(result?.avg_release_time || '0'),
  };
}

// ============================================
// Batch Operations
// ============================================

export async function expireStaleOrders(): Promise<number> {
  const result = await query(
    `UPDATE p2p_orders
     SET status = 'expired'
     WHERE status = 'pending' AND expires_at < NOW()`,
    []
  );
  return (result as any).rowCount || 0;
}
