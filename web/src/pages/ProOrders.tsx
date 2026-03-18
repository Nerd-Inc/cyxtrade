import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useOrdersStore, type P2POrder } from '../store/pro'

export default function ProOrders() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { orders, isLoading, error, fetchOrders } = useOrdersStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<'buyer' | 'seller' | ''>('')

  useEffect(() => {
    fetchOrders({
      status: statusFilter || undefined,
      role: roleFilter || undefined
    })
  }, [statusFilter, roleFilter, fetchOrders])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

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
      case 'paid': return 'Paid'
      case 'releasing': return 'Releasing'
      case 'completed': return 'Completed'
      case 'disputed': return 'Disputed'
      case 'cancelled': return 'Cancelled'
      case 'expired': return 'Expired'
      default: return status
    }
  }

  const activeOrders = orders.filter(o => ['pending', 'payment_pending', 'paid', 'releasing'].includes(o.status))
  const completedOrders = orders.filter(o => ['completed', 'cancelled', 'expired', 'disputed'].includes(o.status))

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const diff = expiry - now

    if (diff <= 0) return 'Expired'

    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/app" className="flex items-center space-x-2">
                <img src="/logo.png" alt="CyxTrade" className="h-8 w-8" />
                <span className="text-xl font-bold text-teal-600">CyxTrade</span>
              </Link>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded">
                PRO
              </span>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/pro" className="text-gray-600 dark:text-gray-400 hover:text-teal-600">P2P</Link>
              <Link to="/pro/orders" className="text-teal-600 font-medium">Orders</Link>
              <Link to="/pro/wallet" className="text-gray-600 dark:text-gray-400 hover:text-teal-600">Wallet</Link>
              <Link to="/pro/post-ad" className="text-gray-600 dark:text-gray-400 hover:text-teal-600">Post Ad</Link>
            </nav>

            <div className="flex items-center gap-4">
              <Link to="/app" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm">
                Switch to Basic
              </Link>
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

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex gap-4 overflow-x-auto">
        <Link to="/pro" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">P2P</Link>
        <Link to="/pro/orders" className="text-teal-600 font-medium whitespace-nowrap">Orders</Link>
        <Link to="/pro/wallet" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Wallet</Link>
        <Link to="/pro/post-ad" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Post Ad</Link>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Orders</h1>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="payment_pending">Awaiting Payment</option>
                <option value="paid">Paid</option>
                <option value="releasing">Releasing</option>
                <option value="completed">Completed</option>
                <option value="disputed">Disputed</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as '' | 'buyer' | 'seller')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Roles</option>
                <option value="buyer">As Buyer</option>
                <option value="seller">As Seller</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No orders found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Start trading to see your orders here</p>
            <Link
              to="/pro"
              className="inline-block mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition"
            >
              Browse Ads
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Active Orders</h2>
                <div className="space-y-3">
                  {activeOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      userId={user?.id}
                      getStatusColor={getStatusColor}
                      getStatusLabel={getStatusLabel}
                      getTimeRemaining={getTimeRemaining}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Orders */}
            {completedOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Past Orders</h2>
                <div className="space-y-3">
                  {completedOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      userId={user?.id}
                      getStatusColor={getStatusColor}
                      getStatusLabel={getStatusLabel}
                      getTimeRemaining={getTimeRemaining}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

interface OrderCardProps {
  order: P2POrder
  userId?: string
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string) => string
  getTimeRemaining: (expiresAt: string) => string
}

function OrderCard({ order, userId, getStatusColor, getStatusLabel, getTimeRemaining }: OrderCardProps) {
  const navigate = useNavigate()
  const isBuyer = order.buyerUserId === userId
  const counterparty = isBuyer ? order.sellerName : order.buyerName
  const isActive = ['pending', 'payment_pending', 'paid', 'releasing'].includes(order.status)

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-teal-500 transition cursor-pointer"
      onClick={() => navigate(`/pro/order/${order.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-lg font-semibold text-gray-600 dark:text-gray-300">
            {counterparty?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{counterparty || 'Anonymous'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isBuyer ? 'Buying' : 'Selling'} {order.cryptoAmount.toFixed(4)} {order.asset}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-bold text-gray-900 dark:text-white">
            {order.fiatAmount.toLocaleString()} {order.fiatCurrency}
          </p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Price</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-white">
            {order.price.toLocaleString()} {order.fiatCurrency}/{order.asset}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Payment</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-white">{order.paymentMethod}</span>
        </div>
        {isActive && (
          <div className="ml-auto text-orange-500 font-medium">
            {getTimeRemaining(order.expiresAt)}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
        </span>
        <button
          className="text-teal-600 text-sm font-medium hover:text-teal-700"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/pro/order/${order.id}`)
          }}
        >
          View Details
        </button>
      </div>
    </div>
  )
}
