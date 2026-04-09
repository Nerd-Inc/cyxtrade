import { Router } from 'express';
import crypto from 'crypto';
import { queryOne } from '../services/db';
import { AuthRequest, authMiddleware, traderMiddleware } from '../middleware/auth';
import {
  findTraderById,
  findTraderByUserId,
  listTraders,
  createTraderApplication,
  approveTrader,
  updateTraderStatus,
  updateTraderCorridors,
  updateTraderWalletAddress,
  getTraderScorecard,
  Corridor
} from '../services/traderService';
import { paymentMethodService } from '../services/paymentMethodService';
import {
  initiateVerification,
  submitVerificationProof,
  getVerificationStatus,
  cancelVerification
} from '../services/paymentVerificationService';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Helper to ensure param is string (Express 5 types params as string | string[])
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

// Generate a Tron-style address (T + base58 encoded)
function generateTronAddress(): string {
  // In production, use TronWeb.createAccount()
  // For now, generate a mock but valid-looking Tron address
  const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const addressLength = 33; // Tron addresses are 34 chars starting with T

  let address = 'T';
  for (let i = 0; i < addressLength; i++) {
    address += BASE58_CHARS[Math.floor(Math.random() * BASE58_CHARS.length)];
  }
  return address;
}

// Mock traders for development (when DB is not available)
const mockTraders = [
  {
    id: 'trader-001',
    displayName: 'Mamadou Diallo',
    status: 'active',
    corridors: [{ from: 'AED', to: 'XAF', buyRate: 163, sellRate: 160 }],
    rating: 4.9,
    totalTrades: 47,
    isOnline: true,
    bondAmount: 2000,
    bondAvailable: 1800
  },
  {
    id: 'trader-002',
    displayName: 'Ibrahim Sow',
    status: 'active',
    corridors: [{ from: 'AED', to: 'XAF', buyRate: 162, sellRate: 159 }],
    rating: 4.7,
    totalTrades: 32,
    isOnline: true,
    bondAmount: 1500,
    bondAvailable: 1200
  },
  {
    id: 'trader-003',
    displayName: 'Fatou Kamara',
    status: 'active',
    corridors: [{ from: 'AED', to: 'XAF', buyRate: 164, sellRate: 161 }],
    rating: 4.8,
    totalTrades: 58,
    isOnline: true,
    bondAmount: 3000,
    bondAvailable: 2500
  }
];

// GET /api/traders - List traders (public)
router.get('/', asyncHandler(async (req, res) => {
  const { from, to, online, limit, offset } = req.query;

  let traders;
  let total;

  try {
    const result = await listTraders({
      from: from as string,
      to: to as string,
      online: online === 'true' ? true : online === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    // Transform for API response with scorecard data
    traders = result.traders.map(t => {
      const totalFeedback = (t.positive_feedback || 0) + (t.negative_feedback || 0);
      const feedbackScore = totalFeedback > 0
        ? Math.round(((t.positive_feedback || 0) / totalFeedback) * 100)
        : 100;

      return {
        id: t.id,
        displayName: t.display_name,
        status: t.status,
        corridors: t.corridors,
        rating: t.rating,
        totalTrades: t.total_trades,
        completedTrades: t.completed_trades || t.total_trades,
        isOnline: t.is_online,
        bondAmount: t.bond_amount,
        bondAvailable: t.bond_amount - t.bond_locked,
        // Scorecard fields
        avgReleaseTimeMins: t.avg_release_time_mins,
        positiveFeedback: t.positive_feedback || 0,
        negativeFeedback: t.negative_feedback || 0,
        feedbackScore,
        trades30d: t.trades_30d || 0,
        completionRate30d: t.completion_rate_30d,
        createdAt: t.created_at
      };
    });
    total = result.total;
  } catch (dbError) {
    // Database not available - use mock traders
    console.log('⚠️ Database not available, using mock traders');
    traders = mockTraders;
    total = mockTraders.length;
  }

  sendSuccess(res, { traders, total });
}));

// GET /api/traders/me - Get own trader profile (must come before /:id)
router.get('/me', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER, 'You are not registered as a trader');
  }

  sendSuccess(res, {
    id: trader.id,
    userId: trader.user_id,
    address: trader.wallet_address,
    displayName: trader.display_name,
    phone: trader.phone,
    status: trader.status,
    bondAmount: trader.bond_amount,
    bondLocked: trader.bond_locked,
    bondAvailable: trader.bond_amount - trader.bond_locked,
    corridors: trader.corridors,
    rating: trader.rating,
    totalTrades: trader.total_trades,
    isOnline: trader.is_online,
    approvedAt: trader.approved_at,
    createdAt: trader.created_at
  });
}));

