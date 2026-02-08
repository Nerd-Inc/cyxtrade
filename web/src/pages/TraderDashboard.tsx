import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTradeStore } from '../store/trade'
import type { Trade } from '../store/trade'
import { useTraderStore } from '../store/trader'
import { useAuthStore } from '../store/auth'

type Tab = 'pending' | 'active' | 'completed'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  accepted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  paid: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  disputed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  cancelled: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-400' },
}

function TradeRequestCard({
  trade,
  onAccept,
  onDecline,
  isLoading
}: {
  trade: Trade
  onAccept: () => void
  onDecline: () => void
  isLoading: boolean
}) {
  const createdAt = new Date(trade.createdAt)
  const timeAgo = Math.floor((Date.now() - createdAt.getTime()) / 60000)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{trade.recipientName}</p>
          <p className="text-sm text-gray-500">{timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[trade.status].bg} ${STATUS_COLORS[trade.status].text}`}>
          {trade.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Sending</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {trade.sendAmount.toLocaleString()} {trade.sendCurrency}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">To deliver</p>
          <p className="font-semibold text-teal-600">
            {trade.receiveAmount.toLocaleString()} {trade.receiveCurrency}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onDecline}
          disabled={isLoading}
          className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          disabled={isLoading}
          className="flex-1 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
        >
          {isLoading ? 'Accepting...' : 'Accept'}
        </button>
      </div>
    </div>
  )
}

function ActiveTradeCard({
  trade,
  onMarkDelivered,
  isLoading
}: {
  trade: Trade
  onMarkDelivered: () => void
  isLoading: boolean
}) {
  const status = STATUS_COLORS[trade.status]

  return (
    <Link
      to={`/app/trade/${trade.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-teal-500 transition"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
            <span className="font-bold text-teal-600">{trade.recipientName?.charAt(0) || '?'}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{trade.recipientName}</p>
            <p className="text-sm text-gray-500">#{trade.id.substring(0, 8)}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
          {trade.status}
        </span>
      </div>

      <div className="flex justify-between text-sm mb-3">
        <span className="text-gray-500">
          {trade.sendAmount.toLocaleString()} {trade.sendCurrency}
        </span>
        <span className="font-medium text-teal-600">
          {trade.receiveAmount.toLocaleString()} {trade.receiveCurrency}
        </span>
      </div>

      {trade.status === 'paid' && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onMarkDelivered()
          }}
          disabled={isLoading}
          className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Mark as Delivered'}
        </button>
      )}
    </Link>
  )
}

export default function TraderDashboard() {
  const { user } = useAuthStore()
  const { profile, isLoading: profileLoading, getProfile, updateStatus } = useTraderStore()
  const { trades, isLoading: tradesLoading, getMyTrades, acceptTrade, declineTrade, markDelivered } = useTradeStore()

  const [tab, setTab] = useState<Tab>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
    getMyTrades({ role: 'trader' })
  }, [])

  const pendingTrades = trades.filter(t => t.status === 'pending')
  const activeTrades = trades.filter(t => ['accepted', 'paid'].includes(t.status))
  const completedTrades = trades.filter(t => ['completed', 'cancelled', 'disputed'].includes(t.status))

  const handleAccept = async (id: string) => {
    setProcessingId(id)
    await acceptTrade(id)
    setProcessingId(null)
  }

  const handleDecline = async (id: string) => {
    if (!confirm('Are you sure you want to decline this trade?')) return
    setProcessingId(id)
    await declineTrade(id)
    setProcessingId(null)
  }

  const handleMarkDelivered = async (id: string) => {
    setProcessingId(id)
    await markDelivered(id)
    setProcessingId(null)
  }

  const handleStatusToggle = async () => {
    if (profile) {
      await updateStatus(!profile.online)
    }
  }

  if (!user?.isTrader) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Not a Trader</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You need to register as a trader to access this page.</p>
          <Link
            to="/become-trader"
            className="inline-block bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 transition"
          >
            Become a Trader
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/app" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trader Dashboard</h1>
            </div>
            <button
              onClick={handleStatusToggle}
              disabled={profileLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                profile?.online
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${profile?.online ? 'bg-green-500' : 'bg-gray-400'}`} />
              {profile?.online ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingTrades.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            <p className="text-2xl font-bold text-blue-600">{activeTrades.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
            <p className="text-2xl font-bold text-green-600">{profile?.completedCount || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Rating</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              &#11088; {profile?.rating?.toFixed(1) || '5.0'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-6">
          <Link
            to="/app/payment-methods"
            className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-teal-500 transition text-center"
          >
            <div className="text-2xl mb-2">&#128179;</div>
            <p className="font-medium text-gray-900 dark:text-white">Payment Methods</p>
          </Link>
          <Link
            to="/app/settings"
            className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-teal-500 transition text-center"
          >
            <div className="text-2xl mb-2">&#9881;&#65039;</div>
            <p className="font-medium text-gray-900 dark:text-white">Settings</p>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'active', 'completed'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                tab === t
                  ? 'bg-teal-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-teal-500'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'pending' && pendingTrades.length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingTrades.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Trade Lists */}
        {tradesLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {tab === 'pending' && (
              <div className="space-y-4">
                {pendingTrades.length === 0 ? (
                  <EmptyState
                    title="No pending requests"
                    description="New trade requests will appear here"
                  />
                ) : (
                  pendingTrades.map((trade) => (
                    <TradeRequestCard
                      key={trade.id}
                      trade={trade}
                      onAccept={() => handleAccept(trade.id)}
                      onDecline={() => handleDecline(trade.id)}
                      isLoading={processingId === trade.id}
                    />
                  ))
                )}
              </div>
            )}

            {tab === 'active' && (
              <div className="space-y-4">
                {activeTrades.length === 0 ? (
                  <EmptyState
                    title="No active trades"
                    description="Trades you accept will appear here"
                  />
                ) : (
                  activeTrades.map((trade) => (
                    <ActiveTradeCard
                      key={trade.id}
                      trade={trade}
                      onMarkDelivered={() => handleMarkDelivered(trade.id)}
                      isLoading={processingId === trade.id}
                    />
                  ))
                )}
              </div>
            )}

            {tab === 'completed' && (
              <div className="space-y-4">
                {completedTrades.length === 0 ? (
                  <EmptyState
                    title="No completed trades"
                    description="Completed trades will appear here"
                  />
                ) : (
                  completedTrades.map((trade) => (
                    <ActiveTradeCard
                      key={trade.id}
                      trade={trade}
                      onMarkDelivered={() => {}}
                      isLoading={false}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="font-medium text-gray-900 dark:text-white">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  )
}
