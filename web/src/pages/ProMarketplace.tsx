import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useAdsStore, useWalletStore, type P2PAd } from '../store/pro'

const CRYPTO_ASSETS = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC']
const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'XAF', 'AED', 'INR', 'PKR']
const PAYMENT_METHODS = ['Bank Transfer', 'Mobile Money', 'PayPal', 'Wise', 'Cash', 'Alipay', 'WeChat Pay']

export default function ProMarketplace() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { ads, isLoading, error, fetchAds, filters, setFilters } = useAdsStore()
  const { balances, fetchBalances } = useWalletStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [selectedAsset, setSelectedAsset] = useState('USDT')
  const [selectedFiat, setSelectedFiat] = useState('')
  const [selectedPayment, setSelectedPayment] = useState('')

  useEffect(() => {
    fetchAds({ type: tradeType, asset: selectedAsset, fiatCurrency: selectedFiat || undefined, paymentMethod: selectedPayment || undefined })
    fetchBalances()
  }, [tradeType, selectedAsset, selectedFiat, selectedPayment, fetchAds, fetchBalances])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  const handleTradeClick = (ad: P2PAd) => {
    navigate(`/pro/trade/${ad.id}`)
  }

  // Get user's balance for the selected asset
  const userBalance = balances.find(b => b.asset === selectedAsset)

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
              <Link to="/pro" className="text-teal-600 font-medium">P2P</Link>
              <Link to="/pro/orders" className="text-gray-600 dark:text-gray-400 hover:text-teal-600">Orders</Link>
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
        <Link to="/pro" className="text-teal-600 font-medium whitespace-nowrap">P2P</Link>
        <Link to="/pro/orders" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Orders</Link>
        <Link to="/pro/wallet" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Wallet</Link>
        <Link to="/pro/post-ad" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Post Ad</Link>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Balance Banner */}
        {userBalance && (
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm">Available {selectedAsset}</p>
                <p className="text-2xl font-bold">{userBalance.available.toFixed(4)}</p>
                <p className="text-teal-100 text-xs">Locked: {userBalance.locked.toFixed(4)}</p>
              </div>
              <Link
                to="/pro/wallet"
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Manage Wallet
              </Link>
            </div>
          </div>
        )}

        {/* Buy/Sell Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTradeType('buy')}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              tradeType === 'buy'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setTradeType('sell')}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              tradeType === 'sell'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Asset Select */}
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Crypto
              </label>
              <div className="flex gap-2 flex-wrap">
                {CRYPTO_ASSETS.map(asset => (
                  <button
                    key={asset}
                    onClick={() => setSelectedAsset(asset)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      selectedAsset === asset
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            </div>

            {/* Fiat Currency */}
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Fiat Currency
              </label>
              <select
                value={selectedFiat}
                onChange={(e) => setSelectedFiat(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Currencies</option>
                {FIAT_CURRENCIES.map(fiat => (
                  <option key={fiat} value={fiat}>{fiat}</option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Payment Method
              </label>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Methods</option>
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
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

        {/* Ads List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No ads found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your filters</p>
            <Link
              to="/pro/post-ad"
              className="inline-block mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition"
            >
              Post an Ad
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map(ad => (
              <div
                key={ad.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-teal-500 transition cursor-pointer"
                onClick={() => handleTradeClick(ad)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Trader Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-lg font-semibold text-gray-600 dark:text-gray-300">
                      {ad.traderName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{ad.traderName || 'Anonymous'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{ad.completedCount} orders</span>
                        <span className="text-green-500">{(ad.completionRate * 100).toFixed(0)}% completion</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Amount */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {ad.price.toLocaleString()} {ad.fiatCurrency}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">per {ad.asset}</p>
                  </div>
                </div>

                {/* Details Row */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Available</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {ad.availableAmount.toFixed(2)} {ad.asset}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Limit</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {ad.minAmount.toLocaleString()} - {ad.maxAmount.toLocaleString()} {ad.fiatCurrency}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {ad.paymentMethods.slice(0, 3).map(method => (
                      <span
                        key={method}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                      >
                        {method}
                      </span>
                    ))}
                    {ad.paymentMethods.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                        +{ad.paymentMethods.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Trade Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    className={`px-6 py-2 rounded-lg font-medium ${
                      tradeType === 'buy'
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTradeClick(ad)
                    }}
                  >
                    {tradeType === 'buy' ? 'Buy' : 'Sell'} {ad.asset}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
