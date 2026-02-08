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
