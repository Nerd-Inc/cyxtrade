import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useOrdersStore, useWalletStore } from '../store/pro'
import ScamWarningModal, { WarningBanner, ReportSuspiciousModal } from '../components/ScamWarningModal'
import { useRiskAssessment } from '../hooks/useRiskAssessment'
import FeeBreakdown from '../components/FeeBreakdown'
import DisputeForm, { type DisputeClaimType } from '../components/DisputeForm'

export default function ProOrderDetails() {
  const { id } = useParams<{ id: string }>()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { currentOrder, isLoading, error, fetchOrder, markPaid, releaseOrder, cancelOrder, openDispute, clearError } = useOrdersStore()
  const { fetchBalances } = useWalletStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('')

  // Risk assessment
  const { assessment, assessTrade, reportSuspicious } = useRiskAssessment()
  const [showRiskWarning, setShowRiskWarning] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [riskChecked, setRiskChecked] = useState(false)

  useEffect(() => {
    if (id) {
      fetchOrder(id)
    }
  }, [id, fetchOrder])

  // Risk assessment when order loads
  useEffect(() => {
    const checkRisk = async () => {
      if (!currentOrder || riskChecked) return

      // Check risk of counterparty
      const counterpartyId = currentOrder.buyerUserId === user?.id
        ? currentOrder.sellerUserId
        : currentOrder.buyerUserId

      if (!counterpartyId) return

      const result = await assessTrade({
        traderId: counterpartyId,
        paymentMethodType: currentOrder.paymentMethod?.toLowerCase().includes('bank') ? 'bank' : 'mobile_money',
        paymentIdentifier: undefined,
        amount: currentOrder.fiatAmount
      })

      setRiskChecked(true)

      // Show warning modal if high/critical risk and order is still active
      if (result && result.requiresConfirmation && ['pending', 'payment_pending'].includes(currentOrder.status)) {
        setShowRiskWarning(true)
      }
    }

    checkRisk()
  }, [currentOrder?.id])

  useEffect(() => {
    if (!currentOrder || !['pending', 'payment_pending', 'paid', 'releasing'].includes(currentOrder.status)) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(currentOrder.expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining('Expired')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [currentOrder])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  const handleMarkPaid = async () => {
    if (!id) return
    setActionLoading(true)
    const success = await markPaid(id)
    setActionLoading(false)
    if (success) {
      fetchOrder(id)
    }
  }

  const handleRelease = async () => {
    if (!id) return
    if (!confirm('Are you sure you want to release the crypto? This action cannot be undone.')) return

    setActionLoading(true)
    const success = await releaseOrder(id)
    setActionLoading(false)
    if (success) {
      fetchOrder(id)
      fetchBalances()
    }
  }

  const handleCancel = async () => {
    if (!id) return
    if (!confirm('Are you sure you want to cancel this order?')) return

    setActionLoading(true)
    const success = await cancelOrder(id)
    setActionLoading(false)
    if (success) {
      fetchOrder(id)
      fetchBalances()
    }
  }

  const handleOpenDispute = async (data: { claimType: DisputeClaimType; reason: string }) => {
    if (!id) return

    setActionLoading(true)
    const success = await openDispute(id, data.claimType, data.reason)
    setActionLoading(false)
    if (success) {
      setShowDisputeForm(false)
      fetchOrder(id)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Order not found</p>
          <Link to="/pro/orders" className="text-teal-600 mt-4 inline-block">
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  const isBuyer = currentOrder.buyerUserId === user?.id
  const isSeller = currentOrder.sellerUserId === user?.id
  const counterparty = isBuyer ? currentOrder.sellerName : currentOrder.buyerName
  const isActive = ['pending', 'payment_pending', 'paid', 'releasing'].includes(currentOrder.status)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      case 'payment_pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'paid': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'releasing': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'disputed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'cancelled': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
      case 'expired': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'payment_pending': return 'Awaiting Payment'
      case 'paid': return 'Payment Confirmed'
      case 'releasing': return 'Releasing Crypto'
      case 'completed': return 'Completed'
      case 'disputed': return 'In Dispute'
      case 'cancelled': return 'Cancelled'
      case 'expired': return 'Expired'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/pro/orders" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                &larr; Back
              </Link>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded">
                PRO
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Report Suspicious Activity */}
              {currentOrder && !['completed', 'cancelled', 'expired'].includes(currentOrder.status) && (
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
        {assessment && assessment.warnings.length > 0 && !['completed', 'cancelled', 'expired'].includes(currentOrder.status) && (
          <WarningBanner
            warnings={assessment.warnings}
            onViewDetails={() => setShowRiskWarning(true)}
            className="mb-6"
          />
        )}

        {/* Order Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xl font-semibold text-gray-600 dark:text-gray-300">
                {counterparty?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{counterparty || 'Anonymous'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isBuyer ? 'You are buying from' : 'You are selling to'}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(currentOrder.status)}`}>
              {getStatusLabel(currentOrder.status)}
            </span>
          </div>

          {/* Timer */}
          {isActive && (
            <div className={`text-center py-3 rounded-lg mb-4 ${
              timeRemaining === 'Expired' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600'
            }`}>
              <p className="text-sm">Time Remaining</p>
              <p className="text-2xl font-bold">{timeRemaining}</p>
            </div>
          )}

          {/* Fee Breakdown Summary */}
          <FeeBreakdown
            sendAmount={isBuyer ? currentOrder.fiatAmount : currentOrder.cryptoAmount}
            sendCurrency={isBuyer ? currentOrder.fiatCurrency : currentOrder.asset}
            receiveAmount={isBuyer ? currentOrder.cryptoAmount : currentOrder.fiatAmount}
            receiveCurrency={isBuyer ? currentOrder.asset : currentOrder.fiatCurrency}
            exchangeRate={isBuyer ? 1 / currentOrder.price : currentOrder.price}
            platformFeePercent={0}
            variant="compact"
            className="mb-4"
          />

          {/* Order Details */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Price</span>
              <span className="text-gray-900 dark:text-white">
                {currentOrder.price.toLocaleString()} {currentOrder.fiatCurrency}/{currentOrder.asset}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Payment Method</span>
              <span className="text-gray-900 dark:text-white">{currentOrder.paymentMethod}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500 dark:text-gray-400">Order ID</span>
              <span className="text-gray-900 dark:text-white font-mono text-sm">{currentOrder.id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Escrow Info */}
        {currentOrder.escrowAmount && (
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-500 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-teal-600 dark:text-teal-400 text-lg">&#128274;</span>
              <span className="font-medium text-teal-700 dark:text-teal-300">Escrow Protected</span>
            </div>
            <p className="text-sm text-teal-600 dark:text-teal-400">
              {currentOrder.escrowAmount} {currentOrder.escrowAsset} is locked in escrow and will be released to the buyer upon confirmation.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Instructions</h3>

          {currentOrder.status === 'payment_pending' && isBuyer && (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>1. Send <strong>{currentOrder.fiatAmount.toLocaleString()} {currentOrder.fiatCurrency}</strong> to the seller using <strong>{currentOrder.paymentMethod}</strong></p>
              <p>2. After sending payment, click "I've Paid" to notify the seller</p>
              <p>3. The seller will verify and release the crypto to your wallet</p>
            </div>
          )}

          {currentOrder.status === 'payment_pending' && isSeller && (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>1. Wait for the buyer to send <strong>{currentOrder.fiatAmount.toLocaleString()} {currentOrder.fiatCurrency}</strong></p>
              <p>2. The buyer will mark the order as paid once they send payment</p>
              <p>3. After verifying receipt, release the crypto</p>
            </div>
          )}

          {currentOrder.status === 'paid' && isSeller && (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>1. The buyer has marked this order as <strong>Paid</strong></p>
              <p>2. Verify that you have received <strong>{currentOrder.fiatAmount.toLocaleString()} {currentOrder.fiatCurrency}</strong></p>
              <p>3. Once confirmed, click "Release Crypto" to complete the trade</p>
            </div>
          )}

          {currentOrder.status === 'paid' && isBuyer && (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>1. You've marked this order as paid</p>
              <p>2. Waiting for the seller to verify and release the crypto</p>
              <p>3. The crypto will be credited to your wallet once released</p>
            </div>
          )}

          {currentOrder.status === 'completed' && (
            <div className="text-center py-4">
              <span className="text-green-500 text-4xl">&#10003;</span>
              <p className="text-green-600 font-medium mt-2">Trade Completed Successfully</p>
            </div>
          )}

          {currentOrder.status === 'disputed' && (
            <div className="text-center py-4">
              <span className="text-red-500 text-4xl">&#9888;</span>
              <p className="text-red-600 font-medium mt-2">This order is under dispute</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                An arbitrator will review the case and make a decision
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Buyer: Mark as Paid */}
          {currentOrder.status === 'payment_pending' && isBuyer && (
            <button
              onClick={handleMarkPaid}
              disabled={actionLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {actionLoading ? 'Processing...' : "I've Paid"}
            </button>
          )}

          {/* Seller: Release Crypto */}
          {currentOrder.status === 'paid' && isSeller && (
            <button
              onClick={handleRelease}
              disabled={actionLoading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition"
            >
              {actionLoading ? 'Processing...' : 'Release Crypto'}
            </button>
          )}

          {/* Cancel Order */}
          {['pending', 'payment_pending'].includes(currentOrder.status) && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition"
            >
              {actionLoading ? 'Processing...' : 'Cancel Order'}
            </button>
          )}

          {/* Open Dispute */}
          {['paid'].includes(currentOrder.status) && (
            <button
              onClick={() => setShowDisputeForm(true)}
              className="w-full border border-red-500 text-red-500 py-3 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              Open Dispute
            </button>
          )}

          {/* Chat (placeholder) */}
          {isActive && (
            <button className="w-full border border-teal-600 text-teal-600 py-3 rounded-xl font-semibold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition">
              Chat with {isBuyer ? 'Seller' : 'Buyer'}
            </button>
          )}
        </div>

        {/* Dispute Form Modal */}
        {showDisputeForm && currentOrder && (
          <DisputeForm
            orderId={currentOrder.id}
            userRole={isBuyer ? 'buyer' : 'seller'}
            onSubmit={handleOpenDispute}
            onCancel={() => setShowDisputeForm(false)}
            isLoading={actionLoading}
          />
        )}
      </main>

      {/* Scam Warning Modal */}
      {assessment && (
        <ScamWarningModal
          isOpen={showRiskWarning}
          onClose={() => setShowRiskWarning(false)}
          onProceed={() => setShowRiskWarning(false)}
          onCancel={() => navigate('/pro/orders')}
          assessment={assessment}
          actionLabel="Continue with Order"
        />
      )}

      {/* Report Suspicious Activity Modal */}
      {currentOrder && (
        <ReportSuspiciousModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={async (data) => {
            const counterpartyId = currentOrder.buyerUserId === user?.id
              ? currentOrder.sellerUserId
              : currentOrder.buyerUserId
            await reportSuspicious({
              tradeId: currentOrder.id,
              methodType: currentOrder.paymentMethod?.toLowerCase().includes('bank') ? 'bank' : 'mobile_money',
              identifier: counterpartyId || '',
              ...data
            })
          }}
          tradeId={currentOrder.id}
          methodType={currentOrder.paymentMethod?.toLowerCase().includes('bank') ? 'bank' : 'mobile_money'}
          identifier={isBuyer ? currentOrder.sellerUserId : currentOrder.buyerUserId}
        />
      )}
    </div>
  )
}
