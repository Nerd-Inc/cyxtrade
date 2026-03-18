import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

type MarketMetric = 'rate' | 'pnl' | 'snl'

type MarketPair = {
  from: string
  to: string
  label: string
}

type TraderCorridor = {
  from: string
  to: string
  rate?: number
  buyRate?: number
  sellRate?: number
}

type TraderApi = {
  corridors?: TraderCorridor[]
}

type TradersApiResponse = {
  data?: {
    traders?: TraderApi[]
  }
}

type MarketRateApiResponse = {
  data?: {
    rate?: number
  }
}

type MarketSnapshot = {
  pair: string
  rate: number
  previousRate: number
  bestRate: number
  worstRate: number
  pnl: number
  snl: number
  traderCount: number
  updatedAt: string
  source: 'trader' | 'market' | 'simulated'
  sessionOpen: number
}

const DEFAULT_MARKET_PAIRS: MarketPair[] = [
  { from: 'AED', to: 'XAF', label: 'UAE Dirham / CFA Franc' },
  { from: 'USD', to: 'XAF', label: 'US Dollar / CFA Franc' },
  { from: 'EUR', to: 'XAF', label: 'Euro / CFA Franc' },
  { from: 'GBP', to: 'XAF', label: 'British Pound / CFA Franc' },
]

const COMMON_CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'XAF', 'NGN', 'KES', 'GHS', 'MAD', 'SAR', 'QAR', 'EGP', 'INR', 'PKR', 'TRY']

const BASE_SIM_RATES: Record<string, number> = {
  'AED/XAF': 152.8,
  'USD/XAF': 602.1,
  'EUR/XAF': 658.4,
  'GBP/XAF': 771.9,
}

const pairKey = (from: string, to: string) => `${from}/${to}`

const calcPnl = (rate: number, reference: number): number => {
  if (!Number.isFinite(rate) || !Number.isFinite(reference) || reference === 0) return 0
  return ((rate - reference) / reference) * 100
}

const calcSnl = (bestRate: number, worstRate: number): number => {
  if (!Number.isFinite(bestRate) || !Number.isFinite(worstRate) || bestRate === 0) return 0
  return ((bestRate - worstRate) / bestRate) * 100
}

const toRate = (corridor: TraderCorridor): number | null => {
  if (typeof corridor.rate === 'number') return corridor.rate
  if (typeof corridor.buyRate === 'number' && typeof corridor.sellRate === 'number') {
    return (corridor.buyRate + corridor.sellRate) / 2
  }
  if (typeof corridor.buyRate === 'number') return corridor.buyRate
  if (typeof corridor.sellRate === 'number') return corridor.sellRate
  return null
}

