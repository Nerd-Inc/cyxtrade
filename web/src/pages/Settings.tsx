import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/app" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Identity</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Your account is tied to your keypair identity.
          </p>

          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Fingerprint</p>
              <p className="font-mono text-sm text-gray-900 dark:text-white">
                {fingerprint || 'Not available'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Public Key</p>
              <p className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                {publicKey || 'Not available'}
              </p>
            </div>
            {publicKey && (
              <button
                type="button"
                onClick={() => handleCopy(publicKey)}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-teal-500 transition"
              >
                Copy Public Key
              </button>
            )}
          </div>
        </section>

        {user?.isTrader && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Trader Address</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Use this address for your trader bond deposits.
            </p>

            {isLoadingTraderAddress && !traderAddress ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading address...</p>
            ) : traderAddress ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Asset</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{TRADER_DEPOSIT_ASSET}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Network</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{TRADER_DEPOSIT_NETWORK}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Deposit Address</p>
                  <p className="font-mono text-xs break-all text-gray-900 dark:text-white">{traderAddress}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(traderAddress)}
                    className="px-3 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
                  >
                    Copy Trader Address
                  </button>
                  {traderDepositShareText && (
                    <button
                      type="button"
                      onClick={() => handleCopy(traderDepositShareText)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-teal-500 transition"
                    >
                      Copy Deposit Details
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Share both the address and network with anyone sending your trader deposit.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Address not available yet. Register as trader first.
              </p>
            )}
          </section>
        )}

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Backup Key</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Save this key securely. You need it to recover your account on a new device.
          </p>

          {!backupKey ? (
            <button
              type="button"
              onClick={handleRevealBackupKey}
              disabled={isRevealingKey}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition"
            >
              {isRevealingKey ? 'Revealing...' : 'Reveal Backup Key'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3">
                <p className="font-mono text-xs break-all text-gray-900 dark:text-white">{backupKey}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(backupKey)}
                  className="px-3 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
                >
                  Copy Backup Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBackupKey(null)
                    setCopyStatus('idle')
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-teal-500 transition"
                >
                  Hide Key
                </button>
              </div>
            </div>
          )}

          {copyStatus === 'copied' && (
            <p className="mt-3 text-sm text-green-600 dark:text-green-400">Copied to clipboard.</p>
          )}
          {copyStatus === 'failed' && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">Copy failed. Please copy manually.</p>
          )}
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-900 p-6">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Remove the local identity from this browser.
          </p>
          <button
            type="button"
            onClick={handleForgetDevice}
            disabled={isForgettingDevice || isLoading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
          >
            {isForgettingDevice ? 'Removing...' : 'Forget This Device'}
          </button>
        </section>

        {(localError || error) && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {localError || error}
          </div>
        )}
      </main>
    </div>
  )
}
