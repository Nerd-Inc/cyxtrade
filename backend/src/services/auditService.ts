import { query, queryOne } from './db'

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  | 'approve'
  | 'reject'
  | 'suspend'
  | 'activate'
  | 'tier_change'
  | 'restriction_add'
  | 'restriction_remove'
  | 'bulk_approve'
  | 'bulk_reject'
  | 'bulk_suspend'
  | 'dispute_resolve'
  | 'role_assign'
  | 'login'
  | 'export'

export type AuditEntityType = 'trader' | 'dispute' | 'user' | 'role' | 'system'

export interface AuditLogEntry {
  id: string
  adminId: string
  adminName?: string
  adminEmail?: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  reason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface CreateAuditLogDTO {
  adminId: string
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  reason?: string
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogFilters {
  adminId?: string
  action?: AuditAction | AuditAction[]
  entityType?: AuditEntityType
  entityId?: string
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
  offset?: number
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Log an admin action to the audit trail
 */
export async function logAction(entry: CreateAuditLogDTO): Promise<string> {
  const result = await queryOne<{ id: string }>(
    `INSERT INTO admin_audit_log
     (admin_id, action, entity_type, entity_id, old_value, new_value, reason, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      entry.adminId,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      entry.newValue ? JSON.stringify(entry.newValue) : null,
      entry.reason || null,
      entry.ipAddress || null,
      entry.userAgent || null
    ]
  )

  return result!.id
}

/**
 * Get audit log entries with filters
 */
export async function getAuditLog(filters: AuditLogFilters = {}): Promise<{
  entries: AuditLogEntry[]
  total: number
}> {
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (filters.adminId) {
    conditions.push(`a.admin_id = $${paramIndex++}`)
    params.push(filters.adminId)
  }

  if (filters.action) {
    if (Array.isArray(filters.action)) {
      conditions.push(`a.action = ANY($${paramIndex++})`)
      params.push(filters.action)
    } else {
      conditions.push(`a.action = $${paramIndex++}`)
      params.push(filters.action)
    }
  }

  if (filters.entityType) {
    conditions.push(`a.entity_type = $${paramIndex++}`)
    params.push(filters.entityType)
  }

  if (filters.entityId) {
    conditions.push(`a.entity_id = $${paramIndex++}`)
    params.push(filters.entityId)
  }

  if (filters.startDate) {
    conditions.push(`a.created_at >= $${paramIndex++}`)
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    conditions.push(`a.created_at <= $${paramIndex++}`)
    params.push(filters.endDate)
  }

  if (filters.search) {
    conditions.push(`(
      u.display_name ILIKE $${paramIndex} OR
      u.email ILIKE $${paramIndex} OR
      a.reason ILIKE $${paramIndex}
    )`)
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM admin_audit_log a
     LEFT JOIN users u ON a.admin_id = u.id
     ${whereClause}`,
    params
  )
  const total = parseInt(countResult?.count || '0', 10)

  // Get entries with pagination
  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const entries = await query<{
    id: string
    admin_id: string
    admin_name: string | null
    admin_email: string | null
    action: AuditAction
    entity_type: AuditEntityType
    entity_id: string | null
    old_value: Record<string, unknown> | null
    new_value: Record<string, unknown> | null
    reason: string | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
  }>(
    `SELECT
       a.id,
       a.admin_id,
       u.display_name as admin_name,
       u.email as admin_email,
       a.action,
       a.entity_type,
       a.entity_id,
       a.old_value,
       a.new_value,
       a.reason,
       a.ip_address,
       a.user_agent,
       a.created_at
     FROM admin_audit_log a
     LEFT JOIN users u ON a.admin_id = u.id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  )

  return {
    entries: entries.map(mapAuditLogRow),
    total
  }
}

/**
 * Get audit history for a specific entity
 */
export async function getEntityHistory(
  entityType: AuditEntityType,
  entityId: string,
  limit = 50
): Promise<AuditLogEntry[]> {
  const entries = await query<{
    id: string
    admin_id: string
    admin_name: string | null
    admin_email: string | null
    action: AuditAction
    entity_type: AuditEntityType
    entity_id: string | null
    old_value: Record<string, unknown> | null
    new_value: Record<string, unknown> | null
    reason: string | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
  }>(
    `SELECT
       a.id,
       a.admin_id,
       u.display_name as admin_name,
       u.email as admin_email,
       a.action,
       a.entity_type,
       a.entity_id,
       a.old_value,
       a.new_value,
       a.reason,
       a.ip_address,
       a.user_agent,
       a.created_at
     FROM admin_audit_log a
     LEFT JOIN users u ON a.admin_id = u.id
     WHERE a.entity_type = $1 AND a.entity_id = $2
     ORDER BY a.created_at DESC
     LIMIT $3`,
    [entityType, entityId, limit]
  )

  return entries.map(mapAuditLogRow)
}

/**
 * Get recent activity feed for dashboard
 */
export async function getActivityFeed(limit = 20): Promise<AuditLogEntry[]> {
  const entries = await query<{
    id: string
    admin_id: string
    admin_name: string | null
    admin_email: string | null
    action: AuditAction
    entity_type: AuditEntityType
    entity_id: string | null
    old_value: Record<string, unknown> | null
    new_value: Record<string, unknown> | null
    reason: string | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
  }>(
    `SELECT
       a.id,
       a.admin_id,
       u.display_name as admin_name,
       u.email as admin_email,
       a.action,
       a.entity_type,
       a.entity_id,
       a.old_value,
       a.new_value,
       a.reason,
       a.ip_address,
       a.user_agent,
       a.created_at
     FROM admin_audit_log a
     LEFT JOIN users u ON a.admin_id = u.id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [limit]
  )

  return entries.map(mapAuditLogRow)
}

/**
 * Get admin action counts for dashboard
 */
export async function getActionCounts(
  adminId?: string,
  startDate?: string,
  endDate?: string
): Promise<Record<string, number>> {
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (adminId) {
    conditions.push(`admin_id = $${paramIndex++}`)
    params.push(adminId)
  }

  if (startDate) {
    conditions.push(`created_at >= $${paramIndex++}`)
    params.push(startDate)
  }

  if (endDate) {
    conditions.push(`created_at <= $${paramIndex++}`)
    params.push(endDate)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await query<{ action: string; count: string }>(
    `SELECT action, COUNT(*) as count
     FROM admin_audit_log
     ${whereClause}
     GROUP BY action`,
    params
  )

  return result.reduce((acc, row) => {
    acc[row.action] = parseInt(row.count, 10)
    return acc
  }, {} as Record<string, number>)
}

// ============================================================================
// Helpers
// ============================================================================

function mapAuditLogRow(row: {
  id: string
  admin_id: string
  admin_name: string | null
  admin_email: string | null
  action: AuditAction
  entity_type: AuditEntityType
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  reason: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}): AuditLogEntry {
  return {
    id: row.id,
    adminId: row.admin_id,
    adminName: row.admin_name || undefined,
    adminEmail: row.admin_email || undefined,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValue: row.old_value,
    newValue: row.new_value,
    reason: row.reason,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at
  }
}

// ============================================================================
// Convenience Logging Functions
// ============================================================================

export async function logTraderApproval(
  adminId: string,
  traderId: string,
  reason?: string,
  ipAddress?: string
): Promise<void> {
  await logAction({
    adminId,
    action: 'approve',
    entityType: 'trader',
    entityId: traderId,
    newValue: { status: 'active' },
    reason,
    ipAddress
  })
}

export async function logTraderRejection(
  adminId: string,
  traderId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAction({
    adminId,
    action: 'reject',
    entityType: 'trader',
    entityId: traderId,
    newValue: { status: 'rejected' },
    reason,
    ipAddress
  })
}

export async function logTraderSuspension(
  adminId: string,
  traderId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAction({
    adminId,
    action: 'suspend',
    entityType: 'trader',
    entityId: traderId,
    newValue: { status: 'suspended' },
    reason,
    ipAddress
  })
}

export async function logTierChange(
  adminId: string,
  traderId: string,
  oldTier: string,
  newTier: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAction({
    adminId,
    action: 'tier_change',
    entityType: 'trader',
    entityId: traderId,
    oldValue: { tier: oldTier },
    newValue: { tier: newTier },
    reason,
    ipAddress
  })
}

export async function logBulkAction(
  adminId: string,
  action: 'bulk_approve' | 'bulk_reject' | 'bulk_suspend',
  traderIds: string[],
  successCount: number,
  failCount: number,
  reason?: string,
  ipAddress?: string
): Promise<void> {
  await logAction({
    adminId,
    action,
    entityType: 'trader',
    newValue: {
      traderIds,
      successCount,
      failCount
    },
    reason,
    ipAddress
  })
}

export async function logDisputeResolution(
  adminId: string,
  disputeId: string,
  resolution: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAction({
    adminId,
    action: 'dispute_resolve',
    entityType: 'dispute',
    entityId: disputeId,
    newValue: { resolution },
    reason,
    ipAddress
  })
}
