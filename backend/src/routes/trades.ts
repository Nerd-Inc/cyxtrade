import { Router } from 'express';
import { AuthRequest, traderMiddleware } from '../middleware/auth';
import {
  createLiteOrder,
  findOrderById,
  listOrders,
  acceptOrder,
  declineOrder,
  markOrderPaid,
  markOrderDelivered,
  completeOrder,
  cancelOrder,
  openDispute
} from '../services/orderService';
import { findTraderByUserId, findTraderById } from '../services/traderService';
import { paymentMethodService } from '../services/paymentMethodService';
import { query } from '../services/db';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Helper to safely get string param
const getParam = (val: string | string[] | undefined): string =>
  Array.isArray(val) ? val[0] : (val ?? '');

// POST /api/trades - Create new trade request (Lite mode order)
router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const {
    traderId,
    adId,
    sendCurrency,
    sendAmount,
    receiveCurrency,
    rate,
    recipientName,
    recipientPhone,
    recipientBank,
    recipientAccount,
    paymentMethodId
  } = req.body;

  // Validation
  if (!traderId) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Trader is required', { field: 'traderId' });
  }
  if (!sendAmount || sendAmount <= 0) {
    throw new AppError(ErrorCode.INVALID_AMOUNT, 'Please enter a valid send amount');
  }
  if (!recipientName) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Recipient name is required', { field: 'recipientName' });
  }
  if (!recipientPhone) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Recipient phone is required', { field: 'recipientPhone' });
  }

  // Calculate receive amount from rate
  const receiveAmount = sendAmount * rate;

  const order = await createLiteOrder(userId, {
    trader_id: traderId,
    ad_id: adId,
    send_currency: sendCurrency || 'AED',
    send_amount: sendAmount,
    receive_currency: receiveCurrency || 'XAF',
    rate: rate || 163,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_bank: recipientBank,
    recipient_account: recipientAccount,
    payment_method_id: paymentMethodId
  });

  sendSuccess(res, {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    expiresAt: order.expires_at,
    message: 'Trade request created'
  }, 201);
}));

// GET /api/trades - List my trades/orders
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { status, role, limit, offset } = req.query;

  // Check if user is a trader
  const trader = await findTraderByUserId(userId);
  const isTrader = role === 'trader' && trader?.status === 'active';

  // Build filters for Lite mode orders
  const filters: any = {
    mode: 'lite'
  };

  if (isTrader && trader) {
    filters.trader_id = trader.id;
  } else {
    filters.user_id = userId;
  }

  if (status) {
    filters.status = status as string;
  }

  const orders = await listOrders(
    filters,
    limit ? parseInt(limit as string) : 20,
    offset ? parseInt(offset as string) : 0
  );

  // Format response for backward compatibility
  const trades = orders.map(o => ({
    id: o.id,
    orderNumber: o.order_number,
    sendAmount: o.send_amount,
    sendCurrency: o.send_currency,
    receiveAmount: o.receive_amount,
    receiveCurrency: o.receive_currency,
    status: o.status,
    recipientName: o.recipient_name,
    traderName: o.trader_name,
    createdAt: o.created_at,
    expiresAt: o.expires_at
  }));

  sendSuccess(res, { trades, total: trades.length });
}));

// GET /api/trades/:id - Get trade/order details
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }
  const id = getParam(req.params.id);

  const order = await findOrderById(id);

  if (!order) {
    throw new AppError(ErrorCode.ORDER_NOT_FOUND);
  }

  // Authorization: verify user is a participant in this trade
  const trader = await findTraderByUserId(userId);
  const isParticipant = order.user_id === userId || (trader && order.trader_id === trader.id);
  if (!isParticipant) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized to view this trade');
  }

  // Get trader payment methods
  let traderPaymentMethods: any[] = [];
  try {
    const methods = await paymentMethodService.getPaymentMethods(order.trader_id);
    traderPaymentMethods = methods.map(pm => paymentMethodService.maskPaymentMethod(pm));
  } catch (err) {
    console.log('Could not fetch trader payment methods');
  }

  sendSuccess(res, {
    id: order.id,
    orderNumber: order.order_number,
    mode: order.mode,
    status: order.status,
    sendCurrency: order.send_currency,
    sendAmount: order.send_amount,
    receiveCurrency: order.receive_currency,
    receiveAmount: order.receive_amount,
    exchangeRate: order.rate,
    feeAmount: order.fee_amount,
    traderId: order.trader_id,
    traderName: order.trader_name || 'Trader',
    traderRating: order.trader_rating,
    traderPaymentMethods: traderPaymentMethods.map(pm => ({
      id: pm.id,
      type: pm.method_type,
      name: pm.provider,
      details: {
        ...(pm.account_holder_name && { account_holder: pm.account_holder_name }),
        ...(pm.bank_name && { bank: pm.bank_name }),
        ...(pm.account_number && { account: pm.account_number }),
        ...(pm.phone_number && { phone: pm.phone_number }),
        ...(pm.iban && { iban: pm.iban }),
      }
    })),
    userId: order.user_id,
    userName: order.user_name,
    recipientName: order.recipient_name,
    recipientPhone: order.recipient_phone,
    recipientBank: order.recipient_bank,
    recipientAccount: order.recipient_account,
    bondLocked: order.bond_locked,
    paymentReference: order.payment_reference,
    paymentProofUrl: order.payment_proof_url,
    createdAt: order.created_at,
    expiresAt: order.expires_at,
    acceptedAt: order.accepted_at,
    paidAt: order.paid_at,
    deliveredAt: order.delivered_at,
    completedAt: order.completed_at,
    cancelledAt: order.cancelled_at
  });
}));