// GET /api/traders/:id - Get trader details (public)
router.get('/:id', asyncHandler(async (req, res) => {
  const id = getParam(req.params.id);

  const trader = await findTraderById(id);
  if (!trader) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND);
  }

  sendSuccess(res, {
    id: trader.id,
    displayName: trader.display_name,
    status: trader.status,
    corridors: trader.corridors,
    rating: trader.rating,
    totalTrades: trader.total_trades,
    completedTrades: trader.completed_trades || trader.total_trades,
    isOnline: trader.is_online,
    bondAmount: trader.bond_amount,
    bondAvailable: trader.bond_amount - trader.bond_locked,
    // Scorecard fields
    avgReleaseTimeMins: trader.avg_release_time_mins,
    avgPayTimeMins: trader.avg_pay_time_mins,
    positiveFeedback: trader.positive_feedback || 0,
    negativeFeedback: trader.negative_feedback || 0,
    trades30d: trader.trades_30d || 0,
    completionRate30d: trader.completion_rate_30d,
    totalVolume: trader.total_volume || 0,
    createdAt: trader.created_at
  });
}));

// GET /api/traders/:id/scorecard - Get detailed trader scorecard (public)
router.get('/:id/scorecard', asyncHandler(async (req, res) => {
  const id = getParam(req.params.id);

  const scorecard = await getTraderScorecard(id);
  if (!scorecard) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND);
  }

  sendSuccess(res, scorecard);
}));

// POST /api/traders/apply - Apply to become trader (auth required)
router.post('/apply', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { corridors } = req.body;

  if (!corridors || !Array.isArray(corridors) || corridors.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'At least one corridor is required');
  }

  // Check if already a trader
  const existing = await findTraderByUserId(userId);
  if (existing) {
    throw new AppError(ErrorCode.TRADER_ALREADY_EXISTS, 'You already have a trader account or pending application');
  }

  const trader = await createTraderApplication(userId, corridors as Corridor[]);

  sendSuccess(res, {
    message: 'Application submitted',
    applicationId: trader.id,
    status: trader.status
  }, 201);
}));

// POST /api/traders/register - Quick registration with auto-generated address
router.post('/register', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  // Check if already a trader
  const existing = await findTraderByUserId(userId);
  if (existing) {
    let addressForResponse = existing.wallet_address;
    if (!addressForResponse) {
      addressForResponse = generateTronAddress();
      await updateTraderWalletAddress(existing.id, addressForResponse);
    }

    sendSuccess(res, {
      message: existing.status === 'active' ? 'Already registered' : 'Application pending admin approval',
      traderId: existing.id,
      address: addressForResponse,
      status: existing.status,
      isNew: false
    });
    return;
  }

  // Generate and persist a new Tron address for deposits
  const address = generateTronAddress();
  console.log(`Generated trader address for ${userId}: ${address}`);

  const defaultCorridor: Corridor = { from: 'AED', to: 'XAF', buyRate: 162, sellRate: 159 };
  const createdTrader = await createTraderApplication(userId, [defaultCorridor]);
  await updateTraderWalletAddress(createdTrader.id, address);

  sendSuccess(res, {
    message: 'Registration submitted, pending admin approval',
    traderId: createdTrader.id,
    address: address,
    status: 'pending',
    isNew: true,
    instructions: {
      minDeposit: '100 USDT',
      network: 'TRC20 (Tron)',
      confirmations: 19,
      estimatedTime: '1-3 minutes'
    }
  }, 201);
}));

// GET /api/traders/me/address - Get trader's deposit address
router.get('/me/address', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER, 'You are not registered as a trader');
  }

  if (!trader.wallet_address) {
    throw new AppError(ErrorCode.NOT_A_TRADER, 'Trader address not found');
  }

  sendSuccess(res, { address: trader.wallet_address });
}));

// PUT /api/traders/me - Update trader profile (trader required)
router.put('/me', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { corridors } = req.body;

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  if (corridors) {
    await updateTraderCorridors(trader.id, corridors as Corridor[]);
  }

  sendSuccess(res, { message: 'Trader profile updated' });
}));

// PUT /api/traders/me/status - Go online/offline (trader required)
router.put('/me/status', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { online } = req.body;

  if (typeof online !== 'boolean') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'online must be a boolean', { field: 'online' });
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  await updateTraderStatus(trader.id, online);

  sendSuccess(res, {
    online,
    message: online ? 'You are now online' : 'You are now offline'
  });
}));

// ============================================
// Payment Methods Routes
// ============================================

// GET /api/traders/me/payment-methods - List payment methods
router.get('/me/payment-methods', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const methods = await paymentMethodService.getPaymentMethods(trader.id);

  // Mask sensitive data for response
  const maskedMethods = methods.map(m => paymentMethodService.maskPaymentMethod(m));

  sendSuccess(res, { paymentMethods: maskedMethods });
}));

// POST /api/traders/me/payment-methods - Add payment method
router.post('/me/payment-methods', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  try {
    const method = await paymentMethodService.addPaymentMethod(trader.id, req.body);

    sendSuccess(res, {
      message: 'Payment method added',
      paymentMethod: paymentMethodService.maskPaymentMethod(method)
    }, 201);
  } catch (error: any) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, error.message || 'Failed to add payment method');
  }
}));

