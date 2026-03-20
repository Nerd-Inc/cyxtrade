// User types
export interface User {
  id: string;
  phone: string;
  displayName: string | null;
  avatarUrl: string | null;
  isTrader: boolean;
  isAdmin: boolean;
  createdAt: string;
}

// Trader types
export interface Trader {
  id: string;
  userId: string;
  displayName: string;
  phone: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  bondAmount: number;
  bondLocked: number;
  corridors: Corridor[];
  rating: number;
  totalTrades: number;
  isOnline: boolean;
  walletAddress: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export interface Corridor {
  from: string;
  to: string;
  buyRate: number;
  sellRate: number;
}

// Trade types
export interface Trade {
  id: string;
  userId: string;
  traderId: string;
  sendCurrency: string;
  sendAmount: number;
  receiveCurrency: string;
  receiveAmount: number;
  rate: number;
  recipientName: string;
  recipientPhone: string;
  recipientMethod: string;
  status: TradeStatus;
  bondLocked: number | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  createdAt: string;
  acceptedAt: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  // Joined fields
  userName?: string;
  userPhone?: string;
  traderName?: string;
}

export type TradeStatus =
  | 'pending'
  | 'accepted'
  | 'paid'
  | 'delivering'
  | 'completed'
  | 'disputed'
  | 'cancelled';

// Dispute types
export interface Dispute {
  id: string;
  tradeId: string;
  openedBy: string;
  reason: string;
  status: 'open' | 'reviewing' | 'resolved';
  resolution: 'favor_user' | 'favor_trader' | 'split' | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  // Joined fields
  trade?: Trade;
  evidence?: DisputeEvidence[];
  openedByUser?: User;
}

export interface DisputeEvidence {
  id: string;
  disputeId: string;
  submittedBy: string;
  evidenceType: 'screenshot' | 'document' | 'text';
  content: string | null;
  fileUrl: string | null;
  createdAt: string;
  // Joined
  submittedByUser?: User;
}

// Stats
export interface AdminStats {
  totalUsers: number;
  totalTraders: number;
  activeTraders: number;
  pendingTraders: number;
  totalTrades: number;
  completedTrades: number;
  openDisputes: number;
  totalVolume: number;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
}

// Admin Roles
export type RoleId = 'owner' | 'manager' | 'operator';

export interface AdminRole {
  id: RoleId;
  name: string;
  description: string;
  permissions: Record<string, string[]>;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string;
  isAdmin: boolean;
  adminRole: RoleId | null;
  roleName: string | null;
}

// Audit Log
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
  | 'role_assign';

export type AuditEntityType = 'trader' | 'dispute' | 'user' | 'role' | 'system';

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Tier History
export interface TierHistoryEntry {
  id: string;
  oldTier: string | null;
  newTier: string;
  reason: string | null;
  changedBy: string;
  changedByName: string | null;
  createdAt: string;
}

// Restrictions
export type RestrictionType =
  | 'volume_limit'
  | 'corridor_limit'
  | 'no_new_trades'
  | 'under_review'
  | 'kyc_required'
  | 'bond_hold';

export interface Restriction {
  id: string;
  restrictionType: RestrictionType;
  value: unknown;
  reason: string | null;
  appliedBy: string;
  appliedByName: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  removedAt: string | null;
  removedBy: string | null;
  removedByName: string | null;
}

// Bulk Actions
export interface BulkActionResult {
  action: 'approve' | 'reject' | 'suspend';
  processed: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}

// Dashboard KPIs
export interface DashboardKPIs {
  pendingTraders: number;
  activeAlerts: number;
  volumeToday: number;
  tradesToday: number;
  disputeRate: number;
  tierDistribution: Record<string, number>;
}
