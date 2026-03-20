import { create } from 'zustand'
import { useAuthStore } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface PaymentMethod {
  id: string
  type: 'bank_transfer' | 'mobile_money' | 'cash'
  name: string
  details: Record<string, string>
  isPrimary: boolean
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired'
  createdAt: string
}

export interface VerificationResult {
  code: string
  amount: number
  instructions: string
  expiresAt: string
}

export interface TraderScorecard {
  avgReleaseTimeMins: number | null
  avgPayTimeMins: number | null
  positiveFeedback: number
  negativeFeedback: number
  feedbackScore: number
  trades30d: number
  completionRate30d: number | null
  totalVolume: number
  trustIndicators: string[]
}

export interface TraderProfile {
  id: string
  userId: string
  address?: string | null
  displayName: string
  avatarUrl?: string
  online: boolean
  rating: number
  tradeCount: number
  completedCount: number
  tier: 'starter' | 'verified' | 'trusted' | 'anchor'
  bondAmount: number
  corridors: Array<{
    from: string
    to: string
    rate: number
    minAmount: number
    maxAmount: number
  }>
  paymentMethods: PaymentMethod[]
  createdAt: string
  // Scorecard fields
  scorecard?: TraderScorecard
}

export interface Corridor {
  from: string
  to: string
  buyRate: number
  sellRate: number
  minAmount?: number
  maxAmount?: number
  paymentMethods?: string[]
  conditions?: string
  autoReply?: string
  timeLimit?: number
  status?: 'online' | 'offline'
}

interface TraderState {
  profile: TraderProfile | null
  trader: TraderProfile | null // Alias for profile
  paymentMethods: PaymentMethod[]
  isLoading: boolean
  error: string | null

  // Profile actions
  getProfile: () => Promise<TraderProfile | null>
  updateStatus: (online: boolean) => Promise<boolean>
  updateCorridor: (corridor: Corridor) => Promise<boolean>

  // Payment method actions
  getPaymentMethods: () => Promise<void>
  addPaymentMethod: (data: {
    type: PaymentMethod['type'] | 'cash'
    name: string
    details: Record<string, string>
  }) => Promise<PaymentMethod | null>
  updatePaymentMethod: (id: string, data: Partial<PaymentMethod>) => Promise<boolean>
  deletePaymentMethod: (id: string) => Promise<boolean>
  setPrimaryPaymentMethod: (id: string) => Promise<boolean>

  // Verification actions
  initiateVerification: (id: string) => Promise<VerificationResult | null>
  submitVerificationProof: (id: string, proofUrl: string) => Promise<boolean>
  cancelVerification: (id: string) => Promise<boolean>

  clearError: () => void
}

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
}

const getErrorMessage = (payload: any, fallback: string): string => {
  if (typeof payload?.error === 'string') return payload.error
  if (typeof payload?.error?.message === 'string') return payload.error.message
  if (typeof payload?.message === 'string') return payload.message
  return fallback
}

type BackendPaymentMethod = {
  id: string
  method_type: 'bank' | 'mobile_money' | 'cash'
  provider?: string
  account_holder_name?: string
  phone_number?: string
  bank_name?: string
  account_number?: string
  iban?: string
  swift_code?: string
  currency?: string
  is_primary?: boolean
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired'
  created_at?: string
}

type BackendTraderProfile = {
  id: string
  userId?: string
  user_id?: string
  address?: string | null
  displayName?: string | null
  display_name?: string | null
  avatarUrl?: string | null
  avatar_url?: string | null
  online?: boolean
  isOnline?: boolean
  rating?: number | string
  tradeCount?: number
  totalTrades?: number
  completedCount?: number
  completedTrades?: number
  tier?: 'starter' | 'verified' | 'trusted' | 'anchor'
  bondAmount?: number | string
  corridors?: Array<{
    from: string
    to: string
    rate?: number
    buyRate?: number
    sellRate?: number
    minAmount?: number
    maxAmount?: number
  }>
  paymentMethods?: PaymentMethod[]
  createdAt?: string
  created_at?: string
  // Scorecard fields
  avgReleaseTimeMins?: number | null
  avg_release_time_mins?: number | null
  avgPayTimeMins?: number | null
  avg_pay_time_mins?: number | null
  positiveFeedback?: number
  positive_feedback?: number
  negativeFeedback?: number
  negative_feedback?: number
  feedbackScore?: number
  trades30d?: number
  trades_30d?: number
  completionRate30d?: number | null
  completion_rate_30d?: number | null
  totalVolume?: number
  total_volume?: number
}

const normalizeMobileProvider = (providerRaw: string): string => {
  const p = providerRaw.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
  const map: Record<string, string> = {
    orange: 'orange_money',
    orange_money: 'orange_money',
    mtn: 'mtn_momo',
    mtn_money: 'mtn_momo',
    mtn_momo: 'mtn_momo',
    momo: 'mtn_momo',
    mpesa: 'mpesa',
    m_pesa: 'mpesa',
    airtel: 'airtel_money',
    airtel_money: 'airtel_money',
    wave: 'wave'
  }
  return map[p] || p
}

