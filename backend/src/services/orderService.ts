// ============================================================================
// Unified Order Service
// Handles both CyxTrade Lite (fiat-to-fiat) and Pro (crypto P2P) orders
// ============================================================================

import { PoolClient } from 'pg'
import { query, queryOne, transaction, clientQuery, clientQueryOne } from './db'
import { AppError, ErrorCode } from '../utils/errors'
import type {
  Order,
  CreateLiteOrderDTO,
  CreateProOrderDTO,
  OrderFilters,
  OrderStatus,
  Mode
} from '../types'

// Re-export types for convenience
export type { Order, CreateLiteOrderDTO, CreateProOrderDTO, OrderFilters }

// Constants
const PLATFORM_FEE = 0.005  // 0.5%
const ORDER_EXPIRY = 15     // 15 minutes

// ============================================================================
// QUERIES
// ============================================================================

const ORDER_SELECT = `
  SELECT
    o.*,
    u.display_name as user_name,
    u.phone as user_phone,
    t.name as trader_name,
    t.rating as trader_rating
  FROM orders o
  LEFT JOIN users u ON o.user_id = u.id
  LEFT JOIN traders t ON o.trader_id = t.id
`

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Find order by ID
 */
export async function findOrderById(orderId: string): Promise<Order | null> {
  return queryOne<Order>(`${ORDER_SELECT} WHERE o.id = $1`, [orderId])
}

/**
 * Find order by order number
 */
export async function findOrderByNumber(orderNumber: string): Promise<Order | null> {
  return queryOne<Order>(`${ORDER_SELECT} WHERE o.order_number = $1`, [orderNumber])
}

/**
 * List orders with filters
 */
export async function listOrders(filters: OrderFilters = {}, limit = 50, offset = 0): Promise<Order[]> {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (filters.mode) {
    conditions.push(`o.mode = $${paramIndex++}`)
    params.push(filters.mode)
  }

  if (filters.user_id) {
    conditions.push(`o.user_id = $${paramIndex++}`)
    params.push(filters.user_id)
  }

  if (filters.trader_id) {
    conditions.push(`o.trader_id = $${paramIndex++}`)
    params.push(filters.trader_id)
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      conditions.push(`o.status = ANY($${paramIndex++})`)
      params.push(filters.status)
    } else {
      conditions.push(`o.status = $${paramIndex++}`)
      params.push(filters.status)
    }
  }

  if (filters.ad_id) {
    conditions.push(`o.ad_id = $${paramIndex++}`)
    params.push(filters.ad_id)
  }

  if (filters.from_date) {
    conditions.push(`o.created_at >= $${paramIndex++}`)
    params.push(filters.from_date)
  }

  if (filters.to_date) {
    conditions.push(`o.created_at <= $${paramIndex++}`)
    params.push(filters.to_date)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  params.push(limit, offset)
  const limitOffset = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`

  return query<Order>(
    `${ORDER_SELECT} ${whereClause} ORDER BY o.created_at DESC ${limitOffset}`,
    params
  )
}

/**
 * Count orders with filters
 */
export async function countOrders(filters: OrderFilters = {}): Promise<number> {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (filters.mode) {
    conditions.push(`mode = $${paramIndex++}`)
    params.push(filters.mode)
  }

  if (filters.user_id) {
    conditions.push(`user_id = $${paramIndex++}`)
    params.push(filters.user_id)
  }

  if (filters.trader_id) {
    conditions.push(`trader_id = $${paramIndex++}`)
    params.push(filters.trader_id)
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      conditions.push(`status = ANY($${paramIndex++})`)
      params.push(filters.status)
    } else {
      conditions.push(`status = $${paramIndex++}`)
      params.push(filters.status)
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM orders ${whereClause}`,
    params
  )

  return parseInt(result?.count || '0', 10)
}

// ============================================================================
// LITE MODE - Create Order
// ============================================================================

