import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Dark mode context - exported for use in other components
export const DarkModeContext = createContext({
  dark: false,
  toggle: () => {}
})

// Dark mode provider - exported to wrap the entire app
export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) return saved === 'true'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', String(dark))
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [dark])

  const toggle = () => setDark(!dark)

  return (
    <DarkModeContext.Provider value={{ dark, toggle }}>
      {children}
    </DarkModeContext.Provider>
  )
}

type LandingPair = {
  from: string
  to: string
}

type LandingMarketRow = {
  pair: string
  rate: number
  change: number
  pnl: number
  snl: number
}

type LandingTraderCorridor = {
  from: string
  to: string
  rate?: number
  buyRate?: number
  sellRate?: number
}

type LandingTrader = {
  corridors?: LandingTraderCorridor[]
}

type LandingTradersResponse = {
  data?: {
    traders?: LandingTrader[]
  }
}

const DEFAULT_LANDING_PAIRS: LandingPair[] = [
  { from: 'AED', to: 'XAF' },
  { from: 'USD', to: 'XAF' },
  { from: 'EUR', to: 'XAF' },
  { from: 'GBP', to: 'XAF' },
]

const COMMON_CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'XAF', 'NGN', 'KES', 'GHS', 'MAD', 'SAR', 'QAR', 'EGP', 'INR', 'PKR', 'TRY']

const LANDING_FALLBACK: Record<string, number> = {
  'AED/XAF': 164.2,
  'USD/XAF': 602.1,
  'EUR/XAF': 658.4,
  'GBP/XAF': 771.9,
}

const landingPairKey = (from: string, to: string) => `${from}/${to}`

function App() {
  const { dark } = useContext(DarkModeContext)

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      <Header />
      <Hero />
      <LiveMarket />
      <Features />
      <HowItWorks />
      <Download />
      <FAQ />
      <Footer />
    </div>
  )
}

