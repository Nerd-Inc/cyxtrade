import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useWalletStore, type Asset, type WalletBalance, type Transaction } from '../store/pro'

export default function ProWallet() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const {
    assets,
    balances,
    transactions,
    isLoading,
    error,
    fetchAssets,
    fetchBalances,
    fetchTransactions,
    fetchDepositAddress,
    requestWithdrawal,
    cancelWithdrawal,
    initWallet,
    clearError
  } = useWalletStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>('overview')
  const [selectedAsset, setSelectedAsset] = useState<string>('USDT')
  const [depositAddress, setDepositAddress] = useState<string | null>(null)
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', address: '', network: 'TRC20' })
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  useEffect(() => {
    fetchAssets()
    fetchBalances()
    fetchTransactions()
  }, [fetchAssets, fetchBalances, fetchTransactions])

  useEffect(() => {
    if (activeTab === 'deposit' && selectedAsset) {
      loadDepositAddress()
    }
  }, [activeTab, selectedAsset])

  const loadDepositAddress = async () => {
    const result = await fetchDepositAddress(selectedAsset)
    if (result) {
      setDepositAddress(result.address)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  const handleInitWallet = async (asset: string) => {
    await initWallet(asset)
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!withdrawForm.amount || !withdrawForm.address) return

    setWithdrawLoading(true)
    clearError()

    const success = await requestWithdrawal({
      asset: selectedAsset,
      amount: parseFloat(withdrawForm.amount),
      address: withdrawForm.address,
      network: withdrawForm.network
    })

    setWithdrawLoading(false)
    if (success) {
      setWithdrawSuccess(true)
      setWithdrawForm({ amount: '', address: '', network: 'TRC20' })
      setTimeout(() => setWithdrawSuccess(false), 3000)
    }
  }

  const handleCancelWithdrawal = async (txId: string) => {
    if (confirm('Are you sure you want to cancel this withdrawal?')) {
      await cancelWithdrawal(txId)
    }
  }

  const totalBalance = balances.reduce((sum, b) => sum + b.total, 0)
  const currentBalance = balances.find(b => b.asset === selectedAsset)
  const assetInfo = assets.find(a => a.symbol === selectedAsset)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-50 dark:bg-green-900/20'
      case 'pending': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'failed': return 'text-red-500 bg-red-50 dark:bg-red-900/20'
      case 'cancelled': return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20'
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Deposit'
      case 'withdrawal': return 'Withdrawal'
      case 'escrow_lock': return 'Escrow Lock'
      case 'escrow_release': return 'Escrow Release'
      case 'escrow_refund': return 'Escrow Refund'
      case 'fee': return 'Fee'
      default: return type
    }
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
              <Link to="/pro/orders" className="text-gray-600 dark:text-gray-400 hover:text-teal-600">Orders</Link>
              <Link to="/pro/wallet" className="text-teal-600 font-medium">Wallet</Link>
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
        <Link to="/pro/orders" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Orders</Link>
        <Link to="/pro/wallet" className="text-teal-600 font-medium whitespace-nowrap">Wallet</Link>
        <Link to="/pro/post-ad" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Post Ad</Link>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Total Balance */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-6 mb-6">
          <p className="text-purple-200 text-sm">Estimated Total Balance</p>
          <p className="text-3xl font-bold mt-1">${totalBalance.toFixed(2)} USD</p>
          <p className="text-purple-200 text-xs mt-2">
            Across {balances.length} assets
          </p>
        </div>

        {/* Asset Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {assets.filter(a => !a.isFiat).map(asset => {
              const balance = balances.find(b => b.asset === asset.symbol)
              return (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedAsset === asset.symbol
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{asset.symbol}</span>
                  {balance && (
                    <span className="ml-2 text-xs opacity-75">{balance.total.toFixed(4)}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Asset Balance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedAsset} Wallet</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{assetInfo?.name || selectedAsset}</p>
            </div>
            {!currentBalance && (
              <button
                onClick={() => handleInitWallet(selectedAsset)}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition"
              >
                Initialize Wallet
              </button>
            )}
          </div>

          {currentBalance ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Available</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {currentBalance.available.toFixed(4)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Locked</p>
                <p className="text-xl font-bold text-yellow-600 mt-1">
                  {currentBalance.locked.toFixed(4)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-xl font-bold text-teal-600 mt-1">
                  {currentBalance.total.toFixed(4)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Initialize your {selectedAsset} wallet to start trading
            </p>
          )}
        </div>

        {/* Action Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'deposit', 'withdraw', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl font-medium text-sm transition ${
                activeTab === tab
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
            <button onClick={clearError} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">All Balances</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
              </div>
            ) : balances.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No wallets initialized yet
              </p>
            ) : (
              <div className="space-y-3">
                {balances.map(balance => (
                  <div
                    key={balance.asset}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                        {balance.asset.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{balance.asset}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {assets.find(a => a.symbol === balance.asset)?.name || balance.asset}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">{balance.total.toFixed(4)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {balance.locked > 0 && `${balance.locked.toFixed(4)} locked`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Deposit {selectedAsset}
            </h3>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg mb-4 text-sm">
              Only send {selectedAsset} to this address. Sending other assets may result in permanent loss.
            </div>

            {depositAddress ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    {selectedAsset} Deposit Address
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white break-all">
                      {depositAddress}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(depositAddress)}
                      className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {assetInfo && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>Network: {assetInfo.network}</p>
                    <p>Minimum deposit: {assetInfo.minDeposit} {selectedAsset}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Deposit address not yet generated
                </p>
                <button
                  onClick={loadDepositAddress}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700"
                >
                  Generate Address
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Withdraw {selectedAsset}
            </h3>

            {withdrawSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
                Withdrawal request submitted successfully!
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.0000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawForm(f => ({ ...f, amount: (currentBalance?.available || 0).toString() }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 text-sm font-medium"
                  >
                    MAX
                  </button>
                </div>
                {currentBalance && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Available: {currentBalance.available.toFixed(4)} {selectedAsset}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Withdrawal Address
                </label>
                <input
                  type="text"
                  value={withdrawForm.address}
                  onChange={(e) => setWithdrawForm(f => ({ ...f, address: e.target.value }))}
                  placeholder={`Enter ${selectedAsset} address`}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Network
                </label>
                <select
                  value={withdrawForm.network}
                  onChange={(e) => setWithdrawForm(f => ({ ...f, network: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="TRC20">TRC20 (Tron)</option>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="BEP20">BEP20 (BSC)</option>
                </select>
              </div>

              {assetInfo && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Fee</span>
                    <span className="text-gray-900 dark:text-white">{assetInfo.withdrawalFee} {selectedAsset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Minimum</span>
                    <span className="text-gray-900 dark:text-white">{assetInfo.minWithdrawal} {selectedAsset}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={withdrawLoading || !withdrawForm.amount || !withdrawForm.address}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {withdrawLoading ? 'Processing...' : 'Withdraw'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Transaction History
            </h3>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type.includes('deposit') || tx.type.includes('release') || tx.type.includes('refund')
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                      }`}>
                        {tx.type.includes('deposit') || tx.type.includes('release') || tx.type.includes('refund') ? '+' : '-'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getTypeLabel(tx.type)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.type.includes('deposit') || tx.type.includes('release') || tx.type.includes('refund')
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {tx.type.includes('deposit') || tx.type.includes('release') || tx.type.includes('refund') ? '+' : '-'}
                        {tx.amount.toFixed(4)} {tx.asset}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                      {tx.status === 'pending' && tx.type === 'withdrawal' && (
                        <button
                          onClick={() => handleCancelWithdrawal(tx.id)}
                          className="ml-2 text-xs text-red-500 underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
