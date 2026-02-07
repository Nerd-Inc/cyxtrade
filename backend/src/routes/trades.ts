import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, traderMiddleware } from '../middleware/auth';
import {
  createTrade,
  findTradeById,
  listTradesForUser,
  listTradesForTrader,
  acceptTrade,
  declineTrade,
  markTradePaid,
  markTradeDelivered,
  completeTrade,
  openDispute,
  rateTrade
} from '../services/tradeService';
import { findTraderByUserId, findTraderById } from '../services/traderService';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Helper to safely get string param
const getParam = (val: string | string[] | undefined): string =>
  Array.isArray(val) ? val[0] : (val ?? '');

// In-memory trade store for development (when DB is not available)
const mockTrades = new Map<string, any>();

// POST /api/trades - Create new trade request
router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const {
    traderId,
    sendCurrency,
    sendAmount,
    receiveCurrency,
    receiveAmount,
    rate,
    recipientName,
    recipientPhone,
    recipientMethod
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

  let trade;

  try {
    // Validate trader exists
    const trader = await findTraderById(traderId);
    if (!trader) {
      throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found');
    }
    if (trader.status !== 'active') {
      throw new AppError(ErrorCode.TRADER_OFFLINE, 'This trader is currently unavailable');
    }

    trade = await createTrade({
      userId,
      traderId,
      sendCurrency,
      sendAmount,
      receiveCurrency,
      receiveAmount,
      rate,
      recipientName,
      recipientPhone,
      recipientMethod
    });
  } catch (err) {
    if (err instanceof AppError) throw err;

    // Database not available - create mock trade
    console.log('⚠️ Database not available, creating mock trade');
    trade = {
      id: uuidv4(),
      user_id: userId,
      trader_id: traderId,
      send_currency: sendCurrency,
      send_amount: sendAmount,
      receive_currency: receiveCurrency,
      receive_amount: receiveAmount,
      rate,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_method: recipientMethod,
      status: 'pending',
      created_at: new Date(),
      trader_name: 'Mamadou Diallo',
      trader_rating: 4.9
    };
    mockTrades.set(trade.id, trade);
  }

  sendSuccess(res, {
    id: trade.id,
    status: trade.status,
    message: 'Trade request created'
  }, 201);
}));

// GET /api/trades - List my trades
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { status, role, limit, offset } = req.query;

  let result;

  try {
    // Check if user is a trader
    const trader = await findTraderByUserId(userId);
    const isTrader = role === 'trader' && trader?.status === 'active';

    if (isTrader) {
      result = await listTradesForTrader(userId, {
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
    } else {
      result = await listTradesForUser(userId, {
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
    }
  } catch (dbError) {
    // Database not available - return mock trades for this user
    console.log('⚠️ Database not available, using mock trades');
    const userTrades = Array.from(mockTrades.values())
      .filter(t => t.user_id === userId)
      .map(t => ({
        id: t.id,
        sendAmount: t.send_amount,
        sendCurrency: t.send_currency,
        receiveAmount: t.receive_amount,
        receiveCurrency: t.receive_currency,
        status: t.status,
        recipientName: t.recipient_name,
        traderName: t.trader_name,
        createdAt: t.created_at
      }));
    result = { trades: userTrades, total: userTrades.length };
  }

  sendSuccess(res, result);
}));

// GET /api/trades/:id - Get trade details
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const id = getParam(req.params.id);

  let trade;

  try {
    trade = await findTradeById(id);
    if (!trade) {
      // Check mock trades
      trade = mockTrades.get(id);
    }
  } catch (dbError) {
    // Database not available - check mock trades
    console.log('⚠️ Database not available, checking mock trades');
    trade = mockTrades.get(id);
  }

  if (!trade) {
    throw new AppError(ErrorCode.TRADE_NOT_FOUND);
  }

  sendSuccess(res, {
    id: trade.id,
    status: trade.status,
    sendCurrency: trade.send_currency,
    sendAmount: trade.send_amount,
    receiveCurrency: trade.receive_currency,
    receiveAmount: trade.receive_amount,
    rate: trade.rate,
    trader: {
      id: trade.trader_id,
      displayName: trade.trader_name || 'Mamadou Diallo',
      rating: trade.trader_rating || 4.9
    },
    user: {
      id: trade.user_id,
      displayName: trade.user_name,
      phone: trade.user_phone
    },
    recipientName: trade.recipient_name,
    recipientPhone: trade.recipient_phone,
    recipientMethod: trade.recipient_method,
    bondLocked: trade.bond_locked,
    paymentReference: trade.payment_reference,
    paymentProofUrl: trade.payment_proof_url,
    createdAt: trade.created_at,
    acceptedAt: trade.accepted_at,
    paidAt: trade.paid_at,
    deliveredAt: trade.delivered_at,
    completedAt: trade.completed_at
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

  const trade = await acceptTrade(id, trader.id);
  if (!trade) {
    throw new AppError(
      ErrorCode.INVALID_TRADE_STATE,
      'Cannot accept this trade. It may have been cancelled, already accepted, or you may have insufficient bond.'
    );
  }

  sendSuccess(res, {
    id: trade.id,
    status: trade.status,
    bondLocked: trade.bond_locked,
    message: 'Trade accepted'
  });
}));

