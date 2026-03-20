import { Router } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import {
  assessTradeRisk,
  getQuickRiskCheck,
  reportSuspicious,
  checkBlacklist
} from '../services/riskService';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/risk/assess
 * Full risk assessment for a trade
 */
router.post('/assess', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { traderId, paymentMethodType, paymentIdentifier, amount } = req.body;

  if (!traderId) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'traderId is required', { field: 'traderId' });
  }

  const assessment = await assessTradeRisk({
    traderId,
    userId,
    paymentMethodType,
    paymentIdentifier,
    amount: amount ? parseFloat(amount) : undefined
  });

  sendSuccess(res, assessment);
}));

/**
 * GET /api/risk/quick/:traderId
 * Quick risk check for a trader (no payment method)
 */
router.get('/quick/:traderId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const traderId = req.params.traderId as string;
  const result = await getQuickRiskCheck(traderId, userId);

  sendSuccess(res, result);
}));

/**
 * POST /api/risk/check-payment
 * Check if a specific payment method is blacklisted
 */
router.post('/check-payment', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { methodType, identifier } = req.body;

  if (!methodType || !identifier) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'methodType and identifier are required');
  }

  const blacklisted = await checkBlacklist(methodType, identifier);

  sendSuccess(res, {
    isBlacklisted: !!blacklisted,
    reason: blacklisted?.reason || null,
    reportedAt: blacklisted?.created_at || null
  });
}));

/**
 * POST /api/risk/report
 * Report a suspicious payment method
 */
router.post('/report', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { tradeId, methodType, identifier, reason, evidenceUrl } = req.body;

  if (!tradeId || !methodType || !identifier || !reason) {
    throw new AppError(
      ErrorCode.MISSING_FIELD,
      'tradeId, methodType, identifier, and reason are required'
    );
  }

  // Validate method type
  if (!['bank', 'mobile_money', 'cash'].includes(methodType)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid methodType');
  }

  const result = await reportSuspicious({
    tradeId,
    reportedBy: userId,
    methodType,
    identifier,
    reason,
    evidenceUrl
  });

  sendSuccess(res, {
    reported: true,
    isNew: result.isNew,
    message: result.isNew
      ? 'Payment method has been reported and added to watchlist'
      : 'Payment method was already reported'
  }, result.isNew ? 201 : 200);
}));

export default router;
