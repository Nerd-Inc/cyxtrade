import { create } from 'zustand'
import { useAuthStore } from './auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// ============================================
// Types
// ============================================

export interface Asset {
  symbol: string
  name: string
  network: string
  decimals: number
  minDeposit: number
  minWithdrawal: number
  withdrawalFee: number
  isFiat: boolean
  iconUrl?: string
  contractAddress?: string
}

export interface WalletBalance {
  asset: string
  available: number
  locked: number
  total: number
  totalDeposited?: number
  totalWithdrawn?: number
}

export interface Transaction {
  id: string
  asset: string
  type: 'deposit' | 'withdrawal' | 'escrow_lock' | 'escrow_release' | 'escrow_refund' | 'fee'
  amount: number
  fee: number
  balanceBefore: number
  balanceAfter: number
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  txHash?: string
  fromAddress?: string
  toAddress?: string
  network?: string
  confirmations?: number
  requiredConfirmations?: number
  notes?: string
  createdAt: string
  completedAt?: string
}

export interface P2PAd {
  id: string
  traderUserId: string
  traderName: string
  type: 'buy' | 'sell'
  asset: string
  fiatCurrency: string
  price: number
  minAmount: number
  maxAmount: number
  availableAmount: number
  paymentMethods: string[]
  paymentWindow: number
  terms?: string
  autoReply?: string
  isActive: boolean
  completedCount: number
  completionRate: number
  avgReleaseTime?: number
  createdAt: string
}

export interface P2POrder {
  id: string
  adId: string
  adType: 'buy' | 'sell'
  buyerUserId: string
  sellerUserId: string
  buyerName: string
  sellerName: string
  asset: string
  fiatCurrency: string
  cryptoAmount: number
  fiatAmount: number
  price: number
  paymentMethod: string
  status: 'pending' | 'payment_pending' | 'paid' | 'releasing' | 'completed' | 'disputed' | 'cancelled' | 'expired'
  escrowAsset?: string
  escrowAmount?: number
  escrowLockedAt?: string
  expiresAt: string
  createdAt: string
  paidAt?: string
  releasedAt?: string
  completedAt?: string
}

// ============================================
// Wallet Store
// ============================================

interface WalletState {
  assets: Asset[]
  balances: WalletBalance[]
  transactions: Transaction[]
  transactionTotal: number
  isLoading: boolean
  error: string | null

  // Actions
  fetchAssets: () => Promise<void>
  fetchBalances: () => Promise<void>
  fetchBalance: (asset: string) => Promise<WalletBalance | null>
  initWallet: (asset: string) => Promise<boolean>
  fetchDepositAddress: (asset: string, network?: string) => Promise<{ address: string | null; memo?: string } | null>
  requestWithdrawal: (data: { asset: string; amount: number; address: string; network?: string }) => Promise<{ success: boolean; errorCode?: number }>
  cancelWithdrawal: (txId: string) => Promise<boolean>
  fetchTransactions: (filters?: { asset?: string; type?: string; status?: string; limit?: number; offset?: number }) => Promise<void>
  clearError: () => void
}

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
}

