import { Router } from 'express';
import { AuthRequest, authMiddleware, traderMiddleware } from '../../middleware/auth';
import {
  createOrder,
  findOrderById,
  findOrderByNumber,
  listUserOrders,
  listTraderOrders,
  markOrderPaid,
  releaseOrder,
  completeOrder,
  cancelOrder,
  openOrderDispute,
  getUserOrderStats,
  getTraderOrderStats,
  CreateOrderDTO,
} from '../../services/p2pOrderService';
import {
  getOrderMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  getConversations,
} from '../../services/p2pChatService';
import {
  submitFeedback,
  hasUserLeftFeedback,
} from '../../services/p2pSocialService';
import { findTraderByUserId } from '../../services/traderService';
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
// User Order Routes
// ============================================

// POST /api/pro/orders - Create new order
router.post('/', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const data: CreateOrderDTO = {
    ad_id: req.body.adId,
    amount: req.body.amount,
    payment_method_id: req.body.paymentMethodId,
  };

  if (!data.ad_id) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Ad ID is required', { field: 'adId' });
  }
  if (!data.amount || data.amount <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Amount must be positive');
  }

  const order = await createOrder(userId, data);

  sendSuccess(res, {
    message: 'Order created successfully',
    order: {
      id: order.id,
      orderNumber: order.order_number,
      type: order.type,
      asset: order.asset,
      fiatCurrency: order.fiat_currency,
      amount: order.amount,
      price: order.price,
      totalFiat: order.total_fiat,
      status: order.status,
      expiresAt: order.expires_at,
      createdAt: order.created_at,
    },
  }, 201);
}));

// GET /api/pro/orders - List user's orders
router.get('/', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { status, limit, offset } = req.query;

  const result = await listUserOrders(userId, {
    status: status as string,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  const orders = result.orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    type: order.type,
    asset: order.asset,
    fiatCurrency: order.fiat_currency,
    amount: order.amount,
    price: order.price,
    totalFiat: order.total_fiat,
    status: order.status,
    traderName: order.trader_display_name,
    traderRating: order.trader_rating,
    expiresAt: order.expires_at,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    releasedAt: order.released_at,
    completedAt: order.completed_at,
  }));

  sendSuccess(res, { orders, total: result.total });
}));

// GET /api/pro/orders/stats - Get user's order stats
router.get('/stats', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const stats = await getUserOrderStats(userId);

  sendSuccess(res, {
    totalOrders: stats.total_orders,
    completedOrders: stats.completed_orders,
    totalVolume: stats.total_volume,
    completionRate: stats.completion_rate,
  });
}));

// GET /api/pro/orders/conversations - Get chat conversations
router.get('/conversations', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { limit, offset } = req.query;

  const conversations = await getConversations(userId, {
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  sendSuccess(res, {
    conversations: conversations.map((c) => ({
      orderId: c.order_id,
      orderNumber: c.order_number,
      orderStatus: c.order_status,
      counterpartyId: c.counterparty_id,
      counterpartyName: c.counterparty_name,
      counterpartyAvatar: c.counterparty_avatar,
      lastMessage: c.last_message,
      lastMessageType: c.last_message_type,
      lastMessageAt: c.last_message_at,
      unreadCount: c.unread_count,
      totalFiat: c.total_fiat,
      fiatCurrency: c.fiat_currency,
      type: c.type,
    })),
  });
}));

// GET /api/pro/orders/:id - Get order details
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  let order = await findOrderById(orderId);

  // Try by order number if not found by ID
  if (!order) {
    order = await findOrderByNumber(orderId);
  }

  if (!order) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Order not found');
  }

  // Check if user is participant
  const trader = await findTraderByUserId(userId);
  const isParticipant = order.user_id === userId || (trader && trader.id === order.trader_id);

  if (!isParticipant) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized to view this order');
  }

  // Check if user has left feedback
  const hasFeedback = await hasUserLeftFeedback(userId, order.id);

  sendSuccess(res, {
    id: order.id,
    orderNumber: order.order_number,
    adId: order.ad_id,
    type: order.type,
    asset: order.asset,
    fiatCurrency: order.fiat_currency,
    amount: order.amount,
    price: order.price,
    totalFiat: order.total_fiat,
    status: order.status,
    traderName: order.trader_display_name,
    traderRating: order.trader_rating,
    userName: order.user_display_name,
    paymentMethod: order.payment_method,
    paymentReference: order.payment_reference,
    paymentProofUrl: order.payment_proof_url,
    expiresAt: order.expires_at,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    releasedAt: order.released_at,
    completedAt: order.completed_at,
    canceledAt: order.canceled_at,
    cancelReason: order.cancel_reason,
    hasFeedback,
    isTrader: trader && trader.id === order.trader_id,
  });
}));

// PUT /api/pro/orders/:id/pay - Mark order as paid
router.put('/:id/pay', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  const { reference, proofUrl } = req.body;

  const order = await markOrderPaid(orderId, userId, { reference, proofUrl });

  if (!order) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Order not found or cannot be marked as paid');
  }

  sendSuccess(res, {
    message: 'Order marked as paid',
    status: order.status,
    paidAt: order.paid_at,
  });
}));