// GET /api/traders/me/payment-methods/:id - Get single payment method
router.get('/me/payment-methods/:id', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const method = await paymentMethodService.getPaymentMethod(getParam(req.params.id));
  if (!method || method.trader_id !== trader.id) {
    throw new AppError(ErrorCode.PAYMENT_METHOD_NOT_FOUND);
  }

  sendSuccess(res, { paymentMethod: paymentMethodService.maskPaymentMethod(method) });
}));

// PUT /api/traders/me/payment-methods/:id - Update payment method
router.put('/me/payment-methods/:id', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  try {
    const method = await paymentMethodService.updatePaymentMethod(
      getParam(req.params.id),
      trader.id,
      req.body
    );

    sendSuccess(res, {
      message: 'Payment method updated',
      paymentMethod: paymentMethodService.maskPaymentMethod(method)
    });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw new AppError(ErrorCode.PAYMENT_METHOD_NOT_FOUND);
    }
    throw new AppError(ErrorCode.VALIDATION_ERROR, error.message || 'Failed to update payment method');
  }
}));

// DELETE /api/traders/me/payment-methods/:id - Delete payment method
router.delete('/me/payment-methods/:id', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  try {
    await paymentMethodService.deletePaymentMethod(getParam(req.params.id), trader.id);
    sendSuccess(res, { message: 'Payment method deleted' });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw new AppError(ErrorCode.PAYMENT_METHOD_NOT_FOUND);
    }
    throw new AppError(ErrorCode.VALIDATION_ERROR, error.message || 'Failed to delete payment method');
  }
}));

// PUT /api/traders/me/payment-methods/:id/primary - Set as primary
router.put('/me/payment-methods/:id/primary', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  try {
    await paymentMethodService.setPrimary(trader.id, getParam(req.params.id));
    sendSuccess(res, { message: 'Primary payment method updated' });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw new AppError(ErrorCode.PAYMENT_METHOD_NOT_FOUND);
    }
    throw new AppError(ErrorCode.VALIDATION_ERROR, error.message || 'Failed to set primary payment method');
  }
}));

// ============================================
// Payment Method Verification Routes
// ============================================

// POST /api/traders/me/payment-methods/:id/verify - Initiate verification
router.post('/me/payment-methods/:id/verify', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const result = await initiateVerification(getParam(req.params.id), trader.id);

  sendSuccess(res, {
    code: result.code,
    amount: result.amount,
    instructions: result.instructions,
    expiresAt: result.expiresAt
  });
}));

// POST /api/traders/me/payment-methods/:id/proof - Submit verification proof (screenshot)
router.post('/me/payment-methods/:id/proof', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const { proofUrl } = req.body;
  if (!proofUrl) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Proof URL is required', { field: 'proofUrl' });
  }

  const result = await submitVerificationProof(getParam(req.params.id), trader.id, proofUrl);

  sendSuccess(res, {
    verified: result.verified,
    message: 'Payment method verified successfully'
  });
}));

// GET /api/traders/me/payment-methods/:id/verification-status - Get verification status
router.get('/me/payment-methods/:id/verification-status', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const status = await getVerificationStatus(getParam(req.params.id), trader.id);

  sendSuccess(res, status);
}));

// DELETE /api/traders/me/payment-methods/:id/verify - Cancel verification
router.delete('/me/payment-methods/:id/verify', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  await cancelVerification(getParam(req.params.id), trader.id);

  sendSuccess(res, { message: 'Verification cancelled' });
}));

// GET /api/traders/:id/payment-details - Get trader's payment details for a trade (trade parties only)
router.get('/:id/payment-details', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }
  const traderId = getParam(req.params.id);

  // Verify requester has an active trade with this trader
  const activeTrade = await queryOne<{ id: string }>(
    `SELECT id FROM orders
     WHERE trader_id = $1
       AND user_id = $2
       AND status IN ('pending', 'accepted', 'paid', 'delivering', 'releasing', 'released')
     LIMIT 1`,
    [traderId, userId]
  );
  if (!activeTrade) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'You must have an active trade with this trader to view payment details');
  }

  // Get trader's primary payment method
  const method = await paymentMethodService.getPrimaryPaymentMethod(traderId);
  if (!method) {
    throw new AppError(ErrorCode.NO_PAYMENT_METHOD, 'Trader has no payment methods configured');
  }

  // Return full details (not masked) for trade counterparty
  sendSuccess(res, {
    paymentMethod: {
      id: method.id,
      methodType: method.method_type,
      provider: method.provider,
      accountHolderName: method.account_holder_name,
      phoneNumber: method.phone_number,
      bankName: method.bank_name,
      accountNumber: method.account_number,
      iban: method.iban,
      swiftCode: method.swift_code,
      currency: method.currency
    }
  });
}));

export default router;