export const useWalletStore = create<WalletState>((set, get) => ({
  assets: [],
  balances: [],
  transactions: [],
  transactionTotal: 0,
  isLoading: false,
  error: null,

  fetchAssets: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/wallet/assets`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch assets')
      set({ assets: data.data.assets || [], isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  fetchBalances: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/wallet/balances`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch balances')
      set({ balances: data.data.wallets || [], isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  fetchBalance: async (asset) => {
    try {
      const res = await fetch(`${API_URL}/pro/wallet/balance/${asset}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch balance')
      return data.data as WalletBalance
    } catch (err) {
      set({ error: (err as Error).message })
      return null
    }
  },

  initWallet: async (asset) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/wallet/init/${asset}`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to initialize wallet')

      // Refresh balances
      await get().fetchBalances()
      set({ isLoading: false })
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  fetchDepositAddress: async (asset, network = 'TRC20') => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/wallet/deposit/${asset}?network=${network}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to get deposit address')
      set({ isLoading: false })
      return { address: data.data.address, memo: data.data.memo }
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  requestWithdrawal: async ({ asset, amount, address, network = 'TRC20' }) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/wallet/withdraw`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ asset, amount, address, network })
      })
      const data = await res.json()
      if (!res.ok) {
        // Return error code for TOTP handling
        const errorCode = data.error?.code
        const errorMsg = data.error?.message || 'Failed to request withdrawal'
        set({ isLoading: false, error: errorMsg })
        // Return error code so caller can handle TOTP_REQUIRED (2006)
        return { success: false, errorCode }
      }

      // Refresh balances and transactions
      await get().fetchBalances()
      await get().fetchTransactions()
      set({ isLoading: false })
      return { success: true }
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return { success: false }
    }
  },

  cancelWithdrawal: async (txId) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/wallet/withdraw/${txId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel withdrawal')

      // Refresh balances and transactions
      await get().fetchBalances()
      await get().fetchTransactions()
      set({ isLoading: false })
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  fetchTransactions: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters?.asset) params.append('asset', filters.asset)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      const res = await fetch(`${API_URL}/pro/wallet/transactions?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch transactions')
      set({
        transactions: data.data.transactions || [],
        transactionTotal: data.data.total || 0,
        isLoading: false
      })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  clearError: () => set({ error: null })
}))

// ============================================
// P2P Ads Store
// ============================================

interface AdsState {
  ads: P2PAd[]
  myAds: P2PAd[]
  currentAd: P2PAd | null
  isLoading: boolean
  error: string | null
  filters: {
    type?: 'buy' | 'sell'
    asset?: string
    fiatCurrency?: string
    paymentMethod?: string
  }

  // Actions
  fetchAds: (filters?: AdsState['filters']) => Promise<void>
  fetchMyAds: () => Promise<void>
  fetchAd: (id: string) => Promise<P2PAd | null>
  createAd: (data: {
    type: 'buy' | 'sell'
    asset: string
    fiatCurrency: string
    price: number
    priceType?: 'fixed' | 'floating'
    floatingMargin?: number
    totalAmount: number
    minLimit: number
    maxLimit: number
    paymentMethodIds: string[]
    paymentTimeLimit?: number
    terms?: string
    autoReply?: string
    remarks?: string
    regionRestrictions?: string
    counterpartyConditions?: object
  }) => Promise<P2PAd | null>
  updateAd: (id: string, data: Partial<{
    price: number
    totalAmount: number
    minAmount: number
    maxAmount: number
    paymentMethods: string[]
    paymentWindow: number
    terms: string
    autoReply: string
    isActive: boolean
  }>) => Promise<boolean>
  deleteAd: (id: string) => Promise<boolean>
  setFilters: (filters: AdsState['filters']) => void
  clearError: () => void
}

export const useAdsStore = create<AdsState>((set, get) => ({
  ads: [],
  myAds: [],
  currentAd: null,
  isLoading: false,
  error: null,
  filters: {},

  fetchAds: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      const activeFilters = filters || get().filters
      if (activeFilters.type) params.append('type', activeFilters.type)
      if (activeFilters.asset) params.append('asset', activeFilters.asset)
      if (activeFilters.fiatCurrency) params.append('fiatCurrency', activeFilters.fiatCurrency)
      if (activeFilters.paymentMethod) params.append('paymentMethod', activeFilters.paymentMethod)

      const res = await fetch(`${API_URL}/pro/ads?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch ads')
      set({ ads: data.data.ads || [], isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  fetchMyAds: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/ads/my`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch my ads')
      set({ myAds: data.data.ads || [], isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  fetchAd: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/ads/${id}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch ad')
      set({ currentAd: data.data, isLoading: false })
      return data.data
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  createAd: async (adData) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/ads`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(adData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create ad')

      const newAd = data.data
      set(state => ({
        myAds: [newAd, ...state.myAds],
        isLoading: false
      }))
      return newAd
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  updateAd: async (id, updateData) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/ads/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update ad')

      set(state => ({
        myAds: state.myAds.map(ad => ad.id === id ? { ...ad, ...updateData } : ad),
        currentAd: state.currentAd?.id === id ? { ...state.currentAd, ...updateData } : state.currentAd,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  deleteAd: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/ads/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to delete ad')

      set(state => ({
        myAds: state.myAds.filter(ad => ad.id !== id),
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  setFilters: (filters) => set({ filters }),
  clearError: () => set({ error: null })
}))

// ============================================
// P2P Orders Store
// ============================================

interface OrdersState {
  orders: P2POrder[]
  currentOrder: P2POrder | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchOrders: (filters?: { status?: string; role?: 'buyer' | 'seller' }) => Promise<void>
  fetchOrder: (id: string) => Promise<P2POrder | null>
  createOrder: (data: { adId: string; amount: number; paymentMethod: string }) => Promise<{ order: P2POrder | null; errorCode?: number }>
  markPaid: (id: string) => Promise<boolean>
  releaseOrder: (id: string) => Promise<boolean>
  cancelOrder: (id: string) => Promise<boolean>
  openDispute: (id: string, claimType: string, reason: string) => Promise<boolean>
  clearError: () => void
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,

  fetchOrders: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.role) params.append('role', filters.role)

      const res = await fetch(`${API_URL}/pro/orders?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch orders')
      set({ orders: data.data.orders || [], isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  fetchOrder: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/orders/${id}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch order')
      set({ currentOrder: data.data, isLoading: false })
      return data.data
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return null
    }
  },

  createOrder: async (orderData) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData)
      })
      const data = await res.json()
      if (!res.ok) {
        const errorCode = data.error?.code
        const errorMsg = data.error?.message || 'Failed to create order'
        set({ isLoading: false, error: errorMsg })
        // Return error info for TOTP handling
        return { order: null, errorCode }
      }

      const newOrder = data.data
      set(state => ({
        orders: [newOrder, ...state.orders],
        currentOrder: newOrder,
        isLoading: false
      }))
      return { order: newOrder }
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return { order: null }
    }
  },

  markPaid: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/orders/${id}/paid`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to mark as paid')

      set(state => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status: 'paid' as const } : o),
        currentOrder: state.currentOrder?.id === id ? { ...state.currentOrder, status: 'paid' as const } : state.currentOrder,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  releaseOrder: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/orders/${id}/release`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to release order')

      set(state => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status: 'completed' as const } : o),
        currentOrder: state.currentOrder?.id === id ? { ...state.currentOrder, status: 'completed' as const } : state.currentOrder,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  cancelOrder: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/orders/${id}/cancel`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel order')

      set(state => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status: 'cancelled' as const } : o),
        currentOrder: state.currentOrder?.id === id ? { ...state.currentOrder, status: 'cancelled' as const } : state.currentOrder,
        isLoading: false
      }))
      return true
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      return false
    }
  },

  openDispute: async (id, claimType, reason) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/pro/orders/${id}/dispute`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ claimType, reason })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to open dispute')

      set(state => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status: 'disputed' as const } : o),
        currentOrder: state.currentOrder?.id === id ? { ...state.currentOrder, status: 'disputed' as const } : state.currentOrder,
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
