// ============================================================================
// CyxTrade Unified TypeScript Interfaces
// Matches: backend/migrations/001_unified_schema.sql
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export type Mode = 'lite' | 'pro'

export type OrderType = 'buy' | 'sell'

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'paid'
  | 'delivering'
  | 'releasing'
  | 'released'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'expired'

export type TraderStatus = 'pending' | 'active' | 'suspended' | 'rejected'

export type TraderTier = 'observer' | 'starter' | 'verified' | 'trusted' | 'anchor'

export type AdStatus = 'online' | 'offline' | 'closed'

export type PriceType = 'fixed' | 'floating'

export type PaymentMethodType = 'bank' | 'mobile_money' | 'cash'

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'failed'

export type MessageType = 'text' | 'image' | 'system' | 'payment_proof'

export type RatingType = 'numeric' | 'binary'

export type DisputeStatus = 'open' | 'evidence' | 'arbitration' | 'resolved'

export type DisputeResolution = 'buyer_wins' | 'seller_wins' | 'split' | 'cancelled'

export type EvidenceType = 'screenshot' | 'document' | 'message' | 'other'

export type DisputeClaimType =
  | 'item_not_received'
  | 'not_as_described'
  | 'payment_not_received'
  | 'wrong_amount'
  | 'unauthorized_transaction'
  | 'other'

export type AssetType = 'crypto' | 'fiat'

export type WalletTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'escrow_lock'
  | 'escrow_release'
  | 'escrow_refund'
  | 'trade_fee'
  | 'transfer'

export type WalletTransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

// ============================================================================
// 1. USER
// ============================================================================

