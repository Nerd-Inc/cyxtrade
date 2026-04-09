import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTradeStore } from '../store/trade'
import type { Trade } from '../store/trade'
import { useTraderStore } from '../store/trader'
import { useAuthStore } from '../store/auth'

type Tab = 'pending' | 'active' | 'completed'

// Eye icons for balance visibility
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-500' },
  accepted: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  paid: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  delivering: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-500' },
  disputed: { bg: 'bg-red-500/20', text: 'text-red-500' },
  cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
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
    <div className="bg-cyx-card rounded-xl border border-gray-800/50 p-5 hover:border-yellow-500/30 transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <span className="font-bold text-white text-lg">{trade.recipientName?.charAt(0) || '?'}</span>
          </div>
          <div>
            <p className="font-semibold text-white">{trade.recipientName}</p>
            <p className="text-xs text-gray-500">{timeAgo < 60 ? `${timeAgo} min ago` : `${Math.floor(timeAgo / 60)}h ago`}</p>
          </div>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-medium">
          New Request
        </span>
      </div>

      {/* Amount Details */}
      <div className="bg-cyx-bg/50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">They Send</p>
            <p className="text-xl font-bold text-white">
              {trade.sendAmount.toLocaleString()} <span className="text-sm font-medium text-gray-400">{trade.sendCurrency}</span>
            </p>
          </div>
          <div className="w-10 h-10 bg-cyx-card-hover rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">You Deliver</p>
            <p className="text-xl font-bold text-green-400">
              {trade.receiveAmount.toLocaleString()} <span className="text-sm font-medium text-green-400/70">{trade.receiveCurrency}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onDecline}
          disabled={isLoading}
          className="flex-1 py-3 border border-gray-700 text-gray-300 font-medium rounded-xl hover:bg-cyx-card-hover hover:border-red-500/30 hover:text-red-400 transition disabled:opacity-50"
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          disabled={isLoading}
          className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition disabled:opacity-50 shadow-lg shadow-green-500/20"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Accepting...
            </span>
          ) : 'Accept Trade'}
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
  const status = STATUS_COLORS[trade.status] || { bg: 'bg-gray-500/20', text: 'text-gray-400' }

  const statusLabels: Record<string, string> = {
    accepted: 'Awaiting Payment',
    paid: 'Payment Received',
    delivering: 'Delivering',
    completed: 'Completed',
    disputed: 'In Dispute',
    cancelled: 'Cancelled'
  }

  return (
    <Link
      to={`/app/chat/${trade.id}`}
      className="block bg-cyx-card rounded-xl border border-gray-800/50 p-5 hover:border-green-500/30 transition group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/10 group-hover:shadow-green-500/20 transition">
            <span className="font-bold text-white text-lg">{trade.recipientName?.charAt(0) || '?'}</span>
          </div>
          <div>
            <p className="font-semibold text-white">{trade.recipientName}</p>
            <p className="text-xs text-gray-500 font-mono">#{trade.id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full ${status.bg} ${status.text} border border-current/20 font-medium`}>
          {statusLabels[trade.status] || trade.status}
        </span>
      </div>

      {/* Amount Bar */}
      <div className="flex items-center justify-between bg-cyx-bg/50 rounded-xl px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{trade.sendAmount.toLocaleString()}</span>
          <span className="text-sm text-gray-500">{trade.sendCurrency}</span>
        </div>
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-green-400">{trade.receiveAmount.toLocaleString()}</span>
          <span className="text-sm text-green-400/70">{trade.receiveCurrency}</span>
        </div>
      </div>

      {/* Action Button for Paid Status */}
      {trade.status === 'paid' && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onMarkDelivered()
          }}
          disabled={isLoading}
          className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition disabled:opacity-50 shadow-lg shadow-green-500/20"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : 'Mark as Delivered'}
        </button>
      )}

      {/* Open Chat hint for non-action cards */}
      {trade.status !== 'paid' && (
        <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-green-500 transition">
          <span className="text-sm">Open Chat</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
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
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hideBalance, setHideBalance] = useState(() => {
    // Persist preference in localStorage
    return localStorage.getItem('cyxtrade_hide_balance') === 'true'
  })

  const toggleHideBalance = () => {
    const newValue = !hideBalance
    setHideBalance(newValue)
    localStorage.setItem('cyxtrade_hide_balance', String(newValue))
  }

  // Format amount with hide option
  const formatAmount = (amount: number, suffix = '') => {
    if (hideBalance) {
      return '••••••' + (suffix ? ` ${suffix}` : '')
    }
    return amount.toLocaleString() + (suffix ? ` ${suffix}` : '')
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      const traderProfile = await getProfile()
      if (!active) return

      if (traderProfile) {
        useAuthStore.setState((state) => ({
          user: state.user ? {
            ...state.user,
            isTrader: true,
            traderId: traderProfile.id,
            traderAddress: traderProfile.address || state.user.traderAddress
          } : null
        }))
        await getMyTrades({ role: 'trader' })
      }

      if (active) {
        setHasCheckedProfile(true)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [getProfile, getMyTrades])

  const pendingTrades = trades.filter(t => t.status === 'pending')
  const activeTrades = trades.filter(t => ['accepted', 'paid', 'delivering'].includes(t.status))
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

  const handleCopyAddress = () => {
    if (profile?.address) {
      navigator.clipboard.writeText(profile.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAddress) return
    setIsWithdrawing(true)
    // TODO: Call withdraw API
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsWithdrawing(false)
    setShowWithdrawModal(false)
    setWithdrawAmount('')
    setWithdrawAddress('')
    alert('Withdrawal request submitted!')
  }

  const hasTraderAccess = Boolean(user?.isTrader || profile)
  const bondAmount = profile?.bondAmount || 0
  const bondLocked = (profile as any)?.bondLocked || 0
  const bondAvailable = bondAmount - bondLocked

  if (!hasTraderAccess && !hasCheckedProfile) {
    return (
      <div className="min-h-screen bg-cyx-bg flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
      </div>
    )
  }

  if (!hasTraderAccess) {
    return (
      <div className="min-h-screen bg-cyx-bg flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not a Trader</h1>
          <p className="text-gray-400 mb-6">You need to register as a trader to access this page.</p>
          <Link
            to="/become-trader"
            className="inline-block bg-green-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition"
          >
            Become a Trader
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyx-bg">
      {/* Header */}
      <header className="bg-cyx-card/95 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/app" className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">Dashboard</h1>
                <p className="text-xs text-gray-500">{profile?.name || 'Trader'}</p>
              </div>
            </div>
            <button
              onClick={handleStatusToggle}
              disabled={profileLoading}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                profile?.online
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${profile?.online ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              {profile?.online ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Bond Balance Card - Professional Design */}
        <div className="relative overflow-hidden rounded-2xl mb-6">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a2a] via-[#1E2329] to-[#1E2329]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative p-6 border border-green-500/20 rounded-2xl">
            {/* Header with visibility toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Bond Balance</p>
                  <p className="text-xs text-green-500/80">USDT (TRC20)</p>
                </div>
              </div>
              <button
                onClick={toggleHideBalance}
                className="p-2 hover:bg-white/5 rounded-lg transition group"
                title={hideBalance ? 'Show balance' : 'Hide balance'}
              >
                {hideBalance ? (
                  <EyeOffIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-400" />
                ) : (
                  <EyeIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-400" />
                )}
              </button>
            </div>

            {/* Total Balance */}
            <div className="mb-6">
              <p className="text-4xl font-bold text-white tracking-tight">
                {formatAmount(bondAmount, 'USDT')}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Bond</p>
            </div>

            {/* Available / Locked - Inline Style */}
            <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Available</p>
                  <p className="text-lg font-semibold text-green-400">{formatAmount(bondAvailable)}</p>
                </div>
              </div>
              <div className="w-px h-10 bg-gray-800" />
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Locked</p>
                  <p className="text-lg font-semibold text-yellow-400">{formatAmount(bondLocked)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReceiveModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition shadow-lg shadow-green-500/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Deposit
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-cyx-card-hover text-white font-semibold rounded-xl hover:bg-[#3C4149] transition border border-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Stats - Professional Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-cyx-card rounded-xl p-4 border border-gray-800/50 hover:border-yellow-500/30 transition group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/20 transition">
                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {pendingTrades.length > 0 && (
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-bold text-white">{pendingTrades.length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Pending</p>
          </div>
          <div className="bg-cyx-card rounded-xl p-4 border border-gray-800/50 hover:border-blue-500/30 transition group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              {activeTrades.length > 0 && (
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-bold text-white">{activeTrades.length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Active</p>
          </div>
          <div className="bg-cyx-card rounded-xl p-4 border border-gray-800/50 hover:border-green-500/30 transition group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{profile?.completedCount || 0}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Completed</p>
          </div>
          <div className="bg-cyx-card rounded-xl p-4 border border-gray-800/50 hover:border-yellow-500/30 transition group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/20 transition">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{profile?.rating?.toFixed(1) || '5.0'}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Rating</p>
          </div>
        </div>

        {/* Quick Actions - Horizontal Scroll */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <Link
              to="/app/post-ad"
              className="flex-shrink-0 flex items-center gap-3 bg-gradient-to-r from-green-500/20 to-green-600/10 rounded-xl border border-green-500/30 px-4 py-3 hover:border-green-500/50 transition group"
            >
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Post Ad</p>
                <p className="text-xs text-gray-400">Create new offer</p>
              </div>
            </Link>
            <Link
              to="/app/payment-methods"
              className="flex-shrink-0 flex items-center gap-3 bg-cyx-card rounded-xl border border-gray-800/50 px-4 py-3 hover:border-blue-500/30 transition group"
            >
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Payments</p>
                <p className="text-xs text-gray-400">Manage methods</p>
              </div>
            </Link>
            <Link
              to="/app/history"
              className="flex-shrink-0 flex items-center gap-3 bg-cyx-card rounded-xl border border-gray-800/50 px-4 py-3 hover:border-purple-500/30 transition group"
            >
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">History</p>
                <p className="text-xs text-gray-400">View all trades</p>
              </div>
            </Link>
            <Link
              to="/app/settings"
              className="flex-shrink-0 flex items-center gap-3 bg-cyx-card rounded-xl border border-gray-800/50 px-4 py-3 hover:border-gray-500/30 transition group"
            >
              <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center group-hover:bg-gray-500/30 transition">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Settings</p>
                <p className="text-xs text-gray-400">Account options</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Trades Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Your Trades</h3>
          <Link to="/app/history" className="text-sm text-green-500 hover:text-green-400 transition">
            View All →
          </Link>
        </div>

        {/* Tabs - Professional Pill Style */}
        <div className="bg-cyx-card rounded-xl p-1 inline-flex gap-1 mb-6">
          {(['pending', 'active', 'completed'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'pending' && pendingTrades.length > 0 && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t
                    ? 'bg-white/20 text-white'
                    : 'bg-red-500 text-white'
                }`}>
                  {pendingTrades.length}
                </span>
              )}
              {t === 'active' && activeTrades.length > 0 && tab !== t && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Trade Lists */}
        {tradesLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {tab === 'pending' && (
              <div className="space-y-3">
                {pendingTrades.length === 0 ? (
                  <EmptyState
                    title="No pending requests"
                    description="New trade requests will appear here"
                    icon="pending"
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
              <div className="space-y-3">
                {activeTrades.length === 0 ? (
                  <EmptyState
                    title="No active trades"
                    description="Trades you accept will appear here"
                    icon="active"
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
              <div className="space-y-3">
                {completedTrades.length === 0 ? (
                  <EmptyState
                    title="No completed trades"
                    description="Completed trades will appear here"
                    icon="completed"
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

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-cyx-card rounded-2xl border border-gray-800/50 shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Deposit USDT</h3>
                  <p className="text-xs text-gray-500">Add funds to your bond</p>
                </div>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Network Badge */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">T</span>
                  </div>
                  <span className="text-green-400 font-medium text-sm">TRC20 Network</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-2xl p-5 mb-5 mx-auto w-52 h-52 flex items-center justify-center shadow-xl">
                <div className="text-center">
                  <svg className="w-28 h-28 text-gray-800 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <p className="text-xs text-gray-400 mt-2">Scan to deposit</p>
                </div>
              </div>

              {/* Address */}
              <div className="mb-5">
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Your Deposit Address</label>
                <div className="relative">
                  <div className="bg-cyx-bg rounded-xl px-4 py-3.5 text-white font-mono text-sm break-all pr-14 border border-gray-800/50">
                    {profile?.address || 'Loading...'}
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition ${
                      copied ? 'bg-green-500/20 text-green-400' : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {copied ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-400 mt-2 text-center">Address copied to clipboard!</p>
                )}
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-cyx-bg/50 rounded-xl p-3 text-center border border-gray-800/30">
                  <p className="text-lg font-bold text-white">10</p>
                  <p className="text-xs text-gray-500">Min USDT</p>
                </div>
                <div className="bg-cyx-bg/50 rounded-xl p-3 text-center border border-gray-800/30">
                  <p className="text-lg font-bold text-white">19</p>
                  <p className="text-xs text-gray-500">Confirms</p>
                </div>
                <div className="bg-cyx-bg/50 rounded-xl p-3 text-center border border-gray-800/30">
                  <p className="text-lg font-bold text-white">~2</p>
                  <p className="text-xs text-gray-500">Minutes</p>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">
                    Only send <span className="text-yellow-400 font-medium">USDT (TRC20)</span> to this address. Sending other tokens may result in permanent loss.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-cyx-card rounded-2xl border border-gray-800/50 shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Withdraw USDT</h3>
                  <p className="text-xs text-gray-500">TRC20 Network</p>
                </div>
              </div>
              <button onClick={() => setShowWithdrawModal(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Available Balance Card */}
              <div className="bg-gradient-to-r from-green-500/10 to-green-600/5 rounded-xl p-4 mb-6 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Available to Withdraw</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">{formatAmount(bondAvailable, 'USDT')}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Withdrawal Address */}
              <div className="mb-5">
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="T... (TRC20 Address)"
                  className="w-full px-4 py-3.5 bg-cyx-bg border border-gray-800/50 rounded-xl text-white placeholder-gray-600 focus:border-green-500/50 focus:outline-none font-mono text-sm transition"
                />
              </div>

              {/* Amount */}
              <div className="mb-6">
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3.5 bg-cyx-bg border border-gray-800/50 rounded-xl text-white text-xl font-bold placeholder-gray-600 focus:border-green-500/50 focus:outline-none pr-24 transition"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-gray-500 text-sm">USDT</span>
                    <button
                      onClick={() => setWithdrawAmount(bondAvailable.toString())}
                      className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded hover:bg-green-500/30 transition"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">Network fee: ~1 USDT</p>
                  <p className="text-xs text-gray-500">Min: 10 USDT</p>
                </div>
              </div>

              {/* Summary */}
              {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                <div className="bg-cyx-bg/50 rounded-xl p-4 mb-5 border border-gray-800/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">You will receive</span>
                    <span className="text-white font-semibold">
                      ~{Math.max(0, parseFloat(withdrawAmount) - 1).toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">
                    Withdrawing reduces your <span className="text-red-400 font-medium">trading capacity</span>. You won't be able to accept trades exceeding your available bond.
                  </p>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount || !withdrawAddress || parseFloat(withdrawAmount) < 10}
                className="w-full py-3.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                {isWithdrawing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Withdrawal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ title, description, icon }: { title: string; description: string; icon?: 'pending' | 'active' | 'completed' }) {
  const icons = {
    pending: (
      <svg className="w-8 h-8 text-yellow-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    active: (
      <svg className="w-8 h-8 text-blue-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    completed: (
      <svg className="w-8 h-8 text-green-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-cyx-card rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-800/50">
        {icon ? icons[icon] : (
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <p className="font-semibold text-white text-lg">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  )
}
