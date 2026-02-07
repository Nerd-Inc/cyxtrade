import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users/me - Get current user
router.get('/me', async (req: AuthRequest, res) => {
  try {
    // TODO: Fetch user from database
    res.json({
      id: req.user?.id,
      phone: req.user?.phone,
      displayName: null,
      avatarUrl: null,
      isTrader: req.user?.isTrader,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /api/users/me - Update profile
router.put('/me', async (req: AuthRequest, res) => {
  try {
    const { displayName, avatarUrl } = req.body;

    // TODO: Update user in database
    res.json({
      id: req.user?.id,
      phone: req.user?.phone,
      displayName,
      avatarUrl,
      isTrader: req.user?.isTrader,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/users/:id - Get user public profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Fetch user from database
    res.json({
      id,
      displayName: 'User',
      avatarUrl: null,
      totalTrades: 0,
      memberSince: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
