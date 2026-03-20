import { useState, useCallback } from 'react'
import { useAuthStore } from '../store/auth'
import type { RiskAssessment, RiskWarning } from '../components/ScamWarningModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface UseRiskAssessmentReturn {
  assessment: RiskAssessment | null
  isLoading: boolean
  error: string | null
  assessTrade: (params: {
    traderId: string
    paymentMethodType?: string
    paymentIdentifier?: string
    amount?: number
  }) => Promise<RiskAssessment | null>
  quickCheck: (traderId: string) => Promise<{ hasWarnings: boolean; warnings: RiskWarning[] } | null>
  checkPayment: (methodType: string, identifier: string) => Promise<{ isBlacklisted: boolean; reason: string | null } | null>
  reportSuspicious: (params: {
    tradeId: string
    methodType: string
    identifier: string
    reason: string
    evidenceUrl?: string
  }) => Promise<boolean>
  clearAssessment: () => void
}

export function useRiskAssessment(): UseRiskAssessmentReturn {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = useAuthStore((state) => state.token)

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }), [token])

  const assessTrade = useCallback(async (params: {
    traderId: string
    paymentMethodType?: string
    paymentIdentifier?: string
    amount?: number
  }): Promise<RiskAssessment | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/risk/assess`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(params)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to assess risk')
      }

      const result = data.data as RiskAssessment
      setAssessment(result)
      return result
    } catch (err) {
      const message = (err as Error).message
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [getHeaders])

  const quickCheck = useCallback(async (
    traderId: string
  ): Promise<{ hasWarnings: boolean; warnings: RiskWarning[] } | null> => {
    try {
      const res = await fetch(`${API_URL}/risk/quick/${traderId}`, {
        headers: getHeaders()
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to check risk')
      }

      return data.data
    } catch (err) {
      console.error('Quick risk check failed:', err)
      return null
    }
  }, [getHeaders])

  const checkPayment = useCallback(async (
    methodType: string,
    identifier: string
  ): Promise<{ isBlacklisted: boolean; reason: string | null } | null> => {
    try {
      const res = await fetch(`${API_URL}/risk/check-payment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ methodType, identifier })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to check payment')
      }

      return data.data
    } catch (err) {
      console.error('Payment check failed:', err)
      return null
    }
  }, [getHeaders])

  const reportSuspicious = useCallback(async (params: {
    tradeId: string
    methodType: string
    identifier: string
    reason: string
    evidenceUrl?: string
  }): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/risk/report`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(params)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit report')
      }

      return true
    } catch (err) {
      console.error('Report submission failed:', err)
      throw err
    }
  }, [getHeaders])

  const clearAssessment = useCallback(() => {
    setAssessment(null)
    setError(null)
  }, [])

  return {
    assessment,
    isLoading,
    error,
    assessTrade,
    quickCheck,
    checkPayment,
    reportSuspicious,
    clearAssessment
  }
}