/**
 * Create a Lite mode order (fiat-to-fiat remittance)
 */
export async function createLiteOrder(userId: string, data: CreateLiteOrderDTO): Promise<Order> {
  return transaction(async (client) => {
    // 1. Verify trader exists and is active
    const trader = await clientQueryOne<{ id: string; bond_amount: number; bond_locked: number; is_online: boolean }>(
      client,
      `SELECT id, bond_amount, bond_locked, is_online FROM traders WHERE id = $1 AND status = 'active'`,
      [data.trader_id]
    )

    if (!trader) {
      throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found or not active')
    }

    // 2. Calculate amounts
    const sendAmount = data.send_amount
    const receiveAmount = sendAmount * data.rate
    const feeAmount = sendAmount * PLATFORM_FEE
    const bondRequired = sendAmount  // Lock equal to send amount

    // 3. Check trader has sufficient bond
    const availableBond = trader.bond_amount - trader.bond_locked
    if (availableBond < bondRequired) {
      throw new AppError(ErrorCode.INSUFFICIENT_BOND, 'Trader has insufficient bond for this trade', {
        required: bondRequired,
        available: availableBond
      })
    }

    // 4. Create order
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY * 60 * 1000).toISOString()

    const order = await clientQueryOne<Order>(
      client,
      `INSERT INTO orders (
        mode, user_id, trader_id, ad_id, payment_method_id,
        send_currency, send_amount, receive_currency, receive_amount, rate,
        fee_amount, fee_currency,
        recipient_name, recipient_phone, recipient_bank, recipient_account,
        status, expires_at
      ) VALUES (
        'lite', $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14, $15,
        'pending', $16
      ) RETURNING *`,
      [
        userId,
        data.trader_id,
        data.ad_id || null,
        data.payment_method_id || null,
        data.send_currency,
        sendAmount,
        data.receive_currency,
        receiveAmount,
        data.rate,
        feeAmount,
        data.send_currency,
        data.recipient_name,
        data.recipient_phone,
        data.recipient_bank || null,
        data.recipient_account || null,
        expiresAt
      ]
    )

    if (!order) {
      throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to create order')
    }

    return order
  })
}

// ============================================================================
// PRO MODE - Create Order
// ============================================================================

/**
 * Create a Pro mode order (P2P crypto trade)
 */