// PUT /api/pro/orders/:id/complete - Complete order (buyer confirms receipt)
router.put('/:id/complete', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  const order = await completeOrder(orderId, userId);

  if (!order) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Order not found or cannot be completed');
  }

  sendSuccess(res, {
    message: 'Order completed successfully',
    status: order.status,
    completedAt: order.completed_at,
  });
}));

// PUT /api/pro/orders/:id/cancel - Cancel order
router.put('/:id/cancel', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  const { reason } = req.body;

  const order = await cancelOrder(orderId, userId, reason);

  if (!order) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Order not found or cannot be cancelled');
  }

  sendSuccess(res, {
    message: 'Order cancelled',
    status: order.status,
    canceledAt: order.canceled_at,
  });
}));

// POST /api/pro/orders/:id/dispute - Open dispute
router.post('/:id/dispute', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  const { reason } = req.body;

  if (!reason) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Reason is required', { field: 'reason' });
  }

  const result = await openOrderDispute(orderId, userId, reason);

  if (!result) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Order not found or cannot open dispute');
  }

  sendSuccess(res, {
    message: 'Dispute opened',
    disputeId: result.disputeId,
    status: result.order.status,
  });
}));

// POST /api/pro/orders/:id/feedback - Submit feedback
router.post('/:id/feedback', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  const { rating, comment } = req.body;

  if (!rating || !['positive', 'negative'].includes(rating)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Rating must be positive or negative');
  }

  const feedback = await submitFeedback(userId, orderId, rating, comment);

  sendSuccess(res, {
    message: 'Feedback submitted',
    feedbackId: feedback.id,
  });
}));

// ============================================
// Order Chat Routes
// ============================================

// GET /api/pro/orders/:id/messages - Get order messages
router.get('/:id/messages', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  const { limit, before } = req.query;

  const messages = await getOrderMessages(orderId, userId, {
    limit: limit ? parseInt(limit as string) : undefined,
    before: before as string,
  });

  sendSuccess(res, {
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_display_name,
      senderAvatar: m.sender_avatar_url,
      type: m.message_type,
      content: m.content,
      imageUrl: m.image_url,
      readAt: m.read_at,
      createdAt: m.created_at,
    })),
  });
}));

// POST /api/pro/orders/:id/messages - Send message
router.post('/:id/messages', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  const { type, content, imageUrl } = req.body;

  const message = await sendMessage(userId, {
    order_id: orderId,
    message_type: type,
    content,
    image_url: imageUrl,
  });

  sendSuccess(res, {
    message: {
      id: message.id,
      senderId: message.sender_id,
      senderName: message.sender_display_name,
      senderAvatar: message.sender_avatar_url,
      type: message.message_type,
      content: message.content,
      imageUrl: message.image_url,
      createdAt: message.created_at,
    },
  }, 201);
}));

// PUT /api/pro/orders/:id/messages/read - Mark messages as read
router.put('/:id/messages/read', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  const count = await markMessagesAsRead(orderId, userId);

  sendSuccess(res, { markedRead: count });
}));

// GET /api/pro/orders/:id/messages/unread - Get unread count
router.get('/:id/messages/unread', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const orderId = getParam(req.params.id);
  const count = await getUnreadCount(orderId, userId);

  sendSuccess(res, { unreadCount: count });
}));

// ============================================
// Trader Order Routes
// ============================================

// GET /api/pro/orders/trader/list - List trader's orders
router.get('/trader/list', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const { status, limit, offset } = req.query;

  const result = await listTraderOrders(trader.id, {
    status: status as string,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  const orders = result.orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    type: order.type,
    asset: order.asset,
    fiatCurrency: order.fiat_currency,
    amount: order.amount,
    price: order.price,
    totalFiat: order.total_fiat,
    status: order.status,
    userName: order.user_display_name,
    expiresAt: order.expires_at,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    releasedAt: order.released_at,
    completedAt: order.completed_at,
  }));

  sendSuccess(res, { orders, total: result.total });
}));

// GET /api/pro/orders/trader/stats - Get trader's order stats
router.get('/trader/stats', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const stats = await getTraderOrderStats(trader.id);

  sendSuccess(res, {
    totalOrders: stats.total_orders,
    activeOrders: stats.active_orders,
    completedOrders: stats.completed_orders,
    totalVolume: stats.total_volume,
    avgReleaseTime: stats.avg_release_time_minutes,
  });
}));

// PUT /api/pro/orders/:id/release - Release crypto to buyer (trader action)
router.put('/:id/release', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const orderId = getParam(req.params.id);
  const order = await releaseOrder(orderId, trader.id);

  if (!order) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Order not found or cannot be released');
  }

  sendSuccess(res, {
    message: 'Crypto released to buyer',
    status: order.status,
    releasedAt: order.released_at,
  });
}));

export default router;
