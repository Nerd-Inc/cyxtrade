import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function BecomeTrader() {
  const [step, setStep] = useState<'info' | 'generating' | 'complete'>('info')
  const [generatedAddress, setGeneratedAddress] = useState('')
  const { becomeTrader, isLoading, error, clearError, user } = useAuthStore()

  const handleRegister = async () => {
    clearError()
    setStep('generating')

    const result = await becomeTrader()
    if (result?.address) {
      setGeneratedAddress(result.address)
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
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-6xl mb-4">&#9989;</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              You're Already a Trader!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your deposit address:
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-6 break-all font-mono text-sm">
              {user.traderAddress || 'Loading...'}
            </div>
            <Link
              to="/app/trader-dashboard"
              className="inline-block bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <img src="/logo.png" alt="CyxTrade" className="h-12 w-12" />
            <span className="text-2xl font-bold text-teal-600">CyxTrade</span>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {step === 'info' && (
            <>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">&#128176;</div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Become a Trader
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Earn by facilitating currency exchanges
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-xl">&#128274;</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Security Bond</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Deposit USDT to your unique address. This protects users and determines your trading limits.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-xl">&#128200;</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Set Your Rates</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose your exchange rates and earn the spread on each trade.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-xl">&#127758;</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Auto-Generated Address</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      We'll create a unique Tron (TRC20) address for your bond deposits.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-teal-800 dark:text-teal-300 mb-2">Trader Tiers</h4>
                <div className="text-sm text-teal-700 dark:text-teal-400 space-y-1">
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
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Generate My Trading Address
              </button>
            </>
          )}

          {step === 'generating' && (
            <div className="text-center py-8">
              <div className="animate-spin text-6xl mb-4">&#9881;</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Generating Your Address
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Creating a unique Tron wallet for your bond deposits...
              </p>
            </div>
          )}

          {step === 'complete' && (
            <>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">&#127881;</div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome, Trader!
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Your unique deposit address is ready
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your USDT-TRC20 Deposit Address
                </label>
                <div className="relative">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 pr-12 break-all font-mono text-sm">
                    {generatedAddress}
                  </div>
                  <button
                    onClick={copyAddress}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-teal-600 transition"
                    title="Copy address"
                  >
                    &#128203;
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                  <span>&#9888;</span> Important
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                  <li>&#8226; Only send USDT (TRC20) to this address</li>
                  <li>&#8226; Minimum deposit: 100 USDT</li>
                  <li>&#8226; Deposits are detected within 1-3 minutes</li>
                  <li>&#8226; Your trading limit = your deposit amount</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Link
                  to="/app/trader-dashboard"
                  className="block w-full bg-teal-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-teal-700 transition"
                >
                  Go to Trader Dashboard
                </Link>
                <Link
                  to="/app"
                  className="block w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-semibold text-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  Back to Home
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/app" className="text-sm text-gray-500 hover:text-teal-600 transition">
            Maybe later
          </Link>
        </div>
      </div>
    </div>
  )
}
