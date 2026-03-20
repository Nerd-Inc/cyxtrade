import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '../store/auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface TOTPSetupWizardProps {
  onComplete: () => void
  onCancel: () => void
}

type Step = 'qr' | 'verify' | 'backup'

export default function TOTPSetupWizard({ onComplete, onCancel }: TOTPSetupWizardProps) {
  const { token } = useAuthStore()
  const [step, setStep] = useState<Step>('qr')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [savedBackupCodes, setSavedBackupCodes] = useState(false)

  // Start setup - get QR code
  const startSetup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/totp/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to start setup')
      }

      setQrCodeUrl(data.data.qrCodeUrl)
      setSecret(data.data.secret)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  // Verify code and enable TOTP
  const verifySetup = async () => {
    if (verifyCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/totp/verify-setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verifyCode }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Verification failed')
      }

      setBackupCodes(data.data.backupCodes)
      setStep('backup')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  // Copy backup codes to clipboard
  const copyBackupCodes = () => {
    const text = backupCodes.join('\n')
    navigator.clipboard.writeText(text)
  }

  // Initialize setup on mount
  useState(() => {
    startSetup()
  })

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-2">
        {['qr', 'verify', 'backup'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s
                  ? 'bg-yellow-500 text-black'
                  : ['qr', 'verify', 'backup'].indexOf(step) > i
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && <div className="w-8 h-0.5 bg-gray-700 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: QR Code */}
      {step === 'qr' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white text-center">
            Scan QR Code
          </h3>
          <p className="text-sm text-gray-400 text-center">
            Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-yellow-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : qrCodeUrl ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={qrCodeUrl.startsWith('data:') ? secret : qrCodeUrl} size={200} />
              </div>

              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-sm text-yellow-500 hover:text-yellow-400"
              >
                {showSecret ? 'Hide' : 'Show'} manual entry key
              </button>

              {showSecret && (
                <div className="bg-[#2B3139] rounded-lg p-3 w-full">
                  <p className="text-xs text-gray-400 mb-1">Manual entry key:</p>
                  <code className="text-sm text-white font-mono break-all">{secret}</code>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm text-center">
              {error}
              <button
                onClick={startSetup}
                className="block w-full mt-2 text-yellow-500 hover:text-yellow-400"
              >
                Try again
              </button>
            </div>
          ) : null}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#2B3139] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setStep('verify')}
              disabled={!qrCodeUrl}
              className="flex-1 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Verify */}
      {step === 'verify' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white text-center">
            Enter Verification Code
          </h3>
          <p className="text-sm text-gray-400 text-center">
            Enter the 6-digit code from your authenticator app to verify setup.
          </p>

          <div>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#2B3139] text-white text-center text-2xl font-mono tracking-widest placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition"
              maxLength={6}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setStep('qr')
                setVerifyCode('')
                setError(null)
              }}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#2B3139] transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={verifySetup}
              disabled={isLoading || verifyCode.length !== 6}
              className="flex-1 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Backup Codes */}
      {step === 'backup' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center text-green-500 mb-2">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-white text-center">
            Two-Factor Authentication Enabled!
          </h3>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-500">Save Your Backup Codes</p>
                <p className="text-sm text-yellow-400/80 mt-1">
                  These codes can be used if you lose access to your authenticator app.
                  Each code can only be used once. Store them securely.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#2B3139] rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <code key={i} className="text-sm font-mono text-white bg-[#1E2329] px-3 py-2 rounded text-center">
                  {code}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={copyBackupCodes}
              className="w-full mt-3 py-2 text-sm text-yellow-500 hover:text-yellow-400 transition"
            >
              Copy all codes
            </button>
          </div>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={savedBackupCodes}
              onChange={(e) => setSavedBackupCodes(e.target.checked)}
              className="w-5 h-5 rounded border-gray-700 bg-[#2B3139] text-yellow-500 focus:ring-yellow-500"
            />
            <span className="text-sm text-gray-300">
              I have saved my backup codes in a secure location
            </span>
          </label>

          <button
            type="button"
            onClick={onComplete}
            disabled={!savedBackupCodes}
            className="w-full py-2.5 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
