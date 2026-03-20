import { Router } from 'express';
import { AuthRequest, adminMiddleware, roleMiddleware } from '../middleware/auth';
import { query, queryOne, transaction } from '../services/db';
import { approveTrader, rejectTrader } from '../services/traderService';
import { asyncHandler } from '../middleware/errorHandler';
import { sendSuccess, sendAppError } from '../utils/response';
import { AppError, ErrorCode, createNotFoundError } from '../utils/errors';
import {
  isBlockchainEnabled,
  resolveDisputeOnChain,
} from '../services/blockchainService';
import {
  logAction,
  logTraderApproval,
  logTraderRejection,
  logTraderSuspension,
  logTierChange,
  logBulkAction,
  logDisputeResolution,
  getAuditLog,
  getEntityHistory,
  getActivityFeed,
  getActionCounts
} from '../services/auditService';
import { getAllRoles, getAdminUsers, assignRole, removeRole } from '../services/rbacService';

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
router.put('/traders/:id/approve', roleMiddleware('traders', 'approve'), asyncHandler(async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const adminId = req.user!.id;
  const { reason } = req.body as { reason?: string };

  const trader = await approveTrader(id, adminId);

  if (!trader) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found or already processed');
  }

  // Log the action
  await logTraderApproval(adminId, id, reason, req.ip);

  sendSuccess(res, {
    id: trader.id,
    status: trader.status,
    message: 'Trader approved successfully',
  });
}));

// PUT /api/admin/traders/:id/reject - Reject trader
router.put('/traders/:id/reject', roleMiddleware('traders', 'reject'), asyncHandler(async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const adminId = req.user!.id;
  const { reason } = req.body as { reason?: string };

  const trader = await rejectTrader(id, reason);

  if (!trader) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found or already processed');
  }

  // Log the action
  await logTraderRejection(adminId, id, reason || 'No reason provided', req.ip);

  sendSuccess(res, {
    id: trader.id,
    status: trader.status,
    message: 'Trader rejected',
  });
}));

// PUT /api/admin/traders/:id/suspend - Suspend trader
router.put('/traders/:id/suspend', roleMiddleware('traders', 'suspend'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };
  const adminId = req.user!.id;

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

  // Log the action
  await logTraderSuspension(adminId, id, reason || 'No reason provided', req.ip);

  sendSuccess(res, {
    id: rows[0].id,
    status: 'suspended',
    message: 'Trader suspended',
  });
}));

// PUT /api/admin/traders/:id/activate - Reactivate suspended trader
router.put('/traders/:id/activate', roleMiddleware('traders', 'activate'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };
  const adminId = req.user!.id;

  const rows = await query(
    `UPDATE traders
     SET status = 'active', updated_at = NOW()
     WHERE id = $1 AND status = 'suspended'
     RETURNING *`,
    [id]
  );

  if (!rows[0]) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found or not suspended');
  }

  // Log the action
  await logAction({
    adminId,
    action: 'activate',
    entityType: 'trader',
    entityId: id,
    newValue: { status: 'active' },
    reason,
    ipAddress: req.ip
  });

  sendSuccess(res, {
    id: rows[0].id,
    status: 'active',
    message: 'Trader reactivated',
  });
}));

