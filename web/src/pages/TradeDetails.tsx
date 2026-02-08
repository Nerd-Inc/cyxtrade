import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTradeStore } from '../store/trade'
import { useAuthStore } from '../store/auth'

const STATUS_STEPS = ['pending', 'accepted', 'paid', 'completed']

const STATUS_INFO: Record<string, { title: string; description: string; color: string }> = {
  pending: {
    title: 'Waiting for Trader',
    description: 'The trader needs to accept your trade request',
    color: 'yellow'
  },
  accepted: {
    title: 'Send Payment',
    description: 'Transfer funds to the trader using their payment details',
    color: 'blue'
  },
  paid: {
    title: 'Confirming Payment',
    description: 'The trader is verifying your payment',
    color: 'purple'
  },
  completed: {
    title: 'Trade Complete',
    description: 'The recipient has received the funds',
    color: 'green'
  },
  disputed: {
    title: 'Under Dispute',
    description: 'An arbitrator is reviewing this trade',
    color: 'red'
  },
  cancelled: {
    title: 'Trade Cancelled',
    description: 'This trade was cancelled',
    color: 'gray'
  }
}

export default function TradeDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentTrade, isLoading, error, getTrade, markPaid, cancelTrade, clearError } = useTradeStore()

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      getTrade(id)
    }
  }, [id])

  const handleMarkPaid = async () => {
    if (!id) return
    setSubmitting(true)
    const success = await markPaid(id, paymentRef)
    setSubmitting(false)
    if (success) {
      setShowPaymentModal(false)
      setPaymentRef('')
    }
  }

  const handleCancel = async () => {
    if (!id || !confirm('Are you sure you want to cancel this trade?')) return
    setSubmitting(true)
    const success = await cancelTrade(id)
    setSubmitting(false)
    if (success) {
      navigate('/app/history')
    }
  }

  if (isLoading || !currentTrade) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  const trade = currentTrade
  const statusInfo = STATUS_INFO[trade.status]
  const currentStepIndex = STATUS_STEPS.indexOf(trade.status)
  const isUser = trade.userId === user?.id

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/app/history" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trade Details</h1>
              <p className="text-sm text-gray-500">#{trade.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={clearError} className="text-red-700 underline text-sm mt-1">Dismiss</button>
          </div>
        )}

        {/* Status Banner */}
        <div className={`mb-6 p-4 rounded-xl border ${
          statusInfo.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
          statusInfo.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
          statusInfo.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' :
          statusInfo.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
          statusInfo.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
          'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <h2 className={`font-semibold ${
            statusInfo.color === 'green' ? 'text-green-700 dark:text-green-400' :
            statusInfo.color === 'blue' ? 'text-blue-700 dark:text-blue-400' :
            statusInfo.color === 'purple' ? 'text-purple-700 dark:text-purple-400' :
            statusInfo.color === 'yellow' ? 'text-yellow-700 dark:text-yellow-400' :
            statusInfo.color === 'red' ? 'text-red-700 dark:text-red-400' :
            'text-gray-700 dark:text-gray-400'
          }`}>
            {statusInfo.title}
          </h2>
          <p className={`text-sm ${
            statusInfo.color === 'green' ? 'text-green-600 dark:text-green-300' :
            statusInfo.color === 'blue' ? 'text-blue-600 dark:text-blue-300' :
            statusInfo.color === 'purple' ? 'text-purple-600 dark:text-purple-300' :
            statusInfo.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-300' :
            statusInfo.color === 'red' ? 'text-red-600 dark:text-red-300' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {statusInfo.description}
          </p>
        </div>

        {/* Progress Steps */}
        {!['disputed', 'cancelled'].includes(trade.status) && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    i <= currentStepIndex
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {i < currentStepIndex ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      i < currentStepIndex ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Pending</span>
              <span>Accepted</span>
              <span>Paid</span>
              <span>Complete</span>
            </div>
          </div>
        )}

        {/* Trade Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Transfer Summary</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-500">You send</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {trade.sendAmount.toLocaleString()} {trade.sendCurrency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Recipient gets</span>
              <span className="font-medium text-teal-600">
                {trade.receiveAmount.toLocaleString()} {trade.receiveCurrency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Exchange rate</span>
              <span className="font-medium text-gray-900 dark:text-white">
                1 {trade.sendCurrency} = {trade.exchangeRate} {trade.receiveCurrency}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Recipient</span>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">{trade.recipientName}</p>
                  <p className="text-sm text-gray-500">{trade.recipientPhone}</p>
                </div>
              </div>
            </div>
            {trade.traderName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Trader</span>
                <span className="font-medium text-gray-900 dark:text-white">{trade.traderName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details (show when accepted) */}
        {trade.status === 'accepted' && isUser && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 mb-6 p-4">
            <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">Payment Instructions</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-blue-600 dark:text-blue-400">Bank Transfer</p>
                <p className="font-medium text-blue-800 dark:text-blue-200">UBA Bank Cameroon</p>
                <p className="font-mono text-blue-800 dark:text-blue-200">1234567890</p>
              </div>
              <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                <p className="text-blue-600 dark:text-blue-400">Amount to send</p>
                <p className="text-xl font-bold text-blue-800 dark:text-blue-200">
                  {trade.sendAmount.toLocaleString()} {trade.sendCurrency}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {trade.status === 'accepted' && isUser && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition"
            >
              I've Made the Payment
            </button>
          )}

          {trade.status === 'pending' && isUser && (
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="w-full py-3 border border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
            >
              {submitting ? 'Cancelling...' : 'Cancel Trade'}
            </button>
          )}

          {trade.status === 'completed' && (
            <Link
              to="/app/send"
              className="block w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-center hover:bg-teal-700 transition"
            >
              Send Another Transfer
            </Link>
          )}

          <Link
            to={`/app/chat/${trade.id}`}
            className="block w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Chat with Trader
          </Link>

          {['paid', 'accepted'].includes(trade.status) && isUser && (
            <Link
              to={`/app/dispute/${trade.id}`}
              className="block w-full py-3 text-red-600 text-center text-sm hover:underline"
            >
              Open Dispute
            </Link>
          )}
        </div>

        {/* Timeline */}
        <div className="mt-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Activity</h3>
          <div className="space-y-4">
            <TimelineItem
              time={trade.createdAt}
              title="Trade created"
              description={`Transfer of ${trade.sendAmount} ${trade.sendCurrency} requested`}
            />
            {trade.acceptedAt && (
              <TimelineItem
                time={trade.acceptedAt}
                title="Trade accepted"
                description="Trader accepted the trade request"
              />
            )}
            {trade.paidAt && (
              <TimelineItem
                time={trade.paidAt}
                title="Payment marked"
                description={trade.paymentReference ? `Reference: ${trade.paymentReference}` : 'User confirmed payment'}
              />
            )}
            {trade.completedAt && (
              <TimelineItem
                time={trade.completedAt}
                title="Trade completed"
                description="Funds delivered to recipient"
              />
            )}
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Confirm Payment
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter your payment reference or transaction ID (optional)
            </p>
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g., TXN123456789"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={submitting}
                className="flex-1 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-50"
              >
                {submitting ? 'Confirming...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TimelineItem({ time, title, description }: { time: string; title: string; description: string }) {
  const date = new Date(time)
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 bg-teal-600 rounded-full" />
        <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="pb-4">
        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{dateStr} at {timeStr}</p>
      </div>
    </div>
  )
}