export async function createProOrder(userId: string, data: CreateProOrderDTO): Promise<Order> {
  return transaction(async (client) => {
    // 1. Verify ad exists and is online
    const ad = await clientQueryOne<{
      id: string
      trader_id: string
      type: string
      from_currency: string
      to_currency: string
      asset: string
      price: number
      available_amount: number
      min_limit: number
      max_limit: number
      payment_time_limit: number
    }>(
      client,
      `SELECT * FROM ads WHERE id = $1 AND status = 'online'`,
      [data.ad_id]
    )

    if (!ad) {
      throw new AppError(ErrorCode.AD_NOT_FOUND, 'Ad not found or not available')
    }

    // 2. Check user is not the ad owner
    const trader = await clientQueryOne<{ user_id: string }>(
      client,
      `SELECT user_id FROM traders WHERE id = $1`,
      [ad.trader_id]
    )

    if (trader?.user_id === userId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot trade with your own ad')
    }

    // 3. Calculate amounts
    const fiatAmount = data.amount
    const cryptoAmount = fiatAmount / ad.price
    const feeAmount = fiatAmount * PLATFORM_FEE

    // 4. Validate limits
    if (fiatAmount < ad.min_limit) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Minimum amount is ${ad.min_limit}`)
    }
    if (fiatAmount > ad.max_limit) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Maximum amount is ${ad.max_limit}`)
    }

    // 5. Check ad has sufficient available amount
    if (ad.available_amount !== null && cryptoAmount > ad.available_amount) {
      throw new AppError(ErrorCode.INSUFFICIENT_BALANCE, 'Ad does not have sufficient available amount', {
        required: cryptoAmount,
        available: ad.available_amount
      })
    }

    // 6. Lock escrow from seller
    // For sell ads: seller is trader, buyer is user
    // For buy ads: buyer is trader, seller is user
    const sellerId = ad.type === 'sell' ? ad.trader_id : userId
    const buyerId = ad.type === 'sell' ? userId : ad.trader_id

    // Lock seller's crypto (if trader is selling)
    if (ad.type === 'sell') {
      // Trader is selling, lock their wallet balance
      const wallet = await clientQueryOne<{ available_balance: number }>(
        client,
        `SELECT available_balance FROM user_wallets WHERE user_id = (SELECT user_id FROM traders WHERE id = $1) AND asset = $2`,
        [ad.trader_id, ad.asset]
      )

      if (!wallet || wallet.available_balance < cryptoAmount) {
        throw new AppError(ErrorCode.INSUFFICIENT_BALANCE, 'Seller has insufficient balance')
      }

      // Lock the crypto
      await clientQuery(
        client,
        `UPDATE user_wallets
         SET available_balance = available_balance - $1,
             locked_balance = locked_balance + $1,
             updated_at = NOW()
         WHERE user_id = (SELECT user_id FROM traders WHERE id = $2) AND asset = $3`,
        [cryptoAmount, ad.trader_id, ad.asset]
      )
    }

    // 7. Create order
    const expiresAt = new Date(Date.now() + (ad.payment_time_limit || ORDER_EXPIRY) * 60 * 1000).toISOString()

    // Determine send/receive based on ad type
    // For sell ad: user sends fiat, receives crypto
    // For buy ad: user sends crypto, receives fiat
    const sendCurrency = ad.type === 'sell' ? ad.to_currency : ad.asset
    const sendAmount = ad.type === 'sell' ? fiatAmount : cryptoAmount
    const receiveCurrency = ad.type === 'sell' ? ad.asset : ad.to_currency
    const receiveAmount = ad.type === 'sell' ? cryptoAmount : fiatAmount

    const order = await clientQueryOne<Order>(
      client,
      `INSERT INTO orders (
        mode, type, user_id, trader_id, ad_id, payment_method_id,
        send_currency, send_amount, receive_currency, receive_amount, rate,
        fee_amount, fee_currency,
        asset, crypto_amount,
        escrow_amount, escrow_asset, escrow_locked_at,
        status, expires_at
      ) VALUES (
        'pro', $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12,
        $13, $14,
        $15, $16, NOW(),
        'pending', $17
      ) RETURNING *`,
      [
        data.type,
        userId,
        ad.trader_id,
        ad.id,
        data.payment_method_id || null,
        sendCurrency,
        sendAmount,
        receiveCurrency,
        receiveAmount,
        ad.price,
        feeAmount,
        ad.to_currency,
        ad.asset,
        cryptoAmount,
        cryptoAmount,
        ad.asset,
        expiresAt
      ]
    )

    if (!order) {
      throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to create order')
    }

    // 8. Update ad available amount
    if (ad.available_amount !== null) {
      await clientQuery(
        client,
        `UPDATE ads SET available_amount = available_amount - $1, order_count = order_count + 1, updated_at = NOW() WHERE id = $2`,
        [cryptoAmount, ad.id]
      )
    }

    return order
  })
}

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

/**
 * Validate status transition
 */
function validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
  const validNext: Record<OrderStatus, OrderStatus[]> = {
    pending: ['accepted', 'cancelled', 'expired'],
    accepted: ['paid', 'cancelled'],
    paid: ['delivering', 'releasing', 'disputed'],
    delivering: ['completed', 'disputed'],
    releasing: ['released', 'disputed'],
    released: ['completed'],
    completed: [],
    cancelled: [],
    disputed: ['completed', 'cancelled'],
    expired: []
  }

  if (!validNext[currentStatus]?.includes(newStatus)) {
    throw new AppError(
      ErrorCode.INVALID_ORDER_STATE,
      `Cannot transition from ${currentStatus} to ${newStatus}`
    )
  }
}

