import { Router, Response } from 'express';
import { uploadImage, handleUploadError } from '../middleware/upload';
import { uploadService } from '../services/uploadService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';

const router = Router();

/**
 * POST /api/uploads/avatar
 * Upload user avatar
 */
router.post(
  '/avatar',
  authMiddleware,
  uploadImage,
  handleUploadError,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
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

      res.json({
        message: 'Avatar uploaded successfully',
        avatarUrl: result.url,
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ error: 'Failed to upload avatar' });
    }
  }
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
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const { tradeId } = req.params;
      const userId = req.user!.id;

      // Verify trade exists and belongs to user
      const trade = await pool.query(
        'SELECT id, user_id, status, payment_proof_url FROM trades WHERE id = $1',
        [tradeId]
      );

      if (trade.rows.length === 0) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      if (trade.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'You can only upload proof for your own trades' });
      }

      // Can only upload proof when trade is accepted or paid
      if (!['accepted', 'paid'].includes(trade.rows[0].status)) {
        return res.status(400).json({ error: 'Cannot upload proof for this trade status' });
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

      res.json({
        message: 'Payment proof uploaded successfully',
        proofUrl: result.url,
      });
    } catch (error) {
      console.error('Payment proof upload error:', error);
      res.status(500).json({ error: 'Failed to upload payment proof' });
    }
  }
);

export default router;