// PUT /api/trades/:id/accept - Trader accepts trade
router.put('/:id/accept', traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;

  const trader = await findTraderByUserId(userId!);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const order = await acceptOrder(id, trader.id);

  sendSuccess(res, {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    bondLocked: order.bond_locked,
    message: 'Trade accepted'
  });
}));

// PUT /api/trades/:id/decline - Trader declines trade
router.put('/:id/decline', traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;
  const { reason, claimType } = req.body;

  const trader = await findTraderByUserId(userId!);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const order = await declineOrder(id, trader.id, reason);

  sendSuccess(res, {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    message: 'Trade declined'
  });
}));

// PUT /api/trades/:id/paid - User marks payment sent
router.put('/:id/paid', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;
  const { paymentReference, paymentProofUrl } = req.body;

  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const order = await markOrderPaid(id, userId, paymentReference, paymentProofUrl);

  sendSuccess(res, {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    message: 'Payment marked as sent'
  });
}));

// PUT /api/trades/:id/delivered - Trader marks delivery done
router.put('/:id/delivered', traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;

  const trader = await findTraderByUserId(userId!);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const order = await markOrderDelivered(id, trader.id);

  sendSuccess(res, {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    message: 'Delivery marked as complete'
  });
}));

// PUT /api/trades/:id/complete - User confirms receipt
router.put('/:id/complete', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const order = await completeOrder(id, userId);

  sendSuccess(res, {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    message: 'Trade completed successfully'
  });
}));

// PUT /api/trades/:id/cancel - Cancel trade (only pending/accepted trades)
router.put('/:id/cancel', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;
  const { reason, claimType } = req.body;

  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const order = await cancelOrder(id, userId, reason);

  sendSuccess(res, {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    message: 'Trade cancelled'
  });
}));

// POST /api/trades/:id/dispute - Open dispute
router.post('/:id/dispute', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;
  const { reason, claimType } = req.body;

  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  if (!claimType) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Please provide a claim type', { field: 'claimType' });
  }

  if (!reason) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Please provide a reason for the dispute', { field: 'reason' });
  }

  const order = await openDispute(id, userId, claimType, reason);

  sendSuccess(res, {
    orderId: order.id,
    orderNumber: order.order_number,
    status: order.status,
    message: 'Dispute opened'
  });
}));

// POST /api/trades/:id/rating - Rate completed trade
router.post('/:id/rating', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;
  const { rating, comment, isAnonymous } = req.body;

  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  if (rating === undefined || rating === null) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Rating is required', { field: 'rating' });
  }

  if (rating < 1 || rating > 5) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Rating must be between 1 and 5', {
      field: 'rating',
      min: 1,
      max: 5
    });
  }

  // Get order
  const order = await findOrderById(id);
  if (!order) {
    throw new AppError(ErrorCode.ORDER_NOT_FOUND);
  }

  if (order.user_id !== userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'You can only rate your own orders');
  }

  if (order.status !== 'completed') {
    throw new AppError(ErrorCode.INVALID_ORDER_STATE, 'Can only rate completed orders');
  }

  // Insert feedback
  await query(
    `INSERT INTO feedback (order_id, from_user_id, to_trader_id, rating_type, rating_value, comment, is_anonymous)
     VALUES ($1, $2, $3, 'numeric', $4, $5, $6)
     ON CONFLICT (order_id, from_user_id) DO UPDATE
     SET rating_value = $4, comment = $5, is_anonymous = $6`,
    [id, userId, order.trader_id, rating, comment || null, isAnonymous || false]
  );

  // Update trader rating
  await query(
    `UPDATE traders
     SET rating = (
       SELECT COALESCE(AVG(rating_value), 5.00)
       FROM feedback
       WHERE to_trader_id = $1 AND rating_type = 'numeric'
     ),
     positive_feedback = (
       SELECT COUNT(*) FROM feedback
       WHERE to_trader_id = $1 AND rating_value >= 4
     ),
     negative_feedback = (
       SELECT COUNT(*) FROM feedback
       WHERE to_trader_id = $1 AND rating_value < 3
     ),
     updated_at = NOW()
     WHERE id = $1`,
    [order.trader_id]
  );

  sendSuccess(res, {
    message: 'Rating submitted',
    rating,
    comment
  });
}));

export default router;