export default function AppHome() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [marketData, setMarketData] = useState<Record<string, MarketSnapshot>>({})
  const [isMarketLoading, setIsMarketLoading] = useState(true)
  const [selectedPair, setSelectedPair] = useState(pairKey('AED', 'XAF'))
  const [compareMetric, setCompareMetric] = useState<MarketMetric>('rate')
  const [marketPairs, setMarketPairs] = useState<MarketPair[]>(DEFAULT_MARKET_PAIRS)
  const [baseCurrency, setBaseCurrency] = useState('AED')
  const [quoteCurrency, setQuoteCurrency] = useState('XAF')
  const marketDataRef = useRef<Record<string, MarketSnapshot>>({})

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  useEffect(() => {
    marketDataRef.current = marketData
  }, [marketData])

  useEffect(() => {
    const exists = marketPairs.some((pair) => pairKey(pair.from, pair.to) === selectedPair)
    if (!exists && marketPairs.length > 0) {
      setSelectedPair(pairKey(marketPairs[0].from, marketPairs[0].to))
    }
  }, [marketPairs, selectedPair])

  const addMarketPair = () => {
    const from = baseCurrency.trim().toUpperCase()
    const to = quoteCurrency.trim().toUpperCase()
    if (!from || !to || from === to) return

    const exists = marketPairs.some((pair) => pair.from === from && pair.to === to)
    if (exists) {
      setSelectedPair(pairKey(from, to))
      return
    }

    setMarketPairs((prev) => [...prev, { from, to, label: `${from} / ${to}` }])
    setSelectedPair(pairKey(from, to))
  }

  const removeMarketPair = (key: string) => {
    setMarketPairs((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((pair) => pairKey(pair.from, pair.to) !== key)
    })
  }

  useEffect(() => {
    let mounted = true
    const loadMarket = async () => {
      try {
        const currentData = marketDataRef.current
        const results = await Promise.all(
          marketPairs.map(async (pair) => {
            const key = pairKey(pair.from, pair.to)
            const current = currentData[key]

            try {
              const res = await fetch(`/api/traders?from=${pair.from}&to=${pair.to}&online=true&limit=50`)
              const payload = (await res.json()) as TradersApiResponse
              const traders = payload?.data?.traders || []

              const rates = traders
                .flatMap((trader) => trader.corridors || [])
                .filter((corridor) => corridor.from === pair.from && corridor.to === pair.to)
                .map((corridor) => toRate(corridor))
                .filter((rate): rate is number => typeof rate === 'number' && Number.isFinite(rate))

              if (rates.length > 0) {
                const batchBestRate = Math.max(...rates)
                const batchWorstRate = Math.min(...rates)
                const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length
                const previousRate = current?.rate ?? averageRate
                const sessionOpen = current?.sessionOpen ?? averageRate
                const bestRate = current ? Math.max(current.bestRate, batchBestRate) : batchBestRate
                const worstRate = current ? Math.min(current.worstRate, batchWorstRate) : batchWorstRate
                const pnl = calcPnl(averageRate, previousRate)
                const snl = calcSnl(bestRate, worstRate)

                return {
                  pair: key,
                  rate: averageRate,
                  previousRate,
                  bestRate,
                  worstRate,
                  pnl,
                  snl,
                  traderCount: rates.length,
                  updatedAt: new Date().toISOString(),
                  source: 'trader' as const,
                  sessionOpen,
                }
              }
            } catch {
              // Try market feed fallback below.
            }

            try {
              const marketRes = await fetch(`/api/market/rate?from=${pair.from}&to=${pair.to}`)
              const marketPayload = (await marketRes.json()) as MarketRateApiResponse
              const marketRate = marketPayload?.data?.rate
              if (marketRes.ok && typeof marketRate === 'number' && Number.isFinite(marketRate) && marketRate > 0) {
                const previousRate = current?.rate ?? marketRate
                const sessionOpen = current?.sessionOpen ?? marketRate
                const bestRate = current ? Math.max(current.bestRate, marketRate) : marketRate
                const worstRate = current ? Math.min(current.worstRate, marketRate) : marketRate
                const pnl = calcPnl(marketRate, previousRate)
                const snl = calcSnl(bestRate, worstRate)

                return {
                  pair: key,
                  rate: marketRate,
                  previousRate,
                  bestRate,
                  worstRate,
                  pnl,
                  snl,
                  traderCount: 0,
                  updatedAt: new Date().toISOString(),
                  source: 'market' as const,
                  sessionOpen,
                }
              }
            } catch {
              // Fall back to simulated movement when market API is unavailable.
            }

            const previousRate = current?.rate ?? BASE_SIM_RATES[key] ?? 100
            const drift = (Math.random() - 0.5) * 0.004
            const rate = previousRate * (1 + drift)
            const sessionOpen = current?.sessionOpen ?? previousRate
            const spotBestRate = rate + rate * 0.002
            const spotWorstRate = rate - rate * 0.002
            const bestRate = current ? Math.max(current.bestRate, spotBestRate) : spotBestRate
            const worstRate = current ? Math.min(current.worstRate, spotWorstRate) : spotWorstRate
            const pnl = calcPnl(rate, previousRate)
            const snl = calcSnl(bestRate, worstRate)

            return {
              pair: key,
              rate,
              previousRate,
              bestRate,
              worstRate,
              pnl,
              snl,
              traderCount: 0,
              updatedAt: new Date().toISOString(),
              source: 'simulated' as const,
              sessionOpen,
            }
          })
        )

        if (mounted) {
          setMarketData(Object.fromEntries(results.map((item) => [item.pair, item])))
          setIsMarketLoading(false)
        }
      } catch {
        if (mounted) {
          setIsMarketLoading(false)
        }
      }
    }

    loadMarket()
    const intervalId = window.setInterval(loadMarket, 3000)
    return () => {
      mounted = false
      window.clearInterval(intervalId)
    }
  }, [marketPairs])

  const snapshots = useMemo(() => {
    return marketPairs
      .map((pair) => marketData[pairKey(pair.from, pair.to)])
      .filter((snapshot): snapshot is MarketSnapshot => Boolean(snapshot))
  }, [marketData, marketPairs])

  const selectedSnapshot = marketData[selectedPair] || snapshots[0]

  const rankedSnapshots = useMemo(() => {
    const list = [...snapshots]
    if (compareMetric === 'snl') {
      return list.sort((a, b) => a.snl - b.snl)
    }
    if (compareMetric === 'pnl') {
      return list.sort((a, b) => b.pnl - a.pnl)
    }
    return list.sort((a, b) => b.rate - a.rate)
  }, [snapshots, compareMetric])

  const bestSnapshot = rankedSnapshots[0]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="CyxTrade" className="h-8 w-8" />
              <span className="text-xl font-bold text-teal-600">CyxTrade</span>
            </div>
            <div className="flex items-center gap-4">
              {user?.isTrader && (
                <Link
                  to="/app/trader-dashboard"
                  className="text-teal-600 hover:text-teal-700 font-medium transition"
                >
                  Trader Dashboard
                </Link>
              )}
              <Link
                to="/app/settings"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user?.displayName || 'there'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            What would you like to do today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link
            to="/app/send"
            className="bg-teal-600 text-white p-6 rounded-2xl hover:bg-teal-700 transition group"
          >
            <img src="/logo.png" alt="CyxTrade" className="h-10 w-10 mb-2" />
            <h3 className="text-xl font-semibold mb-1">Send Money</h3>
            <p className="text-teal-100 text-sm">
              Transfer to family and friends abroad
            </p>
          </Link>

          <Link
            to="/app/history"
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition"
          >
            <div className="text-3xl mb-2">&#128203;</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">History</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              View your past transactions
            </p>
          </Link>
        </div>

        {/* CyxTrade Pro Banner */}
        <Link
          to="/pro"
          className="block bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white p-6 rounded-2xl mb-8 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-semibold rounded">PRO</span>
                <span className="text-purple-200 text-sm">Advanced P2P Trading</span>
              </div>
              <h3 className="text-xl font-semibold mb-1">CyxTrade Pro</h3>
              <p className="text-purple-100 text-sm">
                Binance-style P2P trading with your own wallet and escrow
              </p>
            </div>
            <div className="text-3xl">&#128640;</div>
          </div>
        </Link>

        {/* Live Market */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Live Market</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time corridor rates with compare tools for Rate, PnL, and SNL
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              LIVE
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-5">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pair</span>
              <select
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {marketPairs.map((pair) => (
                  <option key={pairKey(pair.from, pair.to)} value={pairKey(pair.from, pair.to)}>
                    {pair.from}/{pair.to} - {pair.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Compare By</span>
              <select
                value={compareMetric}
                onChange={(e) => setCompareMetric(e.target.value as MarketMetric)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="rate">Rate</option>
                <option value="pnl">PnL %</option>
                <option value="snl">SNL %</option>
              </select>
            </label>
          </div>

          <div className="mb-5 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Watchlist (Any Pair)</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                list="market-base-list"
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                maxLength={5}
                placeholder="Base (e.g. USD)"
                className="sm:col-span-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white uppercase"
              />
              <input
                list="market-quote-list"
                value={quoteCurrency}
                onChange={(e) => setQuoteCurrency(e.target.value)}
                maxLength={5}
                placeholder="Quote (e.g. XAF)"
                className="sm:col-span-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white uppercase"
              />
              <button
                type="button"
                onClick={addMarketPair}
                className="sm:col-span-2 px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
              >
                Add Pair
              </button>
            </div>
            <datalist id="market-base-list">
              {COMMON_CURRENCIES.map((currency) => <option key={`b-${currency}`} value={currency} />)}
            </datalist>
            <datalist id="market-quote-list">
              {COMMON_CURRENCIES.map((currency) => <option key={`q-${currency}`} value={currency} />)}
            </datalist>
            <div className="mt-3 flex flex-wrap gap-2">
              {marketPairs.map((pair) => {
                const key = pairKey(pair.from, pair.to)
                return (
                  <span key={key} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedPair(key)}
                      className="font-medium text-gray-700 dark:text-gray-300 hover:text-teal-600"
                    >
                      {key}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMarketPair(key)}
                      className="text-gray-400 hover:text-red-500"
                      disabled={marketPairs.length <= 1}
                    >
                      x
                    </button>
                  </span>
                )
              })}
            </div>
          </div>

          {isMarketLoading && snapshots.length === 0 ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-5">
              {selectedSnapshot && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{selectedSnapshot.pair}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {selectedSnapshot.rate.toFixed(3)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${selectedSnapshot.rate >= selectedSnapshot.previousRate ? 'text-emerald-600' : 'text-red-500'}`}>
                        {selectedSnapshot.rate >= selectedSnapshot.previousRate ? '+' : ''}
                        {(((selectedSnapshot.rate - selectedSnapshot.previousRate) / selectedSnapshot.previousRate) * 100).toFixed(3)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Updated {new Date(selectedSnapshot.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Best</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedSnapshot.bestRate.toFixed(3)}</p>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">PnL</p>
                      <p className={`font-semibold ${selectedSnapshot.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {selectedSnapshot.pnl >= 0 ? '+' : ''}{selectedSnapshot.pnl.toFixed(2)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">SNL</p>
                      <p className="font-semibold text-amber-600">{selectedSnapshot.snl.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-900/60 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Pair</th>
                      <th className="text-right px-4 py-3 font-medium">Rate</th>
                      <th className="text-right px-4 py-3 font-medium">PnL</th>
                      <th className="text-right px-4 py-3 font-medium">SNL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedSnapshots.map((snapshot) => (
                      <tr key={snapshot.pair} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          <button
                            type="button"
                            onClick={() => setSelectedPair(snapshot.pair)}
                            className="font-medium hover:text-teal-600 transition"
                          >
                            {snapshot.pair}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{snapshot.rate.toFixed(3)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${snapshot.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {snapshot.pnl >= 0 ? '+' : ''}{snapshot.pnl.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-amber-600">{snapshot.snl.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bestSnapshot && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Top by {compareMetric.toUpperCase()}: <span className="font-semibold text-gray-700 dark:text-gray-300">{bestSnapshot.pair}</span>
                  {' '}(
                  {bestSnapshot.source === 'trader'
                    ? `${bestSnapshot.traderCount} trader quotes`
                    : bestSnapshot.source === 'market'
                      ? 'market reference feed'
                      : 'simulated feed'}
                  )
                </p>
              )}
            </div>
          )}
        </div>

        {/* Become Trader Card */}
        {!user?.isTrader && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-2xl mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-1">Become a Trader</h3>
                <p className="text-purple-100 text-sm">
                  Earn by facilitating currency exchanges
                </p>
              </div>
              <Link
                to="/become-trader"
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center text-2xl overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Profile avatar" className="w-full h-full object-cover" />
              ) : (
                user?.displayName?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user?.displayName || 'Complete your profile'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {user?.phone || (user?.fingerprint ? `Key ID: ${user.fingerprint}` : 'Key-based account')}
              </p>
              {!user?.displayName && (
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Add your display name so traders can identify you.
                </p>
              )}
              {user?.isTrader && (
                <span className="inline-block bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs px-2 py-1 rounded mt-1">
                  Trader
                </span>
              )}
            </div>
          </div>
          <Link
            to="/app/profile"
            className="text-teal-600 hover:text-teal-700 font-medium text-sm"
          >
            {user?.displayName ? 'Edit Profile' : 'Complete Profile'} &#8594;
          </Link>
          <div className="mt-2">
            <Link
              to="/app/settings"
              className="text-teal-600 hover:text-teal-700 font-medium text-sm"
            >
              Security & Backup &#8594;
            </Link>
          </div>
        </div>

        {/* About Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 mt-8 p-6 space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-teal-600">About CyxTrade</p>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
              What we are — and what we are not
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              CyxTrade exists to deliver low-fee, corridor-first remittance for underserved communities without asking
              users to hold or manage crypto wallets. We avoid centralized custody and single-point gatekeepers, not
              regulators.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">What we are</p>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>Non-custodial, escrowed bonds keep traders honest on-chain.</li>
                <li>Users send fiat through the app without needing wallets or gas.</li>
                <li>Community arbitrators with economic stake resolve disputes.</li>
                <li>Focused corridors (e.g., UAE ↔ Cameroon) get low-cost access first.</li>
              </ul>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">What we are not</p>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>We do not promote money laundering, terrorism financing, or sanctions evasion.</li>
                <li>We are not a hiding place for fraud, scams, or impersonation.</li>
                <li>We do not offer anonymous rails to bypass compliance obligations.</li>
                <li>We do not tolerate tax evasion or other criminal payments.</li>
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-500 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-800 dark:text-red-100">
            There is no hiding place for bad actors on the CyxTrade network — bonded traders, auditable trade history,
            and arbitrator enforcement keep the rails accountable.
          </div>
        </section>

        {/* Download App Banner */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Get the best experience with our mobile app
          </p>
          <Link
            to="/download"
            className="inline-block bg-gray-900 dark:bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition"
          >
            Download App
          </Link>
        </div>
      </main>
    </div>
  )
}
