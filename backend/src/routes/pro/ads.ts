import { Router } from 'express';
import { AuthRequest, authMiddleware, traderMiddleware } from '../../middleware/auth';
import {
  createAd,
  findAdById,
  listAds,
  listTraderAds,
  updateAd,
  setAdStatus,
  closeAd,
  getTraderAdStats,
  CreateAdDTO,
} from '../../services/adService';
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
// Public Ad Routes
// ============================================

// GET /api/pro/ads - List ads (public marketplace)
router.get('/', asyncHandler(async (req, res) => {
  const {
    type,
    asset,
    fiat_currency,
    min_amount,
    sort_by,
    sort_order,
    limit,
    offset,
  } = req.query;

  const result = await listAds({
    type: type as 'buy' | 'sell' | undefined,
    asset: asset as string,
    fiat_currency: fiat_currency as string,
    min_amount: min_amount ? parseFloat(min_amount as string) : undefined,
    sort_by: sort_by as 'price' | 'rating' | 'trades' | 'created_at',
    sort_order: sort_order as 'asc' | 'desc',
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  // Transform for API response
  const ads = result.ads.map((ad) => ({
    id: ad.id,
    traderId: ad.trader_id,
    traderName: ad.trader_display_name,
    traderRating: ad.trader_rating,
    traderTrades: ad.trader_total_trades,
    traderCompletionRate: ad.trader_completion_rate,
    type: ad.type,
    asset: ad.asset,
    fiatCurrency: ad.fiat_currency,
    priceType: ad.price_type,
    price: ad.price,
    floatingMargin: ad.floating_margin,
    availableAmount: ad.available_amount,
    minLimit: ad.min_limit,
    maxLimit: ad.max_limit,
    paymentTimeLimit: ad.payment_time_limit,
    termsTags: ad.terms_tags,
    isPromoted: ad.is_promoted,
    paymentMethods: ad.payment_methods?.map((pm) => ({
      id: pm.payment_method_id,
      type: pm.method_type,
      provider: pm.provider,
      isRecommended: pm.is_recommended,
    })),
  }));

  sendSuccess(res, { ads, total: result.total });
}));

// GET /api/pro/ads/:id - Get ad details
router.get('/:id', asyncHandler(async (req, res) => {
  const id = getParam(req.params.id);
  const ad = await findAdById(id);

  if (!ad) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Ad not found');
  }

  sendSuccess(res, {
    id: ad.id,
    traderId: ad.trader_id,
    traderName: ad.trader_display_name,
    traderRating: ad.trader_rating,
    traderTrades: ad.trader_total_trades,
    traderCompletionRate: ad.trader_completion_rate,
    type: ad.type,
    asset: ad.asset,
    fiatCurrency: ad.fiat_currency,
    priceType: ad.price_type,
    price: ad.price,
    floatingMargin: ad.floating_margin,
    totalAmount: ad.total_amount,
    availableAmount: ad.available_amount,
    minLimit: ad.min_limit,
    maxLimit: ad.max_limit,
    paymentTimeLimit: ad.payment_time_limit,
    termsTags: ad.terms_tags,
    terms: ad.terms,
    autoReply: ad.auto_reply,
    remarks: ad.remarks,
    status: ad.status,
    isPromoted: ad.is_promoted,
    regionRestrictions: ad.region_restrictions,
    counterpartyConditions: ad.counterparty_conditions,
    paymentMethods: ad.payment_methods?.map((pm) => ({
      id: pm.payment_method_id,
      type: pm.method_type,
      provider: pm.provider,
      accountHolderName: pm.account_holder_name,
      isRecommended: pm.is_recommended,
    })),
    createdAt: ad.created_at,
  });
}));

// ============================================
// Trader Ad Routes (auth required)
// ============================================

// GET /api/pro/ads/my/list - List trader's own ads
router.get('/my/list', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const { status, limit, offset } = req.query;

  const result = await listTraderAds(trader.id, {
    status: status as 'online' | 'offline' | 'closed' | undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  const ads = result.ads.map((ad) => ({
    id: ad.id,
    type: ad.type,
    asset: ad.asset,
    fiatCurrency: ad.fiat_currency,
    price: ad.price,
    totalAmount: ad.total_amount,
    availableAmount: ad.available_amount,
    minLimit: ad.min_limit,
    maxLimit: ad.max_limit,
    status: ad.status,
    isPromoted: ad.is_promoted,
    paymentMethods: ad.payment_methods?.map((pm) => ({
      id: pm.payment_method_id,
      type: pm.method_type,
      provider: pm.provider,
    })),
    createdAt: ad.created_at,
  }));

  sendSuccess(res, { ads, total: result.total });
}));

// GET /api/pro/ads/my/stats - Get trader's ad stats
router.get('/my/stats', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const stats = await getTraderAdStats(trader.id);

  sendSuccess(res, {
    totalAds: stats.total_ads,
    onlineAds: stats.online_ads,
    offlineAds: stats.offline_ads,
    totalVolume: stats.total_volume,
    availableVolume: stats.available_volume,
  });
}));

