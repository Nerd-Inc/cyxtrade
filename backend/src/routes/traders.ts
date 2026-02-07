import { Router } from 'express';
import { AuthRequest, authMiddleware, traderMiddleware } from '../middleware/auth';
import {
  findTraderById,
  findTraderByUserId,
  listTraders,
  createTraderApplication,
  updateTraderStatus,
  updateTraderCorridors,
  Corridor
} from '../services/traderService';
import { paymentMethodService } from '../services/paymentMethodService';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

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

    // Transform for API response
    traders = result.traders.map(t => ({
      id: t.id,
      displayName: t.display_name,
      status: t.status,
      corridors: t.corridors,
      rating: t.rating,
      totalTrades: t.total_trades,
      isOnline: t.is_online,
      bondAmount: t.bond_amount,
      bondAvailable: t.bond_amount - t.bond_locked
    }));
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
  const { id } = req.params;

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
    isOnline: trader.is_online,
    bondAmount: trader.bond_amount,
    bondAvailable: trader.bond_amount - trader.bond_locked,
    createdAt: trader.created_at
  });
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

  const method = await paymentMethodService.getPaymentMethod(req.params.id);
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
      req.params.id,
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
    await paymentMethodService.deletePaymentMethod(req.params.id, trader.id);
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
    await paymentMethodService.setPrimary(trader.id, req.params.id);
    sendSuccess(res, { message: 'Primary payment method updated' });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw new AppError(ErrorCode.PAYMENT_METHOD_NOT_FOUND);
    }
    throw new AppError(ErrorCode.VALIDATION_ERROR, error.message || 'Failed to set primary payment method');
  }
}));

// GET /api/traders/:id/payment-details - Get trader's payment details for a trade (public for trade parties)
router.get('/:id/payment-details', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const traderId = req.params.id;

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
