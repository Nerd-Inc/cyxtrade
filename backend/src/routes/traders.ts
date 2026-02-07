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
router.get('/', async (req, res) => {
  try {
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

    res.json({ traders, total });
  } catch (error) {
    console.error('List traders error:', error);
    res.status(500).json({ error: 'Failed to get traders' });
  }
});

// GET /api/traders/me - Get own trader profile (must come before /:id)
router.get('/me', authMiddleware, traderMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trader = await findTraderByUserId(userId);
    if (!trader) {
      return res.status(404).json({ error: 'Trader profile not found' });
    }

    res.json({
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
  } catch (error) {
    console.error('Get trader profile error:', error);
    res.status(500).json({ error: 'Failed to get trader profile' });
  }
});

// GET /api/traders/:id - Get trader details (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const trader = await findTraderById(id);
    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    res.json({
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
  } catch (error) {
    console.error('Get trader error:', error);
    res.status(500).json({ error: 'Failed to get trader' });
  }
});

// POST /api/traders/apply - Apply to become trader (auth required)
router.post('/apply', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { corridors } = req.body;

    if (!corridors || !Array.isArray(corridors) || corridors.length === 0) {
      return res.status(400).json({ error: 'At least one corridor required' });
    }

    // Check if already a trader
    const existing = await findTraderByUserId(userId);
    if (existing) {
      return res.status(400).json({ error: 'Already a trader or pending application' });
    }

    const trader = await createTraderApplication(userId, corridors as Corridor[]);

    res.json({
      message: 'Application submitted',
      applicationId: trader.id,
      status: trader.status
    });
  } catch (error) {
    console.error('Apply trader error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// PUT /api/traders/me - Update trader profile (trader required)
router.put('/me', authMiddleware, traderMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { corridors } = req.body;

    const trader = await findTraderByUserId(userId);
    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    if (corridors) {
      await updateTraderCorridors(trader.id, corridors as Corridor[]);
    }

    res.json({
      message: 'Trader profile updated'
    });
  } catch (error) {
    console.error('Update trader error:', error);
    res.status(500).json({ error: 'Failed to update trader' });
  }
});

// PUT /api/traders/me/status - Go online/offline (trader required)
router.put('/me/status', authMiddleware, traderMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { online } = req.body;

    const trader = await findTraderByUserId(userId);
    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    await updateTraderStatus(trader.id, online);

    res.json({
      online,
      message: online ? 'You are now online' : 'You are now offline'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
