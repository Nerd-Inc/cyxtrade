import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTradeStore } from '../store/trade'
import type { Trade } from '../store/trade'

type StatusFilter = 'all' | 'pending' | 'accepted' | 'paid' | 'completed' | 'disputed' | 'cancelled'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-500' },
  accepted: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  paid: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-500' },
  disputed: { bg: 'bg-red-500/20', text: 'text-red-500' },
  cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const mins = Math.floor(diff / (1000 * 60))
      return `${mins}m ago`
    }
    return `${hours}h ago`
  }
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TradeCard({ trade }: { trade: Trade }) {
  const status = STATUS_COLORS[trade.status] || STATUS_COLORS.pending

  return (
    <Link
      to={`/app/trade/${trade.id}`}
      className="block bg-[#1E2329] rounded-lg border border-gray-800 p-4 hover:border-yellow-500/50 transition"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
          <span className="text-lg font-bold text-yellow-500">
            {trade.recipientName?.charAt(0) || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white truncate">
              {trade.recipientName}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
              {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-400">
            {formatDate(trade.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium text-white">
            -{trade.sendAmount.toLocaleString()} {trade.sendCurrency}
          </p>
          <p className="text-sm text-green-500">
            +{trade.receiveAmount.toLocaleString()} {trade.receiveCurrency}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function History() {
  const { trades, isLoading, getMyTrades } = useTradeStore()
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    getMyTrades()
  }, [])

  const filteredTrades = filter === 'all'
    ? trades
    : trades.filter(t => t.status === filter)

  const stats = {
    total: trades.length,
    completed: trades.filter(t => t.status === 'completed').length,
    pending: trades.filter(t => ['pending', 'accepted', 'paid'].includes(t.status)).length,
    volume: trades
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.sendAmount, 0)
  }

  return (
    <div className="min-h-screen bg-[#0B0E11]">
      {/* Header */}
      <header className="bg-[#1E2329] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/app" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-white">Transaction History</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1E2329] rounded-lg p-4 border border-gray-800">
            <p className="text-sm text-gray-400">Total Trades</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-[#1E2329] rounded-lg p-4 border border-gray-800">
            <p className="text-sm text-gray-400">Completed</p>
            <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
          </div>
          <div className="bg-[#1E2329] rounded-lg p-4 border border-gray-800">
            <p className="text-sm text-gray-400">In Progress</p>
            <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
          </div>
          <div className="bg-[#1E2329] rounded-lg p-4 border border-gray-800">
            <p className="text-sm text-gray-400">Volume</p>
            <p className="text-2xl font-bold text-white">${stats.volume.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'pending', 'accepted', 'paid', 'completed', 'disputed', 'cancelled'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                filter === status
                  ? 'bg-yellow-500 text-black'
                  : 'bg-[#1E2329] text-gray-400 border border-gray-700 hover:border-yellow-500/50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Trade List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#1E2329] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400 mb-4">
              {filter === 'all' ? 'No transactions yet' : `No ${filter} transactions`}
            </p>
            <Link
              to="/app"
              className="inline-block bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 transition"
            >
              Start a Trade
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