const toPaymentMethod = (method: BackendPaymentMethod): PaymentMethod => {
  const type = method.method_type === 'bank'
    ? 'bank_transfer'
    : method.method_type === 'cash'
      ? 'cash'
      : 'mobile_money'
  const details: Record<string, string> = {}
  if (method.provider) details.provider = method.provider
  if (method.account_holder_name) details.accountName = method.account_holder_name
  if (method.phone_number) details.phoneNumber = method.phone_number
  if (type === 'cash') {
    if (method.bank_name) details.location = method.bank_name
    if (method.account_number) details.instructions = method.account_number
  } else {
    if (method.bank_name) details.bankName = method.bank_name
    if (method.account_number) details.accountNumber = method.account_number
  }
  if (method.iban) details.iban = method.iban
  if (method.swift_code) details.swiftCode = method.swift_code
  if (method.currency) details.currency = method.currency

  return {
    id: method.id,
    type,
    name: method.bank_name || method.provider || method.account_holder_name || 'Payment Method',
    details,
    isPrimary: Boolean(method.is_primary),
    verificationStatus: method.verification_status || 'unverified',
    createdAt: method.created_at || new Date().toISOString()
  }
}

const toNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const toTraderProfile = (raw: BackendTraderProfile): TraderProfile => {
  const corridors = (raw.corridors || []).map((c) => {
    let rate = c.rate
    if (rate === undefined && c.buyRate !== undefined && c.sellRate !== undefined) {
      rate = (c.buyRate + c.sellRate) / 2
    } else if (rate === undefined && c.buyRate !== undefined) {
      rate = c.buyRate
    } else if (rate === undefined && c.sellRate !== undefined) {
      rate = c.sellRate
    }

    return {
      from: c.from,
      to: c.to,
      rate: toNumber(rate, 0),
      minAmount: toNumber(c.minAmount, 0),
      maxAmount: toNumber(c.maxAmount, 0),
    }
  })

  // Build scorecard
  const positiveFeedback = raw.positiveFeedback ?? raw.positive_feedback ?? 0
  const negativeFeedback = raw.negativeFeedback ?? raw.negative_feedback ?? 0
  const totalFeedback = positiveFeedback + negativeFeedback
  const feedbackScore = raw.feedbackScore ?? (totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 100)

  const scorecard: TraderScorecard = {
    avgReleaseTimeMins: raw.avgReleaseTimeMins ?? raw.avg_release_time_mins ?? null,
    avgPayTimeMins: raw.avgPayTimeMins ?? raw.avg_pay_time_mins ?? null,
    positiveFeedback,
    negativeFeedback,
    feedbackScore,
    trades30d: raw.trades30d ?? raw.trades_30d ?? 0,
    completionRate30d: raw.completionRate30d ?? raw.completion_rate_30d ?? null,
    totalVolume: raw.totalVolume ?? raw.total_volume ?? 0,
    trustIndicators: []
  }

  // Calculate trust indicators
  const createdAt = raw.createdAt || raw.created_at
  if (createdAt) {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    if (new Date(createdAt) < sixMonthsAgo) {
      scorecard.trustIndicators.push('6_months_active')
    }
  }
  if (positiveFeedback >= 10) {
    scorecard.trustIndicators.push('10_positive_reviews')
  }
  const completedCount = raw.completedCount ?? raw.completedTrades ?? raw.totalTrades ?? 0
  const tradeCount = raw.tradeCount ?? raw.totalTrades ?? 0
  if (tradeCount >= 10 && completedCount / tradeCount >= 0.95) {
    scorecard.trustIndicators.push('high_completion')
  }
  if (scorecard.avgReleaseTimeMins !== null && scorecard.avgReleaseTimeMins < 10) {
    scorecard.trustIndicators.push('fast_release')
  }

  return {
    id: raw.id,
    userId: raw.userId || raw.user_id || '',
    address: raw.address || null,
    displayName: raw.displayName || raw.display_name || 'Trader',
    avatarUrl: raw.avatarUrl || raw.avatar_url || undefined,
    online: raw.online ?? raw.isOnline ?? false,
    rating: toNumber(raw.rating, 0),
    tradeCount: tradeCount,
    completedCount: completedCount,
    tier: raw.tier || 'starter',
    bondAmount: toNumber(raw.bondAmount, 0),
    corridors,
    paymentMethods: raw.paymentMethods || [],
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    scorecard
  }
}

