import { Router } from 'express';
import { AuthRequest, adminMiddleware } from '../middleware/auth';
import { query, queryOne, transaction } from '../services/db';
import { approveTrader, rejectTrader } from '../services/traderService';
import { asyncHandler } from '../middleware/errorHandler';
import { sendSuccess, sendAppError } from '../utils/response';
import { AppError, ErrorCode, createNotFoundError } from '../utils/errors';
import {
  isBlockchainEnabled,
  resolveDisputeOnChain,
} from '../services/blockchainService';

const router = Router();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  const [
    usersResult,
    tradersResult,
    tradesResult,
    disputesResult,
  ] = await Promise.all([
    query<{ total: string; today: string }>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today
      FROM users
    `),
    query<{ total: string; active: string; pending: string }>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM traders
    `),
    query<{ total: string; today: string; volume: string }>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today,
        COALESCE(SUM(send_amount) FILTER (WHERE status = 'completed'), 0) as volume
      FROM trades
    `),
    query<{ open: string; resolved: string }>(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved
      FROM disputes
    `),
  ]);

  sendSuccess(res, {
    totalUsers: parseInt(usersResult[0]?.total || '0', 10),
    usersToday: parseInt(usersResult[0]?.today || '0', 10),
    totalTraders: parseInt(tradersResult[0]?.total || '0', 10),
    activeTraders: parseInt(tradersResult[0]?.active || '0', 10),
    pendingTraders: parseInt(tradersResult[0]?.pending || '0', 10),
    totalTrades: parseInt(tradesResult[0]?.total || '0', 10),
    tradesToday: parseInt(tradesResult[0]?.today || '0', 10),
    completedTrades: parseInt(tradesResult[0]?.volume || '0', 10),
    openDisputes: parseInt(disputesResult[0]?.open || '0', 10),
    resolvedDisputes: parseInt(disputesResult[0]?.resolved || '0', 10),
  });
}));

// GET /api/admin/traders - List all traders
router.get('/traders', asyncHandler(async (req: AuthRequest, res) => {
  const { status, limit = '20', offset = '0' } = req.query;

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`t.status = $${paramIndex++}`);
    values.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult, traders] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM traders t ${whereClause}`,
      values
    ),
    query(
      `SELECT t.*, u.display_name, u.phone
       FROM traders t
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit as string, 10), parseInt(offset as string, 10)]
    ),
  ]);

  sendSuccess(res, {
    traders: traders.map(t => ({
      id: t.id,
      userId: t.user_id,
      displayName: t.display_name,
      phone: t.phone,
      status: t.status,
      bondAmount: parseFloat(t.bond_amount),
      bondLocked: parseFloat(t.bond_locked),
      corridors: t.corridors,
      rating: parseFloat(t.rating),
      totalTrades: t.total_trades,
      isOnline: t.is_online,
      createdAt: t.created_at,
      approvedAt: t.approved_at,
    })),
    total: parseInt(countResult[0]?.count || '0', 10),
  });
}));

// GET /api/admin/traders/pending - List pending trader applications
router.get('/traders/pending', asyncHandler(async (req: AuthRequest, res) => {
  const { limit = '20', offset = '0' } = req.query;

  const [countResult, traders] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM traders WHERE status = 'pending'`
    ),
    query(
      `SELECT t.*, u.display_name, u.phone
       FROM traders t
       JOIN users u ON t.user_id = u.id
       WHERE t.status = 'pending'
       ORDER BY t.created_at ASC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit as string, 10), parseInt(offset as string, 10)]
    ),
  ]);

  sendSuccess(res, {
    traders: traders.map(t => ({
      id: t.id,
      userId: t.user_id,
      displayName: t.display_name,
      phone: t.phone,
      status: t.status,
      corridors: t.corridors,
      createdAt: t.created_at,
    })),
    total: parseInt(countResult[0]?.count || '0', 10),
  });
}));

// PUT /api/admin/traders/:id/approve - Approve trader
router.put('/traders/:id/approve', asyncHandler(async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const adminId = req.user!.id;

  const trader = await approveTrader(id, adminId);

  if (!trader) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found or already processed');
  }

  sendSuccess(res, {
    id: trader.id,
    status: trader.status,
    message: 'Trader approved successfully',
  });
}));