/**
 * Accept order (Lite mode - trader accepts)
 */
export async function acceptOrder(orderId: string, traderId: string): Promise<Order> {
  return transaction(async (client) => {
    // Get order and lock row
    const order = await clientQueryOne<Order>(
      client,
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    )

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
    }

    if (order.trader_id !== traderId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized to accept this order')
    }

    validateTransition(order.status, 'accepted')

    // Lock trader's bond
    const bondToLock = order.send_amount
    await clientQuery(
      client,
      `UPDATE traders SET bond_locked = bond_locked + $1, updated_at = NOW() WHERE id = $2`,
      [bondToLock, traderId]
    )

    // Update order
    const updated = await clientQueryOne<Order>(
      client,
      `UPDATE orders
       SET status = 'accepted', accepted_at = NOW(), bond_locked = $1
       WHERE id = $2
       RETURNING *`,
      [bondToLock, orderId]
    )

    return updated!
  })
}

/**
 * Mark order as paid (user confirms payment sent)
 */
export async function markOrderPaid(
  orderId: string,
  userId: string,
  paymentReference?: string,
  paymentProofUrl?: string
): Promise<Order> {
  return transaction(async (client) => {
    const order = await clientQueryOne<Order>(
      client,
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    )

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
    }

    if (order.user_id !== userId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized')
    }

    // Lite: must be accepted first; Pro: can mark paid from pending
    const expectedStatus = order.mode === 'lite' ? 'accepted' : 'pending'
    if (order.status !== expectedStatus && order.status !== 'accepted') {
      throw new AppError(ErrorCode.INVALID_ORDER_STATE, `Order must be ${expectedStatus} to mark as paid`)
    }

    const updated = await clientQueryOne<Order>(
      client,
      `UPDATE orders
       SET status = 'paid',
           paid_at = NOW(),
           payment_reference = COALESCE($2, payment_reference),
           payment_proof_url = COALESCE($3, payment_proof_url)
       WHERE id = $1
       RETURNING *`,
      [orderId, paymentReference, paymentProofUrl]
    )

    return updated!
  })
}

/**
 * Mark order as delivered (Lite mode - trader confirms delivery)
 */
export async function markOrderDelivered(orderId: string, traderId: string): Promise<Order> {
  return transaction(async (client) => {
    const order = await clientQueryOne<Order>(
      client,
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    )

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
    }

    if (order.trader_id !== traderId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized')
    }

    if (order.mode !== 'lite') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'This action is only for Lite orders')
    }

    validateTransition(order.status, 'delivering')

    const updated = await clientQueryOne<Order>(
      client,
      `UPDATE orders SET status = 'delivering', delivered_at = NOW() WHERE id = $1 RETURNING *`,
      [orderId]
    )

    return updated!
  })
}

/**
 * Release escrow (Pro mode - seller releases crypto to buyer)
 */
