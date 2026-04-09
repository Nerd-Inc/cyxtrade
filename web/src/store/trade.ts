import { create } from 'zustand'
import { useAuthStore } from './auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export interface Trade {
  id: string
  sendAmount: number
  sendCurrency: string
  receiveAmount: number
  receiveCurrency: string
  exchangeRate: number
  status: 'pending' | 'accepted' | 'paid' | 'delivering' | 'completed' | 'disputed' | 'cancelled' | 'expired'
  recipientName: string
  recipientPhone: string
  recipientBank?: string
  recipientAccountNumber?: string
  paymentReference?: string
  paymentProofUrl?: string
  traderId: string
  traderName?: string
  traderPaymentMethods?: Array<{
    id: string
    type: string
    name: string
    details: Record<string, string>
  }>
  userId: string
  createdAt: string
  updatedAt: string
  expiresAt: string
  acceptedAt?: string
  paidAt?: string
  completedAt?: string
}

export interface Trader {
  id: string
  userId: string
  displayName: string
  avatarUrl?: string
  rating: number
  tradeCount: number
  online: boolean
  corridors: Array<{
    from: string
    to: string
    rate: number
    minAmount: number
    maxAmount: number
  }>
  paymentMethods?: Array<{
    id: string
    type: string
    details: Record<string, string>
    isPrimary: boolean
  }>
}

type BackendTrader = {
  id: string
  userId?: string
  user_id?: string
  displayName?: string | null
  display_name?: string | null
  avatarUrl?: string | null
  avatar_url?: string | null
  rating?: number | string
  tradeCount?: number
  totalTrades?: number
  online?: boolean
  isOnline?: boolean
  corridors?: Array<{
    from: string
    to: string
    rate?: number
    buyRate?: number
    sellRate?: number
    minAmount?: number
    maxAmount?: number
  }>
  paymentMethods?: Array<{
    id: string
    type: string
    details: Record<string, string>
    isPrimary: boolean
  }>
}

interface TradeState {
  trades: Trade[]
  currentTrade: Trade | null
  traders: Trader[]
  selectedTrader: Trader | null
  isLoading: boolean
  error: string | null

  // Trade actions
  getMyTrades: (filters?: { status?: string; role?: string }) => Promise<void>
  getTrade: (id: string) => Promise<Trade | null>
  createTrade: (data: {
    traderId: string
    sendAmount: number
    sendCurrency: string
    receiveCurrency: string
    receiveAmount?: number
    rate?: number
    recipientName: string
    recipientPhone: string
    recipientBank?: string
    recipientAccountNumber?: string
    recipientMethod?: string
  }) => Promise<Trade | null>
  markPaid: (id: string, data?: { paymentReference?: string; paymentProofUrl?: string }) => Promise<boolean>
  completeTrade: (id: string) => Promise<boolean>
  cancelTrade: (id: string) => Promise<boolean>
  rateTrade: (id: string, rating: number, comment?: string) => Promise<boolean>

  // Trader actions (for traders)
  acceptTrade: (id: string) => Promise<boolean>
  declineTrade: (id: string) => Promise<boolean>
  markDelivered: (id: string) => Promise<boolean>

  // Trader browsing
  getTraders: (from?: string, to?: string) => Promise<void>
  getTrader: (id: string) => Promise<Trader | null>
  selectTrader: (trader: Trader | null) => void

  clearError: () => void
}

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
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

const normalizeTrader = (raw: BackendTrader): Trader => {
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
      minAmount: toNumber(c.minAmount, 100),
      maxAmount: toNumber(c.maxAmount, 5000),
    }
  })

  return {
    id: raw.id,
    userId: raw.userId || raw.user_id || '',
    displayName: raw.displayName || raw.display_name || 'Trader',
    avatarUrl: raw.avatarUrl || raw.avatar_url || undefined,
    rating: toNumber(raw.rating, 0),
    tradeCount: raw.tradeCount ?? raw.totalTrades ?? 0,
    online: raw.online ?? raw.isOnline ?? false,
    corridors,
    paymentMethods: raw.paymentMethods || [],
  }
}

export const useTradeStore = create<TradeState>((set) => ({
  trades: [],
  currentTrade: null,
  traders: [],
  selectedTrader: null,
  isLoading: false,
  error: null,

  getMyTrades: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.role) params.append('role', filters.role)

      const res = await fetch(`${API_URL}/trades?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch trades')

      set({ trades: data.data.trades || [], isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  getTrade: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/trades/${id}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch trade')

      set({ currentTrade: data.data, isLoading: false })
      return data.data
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  createTrade: async (tradeData) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/trades`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(tradeData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create trade')

      const newTrade = data.data
      set(state => ({
        trades: [newTrade, ...state.trades],
        currentTrade: newTrade,
        isLoading: false
      }))
      return newTrade
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  markPaid: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/trades/${id}/paid`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          paymentReference: data?.paymentReference,
          paymentProofUrl: data?.paymentProofUrl
        })
      })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error?.message || 'Failed to mark as paid')

      set(state => ({
        trades: state.trades.map(t => t.id === id ? { ...t, status: 'paid' as const, paymentReference: data?.paymentReference } : t),
        currentTrade: state.currentTrade?.id === id ? { ...state.currentTrade, status: 'paid' as const } : state.currentTrade,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  completeTrade: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/trades/${id}/complete`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to complete trade')

      set(state => ({
        trades: state.trades.map(t => t.id === id ? { ...t, status: 'completed' as const } : t),
        currentTrade: state.currentTrade?.id === id ? { ...state.currentTrade, status: 'completed' as const } : state.currentTrade,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  cancelTrade: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/trades/${id}/cancel`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel trade')

      set(state => ({
        trades: state.trades.map(t => t.id === id ? { ...t, status: 'cancelled' as const } : t),
        currentTrade: state.currentTrade?.id === id ? { ...state.currentTrade, status: 'cancelled' as const } : state.currentTrade,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  rateTrade: async (id, rating, comment) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/trades/${id}/rating`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rating, comment })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to rate trade')

      set({ isLoading: false })
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  // Trader actions
  acceptTrade: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/trades/${id}/accept`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to accept trade')

      set(state => ({
        trades: state.trades.map(t => t.id === id ? { ...t, status: 'accepted' as const } : t),
        currentTrade: state.currentTrade?.id === id ? { ...state.currentTrade, status: 'accepted' as const } : state.currentTrade,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  declineTrade: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/trades/${id}/decline`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to decline trade')

      set(state => ({
        trades: state.trades.map(t => t.id === id ? { ...t, status: 'cancelled' as const } : t),
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  markDelivered: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/trades/${id}/delivered`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to mark as delivered')

      set(state => ({
        trades: state.trades.map(t => t.id === id ? { ...t, status: 'delivering' as const } : t),
        currentTrade: state.currentTrade?.id === id ? { ...state.currentTrade, status: 'delivering' as const } : state.currentTrade,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  // Trader browsing
  getTraders: async (from, to) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)

      const res = await fetch(`${API_URL}/traders?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch traders')

      const traders = ((data.data?.traders || []) as BackendTrader[]).map(normalizeTrader)
      set({ traders, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  getTrader: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/${id}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch trader')

      const trader = normalizeTrader(data.data as BackendTrader)
      set({ selectedTrader: trader, isLoading: false })
      return trader
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  selectTrader: (trader) => set({ selectedTrader: trader }),

  clearError: () => set({ error: null })
}))