// POST /api/pro/ads - Create new ad
router.post('/', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const data: CreateAdDTO = {
    type: req.body.type,
    asset: req.body.asset,
    fiat_currency: req.body.fiatCurrency,
    price_type: req.body.priceType,
    price: req.body.price,
    floating_margin: req.body.floatingMargin,
    total_amount: req.body.totalAmount,
    min_limit: req.body.minLimit,
    max_limit: req.body.maxLimit,
    payment_time_limit: req.body.paymentTimeLimit,
    terms_tags: req.body.termsTags,
    terms: req.body.terms,
    auto_reply: req.body.autoReply,
    remarks: req.body.remarks,
    region_restrictions: req.body.regionRestrictions,
    counterparty_conditions: req.body.counterpartyConditions,
    payment_method_ids: req.body.paymentMethodIds,
  };

  // Validation
  if (!data.type || !['buy', 'sell'].includes(data.type)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Type must be buy or sell');
  }
  if (!data.fiat_currency) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Fiat currency is required', { field: 'fiatCurrency' });
  }
  if (!data.price || data.price <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Price must be positive');
  }
  if (!data.total_amount || data.total_amount <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Total amount must be positive');
  }
  if (!data.min_limit || data.min_limit <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Min limit must be positive');
  }
  if (!data.max_limit || data.max_limit <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Max limit must be positive');
  }
  if (data.min_limit > data.max_limit) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Min limit cannot exceed max limit');
  }
  if (!data.payment_method_ids || data.payment_method_ids.length === 0) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'At least one payment method is required', { field: 'paymentMethodIds' });
  }

  const ad = await createAd(trader.id, data);

  sendSuccess(res, {
    message: 'Ad created successfully',
    ad: {
      id: ad.id,
      type: ad.type,
      asset: ad.asset,
      fiatCurrency: ad.fiat_currency,
      price: ad.price,
      totalAmount: ad.total_amount,
      status: ad.status,
    },
  }, 201);
}));

// PUT /api/pro/ads/:id - Update ad
router.put('/:id', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const adId = getParam(req.params.id);

  const data: Partial<CreateAdDTO> = {};
  if (req.body.price !== undefined) data.price = req.body.price;
  if (req.body.floatingMargin !== undefined) data.floating_margin = req.body.floatingMargin;
  if (req.body.totalAmount !== undefined) data.total_amount = req.body.totalAmount;
  if (req.body.minLimit !== undefined) data.min_limit = req.body.minLimit;
  if (req.body.maxLimit !== undefined) data.max_limit = req.body.maxLimit;
  if (req.body.paymentTimeLimit !== undefined) data.payment_time_limit = req.body.paymentTimeLimit;
  if (req.body.termsTags !== undefined) data.terms_tags = req.body.termsTags;
  if (req.body.terms !== undefined) data.terms = req.body.terms;
  if (req.body.autoReply !== undefined) data.auto_reply = req.body.autoReply;
  if (req.body.remarks !== undefined) data.remarks = req.body.remarks;
  if (req.body.regionRestrictions !== undefined) data.region_restrictions = req.body.regionRestrictions;
  if (req.body.counterpartyConditions !== undefined) data.counterparty_conditions = req.body.counterpartyConditions;
  if (req.body.paymentMethodIds !== undefined) data.payment_method_ids = req.body.paymentMethodIds;

  const ad = await updateAd(adId, trader.id, data);

  if (!ad) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Ad not found or not owned by you');
  }

  sendSuccess(res, {
    message: 'Ad updated successfully',
    ad: {
      id: ad.id,
      price: ad.price,
      totalAmount: ad.total_amount,
      availableAmount: ad.available_amount,
      status: ad.status,
    },
  });
}));

// PUT /api/pro/ads/:id/status - Set ad online/offline
router.put('/:id/status', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const adId = getParam(req.params.id);
  const { status } = req.body;

  if (!status || !['online', 'offline'].includes(status)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Status must be online or offline');
  }

  const ad = await setAdStatus(adId, trader.id, status);

  if (!ad) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Ad not found or already closed');
  }

  sendSuccess(res, {
    message: `Ad is now ${status}`,
    status: ad.status,
  });
}));

// DELETE /api/pro/ads/:id - Close ad
router.delete('/:id', authMiddleware, traderMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const trader = await findTraderByUserId(userId);
  if (!trader) {
    throw new AppError(ErrorCode.NOT_A_TRADER);
  }

  const adId = getParam(req.params.id);
  const ad = await closeAd(adId, trader.id);

  if (!ad) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Ad not found');
  }

  sendSuccess(res, { message: 'Ad closed successfully' });
}));

export default router;