// POST /api/admin/traders/bulk - Bulk trader actions
router.post('/traders/bulk', roleMiddleware('traders', 'bulk'), asyncHandler(async (req: AuthRequest, res) => {
  const { action, traderIds, reason } = req.body as {
    action: 'approve' | 'reject' | 'suspend';
    traderIds: string[];
    reason?: string;
  };
  const adminId = req.user!.id;

  if (!['approve', 'reject', 'suspend'].includes(action)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid action');
  }

  if (!Array.isArray(traderIds) || traderIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'No traders specified');
  }

  if (traderIds.length > 100) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Maximum 100 traders per bulk action');
  }

  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  let successCount = 0;
  let failCount = 0;

  for (const traderId of traderIds) {
    try {
      if (action === 'approve') {
        const trader = await approveTrader(traderId, adminId);
        if (trader) {
          results.push({ id: traderId, success: true });
          successCount++;
        } else {
          results.push({ id: traderId, success: false, error: 'Not found or already processed' });
          failCount++;
        }
      } else if (action === 'reject') {
        const trader = await rejectTrader(traderId, reason);
        if (trader) {
          results.push({ id: traderId, success: true });
          successCount++;
        } else {
          results.push({ id: traderId, success: false, error: 'Not found or already processed' });
          failCount++;
        }
      } else if (action === 'suspend') {
        const rows = await query(
          `UPDATE traders SET status = 'suspended', updated_at = NOW()
           WHERE id = $1 AND status = 'active' RETURNING id`,
          [traderId]
        );
        if (rows[0]) {
          results.push({ id: traderId, success: true });
          successCount++;
        } else {
          results.push({ id: traderId, success: false, error: 'Not found or not active' });
          failCount++;
        }
      }
    } catch (error: any) {
      results.push({ id: traderId, success: false, error: error.message });
      failCount++;
    }
  }

  // Log the bulk action
  const bulkAction = action === 'approve' ? 'bulk_approve' : action === 'reject' ? 'bulk_reject' : 'bulk_suspend';
  await logBulkAction(adminId, bulkAction, traderIds, successCount, failCount, reason, req.ip);

  sendSuccess(res, {
    action,
    processed: successCount,
    failed: failCount,
    results,
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

// ============================================================================
// TIER MANAGEMENT
// ============================================================================

// PUT /api/admin/traders/:id/tier - Change trader tier
router.put('/traders/:id/tier', roleMiddleware('traders', 'tier'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { tier, reason } = req.body as { tier: string; reason: string };
  const adminId = req.user!.id;

  const validTiers = ['observer', 'starter', 'verified', 'trusted', 'anchor'];
  if (!validTiers.includes(tier)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid tier');
  }

  if (!reason) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Reason is required for tier changes');
  }

  // Get current trader
  const trader = await queryOne<{ id: string; tier: string }>(`SELECT id, tier FROM traders WHERE id = $1`, [id]);
  if (!trader) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found');
  }

  const oldTier = trader.tier || 'observer';

  // Update trader tier
  await query(`UPDATE traders SET tier = $1, updated_at = NOW() WHERE id = $2`, [tier, id]);

  // Record tier history
  await query(
    `INSERT INTO trader_tier_history (trader_id, old_tier, new_tier, reason, changed_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, oldTier, tier, reason, adminId]
  );

  // Log the action
  await logTierChange(adminId, id, oldTier, tier, reason, req.ip);

  sendSuccess(res, {
    id,
    oldTier,
    newTier: tier,
    message: 'Trader tier updated',
  });
}));

// GET /api/admin/traders/:id/tier-history - Get trader tier history
router.get('/traders/:id/tier-history', roleMiddleware('traders', 'read'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const history = await query(
    `SELECT th.*, u.display_name as changed_by_name
     FROM trader_tier_history th
     LEFT JOIN users u ON th.changed_by = u.id
     WHERE th.trader_id = $1
     ORDER BY th.created_at DESC`,
    [id]
  );

  sendSuccess(res, {
    history: history.map(h => ({
      id: h.id,
      oldTier: h.old_tier,
      newTier: h.new_tier,
      reason: h.reason,
      changedBy: h.changed_by,
      changedByName: h.changed_by_name,
      createdAt: h.created_at,
    })),
  });
}));

// ============================================================================
// RESTRICTIONS
// ============================================================================

// GET /api/admin/traders/:id/restrictions - Get trader restrictions
router.get('/traders/:id/restrictions', roleMiddleware('traders', 'read'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { includeInactive } = req.query;

  const whereClause = includeInactive === 'true' ? '' : 'AND r.is_active = true';

  const restrictions = await query(
    `SELECT r.*, u.display_name as applied_by_name, ru.display_name as removed_by_name
     FROM trader_restrictions r
     LEFT JOIN users u ON r.applied_by = u.id
     LEFT JOIN users ru ON r.removed_by = ru.id
     WHERE r.trader_id = $1 ${whereClause}
     ORDER BY r.created_at DESC`,
    [id]
  );

  sendSuccess(res, {
    restrictions: restrictions.map(r => ({
      id: r.id,
      restrictionType: r.restriction_type,
      value: r.value,
      reason: r.reason,
      appliedBy: r.applied_by,
      appliedByName: r.applied_by_name,
      expiresAt: r.expires_at,
      isActive: r.is_active,
      createdAt: r.created_at,
      removedAt: r.removed_at,
      removedBy: r.removed_by,
      removedByName: r.removed_by_name,
    })),
  });
}));

// POST /api/admin/traders/:id/restrictions - Add restriction
router.post('/traders/:id/restrictions', roleMiddleware('traders', 'restrict'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { restrictionType, value, reason, expiresAt } = req.body as {
    restrictionType: string;
    value?: any;
    reason: string;
    expiresAt?: string;
  };
  const adminId = req.user!.id;

  const validTypes = ['volume_limit', 'corridor_limit', 'no_new_trades', 'under_review', 'kyc_required', 'bond_hold'];
  if (!validTypes.includes(restrictionType)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid restriction type');
  }

  if (!reason) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Reason is required');
  }

  // Check trader exists
  const trader = await queryOne<{ id: string }>(`SELECT id FROM traders WHERE id = $1`, [id]);
  if (!trader) {
    throw new AppError(ErrorCode.TRADER_NOT_FOUND, 'Trader not found');
  }

  const result = await queryOne<{ id: string }>(
    `INSERT INTO trader_restrictions (trader_id, restriction_type, value, reason, applied_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [id, restrictionType, value ? JSON.stringify(value) : null, reason, adminId, expiresAt || null]
  );

  // Log the action
  await logAction({
    adminId,
    action: 'restriction_add',
    entityType: 'trader',
    entityId: id,
    newValue: { restrictionType, value, reason },
    ipAddress: req.ip
  });

  sendSuccess(res, {
    id: result!.id,
    message: 'Restriction added',
  });
}));

// DELETE /api/admin/traders/:id/restrictions/:restrictionId - Remove restriction
router.delete('/traders/:id/restrictions/:restrictionId', roleMiddleware('traders', 'restrict'), asyncHandler(async (req: AuthRequest, res) => {
  const { id, restrictionId } = req.params;
  const adminId = req.user!.id;

  const result = await queryOne<{ id: string; restriction_type: string }>(
    `UPDATE trader_restrictions
     SET is_active = false, removed_at = NOW(), removed_by = $3
     WHERE id = $1 AND trader_id = $2 AND is_active = true
     RETURNING id, restriction_type`,
    [restrictionId, id, adminId]
  );

  if (!result) {
    throw createNotFoundError('Restriction');
  }

  // Log the action
  await logAction({
    adminId,
    action: 'restriction_remove',
    entityType: 'trader',
    entityId: id,
    oldValue: { restrictionId, restrictionType: result.restriction_type },
    ipAddress: req.ip
  });

  sendSuccess(res, {
    message: 'Restriction removed',
  });
}));

// ============================================================================
// AUDIT LOG
// ============================================================================

// GET /api/admin/audit - Get audit log
router.get('/audit', roleMiddleware('audit', 'read'), asyncHandler(async (req: AuthRequest, res) => {
  const { adminId, action, entityType, entityId, startDate, endDate, search, limit = '50', offset = '0' } = req.query;

  const result = await getAuditLog({
    adminId: adminId as string,
    action: action as any,
    entityType: entityType as any,
    entityId: entityId as string,
    startDate: startDate as string,
    endDate: endDate as string,
    search: search as string,
    limit: parseInt(limit as string, 10),
    offset: parseInt(offset as string, 10),
  });

  sendSuccess(res, result);
}));

// GET /api/admin/audit/entity/:type/:id - Get entity history
router.get('/audit/entity/:type/:id', roleMiddleware('audit', 'read'), asyncHandler(async (req: AuthRequest, res) => {
  const { type, id } = req.params;
  const { limit = '50' } = req.query;

  const history = await getEntityHistory(type as any, id, parseInt(limit as string, 10));

  sendSuccess(res, { history });
}));

// GET /api/admin/audit/counts - Get action counts
router.get('/audit/counts', roleMiddleware('audit', 'read'), asyncHandler(async (req: AuthRequest, res) => {
  const { adminId, startDate, endDate } = req.query;

  const counts = await getActionCounts(
    adminId as string,
    startDate as string,
    endDate as string
  );

  sendSuccess(res, { counts });
}));

// ============================================================================
// DASHBOARD
// ============================================================================

// GET /api/admin/dashboard/activity - Get recent activity feed
router.get('/dashboard/activity', asyncHandler(async (req: AuthRequest, res) => {
  const { limit = '20' } = req.query;

  const activity = await getActivityFeed(parseInt(limit as string, 10));

  sendSuccess(res, { activity });
}));

// GET /api/admin/dashboard/kpis - Get dashboard KPIs
router.get('/dashboard/kpis', asyncHandler(async (req: AuthRequest, res) => {
  const [
    pendingResult,
    tierResult,
    volumeResult,
    disputeResult,
    alertsResult,
  ] = await Promise.all([
    // Pending traders
    queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM traders WHERE status = 'pending'`),
    // Tier distribution
    query<{ tier: string; count: string }>(`
      SELECT COALESCE(tier, 'observer') as tier, COUNT(*) as count
      FROM traders WHERE status = 'active'
      GROUP BY tier
    `),
    // Volume today
    queryOne<{ volume: string; count: string }>(`
      SELECT
        COALESCE(SUM(send_amount), 0) as volume,
        COUNT(*) as count
      FROM trades
      WHERE status = 'completed'
        AND created_at > NOW() - INTERVAL '24 hours'
    `),
    // Dispute rate (last 7 days)
    queryOne<{ total: string; disputed: string }>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE id IN (SELECT trade_id FROM disputes)) as disputed
      FROM trades
      WHERE created_at > NOW() - INTERVAL '7 days'
    `),
    // Active alerts (restrictions that need attention)
    queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM trader_restrictions
      WHERE is_active = true AND restriction_type = 'under_review'
    `),
  ]);

  const tierDistribution = tierResult.reduce((acc, r) => {
    acc[r.tier] = parseInt(r.count, 10);
    return acc;
  }, {} as Record<string, number>);

  const totalTrades = parseInt(disputeResult?.total || '0', 10);
  const disputedTrades = parseInt(disputeResult?.disputed || '0', 10);
  const disputeRate = totalTrades > 0 ? (disputedTrades / totalTrades) * 100 : 0;

  sendSuccess(res, {
    pendingTraders: parseInt(pendingResult?.count || '0', 10),
    activeAlerts: parseInt(alertsResult?.count || '0', 10),
    volumeToday: parseFloat(volumeResult?.volume || '0'),
    tradesToday: parseInt(volumeResult?.count || '0', 10),
    disputeRate: Math.round(disputeRate * 100) / 100,
    tierDistribution,
  });
}));

// ============================================================================
// ROLE MANAGEMENT
// ============================================================================

// GET /api/admin/roles - Get all roles
router.get('/roles', roleMiddleware('roles', 'read'), asyncHandler(async (req: AuthRequest, res) => {
  const roles = await getAllRoles();
  sendSuccess(res, { roles });
}));

// GET /api/admin/admins - Get all admin users
router.get('/admins', roleMiddleware('roles', 'read'), asyncHandler(async (req: AuthRequest, res) => {
  const admins = await getAdminUsers();
  sendSuccess(res, { admins });
}));

// POST /api/admin/users/:id/role - Assign role to user
router.post('/users/:id/role', roleMiddleware('roles', 'assign'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { roleId } = req.body as { roleId: string };
  const adminId = req.user!.id;

  if (!['owner', 'manager', 'operator'].includes(roleId)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid role');
  }

  await assignRole(id, roleId as any, adminId);

  // Log the action
  await logAction({
    adminId,
    action: 'role_assign',
    entityType: 'user',
    entityId: id,
    newValue: { role: roleId },
    ipAddress: req.ip
  });

  sendSuccess(res, { message: 'Role assigned' });
}));

// DELETE /api/admin/users/:id/role - Remove role from user
router.delete('/users/:id/role', roleMiddleware('roles', 'assign'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const adminId = req.user!.id;

  await removeRole(id, adminId);

  // Log the action
  await logAction({
    adminId,
    action: 'role_assign',
    entityType: 'user',
    entityId: id,
    newValue: { role: null },
    reason: 'Role removed',
    ipAddress: req.ip
  });

  sendSuccess(res, { message: 'Role removed' });
}));

export default router;
