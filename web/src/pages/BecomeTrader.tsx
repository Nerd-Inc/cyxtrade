import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function BecomeTrader() {
  const [step, setStep] = useState<'info' | 'generating' | 'complete'>('info')
  const [generatedAddress, setGeneratedAddress] = useState('')
  const [traderStatus, setTraderStatus] = useState<string>('pending')
  const { becomeTrader, isLoading, error, clearError, user } = useAuthStore()

  const handleRegister = async () => {
    clearError()
    setStep('generating')

    const result = await becomeTrader()
    if (result?.address) {
      setGeneratedAddress(result.address)
      setTraderStatus(result.status || 'pending')
      setStep('complete')
    } else {
      setStep('info')
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(generatedAddress)
  }

  if (user?.isTrader) {
    return (
      <div className="min-h-screen bg-cyx-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-cyx-card rounded-lg border border-gray-800 p-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              You're Already a Trader!
            </h1>
            <p className="text-gray-400 mb-6">
              Your deposit address:
            </p>
            <div className="bg-cyx-card-hover rounded-lg p-4 mb-6 break-all font-mono text-sm text-white">
              {user.traderAddress || 'Loading...'}
            </div>
            <Link
              to="/app/trader-dashboard"
              className="inline-block bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyx-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <img src="/logo.png" alt="CyxTrade" className="h-12 w-12" />
            <span className="text-2xl font-bold text-yellow-500">CyxTrade</span>
          </Link>
        </div>

        <div className="bg-cyx-card rounded-lg border border-gray-800 p-8">
          {step === 'info' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Become a Trader
                </h1>
                <p className="text-gray-400">
                  Earn by facilitating currency exchanges
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 p-4 bg-cyx-card-hover rounded-lg">
                  <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-white">Security Bond</h3>
                    <p className="text-sm text-gray-400">
                      Deposit USDT to your unique address. This protects users and determines your trading limits.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-cyx-card-hover rounded-lg">
                  <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-white">Set Your Rates</h3>
                    <p className="text-sm text-gray-400">
                      Choose your exchange rates and earn the spread on each trade.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-cyx-card-hover rounded-lg">
                  <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-white">Auto-Generated Address</h3>
                    <p className="text-sm text-gray-400">
                      We'll create a unique Tron (TRC20) address for your bond deposits.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-yellow-400 mb-2">Trader Tiers</h4>
                <div className="text-sm text-yellow-500/80 space-y-1">
                  <div className="flex justify-between">
                    <span>Starter (100-500 USDT)</span>
                    <span>Max $500/trade</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verified (500-2k USDT)</span>
                    <span>Max $2,000/trade</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trusted (2k-10k USDT)</span>
                    <span>Max $10,000/trade</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Generate My Trading Address
              </button>
            </>
          )}

          {step === 'generating' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-yellow-500 border-t-transparent mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Generating Your Address
              </h2>
              <p className="text-gray-400">
                Creating a unique Tron wallet for your bond deposits...
              </p>
            </div>
          )}

          {step === 'complete' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {traderStatus === 'active' ? 'Welcome, Trader!' : 'Registration Submitted'}
                </h1>
                <p className="text-gray-400">
                  {traderStatus === 'active'
                    ? 'Your unique deposit address is ready'
                    : 'Your application is pending admin approval. Your deposit address is ready for when you are approved.'}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your USDT-TRC20 Deposit Address
                </label>
                <div className="relative">
                  <div className="bg-cyx-card-hover rounded-lg p-4 pr-12 break-all font-mono text-sm text-white">
                    {generatedAddress}
                  </div>
                  <button
                    onClick={copyAddress}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-yellow-500 transition"
                    title="Copy address"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Important
                </h4>
                <ul className="text-sm text-yellow-500/80 space-y-1">
                  <li>• Only send USDT (TRC20) to this address</li>
                  <li>• Minimum deposit: 100 USDT</li>
                  <li>• Deposits are detected within 1-3 minutes</li>
                  <li>• Your trading limit = your deposit amount</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Link
                  to="/app/trader-dashboard"
                  className="block w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold text-center hover:bg-yellow-400 transition"
                >
                  Go to Trader Dashboard
                </Link>
                <Link
                  to="/app"
                  className="block w-full bg-cyx-card-hover text-gray-300 py-3 rounded-lg font-semibold text-center hover:bg-[#3C4149] transition"
                >
                  Back to Home
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/app" className="text-sm text-gray-500 hover:text-yellow-500 transition">
            Maybe later
          </Link>
        </div>
      </div>
    </div>
  )
}