// PUT /api/admin/traders/:id/reject - Reject trader
router.put('/traders/:id/reject', asyncHandler(async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { reason } = req.body as { reason?: string };

  const trader = await rejectTrader(id, reason);

  if (!trader) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found or already processed');
  }

  sendSuccess(res, {
    id: trader.id,
    status: trader.status,
    message: 'Trader rejected',
  });
}));

// PUT /api/admin/traders/:id/suspend - Suspend trader
router.put('/traders/:id/suspend', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const rows = await query(
    `UPDATE traders
     SET status = 'suspended', updated_at = NOW()
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [id]
  );

  if (!rows[0]) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found or not active');
  }

  sendSuccess(res, {
    id: rows[0].id,
    status: 'suspended',
    message: 'Trader suspended',
  });
}));

// GET /api/admin/disputes - List disputes
router.get('/disputes', asyncHandler(async (req: AuthRequest, res) => {
  const { status, limit = '20', offset = '0' } = req.query;

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`d.status = $${paramIndex++}`);
    values.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult, disputes] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM disputes d ${whereClause}`,
      values
    ),
    query(
      `SELECT d.*, u.display_name as opened_by_name
       FROM disputes d
       LEFT JOIN users u ON d.opened_by = u.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit as string, 10), parseInt(offset as string, 10)]
    ),
  ]);

  sendSuccess(res, {
    disputes: disputes.map(d => ({
      id: d.id,
      tradeId: d.trade_id,
      openedBy: d.opened_by,
      openedByName: d.opened_by_name,
      reason: d.reason,
      status: d.status,
      resolution: d.resolution,
      createdAt: d.created_at,
      resolvedAt: d.resolved_at,
    })),
    total: parseInt(countResult[0]?.count || '0', 10),
  });
}));

// GET /api/admin/disputes/:id - Get dispute details
router.get('/disputes/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Get dispute with trade info
  const dispute = await queryOne(
    `SELECT d.*,
            u.display_name as opened_by_name, u.phone as opened_by_phone,
            t.id as trade_id, t.user_id, t.trader_id,
            t.send_currency, t.send_amount, t.receive_currency, t.receive_amount,
            t.status as trade_status, t.bond_locked, t.payment_reference,
            t.recipient_name, t.created_at as trade_created_at,
            tu.display_name as user_name,
            tru.display_name as trader_name
     FROM disputes d
     JOIN users u ON d.opened_by = u.id
     JOIN trades t ON d.trade_id = t.id
     JOIN users tu ON t.user_id = tu.id
     JOIN traders tr ON t.trader_id = tr.id
     JOIN users tru ON tr.user_id = tru.id
     WHERE d.id = $1`,
    [id]
  );

  if (!dispute) {
    throw createNotFoundError('Dispute');
  }

  // Get evidence
  const evidence = await query(
    `SELECT e.*, u.display_name as submitted_by_name
     FROM dispute_evidence e
     LEFT JOIN users u ON e.submitted_by = u.id
     WHERE e.dispute_id = $1
     ORDER BY e.created_at ASC`,
    [id]
  );

  // Get resolver info if resolved
  let resolverName = null;
  if (dispute.resolved_by) {
    const resolver = await queryOne<{ display_name: string }>(
      'SELECT display_name FROM users WHERE id = $1',
      [dispute.resolved_by]
    );
    resolverName = resolver?.display_name;
  }

  sendSuccess(res, {
    id: dispute.id,
    tradeId: dispute.trade_id,
    openedBy: dispute.opened_by,
    openedByUser: {
      displayName: dispute.opened_by_name,
      phone: dispute.opened_by_phone,
    },
    reason: dispute.reason,
    status: dispute.status,
    resolution: dispute.resolution,
    resolutionNotes: dispute.resolution_notes,
    resolvedBy: dispute.resolved_by,
    resolvedByName: resolverName,
    resolvedAt: dispute.resolved_at,
    createdAt: dispute.created_at,
    trade: {
      id: dispute.trade_id,
      userId: dispute.user_id,
      traderId: dispute.trader_id,
      userName: dispute.user_name,
      traderName: dispute.trader_name,
      sendCurrency: dispute.send_currency,
      sendAmount: parseFloat(dispute.send_amount),
      receiveCurrency: dispute.receive_currency,
      receiveAmount: parseFloat(dispute.receive_amount),
      status: dispute.trade_status,
      bondLocked: parseFloat(dispute.bond_locked || 0),
      paymentReference: dispute.payment_reference,
      recipientName: dispute.recipient_name,
      createdAt: dispute.trade_created_at,
    },
    evidence: evidence.map(e => ({
      id: e.id,
      submittedBy: e.submitted_by,
      submittedByUser: {
        displayName: e.submitted_by_name,
      },
      evidenceType: e.evidence_type,
      content: e.content,
      fileUrl: e.file_url,
      createdAt: e.created_at,
    })),
  });
}));

// PUT /api/admin/disputes/:id/resolve - Resolve dispute
router.put('/disputes/:id/resolve', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { resolution, notes } = req.body;
  const adminId = req.user!.id;

  if (!['favor_user', 'favor_trader', 'split'].includes(resolution)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid resolution');
  }

  const result = await transaction(async (client) => {
    // Get dispute with trade
    const disputeResult = await client.query(
      `SELECT d.*, t.trader_id, t.bond_locked, t.user_id
       FROM disputes d
       JOIN trades t ON d.trade_id = t.id
       WHERE d.id = $1 AND d.status = 'open'`,
      [id]
    );
    const dispute = disputeResult.rows[0];

    if (!dispute) {
      throw createNotFoundError('Dispute');
    }

    // Update dispute
    await client.query(
      `UPDATE disputes
       SET status = 'resolved', resolution = $2, resolution_notes = $3,
           resolved_by = $4, resolved_at = NOW()
       WHERE id = $1`,
      [id, resolution, notes || null, adminId]
    );

    // Handle bond based on resolution
    if (resolution === 'favor_user') {
      // Slash trader's bond - user gets compensated
      if (dispute.bond_locked) {
        await client.query(
          `UPDATE traders
           SET bond_amount = bond_amount - $2, bond_locked = bond_locked - $2, updated_at = NOW()
           WHERE id = $1`,
          [dispute.trader_id, dispute.bond_locked]
        );
      }
    } else if (resolution === 'favor_trader') {
      // Unlock trader's bond
      if (dispute.bond_locked) {
        await client.query(
          `UPDATE traders
           SET bond_locked = bond_locked - $2, updated_at = NOW()
           WHERE id = $1`,
          [dispute.trader_id, dispute.bond_locked]
        );
      }
    } else if (resolution === 'split') {
      // Split: unlock half the bond, slash half
      const halfBond = (dispute.bond_locked || 0) / 2;
      if (halfBond > 0) {
        await client.query(
          `UPDATE traders
           SET bond_amount = bond_amount - $2, bond_locked = bond_locked - $3, updated_at = NOW()
           WHERE id = $1`,
          [dispute.trader_id, halfBond, dispute.bond_locked]
        );
      }
    }

    // Update trade status
    await client.query(
      `UPDATE trades SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
      [dispute.trade_id]
    );

    return dispute;
  });

  // Resolve on blockchain
  if (result && isBlockchainEnabled()) {
    try {
      const resolutionMap: Record<string, number> = {
        favor_user: 1,
        favor_trader: 2,
        split: 3,
      };
      await resolveDisputeOnChain(result.trade_id, resolutionMap[resolution]);
    } catch (bcError) {
      console.error('[Admin] Blockchain resolveDispute error:', bcError);
      // Don't fail the resolution, just log
    }
  }

  sendSuccess(res, {
    id,
    status: 'resolved',
    resolution,
    message: 'Dispute resolved successfully',
  });
}));

// GET /api/admin/bonds - Bond management overview
router.get('/bonds', asyncHandler(async (req: AuthRequest, res) => {
  const stats = await queryOne<{
    total_deposited: string;
    total_locked: string;
    total_available: string;
  }>(`
    SELECT
      COALESCE(SUM(bond_amount), 0) as total_deposited,
      COALESCE(SUM(bond_locked), 0) as total_locked,
      COALESCE(SUM(bond_amount - bond_locked), 0) as total_available
    FROM traders
    WHERE status = 'active'
  `);

  sendSuccess(res, {
    totalDeposited: parseFloat(stats?.total_deposited || '0'),
    totalLocked: parseFloat(stats?.total_locked || '0'),
    totalAvailable: parseFloat(stats?.total_available || '0'),
  });
}));

export default router;
