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

const router = Router();

// Helper to safely get string param
const getParam = (val: string | string[] | undefined): string =>
  Array.isArray(val) ? val[0] : (val ?? '');

// In-memory trade store for development (when DB is not available)
const mockTrades = new Map<string, any>();

// POST /api/trades - Create new trade request
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
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

    let trade;

    try {
      // Validate trader exists
      const trader = await findTraderById(traderId);
      if (!trader || trader.status !== 'active') {
        return res.status(400).json({ error: 'Invalid or inactive trader' });
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
    } catch (dbError) {
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

    res.json({
      id: trade.id,
      status: trade.status,
      message: 'Trade request created'
    });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ error: 'Failed to create trade' });
  }
});

// GET /api/trades - List my trades
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
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

    res.json(result);
  } catch (error) {
    console.error('List trades error:', error);
    res.status(500).json({ error: 'Failed to get trades' });
  }
});

// GET /api/trades/:id - Get trade details
router.get('/:id', async (req: AuthRequest, res) => {
  try {
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
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json({
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
  } catch (error) {
    console.error('Get trade error:', error);
    res.status(500).json({ error: 'Failed to get trade' });
  }
});

// PUT /api/trades/:id/accept - Trader accepts trade
router.put('/:id/accept', traderMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const userId = req.user?.id;

    const trader = await findTraderByUserId(userId!);
    if (!trader) {
      return res.status(403).json({ error: 'Not a trader' });
    }

    const trade = await acceptTrade(id, trader.id);
    if (!trade) {
      return res.status(400).json({ error: 'Cannot accept trade (not found, wrong trader, or insufficient bond)' });
    }

    res.json({
      id: trade.id,
      status: trade.status,
      bondLocked: trade.bond_locked,
      message: 'Trade accepted'
    });
  } catch (error) {
    console.error('Accept trade error:', error);
    res.status(500).json({ error: 'Failed to accept trade' });
  }
});

// PUT /api/trades/:id/decline - Trader declines trade
router.put('/:id/decline', traderMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const userId = req.user?.id;

    const trader = await findTraderByUserId(userId!);
    if (!trader) {
      return res.status(403).json({ error: 'Not a trader' });
    }

    const trade = await declineTrade(id, trader.id);
    if (!trade) {
      return res.status(400).json({ error: 'Cannot decline trade' });
    }

    res.json({
      id: trade.id,
      status: trade.status,
      message: 'Trade declined'
    });
  } catch (error) {
    console.error('Decline trade error:', error);
    res.status(500).json({ error: 'Failed to decline trade' });
  }
});

// PUT /api/trades/:id/paid - User marks payment sent
router.put('/:id/paid', async (req: AuthRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const userId = req.user?.id;
    const { paymentReference, paymentProofUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trade = await markTradePaid(id, userId, {
      reference: paymentReference,
      proofUrl: paymentProofUrl
    });

    if (!trade) {
      return res.status(400).json({ error: 'Cannot mark as paid (not found or wrong status)' });
    }

    res.json({
      id: trade.id,
      status: trade.status,
      message: 'Payment marked as sent'
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Failed to update trade' });
  }
});

// PUT /api/trades/:id/delivered - Trader marks delivery done
router.put('/:id/delivered', traderMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const userId = req.user?.id;

    const trader = await findTraderByUserId(userId!);
    if (!trader) {
      return res.status(403).json({ error: 'Not a trader' });
    }

    const trade = await markTradeDelivered(id, trader.id);
    if (!trade) {
      return res.status(400).json({ error: 'Cannot mark as delivered' });
    }

    res.json({
      id: trade.id,
      status: trade.status,
      message: 'Delivery marked as complete'
    });
  } catch (error) {
    console.error('Mark delivered error:', error);
    res.status(500).json({ error: 'Failed to update trade' });
  }
});

// PUT /api/trades/:id/complete - User confirms receipt
router.put('/:id/complete', async (req: AuthRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trade = await completeTrade(id, userId);
    if (!trade) {
      return res.status(400).json({ error: 'Cannot complete trade' });
    }

    res.json({
      id: trade.id,
      status: trade.status,
      message: 'Trade completed successfully'
    });
  } catch (error) {
    console.error('Complete trade error:', error);
    res.status(500).json({ error: 'Failed to complete trade' });
  }
});

// PUT /api/trades/:id/cancel - Cancel trade (only pending trades)
router.put('/:id/cancel', async (req: AuthRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For now, only users can cancel their pending trades
    const trade = await findTradeById(id);
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    if (trade.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (trade.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending trades' });
    }

    // Use decline which sets cancelled status
    const trader = await findTraderByUserId(userId);
    const cancelled = await declineTrade(id, trade.trader_id);

    res.json({
      id: trade.id,
      status: 'cancelled',
      message: 'Trade cancelled'
    });
  } catch (error) {
    console.error('Cancel trade error:', error);
    res.status(500).json({ error: 'Failed to cancel trade' });
  }
});

// POST /api/trades/:id/dispute - Open dispute
router.post('/:id/dispute', async (req: AuthRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const userId = req.user?.id;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const result = await openDispute(id, userId, reason);
    if (!result) {
      return res.status(400).json({ error: 'Cannot open dispute on this trade' });
    }

    res.json({
      disputeId: result.disputeId,
      tradeId: id,
      status: 'disputed',
      message: 'Dispute opened'
    });
  } catch (error) {
    console.error('Open dispute error:', error);
    res.status(500).json({ error: 'Failed to open dispute' });
  }
});

// POST /api/trades/:id/rating - Rate completed trade
router.post('/:id/rating', async (req: AuthRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const userId = req.user?.id;
    const { rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }

    await rateTrade(id, userId, rating, comment);

    res.json({
      message: 'Rating submitted',
      rating,
      comment
    });
  } catch (error: any) {
    console.error('Rate trade error:', error);
    res.status(400).json({ error: error.message || 'Failed to submit rating' });
  }
});

export default router;
