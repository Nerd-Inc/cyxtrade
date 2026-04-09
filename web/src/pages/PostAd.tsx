import { useEffect, useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useAdsStore, useWalletStore } from '../store/pro'
import { DarkModeContext } from '../App'

// Crypto assets
const CRYPTO_ASSETS = [
  { code: 'USDT', name: 'Tether', icon: '₮', color: '#26A17B' },
  { code: 'BTC', name: 'Bitcoin', icon: '₿', color: '#F7931A' },
  { code: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627EEA' },
  { code: 'BNB', name: 'BNB', icon: 'B', color: '#F3BA2F' },
  { code: 'USDC', name: 'USD Coin', icon: '$', color: '#2775CA' },
]

// Fiat currencies
const FIAT_CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', color: '#2E7D32', country: 'AE' },
  { code: 'USD', name: 'US Dollar', symbol: '$', color: '#1565C0', country: 'US' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: '#1565C0', country: 'EU' },
  { code: 'GBP', name: 'British Pound', symbol: '£', color: '#7B1FA2', country: 'GB' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', color: '#2E7D32', country: 'NG' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', color: '#2E7D32', country: 'KE' },
  { code: 'XAF', name: 'CFA Franc', symbol: 'FCFA', color: '#1565C0', country: 'CM' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', color: '#FF6F00', country: 'IN' },
]

// Convert country code to flag emoji
const getCountryFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

// Payment methods
const PAYMENT_METHODS = [
  { id: 'aani', name: 'Aani' },
  { id: 'lightning', name: 'Lightning AED Bank Transfer' },
  { id: 'pyypl', name: 'Pyypl' },
  { id: 'mbank', name: 'mBank' },
  { id: 'bank', name: 'Bank Transfer' },
  { id: 'specific_bank', name: 'Transfers with specific bank' },
  { id: 'cash_deposit', name: 'Cash Deposit to Bank' },
  { id: 'emirates_nbd', name: 'Emirates NBD' },
  { id: 'adib', name: 'ADIB: Abu Dhabi Islamic Bank' },
]

// Time limits
const TIME_LIMITS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 120, label: '120 min' },
  { value: 180, label: '180 min' },
]

// Regions
const REGIONS = [
  { value: 'all', label: 'All Regions' },
  { value: 'uae', label: 'United Arab Emirates' },
  { value: 'usa', label: 'United States' },
  { value: 'eu', label: 'Europe' },
  { value: 'africa', label: 'Africa' },
  { value: 'asia', label: 'Asia' },
]

type Step = 1 | 2 | 3