// PUT /api/trades/:id/decline - Trader declines trade
router.put('/:id/decline', traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;

  const trader = await findTraderByUserId(userId!);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const trade = await declineTrade(id, trader.id);
  if (!trade) {
    throw new AppError(ErrorCode.INVALID_TRADE_STATE, 'Cannot decline this trade');
  }

  sendSuccess(res, {
    id: trade.id,
    status: trade.status,
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

  const trade = await markTradePaid(id, userId, {
    reference: paymentReference,
    proofUrl: paymentProofUrl
  });

  if (!trade) {
    throw new AppError(
      ErrorCode.INVALID_TRADE_STATE,
      'Cannot mark as paid. The trade may not be in the correct state.'
    );
  }

  sendSuccess(res, {
    id: trade.id,
    status: trade.status,
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

  const trade = await markTradeDelivered(id, trader.id);
  if (!trade) {
    throw new AppError(ErrorCode.INVALID_TRADE_STATE, 'Cannot mark as delivered');
  }

  sendSuccess(res, {
    id: trade.id,
    status: trade.status,
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

  const trade = await completeTrade(id, userId);
  if (!trade) {
    throw new AppError(ErrorCode.INVALID_TRADE_STATE, 'Cannot complete this trade');
  }

  sendSuccess(res, {
    id: trade.id,
    status: trade.status,
    message: 'Trade completed successfully'
  });
}));

// PUT /api/trades/:id/cancel - Cancel trade (only pending trades)
router.put('/:id/cancel', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  // For now, only users can cancel their pending trades
  const trade = await findTradeById(id);
  if (!trade) {
    throw new AppError(ErrorCode.TRADE_NOT_FOUND);
  }

  if (trade.user_id !== userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'You can only cancel your own trades');
  }

  if (trade.status !== 'pending') {
    throw new AppError(ErrorCode.TRADE_CANNOT_BE_CANCELLED, 'Only pending trades can be cancelled');
  }

  // Use decline which sets cancelled status
  await declineTrade(id, trade.trader_id);

  sendSuccess(res, {
    id: trade.id,
    status: 'cancelled',
    message: 'Trade cancelled'
  });
}));

// POST /api/trades/:id/dispute - Open dispute
router.post('/:id/dispute', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;
  const { reason } = req.body;

  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  if (!reason) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Please provide a reason for the dispute', { field: 'reason' });
  }

  const result = await openDispute(id, userId, reason);
  if (!result) {
    throw new AppError(
      ErrorCode.INVALID_TRADE_STATE,
      'Cannot open a dispute on this trade. It may already be completed or cancelled.'
    );
  }

  sendSuccess(res, {
    disputeId: result.disputeId,
    tradeId: id,
    status: 'disputed',
    message: 'Dispute opened'
  });
}));

// POST /api/trades/:id/rating - Rate completed trade
router.post('/:id/rating', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req.params.id);
  const userId = req.user?.id;
  const { rating, comment } = req.body;

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

  try {
    await rateTrade(id, userId, rating, comment);
  } catch (error: any) {
    if (error.message?.includes('already rated')) {
      throw new AppError(ErrorCode.TRADE_ALREADY_RATED);
    }
    throw error;
  }

  sendSuccess(res, {
    message: 'Rating submitted',
    rating,
    comment
  });
}));

export default router;