export interface User {
  id: string
  phone: string
  phone_verified: boolean
  phone_verified_at: string | null
  public_key: string | null
  public_key_fingerprint: string | null
  key_registered_at: string | null
  display_name: string | null
  avatar_url: string | null
  email: string | null
  country_code: string | null
  preferred_currency: string
  is_trader: boolean
  is_admin: boolean
  is_suspended: boolean
  suspended_reason: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateUserDTO {
  phone: string
  display_name?: string
  public_key?: string
  country_code?: string
}

export interface UpdateUserDTO {
  display_name?: string
  avatar_url?: string
  email?: string
  preferred_currency?: string
}

// ============================================================================
// 2. TRADER
// ============================================================================

export interface Trader {
  id: string
  user_id: string
  wallet_address: string | null
  status: TraderStatus
  tier: TraderTier
  bond_amount: number
  bond_locked: number
  bond_currency: string
  name: string | null
  bio: string | null
  rating: number
  total_trades: number
  completed_trades: number
  total_volume: number
  is_online: boolean
  last_online_at: string | null
  avg_release_time_mins: number | null
  avg_pay_time_mins: number | null
  positive_feedback: number
  negative_feedback: number
  trades_30d: number
  completion_rate_30d: number | null
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  user_phone?: string
  user_display_name?: string
}

export interface CreateTraderDTO {
  user_id: string
  wallet_address?: string
  name?: string
  bio?: string
}

export interface UpdateTraderDTO {
  wallet_address?: string
  name?: string
  bio?: string
  is_online?: boolean
}

// ============================================================================
// 3. TRADER PAYMENT METHODS
// ============================================================================

export interface TraderPaymentMethod {
  id: string
  trader_id: string
  method_type: PaymentMethodType
  provider: string | null
  currency: string
  account_holder_name: string | null
  phone_number: string | null
  phone_country_code: string | null
  bank_name: string | null
  account_number: string | null
  iban: string | null
  swift_code: string | null
  routing_number: string | null
  branch_code: string | null
  is_primary: boolean
  is_active: boolean
  verification_status: VerificationStatus
  verification_code: string | null
  verification_sent_at: string | null
  verified_at: string | null
  verification_proof_url: string | null
  created_at: string
  updated_at: string
}

export interface CreatePaymentMethodDTO {
  method_type: PaymentMethodType
  currency: string
  provider?: string
  account_holder_name?: string
  phone_number?: string
  phone_country_code?: string
  bank_name?: string
  account_number?: string
  iban?: string
  swift_code?: string
  is_primary?: boolean
}

// ============================================================================
// 4. ADS (Unified)
// ============================================================================

export interface Ad {
  id: string
  trader_id: string
  mode: Mode
  type: OrderType
  from_currency: string
  to_currency: string
  asset: string | null  // Pro only
  price_type: PriceType
  price: number
  floating_margin: number | null  // Pro only
  total_amount: number | null     // Pro only
  available_amount: number | null // Pro only
  min_limit: number
  max_limit: number
  payment_time_limit: number
  terms: string | null
  terms_tags: string[] | null
  auto_reply: string | null
  remarks: string | null
  status: AdStatus
  is_promoted: boolean
  promoted_until: string | null
  region_restrictions: string[] | null
  counterparty_conditions: CounterpartyConditions | null
  order_count: number
  created_at: string
  updated_at: string
  closed_at: string | null
  // Joined fields
  trader_name?: string
  trader_rating?: number
  trader_completed_trades?: number
  trader_is_online?: boolean
  payment_methods?: TraderPaymentMethod[]
}

export interface CounterpartyConditions {
  min_trades?: number
  min_completion_rate?: number
  kyc_required?: boolean
}

export interface CreateAdDTO {
  mode: Mode
  type: OrderType
  from_currency: string
  to_currency: string
  asset?: string          // Pro only
  price_type?: PriceType
  price: number
  floating_margin?: number
  total_amount?: number   // Pro only
  min_limit: number
  max_limit: number
  payment_time_limit?: number
  terms?: string
  terms_tags?: string[]
  auto_reply?: string
  remarks?: string
  payment_method_ids?: string[]
  counterparty_conditions?: CounterpartyConditions
}

export interface UpdateAdDTO {
  price?: number
  floating_margin?: number
  total_amount?: number
  available_amount?: number
  min_limit?: number
  max_limit?: number
  payment_time_limit?: number
  terms?: string
  terms_tags?: string[]
  auto_reply?: string
  remarks?: string
  status?: AdStatus
  payment_method_ids?: string[]
  counterparty_conditions?: CounterpartyConditions
}

export interface AdFilters {
  mode?: Mode
  type?: OrderType
  from_currency?: string
  to_currency?: string
  asset?: string
  status?: AdStatus
  trader_id?: string
  min_amount?: number
  max_amount?: number
}

// ============================================================================
// 5. ORDERS (Unified - replaces trades + p2p_orders)
// ============================================================================

export interface Order {
  id: string
  order_number: string
  mode: Mode
  type: OrderType | null  // Pro only
  user_id: string
  trader_id: string
  ad_id: string | null    // Pro only
  payment_method_id: string | null
  // Amounts
  send_currency: string
  send_amount: number
  receive_currency: string
  receive_amount: number
  rate: number
  fee_amount: number
  fee_currency: string | null
  // Pro: Crypto
  asset: string | null
  crypto_amount: number | null
  // Lite: Recipient
  recipient_name: string | null
  recipient_phone: string | null
  recipient_bank: string | null
  recipient_account: string | null
  // Status & Lifecycle
  status: OrderStatus
  expires_at: string | null
  created_at: string
  accepted_at: string | null
  paid_at: string | null
  delivered_at: string | null
  released_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  // Payment proof
  payment_reference: string | null
  payment_proof_url: string | null
  // Escrow (Pro)
  escrow_amount: number | null
  escrow_asset: string | null
  escrow_locked_at: string | null
  escrow_released_at: string | null
  escrow_tx_id: string | null
  // Bond (Lite)
  bond_locked: number | null
  // Metadata
  auto_reply_sent: boolean
  notes: string | null
  // Joined fields
  user_name?: string
  user_phone?: string
  trader_name?: string
  trader_rating?: number
  payment_method?: TraderPaymentMethod
}

export interface CreateLiteOrderDTO {
  trader_id: string
  ad_id?: string
  send_currency: string
  send_amount: number
  receive_currency: string
  rate: number
  recipient_name: string
  recipient_phone: string
  recipient_bank?: string
  recipient_account?: string
  payment_method_id?: string
}

export interface CreateProOrderDTO {
  ad_id: string
  type: OrderType
  amount: number  // Fiat amount
  payment_method_id?: string
}

export interface OrderFilters {
  mode?: Mode
  user_id?: string
  trader_id?: string
  status?: OrderStatus | OrderStatus[]
  ad_id?: string
  from_date?: string
  to_date?: string
}

// ============================================================================
// 6. MESSAGES (Unified chat)
// ============================================================================

export interface Message {
  id: string
  order_id: string
  sender_id: string
  message_type: MessageType
  content: string | null
  image_url: string | null
  metadata: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  created_at: string
  // Joined fields
  sender_name?: string
  sender_avatar?: string
}

export interface CreateMessageDTO {
  order_id: string
  message_type?: MessageType
  content?: string
  image_url?: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// 7. FEEDBACK (Unified ratings)
// ============================================================================

export interface Feedback {
  id: string
  order_id: string
  from_user_id: string
  to_trader_id: string
  rating_type: RatingType
  rating_value: number  // 1-5 for numeric, 0-1 for binary
  comment: string | null
  is_anonymous: boolean
  created_at: string
  // Joined fields
  from_user_name?: string
  order_number?: string
}

export interface CreateFeedbackDTO {
  order_id: string
  rating_type: RatingType
  rating_value: number
  comment?: string
  is_anonymous?: boolean
}

// ============================================================================
// 8. DISPUTES
// ============================================================================

export interface Dispute {
  id: string
  order_id: string
  opened_by: string
  claim_type: DisputeClaimType
  reason: string
  status: DisputeStatus
  resolution: DisputeResolution | null
  resolution_notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  evidence_deadline: string | null
  created_at: string
  updated_at: string
  // Joined fields
  opened_by_name?: string
  resolved_by_name?: string
  order_number?: string
}

export interface CreateDisputeDTO {
  order_id: string
  claim_type: DisputeClaimType
  reason: string
  initial_evidence?: CreateEvidenceDTO[]
}

// Claim type info with evidence requirements
export interface EvidenceRequirement {
  category: string
  label: string
  description: string
  evidenceType: EvidenceType
}

export interface DisputeClaimTypeInfo {
  id: DisputeClaimType
  name: string
  description: string
  required_evidence: EvidenceRequirement[]
  optional_evidence: EvidenceRequirement[]
  available_for_buyer: boolean
  available_for_seller: boolean
  is_active: boolean
  display_order: number
}

// ============================================================================
// 9. DISPUTE EVIDENCE
// ============================================================================

export interface DisputeEvidence {
  id: string
  dispute_id: string
  submitted_by: string
  evidence_type: EvidenceType
  evidence_category: string | null
  is_required: boolean
  title: string | null
  description: string | null
  file_url: string | null
  file_hash: string | null
  created_at: string
  // Joined fields
  submitted_by_name?: string
}

export interface CreateEvidenceDTO {
  dispute_id?: string
  evidence_type: EvidenceType
  evidence_category?: string
  is_required?: boolean
  title?: string
  description?: string
  file_url?: string
  file_hash?: string
}

// ============================================================================
// 10. SUPPORTED ASSETS (Pro)
// ============================================================================

export interface SupportedAsset {
  id: string
  symbol: string
  name: string
  type: AssetType
  network: string | null
  contract_address: string | null
  decimals: number
  min_deposit: number | null
  min_withdrawal: number | null
  withdrawal_fee: number | null
  is_active: boolean
  icon_url: string | null
  created_at: string
}

// ============================================================================
// 11. USER WALLETS (Pro)
// ============================================================================

export interface UserWallet {
  id: string
  user_id: string
  asset: string
  available_balance: number
  locked_balance: number
  total_deposited: number
  total_withdrawn: number
  created_at: string
  updated_at: string
}

// ============================================================================
// 12. WALLET TRANSACTIONS (Pro)
// ============================================================================

export interface WalletTransaction {
  id: string
  user_id: string
  asset: string
  type: WalletTransactionType
  amount: number
  fee: number
  balance_before: number | null
  balance_after: number | null
  status: WalletTransactionStatus
  reference_type: string | null
  reference_id: string | null
  tx_hash: string | null
  from_address: string | null
  to_address: string | null
  network: string | null
  confirmations: number
  required_confirmations: number | null
  notes: string | null
  created_at: string
  completed_at: string | null
}

// ============================================================================
// 13. DEPOSIT ADDRESSES (Pro)
// ============================================================================

export interface DepositAddress {
  id: string
  user_id: string
  asset: string
  network: string
  address: string
  memo: string | null
  is_active: boolean
  created_at: string
}

// ============================================================================
// 14. BLOCKED USERS (Pro)
// ============================================================================

export interface BlockedUser {
  id: string
  blocker_id: string
  blocked_id: string
  reason: string | null
  created_at: string
}

// ============================================================================
// 15. TRADER FOLLOWS (Pro)
// ============================================================================

export interface TraderFollow {
  id: string
  follower_id: string
  trader_id: string
  created_at: string
}

// ============================================================================
// 16. OTP CODES
// ============================================================================

export interface OtpCode {
  id: string
  phone: string
  code: string
  purpose: 'login' | 'verify' | 'reset'
  attempts: number
  expires_at: string
  used_at: string | null
  created_at: string
}

// ============================================================================
// 17. NOTIFICATIONS
// ============================================================================

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const PLATFORM_FEE_PERCENT = 0.5  // 0.5%
export const DEFAULT_PAYMENT_TIME_LIMIT = 15  // 15 minutes
export const ORDER_EXPIRY_MINUTES = 15

// Order status transitions
export const LITE_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'accepted',
  'paid',
  'delivering',
  'completed'
]

export const PRO_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'paid',
  'releasing',
  'released',
  'completed'
]

// Valid status transitions
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'cancelled', 'expired'],       // Lite: trader accepts; both: cancel/expire
  accepted: ['paid', 'cancelled'],                     // Lite: user pays
  paid: ['delivering', 'releasing', 'disputed'],       // Lite: trader delivers; Pro: seller releases
  delivering: ['completed', 'disputed'],               // Lite: user confirms
  releasing: ['released', 'disputed'],                 // Pro: releasing in progress
  released: ['completed'],                             // Pro: auto-complete after release
  completed: [],                                       // Final state
  cancelled: [],                                       // Final state
  disputed: ['completed', 'cancelled'],                // Resolution
  expired: []                                          // Final state
}