export default function PostAd() {
  const { dark } = useContext(DarkModeContext)
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const { createAd, isLoading, error, clearError } = useAdsStore()
  const { balances, fetchBalances } = useWalletStore()

  const [step, setStep] = useState<Step>(1)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [paymentSearch, setPaymentSearch] = useState('')

  // Step 1: Type & Price
  const [adType, setAdType] = useState<'buy' | 'sell'>('buy')
  const [asset, setAsset] = useState('USDT')
  const [fiatCurrency, setFiatCurrency] = useState('AED')
  const [priceType, setPriceType] = useState<'fixed' | 'floating'>('fixed')
  const [fixedPrice, setFixedPrice] = useState('3.670')
  const [floatPercentage, setFloatPercentage] = useState('100')

  // Step 2: Amount & Payment
  const [totalAmount, setTotalAmount] = useState('')
  const [minLimit, setMinLimit] = useState('100')
  const [maxLimit, setMaxLimit] = useState('5000')
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [paymentTimeLimit, setPaymentTimeLimit] = useState(15)

  // Step 3: Remarks & Settings
  const [remarks, setRemarks] = useState('')
  const [autoReply, setAutoReply] = useState('')
  const [region, setRegion] = useState('all')
  const [registeredDays, setRegisteredDays] = useState('')
  const [holdingsAmount, setHoldingsAmount] = useState('')
  const [requireRegistered, setRequireRegistered] = useState(false)
  const [requireHoldings, setRequireHoldings] = useState(false)
  const [adStatus, setAdStatus] = useState<'online' | 'offline' | 'private'>('offline')

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  const userBalance = balances.find(b => b.asset === asset)
  const selectedAssetData = CRYPTO_ASSETS.find(a => a.code === asset)
  const selectedFiatData = FIAT_CURRENCIES.find(c => c.code === fiatCurrency)

  // Mock highest order price
  const highestOrderPrice = 3.686

  // Calculate equivalent values
  const priceNum = parseFloat(fixedPrice) || 0
  const totalNum = parseFloat(totalAmount) || 0
  const minNum = parseFloat(minLimit) || 0
  const maxNum = parseFloat(maxLimit) || 0
  const equivalentFiat = totalNum * priceNum
  const minEquivalent = minNum / priceNum
  const maxEquivalent = maxNum / priceNum

  // Estimated fee (0.1%)
  const estimatedFee = totalNum * 0.001

  const togglePayment = (methodId: string) => {
    if (selectedPayments.includes(methodId)) {
      setSelectedPayments(prev => prev.filter(m => m !== methodId))
    } else if (selectedPayments.length < 5) {
      setSelectedPayments(prev => [...prev, methodId])
    }
  }

  const filteredPayments = PAYMENT_METHODS.filter(m =>
    m.name.toLowerCase().includes(paymentSearch.toLowerCase())
  )

  const canProceedStep1 = priceType === 'fixed' ? parseFloat(fixedPrice) > 0 : true
  const canProceedStep2 = totalNum > 0 && minNum > 0 && maxNum > 0 && minNum <= maxNum && selectedPayments.length > 0
  const canProceedStep3 = true

  const handleNext = () => {
    if (step === 1 && canProceedStep1) setStep(2)
    else if (step === 2 && canProceedStep2) setStep(3)
    else if (step === 3 && canProceedStep3) setShowConfirmModal(true)
  }

  const handlePrevious = () => {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
  }

  const handleSubmit = async () => {
    const ad = await createAd({
      type: adType,
      asset,
      fiatCurrency,
      price: priceType === 'fixed' ? parseFloat(fixedPrice) : 0,
      priceType,
      floatingMargin: priceType === 'floating' ? parseFloat(floatPercentage) : undefined,
      totalAmount: parseFloat(totalAmount),
      minLimit: parseFloat(minLimit),
      maxLimit: parseFloat(maxLimit),
      paymentMethodIds: selectedPayments,
      paymentTimeLimit,
      terms: undefined,
      autoReply: autoReply || undefined,
      remarks: remarks || undefined,
      regionRestrictions: region !== 'all' ? region : undefined,
      counterpartyConditions: (requireRegistered || requireHoldings) ? {
        registeredDays: requireRegistered ? parseInt(registeredDays) || 0 : undefined,
        minHoldings: requireHoldings ? parseFloat(holdingsAmount) || 0 : undefined,
      } : undefined,
    })

    if (ad) {
      navigate('/pro/my-ads')
    }
  }

  const getSelectedPaymentNames = () => {
    return selectedPayments.map(id => PAYMENT_METHODS.find(m => m.id === id)?.name || id).join(', ')
  }

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/pro" className={`flex items-center gap-2 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <h1 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Post Normal Ad</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 1 ? 'bg-orange-500 text-white' : dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span className={`ml-2 text-sm font-medium ${step === 1 ? (dark ? 'text-white' : 'text-gray-900') : (dark ? 'text-gray-500' : 'text-gray-400')}`}>
                Set Type & Price
              </span>
            </div>
            {/* Line */}
            <div className={`flex-1 h-0.5 mx-4 ${step > 1 ? 'bg-orange-500' : dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            {/* Step 2 */}
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 2 ? 'bg-orange-500 text-white' : dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <span className={`ml-2 text-sm font-medium ${step === 2 ? (dark ? 'text-white' : 'text-gray-900') : (dark ? 'text-gray-500' : 'text-gray-400')}`}>
                Set Total Amount & Payment Method
              </span>
            </div>
            {/* Line */}
            <div className={`flex-1 h-0.5 mx-4 ${step > 2 ? 'bg-orange-500' : dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            {/* Step 3 */}
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 3 ? 'bg-orange-500 text-white' : dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
              <span className={`ml-2 text-sm font-medium ${step === 3 ? (dark ? 'text-white' : 'text-gray-900') : (dark ? 'text-gray-500' : 'text-gray-400')}`}>
                Set Remarks & Automatic Response
              </span>
            </div>
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="flex items-center gap-6 mb-6">
          <button
            onClick={() => setAdType('buy')}
            className={`text-lg font-medium pb-2 border-b-2 transition ${
              adType === 'buy'
                ? 'text-orange-500 border-orange-500'
                : dark ? 'text-gray-400 border-transparent hover:text-gray-300' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            I want to buy
          </button>
          <button
            onClick={() => setAdType('sell')}
            className={`text-lg font-medium pb-2 border-b-2 transition ${
              adType === 'sell'
                ? 'text-orange-500 border-orange-500'
                : dark ? 'text-gray-400 border-transparent hover:text-gray-300' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            I want to sell
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={`px-4 py-3 rounded-xl mb-6 border ${dark ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {error}
            <button onClick={clearError} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Step Content */}
        <div className={`rounded-xl border p-6 mb-6 ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>

          {/* ============================================ */}
          {/* STEP 1: Set Type & Price */}
          {/* ============================================ */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Price Display */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className={`text-sm mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Your Price</p>
                  <p className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedFiatData?.symbol} {fixedPrice}
                  </p>
                </div>
                <div>
                  <p className={`text-sm mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Highest Order Price</p>
                  <p className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedFiatData?.symbol} {highestOrderPrice.toFixed(3)}
                  </p>
                </div>
              </div>

              {/* Asset & Fiat Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Asset</label>
                  <div className="relative">
                    <select
                      value={asset}
                      onChange={(e) => setAsset(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border appearance-none cursor-pointer ${
                        dark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {CRYPTO_ASSETS.map(a => (
                        <option key={a.code} value={a.code}>{a.code}</option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      {selectedAssetData && (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: selectedAssetData.color }}
                        >
                          {selectedAssetData.icon}
                        </span>
                      )}
                    </div>
                    <svg className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    With Fiat <span className={`${dark ? 'text-gray-500' : 'text-gray-400'}`}>ⓘ</span>
                  </label>
                  <div className="relative">
                    <select
                      value={fiatCurrency}
                      onChange={(e) => setFiatCurrency(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border appearance-none cursor-pointer ${
                        dark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {FIAT_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      {selectedFiatData && (
                        <span className="text-lg">
                          {getCountryFlag(selectedFiatData.country)}
                        </span>
                      )}
                    </div>
                    <svg className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Price Type */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Price Type</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priceType"
                      checked={priceType === 'fixed'}
                      onChange={() => setPriceType('fixed')}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className={dark ? 'text-white' : 'text-gray-900'}>Fixed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priceType"
                      checked={priceType === 'floating'}
                      onChange={() => setPriceType('floating')}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className={dark ? 'text-white' : 'text-gray-900'}>Floating</span>
                  </label>
                </div>
              </div>

              {/* Fixed Price Input */}
              {priceType === 'fixed' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Fixed</label>
                  <div className={`flex items-center rounded-lg border ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                    <button
                      onClick={() => setFixedPrice((parseFloat(fixedPrice) - 0.001).toFixed(3))}
                      className={`px-4 py-3 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      value={fixedPrice}
                      onChange={(e) => setFixedPrice(e.target.value)}
                      className={`flex-1 text-center py-3 bg-transparent outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
                    />
                    <button
                      onClick={() => setFixedPrice((parseFloat(fixedPrice) + 0.001).toFixed(3))}
                      className={`px-4 py-3 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      +
                    </button>
                  </div>
                  <p className={`text-xs mt-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    The fixed price should be between 2.936 - 4.404
                  </p>
                </div>
              )}

              {/* Floating Price Input */}
              {priceType === 'floating' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Floating Margin (%)</label>
                  <div className={`flex items-center rounded-lg border ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                    <button
                      onClick={() => setFloatPercentage((parseFloat(floatPercentage) - 0.5).toString())}
                      className={`px-4 py-3 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      value={floatPercentage}
                      onChange={(e) => setFloatPercentage(e.target.value)}
                      className={`flex-1 text-center py-3 bg-transparent outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
                    />
                    <span className={`pr-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>%</span>
                    <button
                      onClick={() => setFloatPercentage((parseFloat(floatPercentage) + 0.5).toString())}
                      className={`px-4 py-3 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 2: Set Total Amount & Payment Method */}
          {/* ============================================ */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Total Amount */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Total Amount</label>
                <div className={`flex items-center rounded-lg border ${
                  adType === 'sell' && totalAmount ? 'border-orange-500' : dark ? 'border-gray-600' : 'border-gray-300'
                } ${dark ? 'bg-gray-800' : 'bg-white'}`}>
                  <input
                    type="text"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder={adType === 'sell' ? `Max ${userBalance?.available.toFixed(8) || '0'}` : 'Please enter total amount'}
                    className={`flex-1 px-4 py-3 bg-transparent outline-none ${dark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                  />
                  <span className={`px-3 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{asset}</span>
                  {adType === 'sell' && (
                    <button
                      onClick={() => setTotalAmount(userBalance?.available.toString() || '0')}
                      className="px-3 text-orange-500 font-medium"
                    >
                      All
                    </button>
                  )}
                </div>
                {totalAmount && (
                  <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    ≈ {equivalentFiat.toFixed(2)} {fiatCurrency}
                  </p>
                )}
                {adType === 'sell' && userBalance && (
                  <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Available: {userBalance.available.toFixed(8)} {asset} <span className="text-orange-500 cursor-pointer">⊕</span>
                  </p>
                )}
              </div>

              {/* Order Limit */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Order Limit</label>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 flex items-center rounded-lg border ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                    <input
                      type="text"
                      value={minLimit}
                      onChange={(e) => setMinLimit(e.target.value)}
                      className={`flex-1 px-4 py-3 bg-transparent outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
                    />
                    <span className={`px-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{fiatCurrency}</span>
                  </div>
                  <span className={dark ? 'text-gray-500' : 'text-gray-400'}>~</span>
                  <div className={`flex-1 flex items-center rounded-lg border ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                    <input
                      type="text"
                      value={maxLimit}
                      onChange={(e) => setMaxLimit(e.target.value)}
                      className={`flex-1 px-4 py-3 bg-transparent outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
                    />
                    <span className={`px-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{fiatCurrency}</span>
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>≈ {minEquivalent.toFixed(2)} {asset}</p>
                  <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>≈ {maxEquivalent.toFixed(2)} {asset}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Payment Method</label>
                <p className={`text-xs mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Select up to 5 methods</p>

                {selectedPayments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedPayments.map(id => {
                      const method = PAYMENT_METHODS.find(m => m.id === id)
                      return (
                        <span key={id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                          dark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          <span className="w-1 h-3 bg-orange-500 rounded-full"></span>
                          {method?.name}
                          <button onClick={() => togglePayment(id)} className="text-gray-400 hover:text-gray-600">×</button>
                        </span>
                      )
                    })}
                  </div>
                )}

                <button
                  onClick={() => setShowPaymentModal(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    dark ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-lg">+</span>
                  <span>Add</span>
                </button>
                {selectedPayments.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">Please select at least 1 payment method</p>
                )}
              </div>

              {/* Payment Time Limit */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Payment Time Limit</label>
                <div className="relative">
                  <select
                    value={paymentTimeLimit}
                    onChange={(e) => setPaymentTimeLimit(parseInt(e.target.value))}
                    className={`px-4 py-3 rounded-lg border appearance-none cursor-pointer pr-10 ${
                      dark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {TIME_LIMITS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <svg className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 3: Set Remarks & Automatic Response */}
          {/* ============================================ */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Warning Banner */}
              <div className={`p-4 rounded-lg border ${dark ? 'bg-gray-700/50 border-gray-600' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex gap-3">
                  <span className="text-orange-500 mt-0.5">ⓘ</span>
                  <div className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p className="mb-2">Please ensure that you comply with P2P rules to avoid account suspension or expulsion from the CyxTrade Merchant Program. Especially:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>If you require taker's document for verification, it's necessary to indicate the requirement in the 'Remarks' section of your advertisement.</li>
                      <li>Imposing extra fees on takers is not allowed in all scenarios.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Terms Tags */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Terms Tags (Optional)</label>
                <div className="relative">
                  <select
                    className={`w-full px-4 py-3 rounded-lg border appearance-none cursor-pointer ${
                      dark ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-white border-gray-300 text-gray-500'
                    }`}
                  >
                    <option value="">Add tags</option>
                  </select>
                  <svg className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Select up to 3 tags</p>
              </div>

              {/* Remarks */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Remarks (Optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Please do not include any crypto-related words, such as crypto, P2P, C2C, BTC, USDT, ETH etc."
                  rows={4}
                  maxLength={1000}
                  className={`w-full px-4 py-3 rounded-lg border resize-none ${
                    dark ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <p className={`text-xs text-right mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{remarks.length}/1000</p>
              </div>

              {/* Auto Reply */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Auto Reply (Optional)</label>
                <textarea
                  value={autoReply}
                  onChange={(e) => setAutoReply(e.target.value)}
                  placeholder="Auto reply message will be sent to the counterparty once the order is created"
                  rows={4}
                  maxLength={1000}
                  className={`w-full px-4 py-3 rounded-lg border resize-none ${
                    dark ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <p className={`text-xs text-right mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{autoReply.length}/1000</p>
              </div>

              {/* Display to users in */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Display to users in <span className={`${dark ? 'text-gray-500' : 'text-gray-400'}`}>ⓘ</span>
                </label>
                <div className="relative">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border appearance-none cursor-pointer pl-10 ${
                      dark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {REGIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">🌐</span>
                  <svg className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Counterparty Conditions */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Counterparty Conditions</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireRegistered}
                      onChange={(e) => setRequireRegistered(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className={dark ? 'text-white' : 'text-gray-900'}>Registered</span>
                    <input
                      type="text"
                      value={registeredDays}
                      onChange={(e) => setRegisteredDays(e.target.value)}
                      placeholder="0"
                      disabled={!requireRegistered}
                      className={`w-16 px-3 py-1.5 rounded border text-center ${
                        dark ? 'bg-gray-700 border-gray-600 text-white disabled:opacity-50' : 'bg-white border-gray-300 text-gray-900 disabled:opacity-50'
                      }`}
                    />
                    <span className={dark ? 'text-gray-400' : 'text-gray-500'}>day(s) ago</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireHoldings}
                      onChange={(e) => setRequireHoldings(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className={dark ? 'text-white' : 'text-gray-900'}>Holdings more than</span>
                    <input
                      type="text"
                      value={holdingsAmount}
                      onChange={(e) => setHoldingsAmount(e.target.value)}
                      placeholder="0.01"
                      disabled={!requireHoldings}
                      className={`w-20 px-3 py-1.5 rounded border text-center ${
                        dark ? 'bg-gray-700 border-gray-600 text-white disabled:opacity-50' : 'bg-white border-gray-300 text-gray-900 disabled:opacity-50'
                      }`}
                    />
                    <span className={dark ? 'text-gray-400' : 'text-gray-500'}>BTC</span>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={adStatus === 'online'}
                      onChange={() => setAdStatus('online')}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className={dark ? 'text-white' : 'text-gray-900'}>Online</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={adStatus === 'offline'}
                      onChange={() => setAdStatus('offline')}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className={dark ? 'text-white' : 'text-gray-900'}>Offline</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={adStatus === 'private'}
                      onChange={() => setAdStatus('private')}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className={dark ? 'text-white' : 'text-gray-900'}>Private</span>
                    <span className={`${dark ? 'text-gray-500' : 'text-gray-400'}`}>ⓘ</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help & Guide */}
        <div className="mb-6">
          <button className={`flex items-center gap-2 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            <span className="w-5 h-5 rounded border flex items-center justify-center text-xs">?</span>
            Help & Guide
          </button>
        </div>

        {/* Footer */}
        <div className={`fixed bottom-0 left-0 right-0 border-t px-4 py-4 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              {adType === 'sell' ? 'Reserved' : 'Estimated'} Fee <span className={`${dark ? 'text-gray-500' : 'text-gray-400'}`}>ⓘ</span>
              <span className={`ml-2 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
                {estimatedFee > 0 ? estimatedFee.toFixed(2) : '--'} {asset}
              </span>
            </div>
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={handlePrevious}
                  className={`px-8 py-2.5 rounded-lg font-medium ${
                    dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
                className="px-8 py-2.5 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 3 ? 'Post' : 'Next'}
              </button>
            </div>
          </div>
        </div>

        {/* Add padding for fixed footer */}
        <div className="h-20"></div>
      </main>

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Select payment method</h3>
              <button onClick={() => setShowPaymentModal(false)} className={dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}>
                ✕
              </button>
            </div>
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Enter a payment method"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                    dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              <p className={`text-sm mb-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Select Payment Method <span className="text-orange-500">(Up to 5 methods)</span>
              </p>

              {/* Payment List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredPayments.map(method => (
                  <label
                    key={method.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                      selectedPayments.includes(method.id)
                        ? 'border-orange-500 bg-orange-500/10'
                        : dark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                      <span className={dark ? 'text-white' : 'text-gray-900'}>{method.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(method.id)}
                      onChange={() => togglePayment(method.id)}
                      className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2.5 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-6 ${dark ? 'text-white' : 'text-gray-900'}`}>Confirm to Post</h3>

              <div className="space-y-4">
                {[
                  { label: 'Type', value: adType === 'buy' ? 'Buy' : 'Sell' },
                  { label: 'Asset', value: asset },
                  { label: 'Currency', value: fiatCurrency },
                  { label: 'Price Type', value: priceType === 'fixed' ? 'Fixed' : 'Floating' },
                  { label: priceType === 'fixed' ? 'Fixed' : 'Floating', value: priceType === 'fixed' ? `${fixedPrice} ${fiatCurrency}` : `${floatPercentage}%` },
                  { label: 'Order Limit', value: `${parseFloat(minLimit).toLocaleString()} ${fiatCurrency} ~ ${parseFloat(maxLimit).toLocaleString()} ${fiatCurrency}` },
                  { label: 'Total Trading Amount', value: `${parseFloat(totalAmount).toLocaleString()} ${asset}` },
                  { label: 'Estimated Fee', value: `${estimatedFee.toFixed(2)} ${asset}` },
                  { label: 'Payment Method', value: getSelectedPaymentNames() },
                  { label: 'Payment Time Limit', value: `${paymentTimeLimit} min` },
                  { label: 'Available Region(s)', value: REGIONS.find(r => r.value === region)?.label || 'All Regions' },
                  { label: 'Status', value: adStatus.charAt(0).toUpperCase() + adStatus.slice(1) },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{item.label}</span>
                    <span className={`font-medium text-right ${dark ? 'text-white' : 'text-gray-900'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className={`flex-1 py-2.5 rounded-lg font-medium ${
                  dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {isLoading ? 'Posting...' : 'Confirm to post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