export async function releaseEscrow(orderId: string, traderId: string): Promise<Order> {
  return transaction(async (client) => {
    const order = await clientQueryOne<Order>(
      client,
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    )

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
    }

    if (order.trader_id !== traderId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized')
    }

    if (order.mode !== 'pro') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'This action is only for Pro orders')
    }

    if (order.status !== 'paid') {
      throw new AppError(ErrorCode.INVALID_ORDER_STATE, 'Order must be paid to release escrow')
    }

    // Transfer crypto from seller's locked balance to buyer's available balance
    const cryptoAmount = order.escrow_amount || order.crypto_amount || 0
    const asset = order.escrow_asset || order.asset

    // Release from seller (trader)
    await clientQuery(
      client,
      `UPDATE user_wallets
       SET locked_balance = locked_balance - $1,
           updated_at = NOW()
       WHERE user_id = (SELECT user_id FROM traders WHERE id = $2) AND asset = $3`,
      [cryptoAmount, traderId, asset]
    )

    // Credit to buyer (user)
    // First ensure wallet exists
    await clientQuery(
      client,
      `INSERT INTO user_wallets (user_id, asset, available_balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id, asset) DO NOTHING`,
      [order.user_id, asset]
    )

    // Then credit
    await clientQuery(
      client,
      `UPDATE user_wallets
       SET available_balance = available_balance + $1,
           total_deposited = total_deposited + $1,
           updated_at = NOW()
       WHERE user_id = $2 AND asset = $3`,
      [cryptoAmount, order.user_id, asset]
    )

    // Update order
    const updated = await clientQueryOne<Order>(
      client,
      `UPDATE orders
       SET status = 'released',
           released_at = NOW(),
           escrow_released_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [orderId]
    )

    return updated!
  })
}

/**
 * Complete order (user confirms receipt)
 */
export async function completeOrder(orderId: string, userId: string): Promise<Order> {
  return transaction(async (client) => {
    const order = await clientQueryOne<Order>(
      client,
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    )

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
    }

    if (order.user_id !== userId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized')
    }

    // Lite: must be delivering; Pro: must be released
    const expectedStatus = order.mode === 'lite' ? 'delivering' : 'released'
    if (order.status !== expectedStatus) {
      throw new AppError(ErrorCode.INVALID_ORDER_STATE, `Order must be ${expectedStatus} to complete`)
    }

    // Release trader's bond (Lite mode)
    if (order.mode === 'lite' && order.bond_locked) {
      await clientQuery(
        client,
        `UPDATE traders SET bond_locked = bond_locked - $1, updated_at = NOW() WHERE id = $2`,
        [order.bond_locked, order.trader_id]
      )
    }

    // Update trader stats
    await clientQuery(
      client,
      `UPDATE traders
       SET completed_trades = completed_trades + 1,
           total_trades = total_trades + 1,
           total_volume = total_volume + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [order.send_amount, order.trader_id]
    )

    const updated = await clientQueryOne<Order>(
      client,
      `UPDATE orders SET status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`,
      [orderId]
    )

    return updated!
  })
}

/**
 * Cancel order
 */
export async function cancelOrder(orderId: string, userId: string, reason?: string): Promise<Order> {
  return transaction(async (client) => {
    const order = await clientQueryOne<Order>(
      client,
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    )

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
    }

    // Check authorization - either user or trader can cancel depending on status
    const isUser = order.user_id === userId
    const isTrader = await clientQueryOne<{ id: string }>(
      client,
      `SELECT id FROM traders WHERE id = $1 AND user_id = $2`,
      [order.trader_id, userId]
    )

    if (!isUser && !isTrader) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized to cancel this order')
    }

    // Validate cancellation is allowed
    if (!['pending', 'accepted'].includes(order.status)) {
      throw new AppError(ErrorCode.INVALID_ORDER_STATE, 'Order cannot be cancelled in current state')
    }

    // Refund escrow (Pro mode)
    if (order.mode === 'pro' && order.escrow_amount && order.escrow_asset) {
      await clientQuery(
        client,
        `UPDATE user_wallets
         SET locked_balance = locked_balance - $1,
             available_balance = available_balance + $1,
             updated_at = NOW()
         WHERE user_id = (SELECT user_id FROM traders WHERE id = $2) AND asset = $3`,
        [order.escrow_amount, order.trader_id, order.escrow_asset]
      )

      // Restore ad available amount
      if (order.ad_id) {
        await clientQuery(
          client,
          `UPDATE ads SET available_amount = available_amount + $1, updated_at = NOW() WHERE id = $2`,
          [order.crypto_amount, order.ad_id]
        )
      }
    }

    // Release trader's bond (Lite mode)
    if (order.mode === 'lite' && order.bond_locked) {
      await clientQuery(
        client,
        `UPDATE traders SET bond_locked = bond_locked - $1, updated_at = NOW() WHERE id = $2`,
        [order.bond_locked, order.trader_id]
      )
    }

    const updated = await clientQueryOne<Order>(
      client,
      `UPDATE orders
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancelled_by = $2,
           cancel_reason = $3
       WHERE id = $1
       RETURNING *`,
      [orderId, userId, reason]
    )

    return updated!
  })
}

