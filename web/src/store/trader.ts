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

export interface TraderProfile {
  id: string
  userId: string
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
}

interface TraderState {
  profile: TraderProfile | null
  paymentMethods: PaymentMethod[]
  isLoading: boolean
  error: string | null

  // Profile actions
  getProfile: () => Promise<TraderProfile | null>
  updateStatus: (online: boolean) => Promise<boolean>

  // Payment method actions
  getPaymentMethods: () => Promise<void>
  addPaymentMethod: (data: {
    type: PaymentMethod['type']
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

export const useTraderStore = create<TraderState>((set) => ({
  profile: null,
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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch profile')

      set({ profile: data.data, isLoading: false })
      return data.data
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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update status')

      set(state => ({
        profile: state.profile ? { ...state.profile, online } : null,
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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch payment methods')

      set({ paymentMethods: data.data.paymentMethods || [], isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
    }
  },

  addPaymentMethod: async (methodData) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/traders/me/payment-methods`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(methodData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to add payment method')

      const newMethod = data.data.paymentMethod
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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update payment method')

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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to delete payment method')

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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to set primary payment method')

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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to initiate verification')

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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to submit verification proof')

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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel verification')

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
