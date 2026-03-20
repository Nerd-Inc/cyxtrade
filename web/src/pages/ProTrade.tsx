import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useAdsStore, useOrdersStore, useWalletStore } from '../store/pro'
import ScamWarningModal, { WarningBanner, ReportSuspiciousModal } from '../components/ScamWarningModal'
import { useRiskAssessment } from '../hooks/useRiskAssessment'

export default function ProTrade() {
  const { id } = useParams<{ id: string }>()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { currentAd, isLoading: adLoading, error: adError, fetchAd } = useAdsStore()
  const { createOrder, isLoading: orderLoading, error: orderError, clearError } = useOrdersStore()
  const { balances, fetchBalances } = useWalletStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [fiatAmount, setFiatAmount] = useState('')
  const [selectedPayment, setSelectedPayment] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)

  // Risk assessment
  const { assessment, assessTrade, reportSuspicious } = useRiskAssessment()
  const [showRiskWarning, setShowRiskWarning] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [riskChecked, setRiskChecked] = useState(false)

  useEffect(() => {
    if (id) {
      fetchAd(id)
      fetchBalances()
    }
  }, [id, fetchAd, fetchBalances])

  useEffect(() => {
    if (currentAd && currentAd.paymentMethods.length > 0 && !selectedPayment) {
      setSelectedPayment(currentAd.paymentMethods[0])
    }
  }, [currentAd, selectedPayment])

  // Risk assessment when ad loads
  useEffect(() => {
    const checkRisk = async () => {
      if (!currentAd || !currentAd.traderUserId || riskChecked) return

      const result = await assessTrade({
        traderId: currentAd.traderUserId,
        paymentMethodType: currentAd.paymentMethods[0]?.toLowerCase().includes('bank') ? 'bank' : 'mobile_money',
        paymentIdentifier: undefined // Will check trader reputation only
      })

      setRiskChecked(true)

      // Show warning modal if high/critical risk
      if (result && result.requiresConfirmation) {
        setShowRiskWarning(true)
      }
    }

    checkRisk()
  }, [currentAd?.id])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  const error = adError || orderError

  if (adLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (!currentAd) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Ad not found</p>
          <Link to="/pro" className="text-teal-600 mt-4 inline-block">
            Back to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  // When viewing a "sell" ad, user is buying
  // When viewing a "buy" ad, user is selling
  const isBuying = currentAd.type === 'sell'

  const fiatValue = parseFloat(fiatAmount) || 0
  const cryptoAmount = fiatValue > 0 ? fiatValue / currentAd.price : 0
  const userBalance = balances.find(b => b.asset === currentAd.asset)

  const isValidAmount = fiatValue >= currentAd.minAmount && fiatValue <= currentAd.maxAmount
  const hasSufficientBalance = isBuying || (userBalance && userBalance.available >= cryptoAmount)

  const canTrade = isValidAmount && hasSufficientBalance && selectedPayment && agreedTerms

  const handleTrade = async () => {
    if (!canTrade || !id) return

    const order = await createOrder({
      adId: id,
      amount: cryptoAmount,
      paymentMethod: selectedPayment
    })

    if (order) {
      navigate(`/pro/order/${order.id}`)
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

            <div className="flex items-center gap-3">
              {/* Report Suspicious Activity */}
              {currentAd && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  title="Report Suspicious Activity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </button>
              )}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
            <button onClick={clearError} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Risk Warning Banner */}
        {assessment && assessment.warnings.length > 0 && (
          <WarningBanner
            warnings={assessment.warnings}
            onViewDetails={() => setShowRiskWarning(true)}
            className="mb-6"
          />
        )}

        {/* Trade Type Banner */}
        <div className={`rounded-xl p-4 mb-6 ${
          isBuying
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500'
        }`}>
          <p className={`text-lg font-semibold ${isBuying ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {isBuying ? 'Buy' : 'Sell'} {currentAd.asset}
          </p>
          <p className={`text-sm ${isBuying ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
            {isBuying ? 'from' : 'to'} {currentAd.traderName || 'Anonymous'}
          </p>
        </div>

        {/* Trader Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xl font-semibold text-gray-600 dark:text-gray-300">
              {currentAd.traderName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{currentAd.traderName || 'Anonymous'}</p>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>{currentAd.completedCount} orders</span>
                <span className="text-green-500">{(currentAd.completionRate * 100).toFixed(0)}% completion</span>
                {currentAd.avgReleaseTime && (
                  <span>~{currentAd.avgReleaseTime} min release</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-gray-500 dark:text-gray-400">Price</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {currentAd.price.toLocaleString()} {currentAd.fiatCurrency}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-gray-500 dark:text-gray-400">Available</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {currentAd.availableAmount.toFixed(2)} {currentAd.asset}
              </p>
            </div>
          </div>
        </div>

        {/* Trade Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Trade Details</h3>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isBuying ? 'I want to pay' : 'I want to receive'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={fiatAmount}
                onChange={(e) => setFiatAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                {currentAd.fiatCurrency}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Limit: {currentAd.minAmount.toLocaleString()} - {currentAd.maxAmount.toLocaleString()} {currentAd.fiatCurrency}
            </p>
          </div>

          {/* Crypto Amount */}
          <div className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {isBuying ? 'I will receive' : 'I will send'}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {cryptoAmount.toFixed(6)} <span className="text-teal-600">{currentAd.asset}</span>
            </p>
          </div>

          {/* Balance Check (for selling) */}
          {!isBuying && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${
              hasSufficientBalance
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              {userBalance ? (
                <>
                  Your balance: {userBalance.available.toFixed(4)} {currentAd.asset}
                  {!hasSufficientBalance && cryptoAmount > 0 && (
                    <p className="mt-1">
                      Insufficient balance. Need {(cryptoAmount - userBalance.available).toFixed(4)} more {currentAd.asset}
                    </p>
                  )}
                </>
              ) : (
                <>No {currentAd.asset} wallet found. <Link to="/pro/wallet" className="underline">Initialize wallet</Link></>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <div className="flex flex-wrap gap-2">
              {currentAd.paymentMethods.map(method => (
                <button
                  key={method}
                  onClick={() => setSelectedPayment(method)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedPayment === method
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Window */}
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Payment window: <strong>{currentAd.paymentWindow} minutes</strong>
          </div>

          {/* Terms */}
          {currentAd.terms && (
            <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">Trader's Terms</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500">{currentAd.terms}</p>
            </div>
          )}

          {/* Agree to Terms */}
          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              I have read and agree to the trading terms. I understand that crypto will be held in escrow until the trade is completed.
            </span>
          </label>

          {/* Trade Button */}
          <button
            onClick={handleTrade}
            disabled={!canTrade || orderLoading}
            className={`w-full py-3 rounded-xl font-semibold transition ${
              isBuying
                ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300'
                : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300'
            } disabled:cursor-not-allowed`}
          >
            {orderLoading ? 'Creating Order...' : `${isBuying ? 'Buy' : 'Sell'} ${currentAd.asset}`}
          </button>

          {!isValidAmount && fiatValue > 0 && (
            <p className="text-red-500 text-sm text-center mt-2">
              Amount must be between {currentAd.minAmount.toLocaleString()} and {currentAd.maxAmount.toLocaleString()} {currentAd.fiatCurrency}
            </p>
          )}
        </div>

        {/* Escrow Notice */}
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-500 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-teal-600 dark:text-teal-400 text-lg">&#128274;</span>
            <span className="font-medium text-teal-700 dark:text-teal-300">Escrow Protection</span>
          </div>
          <p className="text-sm text-teal-600 dark:text-teal-400">
            {isBuying
              ? "The seller's crypto is locked in escrow until you confirm payment receipt."
              : "Your crypto will be locked in escrow until the buyer confirms they've received payment."
            }
          </p>
        </div>
      </main>

      {/* Scam Warning Modal */}
      {assessment && (
        <ScamWarningModal
          isOpen={showRiskWarning}
          onClose={() => setShowRiskWarning(false)}
          onProceed={() => setShowRiskWarning(false)}
          onCancel={() => navigate('/pro')}
          assessment={assessment}
          actionLabel="Continue Trading"
        />
      )}

      {/* Report Suspicious Activity Modal */}
      {currentAd && (
        <ReportSuspiciousModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={async (data) => {
            await reportSuspicious({
              tradeId: currentAd.id, // Using ad ID as reference
              methodType: currentAd.paymentMethods[0]?.toLowerCase().includes('bank') ? 'bank' : 'mobile_money',
              identifier: currentAd.traderUserId || '',
              ...data
            })
          }}
          tradeId={currentAd.id}
          methodType={currentAd.paymentMethods[0]?.toLowerCase().includes('bank') ? 'bank' : 'mobile_money'}
          identifier={currentAd.traderUserId || ''}
        />
      )}
    </div>
  )
}
