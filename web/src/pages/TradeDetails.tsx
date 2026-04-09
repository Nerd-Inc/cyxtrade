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
      <div className="min-h-screen bg-cyx-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
      </div>
    )
  }

  const trade = currentTrade
  const statusInfo = STATUS_INFO[trade.status]
  const currentStepIndex = STATUS_STEPS.indexOf(trade.status)
  const isUser = trade.userId === user?.id

  return (
    <div className="min-h-screen bg-cyx-bg">
      {/* Header */}
      <header className="bg-cyx-card border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/app/history" className="text-gray-400 hover:text-white transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Trade Details</h1>
              <p className="text-sm text-gray-500">#{trade.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
            <button onClick={clearError} className="text-red-500 hover:text-red-400 underline text-sm mt-1">Dismiss</button>
          </div>
        )}

        {/* Status Banner */}
        <div className={`mb-6 p-4 rounded-lg border ${
          statusInfo.color === 'green' ? 'bg-green-500/10 border-green-500/30' :
          statusInfo.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' :
          statusInfo.color === 'purple' ? 'bg-purple-500/10 border-purple-500/30' :
          statusInfo.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' :
          statusInfo.color === 'red' ? 'bg-red-500/10 border-red-500/30' :
          'bg-cyx-card border-gray-800'
        }`}>
          <h2 className={`font-semibold ${
            statusInfo.color === 'green' ? 'text-green-400' :
            statusInfo.color === 'blue' ? 'text-blue-400' :
            statusInfo.color === 'purple' ? 'text-purple-400' :
            statusInfo.color === 'yellow' ? 'text-yellow-400' :
            statusInfo.color === 'red' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {statusInfo.title}
          </h2>
          <p className={`text-sm ${
            statusInfo.color === 'green' ? 'text-green-500/80' :
            statusInfo.color === 'blue' ? 'text-blue-500/80' :
            statusInfo.color === 'purple' ? 'text-purple-500/80' :
            statusInfo.color === 'yellow' ? 'text-yellow-500/80' :
            statusInfo.color === 'red' ? 'text-red-500/80' :
            'text-gray-500'
          }`}>
            {statusInfo.description}
          </p>
        </div>

        {/* Progress Steps */}
        {!['disputed', 'cancelled'].includes(trade.status) && (
          <div className="mb-6 bg-cyx-card rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i <= currentStepIndex
                      ? 'bg-yellow-500 text-black'
                      : 'bg-cyx-card-hover text-gray-500'
                  }`}>
                    {i < currentStepIndex ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      i < currentStepIndex ? 'bg-yellow-500' : 'bg-cyx-card-hover'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs text-gray-500">
              <span>Pending</span>
              <span>Accepted</span>
              <span>Paid</span>
              <span>Complete</span>
            </div>
          </div>
        )}

        {/* Trade Summary */}
        <div className="bg-cyx-card rounded-lg border border-gray-800 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-cyx-card-hover">
            <h3 className="font-semibold text-white">Transfer Summary</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-500">You send</span>
              <span className="font-medium text-white">
                {trade.sendAmount.toLocaleString()} {trade.sendCurrency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Recipient gets</span>
              <span className="font-medium text-yellow-500">
                {trade.receiveAmount.toLocaleString()} {trade.receiveCurrency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Exchange rate</span>
              <span className="font-medium text-white">
                1 {trade.sendCurrency} = {trade.exchangeRate} {trade.receiveCurrency}
              </span>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Recipient</span>
                <div className="text-right">
                  <p className="font-medium text-white">{trade.recipientName}</p>
                  <p className="text-sm text-gray-500">{trade.recipientPhone}</p>
                </div>
              </div>
            </div>
            {trade.traderName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Trader</span>
                <span className="font-medium text-white">{trade.traderName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details (show when accepted) */}
        {trade.status === 'accepted' && isUser && (
          <div className="bg-yellow-500/10 rounded-lg border border-yellow-500/30 mb-6 p-4">
            <h3 className="font-semibold text-yellow-400 mb-3">Payment Instructions</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-yellow-500/80">Bank Transfer</p>
                <p className="font-medium text-white">UBA Bank Cameroon</p>
                <p className="font-mono text-white">1234567890</p>
              </div>
              <div className="pt-3 border-t border-yellow-500/20">
                <p className="text-yellow-500/80">Amount to send</p>
                <p className="text-xl font-bold text-yellow-400">
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
              className="w-full py-3 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition"
            >
              I've Made the Payment
            </button>
          )}

          {trade.status === 'pending' && isUser && (
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="w-full py-3 border border-red-500/50 text-red-400 rounded-lg font-semibold hover:bg-red-500/10 transition disabled:opacity-50"
            >
              {submitting ? 'Cancelling...' : 'Cancel Trade'}
            </button>
          )}

          {trade.status === 'completed' && (
            <Link
              to="/app"
              className="block w-full py-3 bg-green-500 text-white rounded-lg font-semibold text-center hover:bg-green-600 transition"
            >
              Start Another Trade
            </Link>
          )}

          <Link
            to={`/app/chat/${trade.id}`}
            className="block w-full py-3 border border-gray-700 text-gray-300 rounded-lg font-semibold text-center hover:bg-cyx-card-hover transition"
          >
            Chat with Trader
          </Link>

          {['paid', 'accepted'].includes(trade.status) && isUser && (
            <Link
              to={`/app/dispute/${trade.id}`}
              className="block w-full py-3 text-red-400 text-center text-sm hover:text-red-300 transition"
            >
              Open Dispute
            </Link>
          )}
        </div>

        {/* Timeline */}
        <div className="mt-8 bg-cyx-card rounded-lg border border-gray-800 p-4">
          <h3 className="font-semibold text-white mb-4">Activity</h3>
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-cyx-card rounded-lg border border-gray-800 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Confirm Payment
            </h3>
            <p className="text-gray-400 mb-4">
              Enter your payment reference or transaction ID (optional)
            </p>
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g., TXN123456789"
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-cyx-card-hover text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-cyx-card-hover transition"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={submitting}
                className="flex-1 py-3 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition disabled:opacity-50"
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
        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
        <div className="w-0.5 flex-1 bg-gray-700" />
      </div>
      <div className="pb-4">
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
        <p className="text-xs text-gray-600 mt-1">{dateStr} at {timeStr}</p>
      </div>
    </div>
  )
}