/**
 * Decline order (Lite mode - trader declines)
 */
export async function declineOrder(orderId: string, traderId: string, reason?: string): Promise<Order> {
  return transaction(async (client) => {
    const order = await clientQueryOne<Order>(
      client,
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    )

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
    }

    if (order.trader_id !== traderId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized')
    }

    if (order.status !== 'pending') {
      throw new AppError(ErrorCode.INVALID_ORDER_STATE, 'Can only decline pending orders')
    }

    // Get trader's user_id for cancelled_by
    const trader = await clientQueryOne<{ user_id: string }>(
      client,
      `SELECT user_id FROM traders WHERE id = $1`,
      [traderId]
    )

    const updated = await clientQueryOne<Order>(
      client,
      `UPDATE orders
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancelled_by = $2,
           cancel_reason = $3
       WHERE id = $1
       RETURNING *`,
      [orderId, trader?.user_id, reason || 'Declined by trader']
    )

    return updated!
  })
}

// ============================================================================
// DISPUTES
// ============================================================================

/**
 * Open dispute on order
 */
export async function openDispute(
  orderId: string,
  userId: string,
  claimType: string,
  reason: string
): Promise<Order> {
  return transaction(async (client) => {
    const order = await clientQueryOne<Order>(
      client,
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    )

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
    }

    // Check user is involved in the order
    const isUser = order.user_id === userId
    const isTrader = await clientQueryOne<{ id: string }>(
      client,
      `SELECT id FROM traders WHERE id = $1 AND user_id = $2`,
      [order.trader_id, userId]
    )

    if (!isUser && !isTrader) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Not involved in this order')
    }

    // Can only dispute paid/delivering/releasing orders
    if (!['paid', 'delivering', 'releasing'].includes(order.status)) {
      throw new AppError(ErrorCode.INVALID_ORDER_STATE, 'Cannot dispute order in current state')
    }

    // Check no existing dispute
    const existingDispute = await clientQueryOne(
      client,
      `SELECT id FROM disputes WHERE order_id = $1`,
      [orderId]
    )

    if (existingDispute) {
      throw new AppError(ErrorCode.DISPUTE_EXISTS, 'Dispute already exists for this order')
    }

    // Create dispute with claim type
    const evidenceDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()  // 48 hours

    await clientQuery(
      client,
      `INSERT INTO disputes (order_id, opened_by, claim_type, reason, evidence_deadline)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, userId, claimType, reason, evidenceDeadline]
    )

    // Update order status
    const updated = await clientQueryOne<Order>(
      client,
      `UPDATE orders SET status = 'disputed' WHERE id = $1 RETURNING *`,
      [orderId]
    )

    return updated!
  })
}

// ============================================================================
// EXPIRY
// ============================================================================

/**
 * Expire old pending orders
 */
export async function expireOrders(): Promise<number> {
  // Get and mark expired orders, then refund any locked escrow
  const expiredOrders = await query<{
    id: string; mode: string; escrow_amount: string | null;
    escrow_asset: string | null; trader_id: string;
    escrow_released_at: string | null; type: string;
    user_id: string;
  }>(
    `UPDATE orders
     SET status = 'expired'
     WHERE status = 'pending'
       AND expires_at < NOW()
     RETURNING id, mode, escrow_amount, escrow_asset, trader_id, escrow_released_at, type, user_id`
  )

  // Refund escrow for Pro orders that had crypto locked
  for (const order of expiredOrders) {
    const escrowAmount = order.escrow_amount ? Number(order.escrow_amount) : 0;
    if (order.mode === 'pro' && escrowAmount > 0 && order.escrow_asset && !order.escrow_released_at) {
      try {
        // Determine who had escrow locked (seller)
        const sellerId = order.type === 'sell' ? order.trader_id : order.user_id;
        await transaction(async (client) => {
          await client.query(
            `UPDATE user_wallets
             SET locked_balance = locked_balance - $1,
                 available_balance = available_balance + $1,
                 updated_at = NOW()
             WHERE user_id = $2 AND asset = $3`,
            [escrowAmount, sellerId, order.escrow_asset]
          );

          // Create refund transaction record
          await client.query(
            `INSERT INTO wallet_transactions (
              user_id, asset, type, amount, fee, status,
              reference_type, reference_id, notes
            ) VALUES ($1, $2, 'escrow_release', $3, 0, 'completed', 'order', $4, $5)`,
            [sellerId, order.escrow_asset, escrowAmount, order.id,
             `Escrow refunded for expired order ${order.id}`]
          );
        });
      } catch (err) {
        console.error(`Failed to refund escrow for expired order ${order.id}:`, err);
      }
    }
  }

  return expiredOrders.length
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get order statistics for a user
 */
export async function getUserOrderStats(userId: string, mode?: Mode): Promise<{
  total: number
  completed: number
  cancelled: number
  disputed: number
  totalVolume: number
}> {
  const params: (string)[] = [userId]
  const modeFilter = mode ? ` AND mode = $${params.push(mode)}` : ''

  const stats = await queryOne<{
    total: string
    completed: string
    cancelled: string
    disputed: string
    total_volume: string
  }>(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'completed') as completed,
       COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
       COUNT(*) FILTER (WHERE status = 'disputed') as disputed,
       COALESCE(SUM(send_amount) FILTER (WHERE status = 'completed'), 0) as total_volume
     FROM orders
     WHERE user_id = $1 ${modeFilter}`,
    params
  )

  return {
    total: parseInt(stats?.total || '0', 10),
    completed: parseInt(stats?.completed || '0', 10),
    cancelled: parseInt(stats?.cancelled || '0', 10),
    disputed: parseInt(stats?.disputed || '0', 10),
    totalVolume: parseFloat(stats?.total_volume || '0')
  }
}

