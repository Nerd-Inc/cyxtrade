import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import TOTPSetupWizard from '../components/TOTPSetupWizard'
import TOTPVerificationModal from '../components/TOTPVerificationModal'

type CopyStatus = 'idle' | 'copied' | 'failed'
const API_URL = import.meta.env.VITE_API_URL || '/api'
const TRADER_DEPOSIT_ASSET = 'USDT'
const TRADER_DEPOSIT_NETWORK = 'TRC20 (Tron)'

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fall through to textarea fallback.
  }

  try {
    const textArea = document.createElement('textarea')
    textArea.value = value
    textArea.setAttribute('readonly', '')
    textArea.style.position = 'absolute'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textArea)
    return copied
  } catch {
    return false
  }
}

export default function Settings() {
  const navigate = useNavigate()
  const {
    user,
    token,
    exportPrivateKey,
    forgetDeviceIdentity,
    isLoading,
    error,
    clearError,
  } = useAuthStore()

  const [backupKey, setBackupKey] = useState<string | null>(null)
  const [isRevealingKey, setIsRevealingKey] = useState(false)
  const [isForgettingDevice, setIsForgettingDevice] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [traderAddress, setTraderAddress] = useState<string | null>(user?.traderAddress || null)
  const [isLoadingTraderAddress, setIsLoadingTraderAddress] = useState(false)

  // TOTP state
  const [showTotpSetup, setShowTotpSetup] = useState(false)
  const [totpStatus, setTotpStatus] = useState<{
    enabled: boolean
    backupCodesRemaining: number
  } | null>(null)
  const [isLoadingTotpStatus, setIsLoadingTotpStatus] = useState(true)
  const [showDisableTotpModal, setShowDisableTotpModal] = useState(false)
  const [isDisablingTotp, setIsDisablingTotp] = useState(false)
  const [disableTotpCode, setDisableTotpCode] = useState('')

  const publicKey = user?.publicKey ?? null
  const fingerprint = user?.fingerprint ?? (publicKey ? publicKey.substring(0, 16) : null)
  const traderDepositShareText = traderAddress
    ? `CyxTrade Trader Deposit\nAsset: ${TRADER_DEPOSIT_ASSET}\nNetwork: ${TRADER_DEPOSIT_NETWORK}\nAddress: ${traderAddress}`
    : null

  useEffect(() => {
    clearError()
  }, [clearError])

  useEffect(() => {
    setTraderAddress(user?.traderAddress || null)
  }, [user?.traderAddress])

  useEffect(() => {
    if (!user?.isTrader || traderAddress || !token) return

    let active = true
    const loadTraderAddress = async () => {
      setIsLoadingTraderAddress(true)
      try {
        const res = await fetch(`${API_URL}/traders/me/address`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const payload = await res.json()
        if (!res.ok) return

        const address = payload?.data?.address
        if (active && address) {
          setTraderAddress(address)
          useAuthStore.setState((state) => ({
            user: state.user ? { ...state.user, traderAddress: address } : null
          }))
        }
      } catch {
        // Keep page usable even if lookup fails.
      } finally {
        if (active) {
          setIsLoadingTraderAddress(false)
        }
      }
    }

    loadTraderAddress()
    return () => {
      active = false
    }
  }, [user?.isTrader, traderAddress, token])

  // Load TOTP status
  useEffect(() => {
    if (!token) return

    const loadTotpStatus = async () => {
      setIsLoadingTotpStatus(true)
      try {
        const res = await fetch(`${API_URL}/totp/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (res.ok && data.data) {
          setTotpStatus({
            enabled: data.data.enabled,
            backupCodesRemaining: data.data.backupCodesRemaining
          })
        }
      } catch {
        // Silently fail - TOTP section just won't show status
      } finally {
        setIsLoadingTotpStatus(false)
      }
    }

    loadTotpStatus()
  }, [token])

  const handleTotpSetupComplete = () => {
    setShowTotpSetup(false)
    setTotpStatus({ enabled: true, backupCodesRemaining: 8 })
  }

  const handleDisableTotp = async () => {
    if (disableTotpCode.length < 6) {
      setLocalError('Please enter a valid code')
      return
    }

    setIsDisablingTotp(true)
    setLocalError(null)

    try {
      const res = await fetch(`${API_URL}/totp`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: disableTotpCode }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to disable 2FA')
      }

      setTotpStatus({ enabled: false, backupCodesRemaining: 0 })
      setShowDisableTotpModal(false)
      setDisableTotpCode('')
    } catch (err) {
      setLocalError((err as Error).message)
    } finally {
      setIsDisablingTotp(false)
    }
  }

  const handleRevealBackupKey = async () => {
    setLocalError(null)
    setCopyStatus('idle')
    setIsRevealingKey(true)

    const key = await exportPrivateKey()
    if (!key) {
      setLocalError('No backup key found on this device.')
      setBackupKey(null)
      setIsRevealingKey(false)
      return
    }

    setBackupKey(key)
    setIsRevealingKey(false)
  }

  const handleCopy = async (value: string) => {
    const copied = await copyToClipboard(value)
    setCopyStatus(copied ? 'copied' : 'failed')
  }

  const handleForgetDevice = async () => {
    const confirmed = window.confirm(
      'This removes your local private key from this browser. You will need your backup key to recover this account. Continue?'
    )
    if (!confirmed) return

    setIsForgettingDevice(true)
    try {
      await forgetDeviceIdentity()
      navigate('/login')
    } finally {
      setIsForgettingDevice(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyx-bg">
      <header className="bg-cyx-card border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/app" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-white">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Identity Section */}
        <section className="bg-cyx-card rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Identity</h2>
          <p className="text-sm text-gray-400 mb-4">
            Your account is tied to your keypair identity.
          </p>

          <div className="space-y-4">
            <div className="bg-cyx-card-hover rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Fingerprint</p>
              <p className="font-mono text-sm text-white">
                {fingerprint || 'Not available'}
              </p>
            </div>
            <div className="bg-cyx-card-hover rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Public Key</p>
              <p className="font-mono text-xs break-all text-gray-300">
                {publicKey || 'Not available'}
              </p>
            </div>
            {publicKey && (
              <button
                type="button"
                onClick={() => handleCopy(publicKey)}
                className="px-4 py-2 text-sm rounded-lg bg-cyx-card-hover text-gray-300 hover:bg-[#3C4149] transition"
              >
                Copy Public Key
              </button>
            )}
          </div>
        </section>

        {/* Trader Address Section */}
        {user?.isTrader && (
          <section className="bg-cyx-card rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Trader Address</h2>
            <p className="text-sm text-gray-400 mb-4">
              Use this address for your trader bond deposits.
            </p>

            {isLoadingTraderAddress && !traderAddress ? (
              <p className="text-sm text-gray-500">Loading address...</p>
            ) : traderAddress ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-cyx-card-hover rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Asset</p>
                    <p className="text-sm font-semibold text-white">{TRADER_DEPOSIT_ASSET}</p>
                  </div>
                  <div className="bg-cyx-card-hover rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Network</p>
                    <p className="text-sm font-semibold text-white">{TRADER_DEPOSIT_NETWORK}</p>
                  </div>
                </div>
                <div className="bg-cyx-card-hover rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Deposit Address</p>
                  <p className="font-mono text-xs break-all text-white">{traderAddress}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(traderAddress)}
                    className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition"
                  >
                    Copy Trader Address
                  </button>
                  {traderDepositShareText && (
                    <button
                      type="button"
                      onClick={() => handleCopy(traderDepositShareText)}
                      className="px-4 py-2 text-sm rounded-lg bg-cyx-card-hover text-gray-300 hover:bg-[#3C4149] transition"
                    >
                      Copy Deposit Details
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Share both the address and network with anyone sending your trader deposit.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Address not available yet. Register as trader first.
              </p>
            )}
          </section>
        )}

        {/* Backup Key Section */}
        <section className="bg-cyx-card rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Backup Key</h2>
          <p className="text-sm text-gray-400 mb-4">
            Save this key securely. You need it to recover your account on a new device.
          </p>

          {!backupKey ? (
            <button
              type="button"
              onClick={handleRevealBackupKey}
              disabled={isRevealingKey}
              className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 disabled:opacity-50 transition"
            >
              {isRevealingKey ? 'Revealing...' : 'Reveal Backup Key'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-cyx-card-hover rounded-lg p-4">
                <p className="font-mono text-xs break-all text-white">{backupKey}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(backupKey)}
                  className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition"
                >
                  Copy Backup Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBackupKey(null)
                    setCopyStatus('idle')
                  }}
                  className="px-4 py-2 text-sm rounded-lg bg-cyx-card-hover text-gray-300 hover:bg-[#3C4149] transition"
                >
                  Hide Key
                </button>
              </div>
            </div>
          )}

          {copyStatus === 'copied' && (
            <p className="mt-3 text-sm text-green-500">Copied to clipboard.</p>
          )}
          {copyStatus === 'failed' && (
            <p className="mt-3 text-sm text-red-500">Copy failed. Please copy manually.</p>
          )}
        </section>

        {/* Two-Factor Authentication Section */}
        <section className="bg-cyx-card rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-400 mb-4">
            Add an extra layer of security to your account using Google Authenticator or similar apps.
          </p>

          {isLoadingTotpStatus ? (
            <div className="flex items-center space-x-2 text-gray-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading...</span>
            </div>
          ) : showTotpSetup ? (
            <TOTPSetupWizard
              onComplete={handleTotpSetupComplete}
              onCancel={() => setShowTotpSetup(false)}
            />
          ) : totpStatus?.enabled ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-green-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-semibold">Two-Factor Authentication is enabled</span>
              </div>

              <div className="bg-cyx-card-hover rounded-lg p-4">
                <p className="text-sm text-gray-400">
                  Backup codes remaining: <span className="text-white font-semibold">{totpStatus.backupCodesRemaining}</span>
                </p>
                {totpStatus.backupCodesRemaining <= 2 && (
                  <p className="text-xs text-yellow-500 mt-1">
                    Consider regenerating backup codes soon.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowDisableTotpModal(true)}
                className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition"
              >
                Disable Two-Factor Authentication
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-yellow-500">Recommended for security</p>
                    <p className="text-sm text-yellow-400/80 mt-1">
                      Enable 2FA to protect your account from unauthorized access. It's required for withdrawals and large trades.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTotpSetup(true)}
                className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition"
              >
                Enable Two-Factor Authentication
              </button>
            </div>
          )}
        </section>

        {/* Disable TOTP Modal */}
        {showDisableTotpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowDisableTotpModal(false)} />
            <div className="relative bg-cyx-card rounded-lg border border-gray-800 p-6 w-full max-w-sm mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Disable Two-Factor Authentication</h3>
              <p className="text-sm text-gray-400 mb-4">
                Enter a code from your authenticator app or a backup code to disable 2FA.
              </p>

              <input
                type="text"
                value={disableTotpCode}
                onChange={(e) => setDisableTotpCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="Enter code"
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-cyx-card-hover text-white text-center font-mono tracking-widest placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition mb-4"
                maxLength={8}
              />

              {localError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                  {localError}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableTotpModal(false)
                    setDisableTotpCode('')
                    setLocalError(null)
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-cyx-card-hover transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisableTotp}
                  disabled={isDisablingTotp || disableTotpCode.length < 6}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isDisablingTotp ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <section className="bg-cyx-card rounded-lg border border-red-500/30 p-6">
          <h2 className="text-lg font-semibold text-red-500 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-400 mb-4">
            Remove the local identity from this browser.
          </p>
          <button
            type="button"
            onClick={handleForgetDevice}
            disabled={isForgettingDevice || isLoading}
            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition"
          >
            {isForgettingDevice ? 'Removing...' : 'Forget This Device'}
          </button>
        </section>

        {/* Error Display */}
        {(localError || error) && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {localError || error}
          </div>
        )}
      </main>
    </div>
  )
}
