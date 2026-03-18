import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useAdsStore, useWalletStore } from '../store/pro'

const CRYPTO_ASSETS = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC']
const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'XAF', 'AED', 'INR', 'PKR', 'TRY', 'BRL', 'MXN', 'PHP', 'VND']
const PAYMENT_METHODS = [
  'Bank Transfer',
  'Mobile Money',
  'PayPal',
  'Wise',
  'Cash',
  'Alipay',
  'WeChat Pay',
  'Revolut',
  'Skrill',
  'Neteller',
  'Zelle',
  'Venmo',
  'Cash App'
]

type Step = 'type' | 'asset' | 'price' | 'amount' | 'payment' | 'terms' | 'review'

export default function PostAd() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const { createAd, isLoading, error, clearError } = useAdsStore()
  const { balances, fetchBalances } = useWalletStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [step, setStep] = useState<Step>('type')

  // Form state
  const [adType, setAdType] = useState<'buy' | 'sell'>('sell')
  const [asset, setAsset] = useState('USDT')
  const [fiatCurrency, setFiatCurrency] = useState('USD')
  const [priceType, setPriceType] = useState<'fixed' | 'floating'>('fixed')
  const [price, setPrice] = useState('')
  const [floatPercentage, setFloatPercentage] = useState('0')
  const [totalAmount, setTotalAmount] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [paymentWindow, setPaymentWindow] = useState('15')
  const [terms, setTerms] = useState('')
  const [autoReply, setAutoReply] = useState('')

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  const userBalance = balances.find(b => b.asset === asset)

  const steps: Step[] = ['type', 'asset', 'price', 'amount', 'payment', 'terms', 'review']
  const currentStepIndex = steps.indexOf(step)

  const togglePayment = (method: string) => {
    setSelectedPayments(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    )
  }

  const canProceed = () => {
    switch (step) {
      case 'type':
        return true
      case 'asset':
        return asset && fiatCurrency
      case 'price':
        return priceType === 'fixed' ? parseFloat(price) > 0 : true
      case 'amount':
        return parseFloat(totalAmount) > 0 && parseFloat(minAmount) > 0 && parseFloat(maxAmount) > 0 &&
          parseFloat(minAmount) <= parseFloat(maxAmount)
      case 'payment':
        return selectedPayments.length > 0
      case 'terms':
        return true
      case 'review':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    const idx = currentStepIndex
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1])
    }
  }

  const prevStep = () => {
    const idx = currentStepIndex
    if (idx > 0) {
      setStep(steps[idx - 1])
    }
  }

  const handleSubmit = async () => {
    const ad = await createAd({
      type: adType,
      asset,
      fiatCurrency,
      price: priceType === 'fixed' ? parseFloat(price) : 0, // Would calculate from market rate
      totalAmount: parseFloat(totalAmount),
      minAmount: parseFloat(minAmount),
      maxAmount: parseFloat(maxAmount),
      paymentMethods: selectedPayments,
      paymentWindow: parseInt(paymentWindow),
      terms: terms || undefined,
      autoReply: autoReply || undefined
    })

    if (ad) {
      navigate('/pro/my-ads')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/pro" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                &larr; Back
              </Link>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded">
                PRO
              </span>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Post an Ad</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Create a P2P trading advertisement</p>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 mx-0.5 rounded ${
                  i <= currentStepIndex ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Step {currentStepIndex + 1} of {steps.length}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
            <button onClick={clearError} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {/* Step 1: Type */}
          {step === 'type' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                What do you want to do?
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setAdType('sell')}
                  className={`p-6 rounded-xl border-2 transition ${
                    adType === 'sell'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <p className="text-2xl mb-2">&#128640;</p>
                  <p className="font-semibold text-gray-900 dark:text-white">Sell Crypto</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Buyers will pay you fiat
                  </p>
                </button>
                <button
                  onClick={() => setAdType('buy')}
                  className={`p-6 rounded-xl border-2 transition ${
                    adType === 'buy'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <p className="text-2xl mb-2">&#128176;</p>
                  <p className="font-semibold text-gray-900 dark:text-white">Buy Crypto</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    You will pay sellers fiat
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Asset */}
          {step === 'asset' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Asset & Currency
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Crypto Asset
                </label>
                <div className="flex flex-wrap gap-2">
                  {CRYPTO_ASSETS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAsset(a)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        asset === a
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                {adType === 'sell' && userBalance && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Your balance: {userBalance.available.toFixed(4)} {asset}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fiat Currency
                </label>
                <select
                  value={fiatCurrency}
                  onChange={(e) => setFiatCurrency(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  {FIAT_CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Price */}
          {step === 'price' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Set Your Price
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPriceType('fixed')}
                    className={`p-4 rounded-lg border-2 transition ${
                      priceType === 'fixed'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">Fixed Price</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Set exact price</p>
                  </button>
                  <button
                    onClick={() => setPriceType('floating')}
                    className={`p-4 rounded-lg border-2 transition ${
                      priceType === 'floating'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">Floating Price</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Follow market rate</p>
                  </button>
                </div>
              </div>

              {priceType === 'fixed' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price per {asset}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-lg"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      {fiatCurrency}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Margin (% above/below market)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={floatPercentage}
                      onChange={(e) => setFloatPercentage(e.target.value)}
                      className="flex-1"
                    />
                    <span className={`font-medium ${parseFloat(floatPercentage) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseFloat(floatPercentage) >= 0 ? '+' : ''}{floatPercentage}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Your price will automatically adjust based on market rates
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Amount */}
          {step === 'amount' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Trading Amount
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total {asset} to {adType === 'sell' ? 'sell' : 'buy'}
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                {adType === 'sell' && userBalance && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Available: {userBalance.available.toFixed(4)} {asset}
                    <button
                      onClick={() => setTotalAmount(userBalance.available.toString())}
                      className="ml-2 text-teal-600 underline"
                    >
                      Use all
                    </button>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Order ({fiatCurrency})
                  </label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Order ({fiatCurrency})
                  </label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Payment */}
          {step === 'payment' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Payment Methods
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select accepted payment methods
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method}
                      onClick={() => togglePayment(method)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        selectedPayments.includes(method)
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
                {selectedPayments.length > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Selected: {selectedPayments.join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Window (minutes)
                </label>
                <select
                  value={paymentWindow}
                  onChange={(e) => setPaymentWindow(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Time limit for buyer to complete payment
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Terms */}
          {step === 'terms' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Trading Terms (Optional)
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Enter any specific requirements or instructions for traders..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Auto-Reply Message
                </label>
                <textarea
                  value={autoReply}
                  onChange={(e) => setAutoReply(e.target.value)}
                  placeholder="This message will be sent automatically when someone starts an order..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Step 7: Review */}
          {step === 'review' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Review Your Ad
              </h2>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Type</p>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{adType} {asset}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Currency</p>
                      <p className="font-medium text-gray-900 dark:text-white">{fiatCurrency}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Price</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {priceType === 'fixed'
                          ? `${parseFloat(price).toLocaleString()} ${fiatCurrency}`
                          : `Market ${floatPercentage}%`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Total Amount</p>
                      <p className="font-medium text-gray-900 dark:text-white">{totalAmount} {asset}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Order Limit</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {parseFloat(minAmount).toLocaleString()} - {parseFloat(maxAmount).toLocaleString()} {fiatCurrency}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Payment Window</p>
                      <p className="font-medium text-gray-900 dark:text-white">{paymentWindow} minutes</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Payment Methods</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPayments.map(method => (
                      <span key={method} className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded text-sm">
                        {method}
                      </span>
                    ))}
                  </div>
                </div>

                {terms && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Terms</p>
                    <p className="text-sm text-gray-900 dark:text-white">{terms}</p>
                  </div>
                )}
              </div>

              {adType === 'sell' && (
                <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500 rounded-lg p-4 text-sm text-yellow-700 dark:text-yellow-400">
                  <p className="font-medium mb-1">Note:</p>
                  <p>
                    {totalAmount} {asset} will be reserved from your wallet when you post this ad.
                    It will be locked in escrow for each order.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {currentStepIndex > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Back
            </button>
          )}
          {step === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition"
            >
              {isLoading ? 'Publishing...' : 'Publish Ad'}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Continue
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