export const useTraderStore = create<TraderState>((set, get) => ({
  profile: null,
  trader: null,
  paymentMethods: [],
  isLoading: false,
  error: null,

  getProfile: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to fetch profile'))

      const profile = toTraderProfile(data.data as BackendTraderProfile)
      set({ profile, trader: profile, isLoading: false })
      return profile
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  updateStatus: async (online) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ online })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to update status'))

      set(state => ({
        profile: state.profile ? { ...state.profile, online } : null,
        trader: state.trader ? { ...state.trader, online } : null,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  updateCorridor: async (corridor) => {
    set({ isLoading: true, error: null })
    try {
      const currentProfile = get().profile
      const existingCorridors = currentProfile?.corridors || []

      // Find existing corridor or add new one
      const corridorIndex = existingCorridors.findIndex(
        c => c.from === corridor.from && c.to === corridor.to
      )

      const updatedCorridors = corridorIndex >= 0
        ? existingCorridors.map((c, i) =>
            i === corridorIndex
              ? {
                  from: corridor.from,
                  to: corridor.to,
                  rate: corridor.buyRate,
                  minAmount: corridor.minAmount || c.minAmount,
                  maxAmount: corridor.maxAmount || c.maxAmount,
                }
              : c
          )
        : [
            ...existingCorridors,
            {
              from: corridor.from,
              to: corridor.to,
              rate: corridor.buyRate,
              minAmount: corridor.minAmount || 100,
              maxAmount: corridor.maxAmount || 5000,
            },
          ]

      const res = await fetch(`${API_URL}/traders/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          corridors: updatedCorridors.map(c => ({
            from: c.from,
            to: c.to,
            buyRate: c.rate,
            sellRate: c.rate,
            minAmount: c.minAmount,
            maxAmount: c.maxAmount,
          })),
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to update corridor'))

      // Update status if specified
      if (corridor.status) {
        await fetch(`${API_URL}/traders/me/status`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ online: corridor.status === 'online' })
        })
      }

      // Update local state
      set(state => ({
        profile: state.profile
          ? { ...state.profile, corridors: updatedCorridors, online: corridor.status === 'online' }
          : null,
        trader: state.trader
          ? { ...state.trader, corridors: updatedCorridors, online: corridor.status === 'online' }
          : null,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  getPaymentMethods: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me/payment-methods`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to fetch payment methods'))

      const paymentMethods = ((data.data.paymentMethods || []) as BackendPaymentMethod[]).map(toPaymentMethod)
      set({ paymentMethods, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  addPaymentMethod: async (methodData) => {
    set({ isLoading: true, error: null })
    try {
      const details = methodData.details || {}
      const payload = methodData.type === 'mobile_money'
        ? {
            method_type: 'mobile_money' as const,
            provider: normalizeMobileProvider(details.provider || methodData.name),
            account_holder_name: details.accountName || methodData.name,
            phone_number: details.phoneNumber,
            currency: details.currency
          }
        : methodData.type === 'cash'
          ? {
              method_type: 'cash' as const,
              provider: (details.location || 'cash_pickup').toLowerCase().replace(/\s+/g, '_'),
              account_holder_name: details.accountName || methodData.name,
              bank_name: details.location,
              account_number: details.instructions,
              currency: details.currency
            }
        : {
            method_type: 'bank' as const,
            provider: (details.bankName || methodData.name || 'bank').toLowerCase().replace(/\s+/g, '_'),
            account_holder_name: details.accountName || methodData.name,
            bank_name: details.bankName,
            account_number: details.accountNumber,
            iban: details.iban,
            swift_code: details.swiftCode,
            currency: details.currency
          }

      const res = await fetch(`${API_URL}/traders/me/payment-methods`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to add payment method'))

      const newMethod = toPaymentMethod(data.data.paymentMethod as BackendPaymentMethod)
      set(state => ({
        paymentMethods: [...state.paymentMethods, newMethod],
        isLoading: false
      }))
      return newMethod
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  updatePaymentMethod: async (id, methodData) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me/payment-methods/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(methodData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to update payment method'))

      set(state => ({
        paymentMethods: state.paymentMethods.map(m =>
          m.id === id ? { ...m, ...methodData } : m
        ),
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  deletePaymentMethod: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me/payment-methods/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to delete payment method'))

      set(state => ({
        paymentMethods: state.paymentMethods.filter(m => m.id !== id),
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  setPrimaryPaymentMethod: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me/payment-methods/${id}/primary`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to set primary payment method'))

      set(state => ({
        paymentMethods: state.paymentMethods.map(m => ({
          ...m,
          isPrimary: m.id === id
        })),
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  initiateVerification: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me/payment-methods/${id}/verify`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to initiate verification'))

      // Update the payment method status to pending
      set(state => ({
        paymentMethods: state.paymentMethods.map(m =>
          m.id === id ? { ...m, verificationStatus: 'pending' as const } : m
        ),
        isLoading: false
      }))

      return data.data as VerificationResult
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  submitVerificationProof: async (id, proofUrl) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me/payment-methods/${id}/proof`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ proofUrl })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to submit verification proof'))

      // Update the payment method status to verified
      set(state => ({
        paymentMethods: state.paymentMethods.map(m =>
          m.id === id ? { ...m, verificationStatus: 'verified' as const } : m
        ),
        isLoading: false
      }))

      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  cancelVerification: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me/payment-methods/${id}/verify`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to cancel verification'))

      // Reset the payment method status to unverified
      set(state => ({
        paymentMethods: state.paymentMethods.map(m =>
          m.id === id ? { ...m, verificationStatus: 'unverified' as const } : m
        ),
        isLoading: false
      }))

      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  clearError: () => set({ error: null })
}))