/**
 * Get order statistics for a trader
 */
export async function getTraderOrderStats(traderId: string, mode?: Mode): Promise<{
  total: number
  completed: number
  pending: number
  active: number
  totalVolume: number
  avgCompletionTime: number | null
}> {
  const params: (string)[] = [traderId]
  const modeFilter = mode ? ` AND mode = $${params.push(mode)}` : ''

  const stats = await queryOne<{
    total: string
    completed: string
    pending: string
    active: string
    total_volume: string
    avg_completion_time: string
  }>(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'completed') as completed,
       COUNT(*) FILTER (WHERE status = 'pending') as pending,
       COUNT(*) FILTER (WHERE status IN ('accepted', 'paid', 'delivering', 'releasing')) as active,
       COALESCE(SUM(send_amount) FILTER (WHERE status = 'completed'), 0) as total_volume,
       AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60) FILTER (WHERE status = 'completed') as avg_completion_time
     FROM orders
     WHERE trader_id = $1 ${modeFilter}`,
    params
  )

  return {
    total: parseInt(stats?.total || '0', 10),
    completed: parseInt(stats?.completed || '0', 10),
    pending: parseInt(stats?.pending || '0', 10),
    active: parseInt(stats?.active || '0', 10),
    totalVolume: parseFloat(stats?.total_volume || '0'),
    avgCompletionTime: stats?.avg_completion_time ? parseFloat(stats.avg_completion_time) : null
  }
}
