import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import TOTPVerificationModal from '../components/TOTPVerificationModal'

export default function Login() {
  const [showRecovery, setShowRecovery] = useState(false)
  const [privateKey, setPrivateKey] = useState('')
  const [hasExisting, setHasExisting] = useState<boolean | null>(null)
  const navigate = useNavigate()
  const {
    loginWithKeypair,
    importPrivateKey,
    hasStoredIdentity,
    verifyTotpLogin,
    cancelTotpLogin,
    totpRequired,
    pendingUser,
    isLoading,
    error,
    clearError
  } = useAuthStore()

  useEffect(() => {
    hasStoredIdentity().then(setHasExisting)
  }, [hasStoredIdentity])

  const handleGetStarted = async () => {
    clearError()
    const success = await loginWithKeypair()
    if (success) {
      // Full login complete (no TOTP required)
      const nextUser = useAuthStore.getState().user
      const profileComplete = nextUser?.displayName && nextUser?.username
      navigate(profileComplete ? '/app' : '/complete-profile')
    }
    // If success is false and totpRequired is true, the modal will show
  }

  const handleTotpVerified = () => {
    // TOTP verification successful - login complete
    const nextUser = useAuthStore.getState().user
    const profileComplete = nextUser?.displayName && nextUser?.username
    navigate(profileComplete ? '/app' : '/complete-profile')
  }

  const handleImportKey = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    const cleanKey = privateKey.trim().toLowerCase()
    if (cleanKey.length !== 64) {
      return
    }

    const success = await importPrivateKey(cleanKey)
    if (success) {
      const nextUser = useAuthStore.getState().user
      // Require both displayName and username to be set
      const profileComplete = nextUser?.displayName && nextUser?.username
      navigate(profileComplete ? '/app' : '/complete-profile')
    }
  }

  if (hasExisting === null) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/logo.png"
          alt=""
          className="w-[500px] h-[500px] opacity-[0.03]"
          style={{ filter: 'grayscale(100%)' }}
        />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img src="/logo.png" alt="CyxTrade" className="h-32 mx-auto" />
          </Link>

          {!showRecovery ? (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">
                {hasExisting ? 'Welcome Back' : 'Get Started'}
              </h1>
              <p className="text-gray-400">
                {hasExisting
                  ? 'Your identity is stored on this device'
                  : 'Your identity is generated on your device. No phone or email needed.'}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">
                Recover Account
              </h1>
              <p className="text-gray-400">
                Enter your backup key to recover your identity
              </p>
            </>
          )}
        </div>

        <div className="bg-[#1E2329] rounded-lg border border-gray-800 p-8">
          {!showRecovery ? (
            <div className="space-y-6">
              {/* Privacy notice */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-500">
                      Anonymous Identity
                    </h3>
                    <p className="text-sm text-yellow-400/80 mt-1">
                      Your keypair identity is generated and stored locally.
                      We never collect your phone number, email, or personal information.
                    </p>
                    <p className="text-xs text-yellow-400/60 mt-2">
                      After login, open Settings to back up your recovery key.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGetStarted}
                disabled={isLoading}
                className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{hasExisting ? 'Signing in...' : 'Creating identity...'}</span>
                  </span>
                ) : (
                  hasExisting ? 'Continue' : 'Get Started'
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#1E2329] text-gray-500">or</span>
                </div>
              </div>

              <button
                onClick={() => setShowRecovery(true)}
                className="w-full border border-gray-700 text-gray-300 py-3 rounded-lg font-semibold hover:bg-[#2B3139] transition"
              >
                Recover Existing Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleImportKey} className="space-y-6">
              <div>
                <label htmlFor="privateKey" className="block text-sm font-medium text-gray-300 mb-2">
                  Backup Key
                </label>
                <textarea
                  id="privateKey"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Enter your 64-character backup key..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#2B3139] text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition font-mono text-sm h-24 resize-none"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  This is the key you backed up when first using CyxTrade
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || privateKey.trim().length !== 64}
                className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? 'Recovering...' : 'Recover Account'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRecovery(false)
                  setPrivateKey('')
                  clearError()
                }}
                className="w-full text-gray-400 py-2 text-sm hover:text-yellow-500 transition"
              >
                Back to login
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-yellow-500 transition">
            Back to home
          </Link>
        </div>
      </div>

      {/* TOTP Verification Modal */}
      <TOTPVerificationModal
        isOpen={totpRequired}
        onClose={cancelTotpLogin}
        onVerified={handleTotpVerified}
        operation="login"
        title="Two-Factor Authentication"
        description={`Enter the 6-digit code from your authenticator app to continue as ${pendingUser?.displayName || pendingUser?.username || 'user'}.`}
        onSubmit={verifyTotpLogin}
        externalLoading={isLoading}
        externalError={error}
      />
    </div>
  )
}
