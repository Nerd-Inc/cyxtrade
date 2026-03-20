import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface TOTPVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerified: () => void
  operation?: string
  title?: string
  description?: string
  // Optional custom submit handler (for login flow which uses different endpoint)
  onSubmit?: (code: string) => Promise<boolean>
  // External loading/error state (used when onSubmit is provided)
  externalLoading?: boolean
  externalError?: string | null
}

export default function TOTPVerificationModal({
  isOpen,
  onClose,
  onVerified,
  operation = 'general',
  title = 'Two-Factor Authentication',
  description = 'Enter the 6-digit code from your authenticator app.',
  onSubmit,
  externalLoading,
  externalError,
}: TOTPVerificationModalProps) {
  const { token } = useAuthStore()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    // Reset state when modal opens
    if (isOpen) {
      setCode('')
      setError(null)
      setUseBackupCode(false)
    }
  }, [isOpen])

  const handleVerify = async () => {
    const expectedLength = useBackupCode ? 8 : 6

    if (code.length !== expectedLength) {
      setError(`Please enter a ${expectedLength}-character code`)
      return
    }

    // If custom onSubmit is provided (e.g., for login flow), use it
    if (onSubmit) {
      const success = await onSubmit(code)
      if (success) {
        onVerified()
      }
      return
    }

    // Default behavior: call /api/totp/verify
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/totp/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, operation }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Verification failed')
      }

      if (data.data.usedBackupCode) {
        // Could show a warning about using backup code
      }

      onVerified()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleVerify()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1E2329] rounded-lg border border-gray-800 p-6 w-full max-w-sm mx-4 shadow-xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          {description}
        </p>

        {/* Code input */}
        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => {
              const val = useBackupCode
                ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
                : e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(val)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder={useBackupCode ? 'ABCD1234' : '000000'}
            className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#2B3139] text-white text-center text-2xl font-mono tracking-widest placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition"
            maxLength={useBackupCode ? 8 : 6}
            autoComplete="one-time-code"
          />
        </div>

        {/* Toggle backup code */}
        <button
          type="button"
          onClick={() => {
            setUseBackupCode(!useBackupCode)
            setCode('')
            setError(null)
          }}
          className="w-full text-sm text-yellow-500 hover:text-yellow-400 mb-4 transition"
        >
          {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
        </button>

        {/* Error */}
        {(error || externalError) && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm text-center mb-4">
            {error || externalError}
          </div>
        )}

        {/* Buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#2B3139] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={(isLoading || externalLoading) || code.length !== (useBackupCode ? 8 : 6)}
            className="flex-1 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {(isLoading || externalLoading) ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  )
}
