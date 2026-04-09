import { useEffect, useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useWalletStore, type Asset } from '../store/pro'
import { DarkModeContext } from '../App'
import TOTPVerificationModal from '../components/TOTPVerificationModal'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const TOTP_REQUIRED_CODE = 2006

type AssetView = 'coin' | 'account'
type SortField = 'coin' | 'amount' | 'price' | 'pnl'
type SortDirection = 'asc' | 'desc'

interface AssetData {
  symbol: string
  name: string
  icon: string
  amount: number
  usdValue: number
  price: number
  costPrice: number
  todayPnl: number
  color: string
}

const ASSET_COLORS: Record<string, string> = {
  USDT: 'bg-emerald-500',
  BTC: 'bg-orange-400',
  ETH: 'bg-indigo-500',
  TRX: 'bg-red-500',
  SOL: 'bg-purple-500',
}

export default function ProWallet() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const darkMode = useContext(DarkModeContext)
  const {
    assets,
    balances,
    isLoading,
    error,
    fetchAssets,
    fetchBalances,
    fetchDepositAddress,
    requestWithdrawal,
    clearError
  } = useWalletStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [balanceCurrency, setBalanceCurrency] = useState<'BTC' | 'USD' | 'ETH'>('BTC')
  const [assetView, setAssetView] = useState<AssetView>('coin')
  const [hideSmallAssets, setHideSmallAssets] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [sortField, setSortField] = useState<SortField>('amount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null)

  // Modal states
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | 'transfer' | 'history' | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<string>('USDT')
  const [depositAddress, setDepositAddress] = useState<string | null>(null)
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', address: '', network: 'TRC20' })
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  // TOTP verification state
  const [showTotpModal, setShowTotpModal] = useState(false)
  const [pendingWithdraw, setPendingWithdraw] = useState<{ asset: string; amount: number; address: string; network: string } | null>(null)

  useEffect(() => {
    fetchAssets()
    fetchBalances()
  }, [fetchAssets, fetchBalances])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  // Derive asset list from real wallet balances
  const walletAssets: AssetData[] = balances.map(b => {
    const assetInfo = assets.find(a => a.symbol === b.asset)
    return {
      symbol: b.asset,
      name: assetInfo?.name || b.asset,
      icon: b.asset[0],
      amount: b.total,
      usdValue: b.total, // Approximate: USDT≈1:1, others need price feed
      price: b.asset === 'USDT' ? 1 : 0,
      costPrice: 0,
      todayPnl: 0,
      color: ASSET_COLORS[b.asset] || 'bg-gray-500',
    }
  })

  // Calculate totals from real balances
  const totalUsdValue = walletAssets.reduce((sum, a) => sum + a.usdValue, 0)
  const totalBtcValue = totalUsdValue > 0 ? totalUsdValue / 70000 : 0
  const totalEthValue = totalUsdValue > 0 ? totalUsdValue / 2500 : 0
  const todayTotalPnl = 0
  const todayPnlPercent = 0

  const getBalanceDisplay = () => {
    if (balanceHidden) return '********'
    switch (balanceCurrency) {
      case 'BTC': return totalBtcValue.toFixed(8)
      case 'ETH': return totalEthValue.toFixed(8)
      case 'USD': return totalUsdValue.toFixed(2)
    }
  }

  const getBalanceUsd = () => {
    if (balanceHidden) return '********'
    return `$${totalUsdValue.toFixed(2)}`
  }

  // Filter and sort assets
  const filteredAssets = walletAssets
    .filter(a => {
      if (hideSmallAssets && a.usdValue < 1) return false
      if (searchQuery && !a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'coin': comparison = a.symbol.localeCompare(b.symbol); break
        case 'amount': comparison = a.usdValue - b.usdValue; break
        case 'price': comparison = a.price - b.price; break
        case 'pnl': comparison = a.todayPnl - b.todayPnl; break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    <svg className={`w-3 h-3 ml-1 inline ${sortField === field ? 'text-yellow-500' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 8l5-5 5 5H5zM5 12l5 5 5-5H5z" />
    </svg>
  )

  // Mini sparkline chart SVG
  const Sparkline = () => (
    <svg className="w-32 h-12" viewBox="0 0 128 48">
      <path
        d="M0,40 L8,35 L16,38 L24,30 L32,32 L40,25 L48,28 L56,20 L64,22 L72,15 L80,18 L88,12 L96,15 L104,8 L112,10 L120,5 L128,8"
        fill="none"
        stroke="#F0B90B"
        strokeWidth="2"
      />
    </svg>
  )

  const loadDepositAddress = async () => {
    const result = await fetchDepositAddress(selectedAsset)
    if (result) {
      setDepositAddress(result.address)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!withdrawForm.amount || !withdrawForm.address) return
    setWithdrawLoading(true)
    clearError()

    const withdrawData = {
      asset: selectedAsset,
      amount: parseFloat(withdrawForm.amount),
      address: withdrawForm.address,
      network: withdrawForm.network
    }

    const result = await requestWithdrawal(withdrawData)
    setWithdrawLoading(false)

    if (result.success) {
      setWithdrawForm({ amount: '', address: '', network: 'TRC20' })
      setActiveModal(null)
    } else if (result.errorCode === TOTP_REQUIRED_CODE) {
      // TOTP required - save pending withdrawal and show modal
      setPendingWithdraw(withdrawData)
      setShowTotpModal(true)
    }
  }

  const handleTotpVerified = async () => {
    setShowTotpModal(false)

    // Retry the withdrawal after TOTP verification
    if (pendingWithdraw) {
      setWithdrawLoading(true)
      clearError()
      const result = await requestWithdrawal(pendingWithdraw)
      setWithdrawLoading(false)

      if (result.success) {
        setWithdrawForm({ amount: '', address: '', network: 'TRC20' })
        setActiveModal(null)
        setPendingWithdraw(null)
      }
    }
  }

  const verifyTotpForWithdrawal = async (code: string): Promise<boolean> => {
    const token = useAuthStore.getState().token
    try {
      const res = await fetch(`${API_URL}/totp/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, operation: 'withdrawal' }),
      })
      const data = await res.json()
      return res.ok && data.data?.valid
    } catch {
      return false
    }
  }

  return (
    <div className="min-h-screen bg-cyx-bg text-white">
      {/* Balance Header */}
      <div className="px-6 py-8 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400 text-sm">Estimated Balance</span>
                <button onClick={() => setBalanceHidden(!balanceHidden)} className="text-gray-400 hover:text-white">
                  {balanceHidden ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold">{getBalanceDisplay()}</span>
                <button
                  onClick={() => setBalanceCurrency(c => c === 'BTC' ? 'USD' : c === 'USD' ? 'ETH' : 'BTC')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white text-sm"
                >
                  {balanceCurrency}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <div className="text-gray-400 text-sm mt-1">
                {balanceCurrency !== 'USD' && <span>≈ {getBalanceUsd()}</span>}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-400 text-sm underline decoration-dotted cursor-help">Today's PnL</span>
                <span className={`text-sm ${todayTotalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {balanceHidden ? '********' : `${todayTotalPnl >= 0 ? '+' : ''} $${todayTotalPnl.toFixed(2)}(${todayPnlPercent >= 0 ? '+' : ''}${todayPnlPercent.toFixed(2)}%)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Sparkline />
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveModal('deposit')}
                  className="px-4 py-2 bg-cyx-card-hover hover:bg-[#3C4149] rounded text-sm font-medium"
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveModal('withdraw')}
                  className="px-4 py-2 bg-cyx-card-hover hover:bg-[#3C4149] rounded text-sm font-medium"
                >
                  Withdraw
                </button>
                <button
                  onClick={() => setActiveModal('transfer')}
                  className="px-4 py-2 bg-cyx-card-hover hover:bg-[#3C4149] rounded text-sm font-medium"
                >
                  Transfer
                </button>
                <button
                  onClick={() => setActiveModal('history')}
                  className="px-4 py-2 bg-cyx-card-hover hover:bg-[#3C4149] rounded text-sm font-medium"
                >
                  History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Assets Section */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">My Assets</h2>

          {/* View Tabs and Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-6">
              <button
                onClick={() => setAssetView('coin')}
                className={`pb-2 text-sm font-medium ${assetView === 'coin' ? 'text-white border-b-2 border-yellow-500' : 'text-gray-400 hover:text-white'}`}
              >
                Coin View
              </button>
              <button
                onClick={() => setAssetView('account')}
                className={`pb-2 text-sm font-medium ${assetView === 'account' ? 'text-white border-b-2 border-yellow-500' : 'text-gray-400 hover:text-white'}`}
              >
                Account View
              </button>
            </div>

            <div className="flex items-center gap-4">
              {showSearch ? (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search coin..."
                    className="w-48 px-3 py-1.5 bg-cyx-card-hover rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    autoFocus
                    onBlur={() => !searchQuery && setShowSearch(false)}
                  />
                </div>
              ) : (
                <button onClick={() => setShowSearch(true)} className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}

              <button className="flex items-center gap-1 text-gray-400 hover:text-white text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Small Amount Exchange
              </button>

              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideSmallAssets}
                  onChange={(e) => setHideSmallAssets(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-transparent text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0"
                />
                Hide assets &lt;1 USD
              </label>
            </div>
          </div>

          {/* Assets Table */}
          <div className="bg-cyx-card rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm text-gray-400 border-b border-gray-800">
              <div className="col-span-3">
                <button onClick={() => handleSort('coin')} className="flex items-center hover:text-white">
                  Coin <SortIcon field="coin" />
                </button>
              </div>
              <div className="col-span-3 text-right">
                <button onClick={() => handleSort('amount')} className="flex items-center justify-end hover:text-white ml-auto">
                  Amount <SortIcon field="amount" />
                </button>
              </div>
              <div className="col-span-3 text-right">
                <span className="flex items-center justify-end">
                  Coin Price / Cost Price
                  <svg className="w-4 h-4 ml-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <div className="col-span-2 text-right">
                <button onClick={() => handleSort('pnl')} className="flex items-center justify-end hover:text-white ml-auto">
                  Today's PnL <SortIcon field="pnl" />
                </button>
              </div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Body */}
            {filteredAssets.map((asset) => (
              <div key={asset.symbol}>
                <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-cyx-card-hover transition-colors">
                  {/* Coin */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className={`w-8 h-8 ${asset.color} rounded-full flex items-center justify-center text-sm font-bold text-white`}>
                      {asset.icon}
                    </div>
                    <div>
                      <p className="font-medium text-white">{asset.symbol}</p>
                      <p className="text-xs text-gray-400">{asset.name}</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="col-span-3 text-right">
                    <p className="text-white">{balanceHidden ? '********' : asset.amount.toFixed(8)}</p>
                    <p className="text-xs text-gray-400">{balanceHidden ? '****' : `$${asset.usdValue.toFixed(2)}`}</p>
                  </div>

                  {/* Price / Cost */}
                  <div className="col-span-3 text-right">
                    <p className="text-white">${asset.price < 1 ? asset.price.toFixed(2) : asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-400">
                      {asset.costPrice > 0 ? `$${asset.costPrice < 1 ? asset.costPrice.toFixed(2) : asset.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
                    </p>
                  </div>

                  {/* Today's PnL */}
                  <div className="col-span-2 text-right">
                    {asset.todayPnl !== 0 ? (
                      <span className={asset.todayPnl > 0 ? 'text-green-500' : 'text-red-500'}>
                        {balanceHidden ? '****' : `${asset.todayPnl > 0 ? '+' : ''} $${asset.todayPnl.toFixed(2)}`}
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </div>

                  {/* Expand */}
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => setExpandedAsset(expandedAsset === asset.symbol ? null : asset.symbol)}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className={`w-5 h-5 transition-transform ${expandedAsset === asset.symbol ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedAsset === asset.symbol && (
                  <div className="px-4 py-4 bg-cyx-card-hover border-t border-gray-800">
                    <div className="flex gap-4">
                      <button
                        onClick={() => { setSelectedAsset(asset.symbol); setActiveModal('deposit'); }}
                        className="px-4 py-2 bg-yellow-500 text-black rounded text-sm font-medium hover:bg-yellow-400"
                      >
                        Deposit
                      </button>
                      <button
                        onClick={() => { setSelectedAsset(asset.symbol); setActiveModal('withdraw'); }}
                        className="px-4 py-2 bg-[#3C4149] text-white rounded text-sm font-medium hover:bg-[#4C5159]"
                      >
                        Withdraw
                      </button>
                      <button className="px-4 py-2 bg-[#3C4149] text-white rounded text-sm font-medium hover:bg-[#4C5159]">
                        Trade
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredAssets.length === 0 && (
              <div className="py-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-400">No assets found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {activeModal === 'deposit' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setActiveModal(null)}>
          <div className="bg-cyx-card rounded-lg w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Deposit {selectedAsset}</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Select Coin</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-3 py-2 bg-cyx-card-hover rounded text-white border border-gray-600 focus:border-yellow-500 focus:outline-none"
                >
                  {mockAssets.map(a => (
                    <option key={a.symbol} value={a.symbol}>{a.symbol} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <p className="text-yellow-500 text-sm">Only send {selectedAsset} to this address. Sending other assets may result in permanent loss.</p>
              </div>

              {depositAddress ? (
                <div className="bg-cyx-card-hover rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Deposit Address</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm break-all">{depositAddress}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(depositAddress)}
                      className="px-3 py-1.5 bg-yellow-500 text-black rounded text-xs font-medium hover:bg-yellow-400"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={loadDepositAddress}
                  className="w-full py-3 bg-yellow-500 text-black rounded font-medium hover:bg-yellow-400"
                >
                  Generate Deposit Address
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {activeModal === 'withdraw' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setActiveModal(null)}>
          <div className="bg-cyx-card rounded-lg w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Withdraw {selectedAsset}</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleWithdraw} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Select Coin</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-3 py-2 bg-cyx-card-hover rounded text-white border border-gray-600 focus:border-yellow-500 focus:outline-none"
                >
                  {mockAssets.map(a => (
                    <option key={a.symbol} value={a.symbol}>{a.symbol} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Network</label>
                <select
                  value={withdrawForm.network}
                  onChange={(e) => setWithdrawForm(f => ({ ...f, network: e.target.value }))}
                  className="w-full px-3 py-2 bg-cyx-card-hover rounded text-white border border-gray-600 focus:border-yellow-500 focus:outline-none"
                >
                  <option value="TRC20">TRC20 (Tron)</option>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="BEP20">BEP20 (BSC)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Address</label>
                <input
                  type="text"
                  value={withdrawForm.address}
                  onChange={(e) => setWithdrawForm(f => ({ ...f, address: e.target.value }))}
                  placeholder={`Enter ${selectedAsset} address`}
                  className="w-full px-3 py-2 bg-cyx-card-hover rounded text-white border border-gray-600 focus:border-yellow-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.0000"
                    className="w-full px-3 py-2 bg-cyx-card-hover rounded text-white border border-gray-600 focus:border-yellow-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const asset = mockAssets.find(a => a.symbol === selectedAsset)
                      if (asset) setWithdrawForm(f => ({ ...f, amount: asset.amount.toString() }))
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500 text-sm font-medium"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="bg-cyx-card-hover rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Network Fee</span>
                  <span>1.00 USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Minimum Withdrawal</span>
                  <span>10.00 USDT</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={withdrawLoading || !withdrawForm.amount || !withdrawForm.address}
                className="w-full py-3 bg-yellow-500 text-black rounded font-medium hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawLoading ? 'Processing...' : 'Withdraw'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {activeModal === 'transfer' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setActiveModal(null)}>
          <div className="bg-cyx-card rounded-lg w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Transfer</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-400 text-center py-8">Transfer between accounts coming soon</p>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {activeModal === 'history' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setActiveModal(null)}>
          <div className="bg-cyx-card rounded-lg w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Transaction History</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-400">No transactions yet</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <span>{error}</span>
          <button onClick={clearError} className="hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* TOTP Verification Modal */}
      <TOTPVerificationModal
        isOpen={showTotpModal}
        onClose={() => {
          setShowTotpModal(false)
          setPendingWithdraw(null)
        }}
        onVerified={handleTotpVerified}
        onSubmit={verifyTotpForWithdrawal}
        operation="withdrawal"
        title="Verify Withdrawal"
        description="Enter your 2FA code to confirm this withdrawal."
      />
    </div>
  )
}
