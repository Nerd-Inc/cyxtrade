import { Router, Response } from 'express';
import { uploadImage, handleUploadError } from '../middleware/upload';
import { uploadService } from '../services/uploadService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Helper to ensure param is string (Express 5 types params as string | string[])
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

/**
 * POST /api/uploads/avatar
 * Upload user avatar
 */
router.post(
  '/avatar',
  authMiddleware,
  uploadImage,
  handleUploadError,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError(ErrorCode.NO_FILE_PROVIDED, 'Please select an image to upload');
    }

    const userId = req.user!.id;

    // Get current avatar to delete later
    const currentUser = await pool.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );
    const oldAvatarUrl = currentUser.rows[0]?.avatar_url;

    // Upload new avatar
    const result = await uploadService.uploadAvatar(userId, req.file.buffer);

    // Update user's avatar URL in database
    await pool.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [result.url, userId]
    );

    // Delete old avatar if exists
    if (oldAvatarUrl) {
      await uploadService.deleteFile(oldAvatarUrl);
    }

    sendSuccess(res, {
      message: 'Avatar uploaded successfully',
      avatarUrl: result.url,
    });
  })
);

/**
 * POST /api/uploads/payment-proof/:tradeId
 * Upload payment proof for a trade
 */
router.post(
  '/payment-proof/:tradeId',
  authMiddleware,
  uploadImage,
  handleUploadError,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError(ErrorCode.NO_FILE_PROVIDED, 'Please select an image to upload');
    }

    const tradeId = getParam(req.params.tradeId);
    const userId = req.user!.id;

    // Verify trade exists and belongs to user
    const trade = await pool.query(
      'SELECT id, user_id, status, payment_proof_url FROM trades WHERE id = $1',
      [tradeId]
    );

    if (trade.rows.length === 0) {
      throw new AppError(ErrorCode.TRADE_NOT_FOUND);
    }

    if (trade.rows[0].user_id !== userId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'You can only upload proof for your own trades');
    }

    // Can only upload proof when trade is accepted or paid
    if (!['accepted', 'paid'].includes(trade.rows[0].status)) {
      throw new AppError(
        ErrorCode.INVALID_TRADE_STATE,
        'Payment proof can only be uploaded for accepted or paid trades'
      );
    }

    // Upload proof image
    const result = await uploadService.uploadPaymentProof(tradeId, req.file.buffer);

    // Update trade with proof URL
    await pool.query(
      'UPDATE trades SET payment_proof_url = $1 WHERE id = $2',
      [result.url, tradeId]
    );

    // Delete old proof if exists
    if (trade.rows[0].payment_proof_url) {
      await uploadService.deleteFile(trade.rows[0].payment_proof_url);
    }

    sendSuccess(res, {
      message: 'Payment proof uploaded successfully',
      proofUrl: result.url,
    });
  })
);

export default router;
