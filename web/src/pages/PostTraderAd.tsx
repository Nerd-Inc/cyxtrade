import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useTraderStore } from '../store/trader'

// Currency list with flags
const CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', symbol: 'د.إ' },
  { code: 'XAF', name: 'CFA Franc (CEMAC)', flag: '🇨🇲', symbol: 'FCFA' },
  { code: 'XOF', name: 'CFA Franc (UEMOA)', flag: '🇸🇳', symbol: 'CFA' },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬', symbol: '₦' },
  { code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭', symbol: '₵' },
  { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪', symbol: 'KSh' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦', symbol: 'R' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', symbol: '$' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', symbol: '₹' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰', symbol: '₨' },
  { code: 'BDT', name: 'Bangladeshi Taka', flag: '🇧🇩', symbol: '৳' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭', symbol: '₱' },
  { code: 'MAD', name: 'Moroccan Dirham', flag: '🇲🇦', symbol: 'DH' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬', symbol: 'E£' },
]

// Payment methods by currency
const PAYMENT_METHODS: Record<string, Array<{ id: string; name: string; icon: string }>> = {
  AED: [
    { id: 'aani', name: 'Aani', icon: '⚡' },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦' },
    { id: 'emirates_nbd', name: 'Emirates NBD', icon: '🏦' },
    { id: 'adcb', name: 'ADCB', icon: '🏦' },
    { id: 'fab', name: 'First Abu Dhabi Bank', icon: '🏦' },
    { id: 'mashreq', name: 'Mashreq Bank', icon: '🏦' },
    { id: 'cash', name: 'Cash in Person', icon: '💵' },
  ],
  XAF: [
    { id: 'orange_money', name: 'Orange Money', icon: '📱' },
    { id: 'mtn_momo', name: 'MTN Mobile Money', icon: '📱' },
    { id: 'express_union', name: 'Express Union', icon: '🏦' },
    { id: 'uba', name: 'UBA Cameroon', icon: '🏦' },
    { id: 'afriland', name: 'Afriland First Bank', icon: '🏦' },
  ],
  NGN: [
    { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦' },
    { id: 'opay', name: 'OPay', icon: '📱' },
    { id: 'palmpay', name: 'PalmPay', icon: '📱' },
    { id: 'kuda', name: 'Kuda Bank', icon: '🏦' },
    { id: 'gtbank', name: 'GTBank', icon: '🏦' },
  ],
  default: [
    { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦' },
    { id: 'mobile_money', name: 'Mobile Money', icon: '📱' },
    { id: 'cash', name: 'Cash', icon: '💵' },
  ],
}

// Time limits
const TIME_LIMITS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
]

type Step = 1 | 2 | 3

export default function PostTraderAd() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { trader, isLoading, error, updateCorridor, addPaymentMethod, clearError } = useTraderStore()

  const [step, setStep] = useState<Step>(1)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Corridor (I receive this, I send this)
  const [receiveCurrency, setReceiveCurrency] = useState('AED') // What user pays trader
  const [sendCurrency, setSendCurrency] = useState('XAF') // What trader sends to recipient
  const [rate, setRate] = useState('163')

  // Step 2: Limits & Payment
  const [minAmount, setMinAmount] = useState('100')
  const [maxAmount, setMaxAmount] = useState('5000')
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [paymentTimeLimit, setPaymentTimeLimit] = useState(15)

  // Step 3: Terms
  const [conditions, setConditions] = useState('')
  const [autoReply, setAutoReply] = useState('')
  const [adStatus, setAdStatus] = useState<'online' | 'offline'>('online')

  const receiveCurrencyData = CURRENCIES.find(c => c.code === receiveCurrency)
  const sendCurrencyData = CURRENCIES.find(c => c.code === sendCurrency)
  const availablePaymentMethods = PAYMENT_METHODS[receiveCurrency] || PAYMENT_METHODS.default

  // Calculate sample amounts
  const rateNum = parseFloat(rate) || 0
  const minNum = parseFloat(minAmount) || 0
  const maxNum = parseFloat(maxAmount) || 0
  const sampleSend = 1000
  const sampleReceive = sampleSend * rateNum

  const togglePayment = (methodId: string) => {
    if (selectedPayments.includes(methodId)) {
      setSelectedPayments(prev => prev.filter(m => m !== methodId))
    } else if (selectedPayments.length < 5) {
      setSelectedPayments(prev => [...prev, methodId])
    }
  }

  const canProceedStep1 = receiveCurrency && sendCurrency && receiveCurrency !== sendCurrency && rateNum > 0
  const canProceedStep2 = minNum > 0 && maxNum > 0 && minNum <= maxNum && selectedPayments.length > 0
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
    setIsSubmitting(true)
    try {
      // Create corridor
      const success = await updateCorridor({
        from: receiveCurrency,
        to: sendCurrency,
        buyRate: rateNum,
        sellRate: rateNum,
        minAmount: minNum,
        maxAmount: maxNum,
        paymentMethods: selectedPayments,
        conditions: conditions || undefined,
        autoReply: autoReply || undefined,
        timeLimit: paymentTimeLimit,
        status: adStatus,
      })

      if (success) {
        navigate('/app/trader')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSelectedPaymentNames = () => {
    return selectedPayments
      .map(id => availablePaymentMethods.find(m => m.id === id)?.name || id)
      .join(', ')
  }

  return (
    <div className="min-h-screen bg-cyx-bg">
      {/* Header */}
      <header className="bg-cyx-card border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/app/trader" className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-white">Post New Ad</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 1 ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:block ${step === 1 ? 'text-white' : 'text-gray-500'}`}>
                Corridor & Rate
              </span>
            </div>
            {/* Line */}
            <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${step > 1 ? 'bg-green-500' : 'bg-gray-700'}`} />
            {/* Step 2 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 2 ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:block ${step === 2 ? 'text-white' : 'text-gray-500'}`}>
                Limits & Payment
              </span>
            </div>
            {/* Line */}
            <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${step > 2 ? 'bg-green-500' : 'bg-gray-700'}`} />
            {/* Step 3 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 3 ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                3
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:block ${step === 3 ? 'text-white' : 'text-gray-500'}`}>
                Terms & Status
              </span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl mb-6 border bg-red-500/10 border-red-500/30 text-red-400">
            {error}
            <button onClick={clearError} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-cyx-card border border-gray-800 rounded-xl p-6 mb-6">

          {/* ============================================ */}
          {/* STEP 1: Set Corridor & Rate */}
          {/* ============================================ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Set Your Trading Corridor</h2>
                <p className="text-sm text-gray-400">Define which currency you receive from buyers and what you send to recipients.</p>
              </div>

              {/* Sample Calculation */}
              <div className="bg-cyx-card-hover rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs mb-1">Buyer Sends You</p>
                    <p className="text-xl font-bold text-white">{sampleSend.toLocaleString()} {receiveCurrency}</p>
                  </div>
                  <div className="text-green-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs mb-1">You Send Recipient</p>
                    <p className="text-xl font-bold text-green-400">{sampleReceive.toLocaleString()} {sendCurrency}</p>
                  </div>
                </div>
              </div>

              {/* Currency Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    I Receive (from buyer)
                  </label>
                  <div className="relative">
                    <select
                      value={receiveCurrency}
                      onChange={(e) => setReceiveCurrency(e.target.value)}
                      className="w-full px-4 py-3 pl-12 rounded-xl border bg-cyx-card-hover border-gray-700 text-white appearance-none cursor-pointer focus:border-green-500 focus:outline-none"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code} - {c.name}</option>
                      ))}
                    </select>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
                      {receiveCurrencyData?.flag}
                    </span>
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    I Send (to recipient)
                  </label>
                  <div className="relative">
                    <select
                      value={sendCurrency}
                      onChange={(e) => setSendCurrency(e.target.value)}
                      className="w-full px-4 py-3 pl-12 rounded-xl border bg-cyx-card-hover border-gray-700 text-white appearance-none cursor-pointer focus:border-green-500 focus:outline-none"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code} - {c.name}</option>
                      ))}
                    </select>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
                      {sendCurrencyData?.flag}
                    </span>
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Same currency warning */}
              {receiveCurrency === sendCurrency && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                  Receive and send currencies must be different
                </div>
              )}

              {/* Exchange Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exchange Rate (1 {receiveCurrency} = ? {sendCurrency})
                </label>
                <div className="flex items-center bg-cyx-card-hover border border-gray-700 rounded-xl">
                  <button
                    onClick={() => setRate((parseFloat(rate) - 0.5).toFixed(2))}
                    className="px-4 py-3 text-gray-400 hover:text-white text-xl"
                  >
                    −
                  </button>
                  <input
                    type="text"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="flex-1 text-center py-3 bg-transparent text-white text-xl font-bold outline-none"
                  />
                  <span className="text-gray-400 pr-2">{sendCurrency}</span>
                  <button
                    onClick={() => setRate((parseFloat(rate) + 0.5).toFixed(2))}
                    className="px-4 py-3 text-gray-400 hover:text-white text-xl"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  1 {receiveCurrency} = {rate} {sendCurrency}
                </p>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 2: Set Limits & Payment Method */}
          {/* ============================================ */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Set Limits & Payment</h2>
                <p className="text-sm text-gray-400">Define order limits and how buyers can pay you.</p>
              </div>

              {/* Order Limits */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Order Limits ({receiveCurrency})
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center bg-cyx-card-hover border border-gray-700 rounded-xl">
                    <span className="px-3 text-gray-400">Min</span>
                    <input
                      type="text"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="flex-1 px-2 py-3 bg-transparent text-white outline-none"
                    />
                    <span className="px-3 text-gray-400">{receiveCurrency}</span>
                  </div>
                  <span className="text-gray-500">~</span>
                  <div className="flex-1 flex items-center bg-cyx-card-hover border border-gray-700 rounded-xl">
                    <span className="px-3 text-gray-400">Max</span>
                    <input
                      type="text"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="flex-1 px-2 py-3 bg-transparent text-white outline-none"
                    />
                    <span className="px-3 text-gray-400">{receiveCurrency}</span>
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">≈ {(minNum * rateNum).toLocaleString()} {sendCurrency}</p>
                  <p className="text-xs text-gray-500">≈ {(maxNum * rateNum).toLocaleString()} {sendCurrency}</p>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  How Buyers Pay You
                </label>
                <p className="text-xs text-gray-500 mb-3">Select up to 5 payment methods</p>

                {selectedPayments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedPayments.map(id => {
                      const method = availablePaymentMethods.find(m => m.id === id)
                      return (
                        <span key={id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400 border border-green-500/30">
                          <span>{method?.icon}</span>
                          {method?.name}
                          <button onClick={() => togglePayment(id)} className="text-green-400 hover:text-green-300">×</button>
                        </span>
                      )
                    })}
                  </div>
                )}

                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 bg-cyx-card-hover text-white hover:bg-[#3C4149] transition"
                >
                  <span className="text-lg text-green-400">+</span>
                  <span>Add Payment Method</span>
                </button>

                {selectedPayments.length === 0 && (
                  <p className="text-xs text-red-400 mt-2">Please select at least 1 payment method</p>
                )}
              </div>

              {/* Payment Time Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Payment Time Limit</label>
                <div className="flex gap-2">
                  {TIME_LIMITS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setPaymentTimeLimit(t.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        paymentTimeLimit === t.value
                          ? 'bg-green-500 text-white'
                          : 'bg-cyx-card-hover text-gray-400 hover:text-white border border-gray-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 3: Terms & Status */}
          {/* ============================================ */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Terms & Status</h2>
                <p className="text-sm text-gray-400">Add conditions for buyers and set your ad status.</p>
              </div>

              {/* Trading Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trading Conditions (Optional)
                </label>
                <textarea
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="E.g., Must have verified phone number. Payment must come from account matching your name."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border bg-cyx-card-hover border-gray-700 text-white placeholder-gray-500 resize-none focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 text-right mt-1">{conditions.length}/500</p>
              </div>

              {/* Auto Reply */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Auto-Reply Message (Optional)
                </label>
                <textarea
                  value={autoReply}
                  onChange={(e) => setAutoReply(e.target.value)}
                  placeholder="This message will be automatically sent to buyers when they start a trade with you."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border bg-cyx-card-hover border-gray-700 text-white placeholder-gray-500 resize-none focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 text-right mt-1">{autoReply.length}/500</p>
              </div>

              {/* Ad Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Ad Status</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setAdStatus('online')}
                    className={`flex-1 py-3 rounded-xl font-medium transition ${
                      adStatus === 'online'
                        ? 'bg-green-500 text-white'
                        : 'bg-cyx-card-hover text-gray-400 border border-gray-700'
                    }`}
                  >
                    <span className="mr-2">🟢</span> Online
                  </button>
                  <button
                    onClick={() => setAdStatus('offline')}
                    className={`flex-1 py-3 rounded-xl font-medium transition ${
                      adStatus === 'offline'
                        ? 'bg-gray-600 text-white'
                        : 'bg-cyx-card-hover text-gray-400 border border-gray-700'
                    }`}
                  >
                    <span className="mr-2">⚫</span> Offline
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {adStatus === 'online'
                    ? 'Your ad will be visible to buyers immediately.'
                    : 'Your ad will be saved as a draft. Enable it when you\'re ready.'}
                </p>
              </div>

              {/* Fee Notice */}
              <div className="p-4 bg-cyx-card-hover border border-gray-700 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 text-xl">💰</span>
                  <div>
                    <p className="text-white font-medium">Platform Fee: 0.5%</p>
                    <p className="text-sm text-gray-400 mt-1">
                      CyxTrade charges a 0.5% fee on completed transactions. This fee is deducted from the transaction amount.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              onClick={handlePrevious}
              className="px-6 py-3 rounded-xl font-medium bg-cyx-card-hover text-white hover:bg-[#3C4149] transition"
            >
              Previous
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            disabled={
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2) ||
              (step === 3 && !canProceedStep3)
            }
            className="px-8 py-3 rounded-xl font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {step === 3 ? 'Post Ad' : 'Next'}
          </button>
        </div>

        {/* Padding for bottom */}
        <div className="h-8"></div>
      </main>

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-cyx-card rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Select Payment Method</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-400 mb-4">
                Available methods for {receiveCurrency} <span className="text-green-400">(Up to 5)</span>
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {availablePaymentMethods.map(method => (
                  <label
                    key={method.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      selectedPayments.includes(method.id)
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{method.icon}</span>
                      <span className="text-white">{method.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(method.id)}
                      onChange={() => togglePayment(method.id)}
                      className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 bg-cyx-card-hover"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-3 rounded-xl font-medium bg-green-500 text-white hover:bg-green-600 transition"
              >
                Confirm ({selectedPayments.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-cyx-card rounded-xl border border-gray-800">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Confirm Your Ad</h3>

              <div className="space-y-4">
                {[
                  { label: 'Corridor', value: `${receiveCurrencyData?.flag} ${receiveCurrency} → ${sendCurrencyData?.flag} ${sendCurrency}` },
                  { label: 'Exchange Rate', value: `1 ${receiveCurrency} = ${rate} ${sendCurrency}` },
                  { label: 'Order Limits', value: `${parseFloat(minAmount).toLocaleString()} - ${parseFloat(maxAmount).toLocaleString()} ${receiveCurrency}` },
                  { label: 'Payment Methods', value: getSelectedPaymentNames() },
                  { label: 'Time Limit', value: `${paymentTimeLimit} min` },
                  { label: 'Status', value: adStatus === 'online' ? '🟢 Online' : '⚫ Offline' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-medium text-right max-w-[60%]">{item.value}</span>
                  </div>
                ))}
              </div>

              {conditions && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-gray-400 text-sm mb-1">Conditions:</p>
                  <p className="text-white text-sm">{conditions}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl font-medium bg-cyx-card-hover text-white hover:bg-[#3C4149] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Posting...' : 'Confirm & Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
