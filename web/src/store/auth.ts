import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cryptoService, type Identity } from '../services/crypto'

// In development, use relative path to go through Vite proxy
// In production, use VITE_API_URL environment variable
const API_URL = import.meta.env.VITE_API_URL || '/api'

export interface User {
  id: string
  phone?: string | null
  publicKey?: string
  fingerprint?: string
  displayName: string | null
  avatarUrl: string | null
  isTrader: boolean
  isAdmin: boolean
  traderId?: string
  traderAddress?: string
}

interface AuthState {
  token: string | null
  user: User | null
  identity: Identity | null
  isLoading: boolean
  error: string | null

  // Keypair auth actions
  loginWithKeypair: () => Promise<boolean>
  hasStoredIdentity: () => Promise<boolean>
  exportPrivateKey: () => Promise<string | null>
  importPrivateKey: (privateKeyHex: string) => Promise<boolean>

  // Legacy OTP actions (for recovery)
  requestOtp: (phone: string) => Promise<boolean>
  verifyOtp: (phone: string, otp: string) => Promise<boolean>

  // Other actions
  updateProfile: (data: { displayName?: string; avatarUrl?: string }) => Promise<boolean>
  becomeTrader: () => Promise<{ address: string } | null>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      identity: null,
      isLoading: false,
      error: null,

      // Check if there's a stored identity
      hasStoredIdentity: async () => {
        return await cryptoService.hasIdentity()
      },

      // Login with keypair (anonymous identity)
      loginWithKeypair: async () => {
        set({ isLoading: true, error: null })
        try {
          // Get or create identity
          const identity = await cryptoService.getOrCreateIdentity()

          // Request challenge from server
          let challengeRes: Response
          try {
            challengeRes = await fetch(`${API_URL}/auth/challenge`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicKey: identity.publicKey })
            })
          } catch (fetchError) {
            throw new Error('Cannot connect to server. Make sure the backend is running on http://localhost:3000')
          }

          // Check if response is JSON
          const contentType = challengeRes.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response. Is the backend running on http://localhost:3000?')
          }

          const challengeData = await challengeRes.json()
          if (!challengeRes.ok) {
            throw new Error(challengeData.error?.message || 'Failed to get challenge')
          }

          // Sign challenge with private key
          const signature = await cryptoService.signChallenge(challengeData.data.challenge)

          // Verify signature and get JWT
          let verifyRes: Response
          try {
            verifyRes = await fetch(`${API_URL}/auth/verify-signature`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                publicKey: identity.publicKey,
                signature
              })
            })
          } catch (fetchError) {
            throw new Error('Cannot connect to server. Make sure the backend is running.')
          }

          // Check if response is JSON
          const verifyContentType = verifyRes.headers.get('content-type')
          if (!verifyContentType || !verifyContentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response. Is the backend running?')
          }

          const verifyData = await verifyRes.json()
          if (!verifyRes.ok) {
            throw new Error(verifyData.error?.message || 'Failed to verify signature')
          }

          set({
            isLoading: false,
            identity,
            token: verifyData.data.token,
            user: {
              id: verifyData.data.user.id,
              publicKey: verifyData.data.user.publicKey,
              fingerprint: verifyData.data.user.fingerprint,
              phone: verifyData.data.user.phone,
              displayName: verifyData.data.user.displayName,
              avatarUrl: verifyData.data.user.avatarUrl,
              isTrader: verifyData.data.user.isTrader,
              isAdmin: verifyData.data.user.isAdmin,
              traderId: verifyData.data.user.traderId,
              traderAddress: verifyData.data.user.traderAddress
            }
          })
          return true
        } catch (err) {
          set({ isLoading: false, error: (err as Error).message })
          return false
        }
      },

      // Export private key for backup
      exportPrivateKey: async () => {
        return await cryptoService.exportPrivateKey()
      },

      // Import from private key backup
      importPrivateKey: async (privateKeyHex: string) => {
        set({ isLoading: true, error: null })
        try {
          const identity = await cryptoService.importFromPrivateKey(privateKeyHex)
          set({ identity })
          // Now login with the imported key
          return await get().loginWithKeypair()
        } catch (err) {
          set({ isLoading: false, error: (err as Error).message })
          return false
        }
      },

      requestOtp: async (phone: string) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/auth/otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error?.message || 'Failed to send OTP')
          set({ isLoading: false })
          return true
        } catch (err) {
          set({ isLoading: false, error: (err as Error).message })
          return false
        }
      },

      verifyOtp: async (phone: string, otp: string) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error?.message || 'Invalid OTP')

          set({
            isLoading: false,
            token: data.data.token,
            user: {
              id: data.data.user.id,
              phone: data.data.user.phone,
              displayName: data.data.user.displayName,
              avatarUrl: data.data.user.avatarUrl,
              isTrader: data.data.user.isTrader,
              isAdmin: data.data.user.isAdmin,
              traderId: data.data.user.traderId,
              traderAddress: data.data.user.traderAddress
            }
          })
          return true
        } catch (err) {
          set({ isLoading: false, error: (err as Error).message })
          return false
        }
      },

      updateProfile: async (data) => {
        const { token } = get()
        if (!token) return false

        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/users/me`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
          })
          const result = await res.json()
          if (!res.ok) throw new Error(result.error?.message || 'Failed to update profile')

          set(state => ({
            isLoading: false,
            user: state.user ? {
              ...state.user,
              displayName: data.displayName ?? state.user.displayName,
              avatarUrl: data.avatarUrl ?? state.user.avatarUrl
            } : null
          }))
          return true
        } catch (err) {
          set({ isLoading: false, error: (err as Error).message })
          return false
        }
      },

      becomeTrader: async () => {
        const { token } = get()
        if (!token) return null

        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/traders/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
          const result = await res.json()
          if (!res.ok) throw new Error(result.error?.message || 'Failed to register as trader')

          set(state => ({
            isLoading: false,
            user: state.user ? {
              ...state.user,
              isTrader: true,
              traderId: result.data.traderId,
              traderAddress: result.data.address
            } : null
          }))
          return { address: result.data.address }
        } catch (err) {
          set({ isLoading: false, error: (err as Error).message })
          return null
        }
      },

      logout: async () => {
        // Clear stored identity on logout
        await cryptoService.clearIdentity()
        set({ token: null, user: null, identity: null, error: null })
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'cyxtrade-auth',
      partialize: (state) => ({ token: state.token, user: state.user })
    }
  )
)