// Header Component
function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { dark, toggle } = useContext(DarkModeContext)

  return (
    <header className={`fixed top-0 left-0 right-0 backdrop-blur-sm z-50 border-b ${dark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-100'}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="CyxTrade" className="h-8 w-8" />
            <span className="text-xl font-bold text-teal-600">CyxTrade</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'} transition`}>Features</a>
            <a href="#how-it-works" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'} transition`}>How It Works</a>
            <a href="#download" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'} transition`}>Download</a>
            <a href="#faq" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'} transition`}>FAQ</a>

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className={`p-2 rounded-lg ${dark ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'} transition`}
              aria-label="Toggle dark mode"
            >
              {dark ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <Link
              to="/login"
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
            >
              Open App
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggle}
              className={`p-2 rounded-lg ${dark ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
            >
              {dark ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <button
              className={`p-2 ${dark ? 'text-gray-300' : 'text-gray-600'}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className={`md:hidden py-4 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className="flex flex-col space-y-4">
              <a href="#features" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>Features</a>
              <a href="#how-it-works" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>How It Works</a>
              <a href="#download" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>Download</a>
              <a href="#faq" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>FAQ</a>
              <Link
                to="/login"
                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-center hover:bg-teal-700"
              >
                Open App
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

// Hero Component
function Hero() {
  const { dark } = useContext(DarkModeContext)
  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80',
      title: 'Send Worldwide',
      caption: 'Move money across borders with trusted local traders.',
      effect: 'pan-left',
    },
    {
      image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=80',
      title: 'Trader Executes',
      caption: 'Matched trader delivers payout using verified channels.',
      effect: 'zoom-in',
    },
    {
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80',
      title: 'Family First',
      caption: 'Money reaches home quickly for essential family needs.',
      effect: 'soft-fade',
    },
    {
      image: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1600&q=80',
      title: 'Reaching Rural Homes',
      caption: 'Support families in rural communities with accessible local payout routes.',
      effect: 'pan-right',
    },
    {
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=80',
      title: 'Community Economy',
      caption: 'Enable local merchants and agents to serve more people reliably.',
      effect: 'zoom-out',
    },
    {
      image: '/logo.png',
      title: 'CyxTrade Network',
      caption: 'Community-powered transfers with transparent trust.',
      effect: 'focus',
    }
  ]
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => window.clearInterval(id)
  }, [slides.length])

  const getSlideMotionClass = (effect: string, isActive: boolean) => {
    const base = 'absolute inset-0 w-full h-full object-cover transition-all duration-[1400ms] ease-out will-change-transform'
    if (!isActive) {
      return `${base} opacity-0 scale-105`
    }

    if (effect === 'pan-left') return `${base} opacity-45 scale-105 -translate-x-4 md:-translate-x-8`
    if (effect === 'pan-right') return `${base} opacity-45 scale-105 translate-x-4 md:translate-x-8`
    if (effect === 'zoom-in') return `${base} opacity-45 scale-110`
    if (effect === 'zoom-out') return `${base} opacity-45 scale-100`
    if (effect === 'focus') return `${base} opacity-45 scale-95`
    return `${base} opacity-45 scale-103`
  }

  return (
    <section className={`relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24 ${dark ? 'bg-gradient-to-b from-gray-800 to-gray-900' : 'bg-gradient-to-b from-teal-50 to-white'}`}>
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <img
            key={slide.title}
            src={slide.image}
            alt={slide.title}
            className={getSlideMotionClass(slide.effect, activeSlide === index)}
          />
        ))}
        <div className={`absolute inset-0 ${dark ? 'bg-gray-900/55' : 'bg-white/42'}`} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 text-center">
          <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Send Money Home,
            <br />
            <span className="text-teal-500">Without the Fees</span>
          </h1>
          <p className={`text-xl max-w-2xl mx-auto mb-8 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
            CyxTrade connects you with trusted local traders for fast, low-cost international transfers.
            Save up to 80% compared to traditional remittance services.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#download"
              className="bg-teal-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-teal-700 transition shadow-lg shadow-teal-600/30"
            >
              Download App
            </a>
            <Link
              to="/login"
              className={`px-8 py-4 rounded-xl text-lg font-semibold border-2 border-teal-600 transition ${dark ? 'bg-gray-800 text-teal-400 hover:bg-gray-700' : 'bg-white text-teal-600 hover:bg-teal-50'}`}
            >
              Use Web Version
            </Link>
          </div>

          <div className={`mt-8 inline-flex items-center gap-3 px-4 py-2 rounded-full border ${dark ? 'border-gray-700 bg-gray-900/60 text-gray-300' : 'border-white/70 bg-white/80 text-gray-700'}`}>
            <span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-sm font-medium">{slides[activeSlide].title}</span>
            <span className="hidden sm:inline text-xs opacity-80">{slides[activeSlide].caption}</span>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={`hero-dot-${index}`}
                type="button"
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition-all ${
                  activeSlide === index ? 'w-8 bg-teal-500' : 'w-2.5 bg-gray-400/60 hover:bg-gray-400'
                }`}
                aria-label={`Show hero slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-teal-500">2-3%</div>
              <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Avg. Fees</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-teal-500">30 min</div>
              <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Avg. Time</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-teal-500">100%</div>
              <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Protected</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LiveMarket() {
  const { dark } = useContext(DarkModeContext)
  const [rows, setRows] = useState<LandingMarketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'rate' | 'pnl' | 'snl'>('rate')
  const [watchPairs, setWatchPairs] = useState<LandingPair[]>(DEFAULT_LANDING_PAIRS)
  const [baseCurrency, setBaseCurrency] = useState('AED')
  const [quoteCurrency, setQuoteCurrency] = useState('XAF')
  const rowsRef = useRef<LandingMarketRow[]>([])

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const addWatchPair = () => {
    const from = baseCurrency.trim().toUpperCase()
    const to = quoteCurrency.trim().toUpperCase()
    if (!from || !to || from === to) return

    const exists = watchPairs.some((pair) => pair.from === from && pair.to === to)
    if (exists) return

    setWatchPairs((prev) => [...prev, { from, to }])
  }

  const removeWatchPair = (pairToRemove: string) => {
    setWatchPairs((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((pair) => landingPairKey(pair.from, pair.to) !== pairToRemove)
    })
  }

  useEffect(() => {
    let mounted = true

    const toRate = (corridor: LandingTraderCorridor): number | null => {
      if (typeof corridor.rate === 'number') return corridor.rate
      if (typeof corridor.buyRate === 'number' && typeof corridor.sellRate === 'number') {
        return (corridor.buyRate + corridor.sellRate) / 2
      }
      if (typeof corridor.buyRate === 'number') return corridor.buyRate
      if (typeof corridor.sellRate === 'number') return corridor.sellRate
      return null
    }

    const refresh = async () => {
      const nextRows = await Promise.all(
        watchPairs.map(async (pair) => {
          const key = landingPairKey(pair.from, pair.to)
          const previous = rowsRef.current.find((row) => row.pair === key)?.rate ?? LANDING_FALLBACK[key] ?? 100

          try {
            const res = await fetch(`/api/traders?from=${pair.from}&to=${pair.to}&online=true&limit=50`)
            const payload = (await res.json()) as LandingTradersResponse
            const traders = payload?.data?.traders || []
            const rates = traders
              .flatMap((trader) => trader.corridors || [])
              .filter((corridor) => corridor.from === pair.from && corridor.to === pair.to)
              .map((corridor) => toRate(corridor))
              .filter((rate): rate is number => typeof rate === 'number' && Number.isFinite(rate))

            if (rates.length > 0) {
              const rate = rates.reduce((sum, item) => sum + item, 0) / rates.length
              const change = ((rate - previous) / previous) * 100
              return {
                pair: key,
                rate,
                change,
                pnl: change,
                snl: ((Math.max(...rates) - Math.min(...rates)) / Math.max(...rates)) * 100,
              }
            }
          } catch {
            // If API quotes are unavailable, keep moving simulated rates.
          }

          const drift = (Math.random() - 0.5) * 0.004
          const rate = previous * (1 + drift)
          return {
            pair: key,
            rate,
            change: drift * 100,
            pnl: drift * 100,
            snl: Math.abs(drift) * 120,
          }
        })
      )

      if (mounted) {
        setRows(nextRows)
        setLoading(false)
      }
    }

    refresh()
    const id = window.setInterval(refresh, 3000)
    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [watchPairs])

  const sortedRows = [...rows].sort((a, b) => {
    if (metric === 'pnl') return b.pnl - a.pnl
    if (metric === 'snl') return a.snl - b.snl
    return b.rate - a.rate
  })

  return (
    <section className={`py-10 md:py-14 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className={`text-2xl md:text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Live Market</h2>
            <p className={dark ? 'text-gray-400' : 'text-gray-600'}>
              Compare corridor rates in real time by Rate, PnL, and SNL.
            </p>
          </div>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as 'rate' | 'pnl' | 'snl')}
            className={`px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="rate">Sort by Rate</option>
            <option value="pnl">Sort by PnL</option>
            <option value="snl">Sort by SNL</option>
          </select>
        </div>

        <div className={`mb-4 rounded-xl border p-3 ${dark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <p className={`text-xs uppercase tracking-wide mb-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Watchlist (Any Pair)</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              list="landing-base-list"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              maxLength={5}
              placeholder="Base (e.g. USD)"
              className={`px-3 py-2 rounded-lg border uppercase ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
            <input
              list="landing-quote-list"
              value={quoteCurrency}
              onChange={(e) => setQuoteCurrency(e.target.value)}
              maxLength={5}
              placeholder="Quote (e.g. XAF)"
              className={`px-3 py-2 rounded-lg border uppercase ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
            <button
              type="button"
              onClick={addWatchPair}
              className="sm:col-span-2 px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
            >
              Add Pair
            </button>
          </div>
          <datalist id="landing-base-list">
            {COMMON_CURRENCIES.map((currency) => <option key={`lb-${currency}`} value={currency} />)}
          </datalist>
          <datalist id="landing-quote-list">
            {COMMON_CURRENCIES.map((currency) => <option key={`lq-${currency}`} value={currency} />)}
          </datalist>
          <div className="mt-3 flex flex-wrap gap-2">
            {watchPairs.map((pair) => {
              const key = landingPairKey(pair.from, pair.to)
              return (
                <span key={key} className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs ${dark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                  {key}
                  <button
                    type="button"
                    onClick={() => removeWatchPair(key)}
                    className="text-gray-400 hover:text-red-500"
                    disabled={watchPairs.length <= 1}
                  >
                    x
                  </button>
                </span>
              )
            })}
          </div>
        </div>

        <div className={`rounded-2xl border overflow-hidden ${dark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <table className="w-full text-sm">
            <thead className={dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}>
              <tr>
                <th className="text-left px-4 py-3 font-medium">Pair</th>
                <th className="text-right px-4 py-3 font-medium">Rate</th>
                <th className="text-right px-4 py-3 font-medium">Change</th>
                <th className="text-right px-4 py-3 font-medium">PnL</th>
                <th className="text-right px-4 py-3 font-medium">SNL</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>Loading market feed...</td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.pair} className={dark ? 'border-t border-gray-800' : 'border-t border-gray-200'}>
                    <td className={`px-4 py-3 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{row.pair}</td>
                    <td className={`px-4 py-3 text-right ${dark ? 'text-white' : 'text-gray-900'}`}>{row.rate.toFixed(3)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${row.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {row.change >= 0 ? '+' : ''}{row.change.toFixed(3)}%
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${row.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {row.pnl >= 0 ? '+' : ''}{row.pnl.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-500">{row.snl.toFixed(2)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// Features Component
function Features() {
  const { dark } = useContext(DarkModeContext)

  const features = [
    {
      icon: '💰',
      title: 'Low Fees',
      description: 'Pay only 2-3% spread instead of 10-15% at traditional services. Keep more money for your family.'
    },
    {
      icon: '⚡',
      title: 'Fast Transfers',
      description: 'Most transfers complete in 30-45 minutes. No waiting days for your money to arrive.'
    },
    {
      icon: '🛡️',
      title: 'Secure & Protected',
      description: 'Traders post security bonds that protect you. If something goes wrong, you get compensated.'
    },
    {
      icon: '🤝',
      title: 'Trusted Network',
      description: 'Trade with verified traders who have real track records and ratings from other users.'
    },
    {
      icon: '📱',
      title: 'Easy to Use',
      description: 'Simple interface that anyone can use. No crypto knowledge needed.'
    },
    {
      icon: '🌍',
      title: 'Underserved Corridors',
      description: 'We focus on corridors ignored by big players. UAE to Cameroon and more coming soon.'
    }
  ]

  return (
    <section id="features" className={`py-16 md:py-24 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Why Choose CyxTrade?
          </h2>
          <p className={`text-xl max-w-2xl mx-auto ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Built for the diaspora, by the diaspora. We understand the pain of expensive remittances.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`p-6 rounded-2xl transition group ${dark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-teal-50'}`}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className={`text-xl font-semibold mb-2 group-hover:text-teal-500 transition ${dark ? 'text-white' : 'text-gray-900'}`}>
                {feature.title}
              </h3>
              <p className={dark ? 'text-gray-400' : 'text-gray-600'}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// How It Works Component
function HowItWorks() {
  const { dark } = useContext(DarkModeContext)

  const steps = [
    {
      step: '1',
      title: 'Enter Amount',
      description: 'Tell us how much you want to send and where. See real-time exchange rates.'
    },
    {
      step: '2',
      title: 'Choose a Trader',
      description: 'Browse verified traders, compare rates and reviews. Pick the best one for you.'
    },
    {
      step: '3',
      title: 'Pay Locally',
      description: 'Transfer money to your chosen trader using bank transfer or mobile money.'
    },
    {
      step: '4',
      title: 'Recipient Gets Paid',
      description: 'The trader\'s partner pays your recipient locally. Done in 30-45 minutes!'
    }
  ]

  return (
    <section id="how-it-works" className={`py-16 md:py-24 ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
            How It Works
          </h2>
          <p className={`text-xl max-w-2xl mx-auto ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Sending money has never been easier. Four simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              <div className={`rounded-2xl p-6 shadow-sm h-full ${dark ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {item.title}
                </h3>
                <p className={dark ? 'text-gray-400' : 'text-gray-600'}>{item.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`hidden lg:block absolute top-10 -right-4 text-2xl ${dark ? 'text-teal-500' : 'text-teal-300'}`}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className={`mt-16 rounded-2xl p-8 shadow-sm ${dark ? 'bg-gray-900' : 'bg-white'}`}>
          <h3 className={`text-2xl font-bold text-center mb-8 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Compare the Savings
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className={`p-6 rounded-xl ${dark ? 'bg-red-900/30' : 'bg-red-50'}`}>
              <h4 className="font-semibold text-red-500 mb-4">Traditional Services</h4>
              <div className={`space-y-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="flex justify-between">
                  <span>Sending $500</span>
                  <span className="font-semibold">$500.00</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Fees (10-15%)</span>
                  <span className="font-semibold">-$50 to $75</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Bad exchange rate</span>
                  <span className="font-semibold">-$20</span>
                </div>
                <div className={`border-t pt-2 flex justify-between font-bold ${dark ? 'border-red-800' : 'border-red-200'}`}>
                  <span>Recipient gets</span>
                  <span className="text-red-500">~$405-$430</span>
                </div>
              </div>
            </div>
            <div className={`p-6 rounded-xl ${dark ? 'bg-teal-900/30' : 'bg-teal-50'}`}>
              <h4 className="font-semibold text-teal-500 mb-4">With CyxTrade</h4>
              <div className={`space-y-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="flex justify-between">
                  <span>Sending $500</span>
                  <span className="font-semibold">$500.00</span>
                </div>
                <div className="flex justify-between text-teal-500">
                  <span>Fees (2-3%)</span>
                  <span className="font-semibold">-$10 to $15</span>
                </div>
                <div className="flex justify-between text-teal-500">
                  <span>Competitive rate</span>
                  <span className="font-semibold">$0</span>
                </div>
                <div className={`border-t pt-2 flex justify-between font-bold ${dark ? 'border-teal-800' : 'border-teal-200'}`}>
                  <span>Recipient gets</span>
                  <span className="text-teal-500">~$485-$490</span>
                </div>
              </div>
            </div>
          </div>
          <p className={`text-center mt-6 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
            Save $60-85 on every $500 sent. That's $700-1,000/year for monthly senders!
          </p>
        </div>
      </div>
    </section>
  )
}

// Download Component
function Download() {
  return (
    <section id="download" className="py-16 md:py-24 bg-teal-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Download CyxTrade
          </h2>
          <p className="text-xl text-teal-100 max-w-2xl mx-auto mb-8">
            Available on iOS, Android, and Web. Start sending money in minutes.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            {/* App Store */}
            <a
              href="#"
              className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
            >
              <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs">Download on the</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </a>

            {/* Play Store */}
            <a
              href="#"
              className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
            >
              <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs">Get it on</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </a>
          </div>

          <p className="text-teal-200">
            Or use the{' '}
            <Link to="/login" className="text-white underline hover:no-underline">
              web version
            </Link>
            {' '}directly in your browser
          </p>
        </div>
      </div>
    </section>
  )
}

// FAQ Component
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const { dark } = useContext(DarkModeContext)

  const faqs = [
    {
      question: 'What is CyxTrade?',
      answer: 'CyxTrade is a peer-to-peer fiat exchange platform that connects you with local traders to send money internationally at low costs. Instead of using expensive remittance services, you trade directly with trusted individuals.'
    },
    {
      question: 'How much does it cost?',
      answer: 'CyxTrade charges no platform fees. You only pay the trader\'s spread (difference between buy and sell rates), which is typically 2-3%. Compare this to 10-15% at traditional services like Western Union.'
    },
    {
      question: 'Is my money safe?',
      answer: 'Yes. Every trader must post a security bond before trading. If a trader fails to complete their part, their bond is forfeited to compensate you. Trade limits are tied to bond amounts to ensure full protection.'
    },
    {
      question: 'How long does a transfer take?',
      answer: 'Most transfers complete in 30-45 minutes. Bank transfers may take 1-2 hours. First-time transfers might take a bit longer as you get familiar with the process.'
    },
    {
      question: 'What currencies are supported?',
      answer: 'Currently we support UAE Dirham (AED) to Central African CFA Franc (XAF). More currencies coming soon including USD, EUR, NGN, and GBP.'
    },
    {
      question: 'Do I need to be a trader?',
      answer: 'No! Most users are just senders. You find a trader, pay them locally, and they arrange for your recipient to get paid. You only need to become a trader if you want to earn money by facilitating exchanges.'
    },
    {
      question: 'What if something goes wrong?',
      answer: 'If there\'s a problem, first try to resolve it via chat with the trader. If that fails, raise a dispute with evidence. Our dispute team reviews cases within 24-48 hours. If the trader is at fault, their bond compensates you.'
    },
    {
      question: 'How do I become a trader?',
      answer: 'Go to Profile > Become a Trader in the app. Deposit your security bond (minimum 500 AED), set your exchange rates, and start accepting trade requests. You earn the spread on each completed trade.'
    }
  ]

  return (
    <section id="faq" className={`py-16 md:py-24 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Frequently Asked Questions
          </h2>
          <p className={`text-xl ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Got questions? We've got answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border rounded-xl overflow-hidden ${dark ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <button
                className={`w-full px-6 py-4 text-left flex justify-between items-center transition ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{faq.question}</span>
                <svg
                  className={`w-5 h-5 transition-transform ${openIndex === index ? 'rotate-180' : ''} ${dark ? 'text-gray-400' : 'text-gray-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className={`px-6 pb-4 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Footer Component
function Footer() {
  const { dark } = useContext(DarkModeContext)

  return (
    <footer className={`py-12 ${dark ? 'bg-black' : 'bg-gray-900'} text-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img src="/logo.png" alt="CyxTrade" className="h-8 w-8" />
              <span className="text-xl font-bold">CyxTrade</span>
            </div>
            <p className="text-gray-400">
              P2P fiat exchange for trusted networks. Send money home without the fees.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
              <li><a href="#download" className="hover:text-white transition">Download</a></li>
              <li><Link to="/login" className="hover:text-white transition">Web App</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/terms" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="/aml" className="hover:text-white transition">AML Policy</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="mailto:support@cyxtrade.com" className="hover:text-white transition">
                  support@cyxtrade.com
                </a>
              </li>
              <li>
                <a href="https://github.com/Nerd-Inc/cyxtrade" className="hover:text-white transition">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <p className="text-gray-400 text-sm text-center">
            &copy; 2024 CyxTrade. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default App
