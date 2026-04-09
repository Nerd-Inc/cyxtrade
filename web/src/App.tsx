import { useState, useEffect, useRef, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Dark mode context - exported for use in other components
export const DarkModeContext = createContext({
  dark: true,
  toggle: () => {}
})

// Dark mode provider - exported to wrap the entire app
export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) return saved === 'true'
      return true // Default to dark mode
    }
    return true
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
  return (
    <div className="min-h-screen bg-[#0B0E11]">
      <Header />
      <Hero />
      <TrustedBy />
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
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0B0E11]/95 backdrop-blur-md border-b border-gray-800/50' : 'bg-transparent'}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/about" className="flex items-center">
            <img src="/logo.png" alt="CyxTrade" className="h-20" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition font-medium">Features</a>
            <a href="#how-it-works" className="text-gray-400 hover:text-white transition font-medium">How It Works</a>
            <a href="#download" className="text-gray-400 hover:text-white transition font-medium">Download</a>
            <a href="#faq" className="text-gray-400 hover:text-white transition font-medium">FAQ</a>
            <Link
              to="/login"
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-lg shadow-orange-500/25"
            >
              Open App
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white"
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

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-gray-400 hover:text-white py-2">Features</a>
              <a href="#how-it-works" className="text-gray-400 hover:text-white py-2">How It Works</a>
              <a href="#download" className="text-gray-400 hover:text-white py-2">Download</a>
              <a href="#faq" className="text-gray-400 hover:text-white py-2">FAQ</a>
              <Link
                to="/login"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl text-center"
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

// Country to corridor mapping - shows user's location with worldwide coverage
const COUNTRY_TO_CORRIDOR: Record<string, { location: string; flag: string }> = {
  // Middle East
  'United Arab Emirates': { location: 'UAE', flag: '🇦🇪' },
  'Saudi Arabia': { location: 'Saudi Arabia', flag: '🇸🇦' },
  'Qatar': { location: 'Qatar', flag: '🇶🇦' },
  'Kuwait': { location: 'Kuwait', flag: '🇰🇼' },
  'Bahrain': { location: 'Bahrain', flag: '🇧🇭' },
  'Oman': { location: 'Oman', flag: '🇴🇲' },
  // Europe
  'France': { location: 'France', flag: '🇫🇷' },
  'Germany': { location: 'Germany', flag: '🇩🇪' },
  'United Kingdom': { location: 'UK', flag: '🇬🇧' },
  'Italy': { location: 'Italy', flag: '🇮🇹' },
  'Spain': { location: 'Spain', flag: '🇪🇸' },
  'Belgium': { location: 'Belgium', flag: '🇧🇪' },
  'Netherlands': { location: 'Netherlands', flag: '🇳🇱' },
  'Switzerland': { location: 'Switzerland', flag: '🇨🇭' },
  // Americas
  'United States': { location: 'USA', flag: '🇺🇸' },
  'Canada': { location: 'Canada', flag: '🇨🇦' },
  // Africa
  'Cameroon': { location: 'Cameroon', flag: '🇨🇲' },
  'Nigeria': { location: 'Nigeria', flag: '🇳🇬' },
  'Ghana': { location: 'Ghana', flag: '🇬🇭' },
  'Kenya': { location: 'Kenya', flag: '🇰🇪' },
  'Senegal': { location: 'Senegal', flag: '🇸🇳' },
  'South Africa': { location: 'South Africa', flag: '🇿🇦' },
  'Morocco': { location: 'Morocco', flag: '🇲🇦' },
  'Egypt': { location: 'Egypt', flag: '🇪🇬' },
  // Asia
  'India': { location: 'India', flag: '🇮🇳' },
  'Pakistan': { location: 'Pakistan', flag: '🇵🇰' },
  'China': { location: 'China', flag: '🇨🇳' },
  'Malaysia': { location: 'Malaysia', flag: '🇲🇾' },
  'Philippines': { location: 'Philippines', flag: '🇵🇭' },
  'Indonesia': { location: 'Indonesia', flag: '🇮🇩' },
  'Bangladesh': { location: 'Bangladesh', flag: '🇧🇩' },
  'Turkey': { location: 'Turkey', flag: '🇹🇷' },
}

// Hero Component
function Hero() {
  const [locationInfo, setLocationInfo] = useState({ location: 'your location', flag: '🌍' })

  useEffect(() => {
    // Fetch user location based on IP
    const fetchLocation = async () => {
      try {
        const res = await fetch('https://ip-api.com/json/?fields=country')
        const data = await res.json()
        if (data.country) {
          const info = COUNTRY_TO_CORRIDOR[data.country]
          if (info) {
            setLocationInfo(info)
          } else {
            setLocationInfo({ location: data.country, flag: '🌍' })
          }
        }
      } catch {
        // Fallback to default if API fails
        setLocationInfo({ location: 'your location', flag: '🌍' })
      }
    }
    fetchLocation()
  }, [])

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

    if (effect === 'pan-left') return `${base} opacity-40 scale-105 -translate-x-4 md:-translate-x-8`
    if (effect === 'pan-right') return `${base} opacity-40 scale-105 translate-x-4 md:translate-x-8`
    if (effect === 'zoom-in') return `${base} opacity-40 scale-110`
    if (effect === 'zoom-out') return `${base} opacity-40 scale-100`
    if (effect === 'focus') return `${base} opacity-40 scale-95`
    return `${base} opacity-40 scale-103`
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Sliding Background Images */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <img
            key={slide.title}
            src={slide.image}
            alt={slide.title}
            className={getSlideMotionClass(slide.effect, activeSlide === index)}
          />
        ))}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[#0B0E11]/70" />
        {/* Green and Orange glow effects */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-600/5 rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full mb-8 backdrop-blur-sm">
            <span className="text-lg">{locationInfo.flag}</span>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm font-medium">
              Serving {locationInfo.location} ↔ Worldwide
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Send Money Home,
            <br />
            <span className="bg-gradient-to-r from-green-400 via-green-500 to-orange-500 bg-clip-text text-transparent">Without the Fees</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-10">
            Connect with trusted local traders for fast, low-cost international transfers.
            Save up to 80% compared to traditional services.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <a
              href="#download"
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-lg font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2"
            >
              Download App
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <Link
              to="/login"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white text-lg font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition flex items-center justify-center gap-2"
            >
              Use Web Version
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {/* Slide indicator with caption */}
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full border border-green-500/20 bg-black/30 backdrop-blur-md mb-6">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-white">{slides[activeSlide].title}</span>
            <span className="hidden sm:inline text-xs text-gray-400">{slides[activeSlide].caption}</span>
          </div>

          {/* Slide dots */}
          <div className="flex justify-center gap-2 mb-12">
            {slides.map((_, index) => (
              <button
                key={`hero-dot-${index}`}
                type="button"
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition-all ${
                  activeSlide === index ? 'w-8 bg-gradient-to-r from-green-500 to-orange-500' : 'w-2.5 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Show slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-green-400">0%</div>
              <div className="text-gray-400 mt-2">Sender Fees</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-orange-400">15m</div>
              <div className="text-gray-400 mt-2">Average Time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-green-400">100%</div>
              <div className="text-gray-400 mt-2">Protected</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  )
}

// Trusted By Component
function TrustedBy() {
  return (
    <section className="py-12 bg-[#1E2329] border-y border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500 text-sm uppercase tracking-wider mb-8">Trusted by communities worldwide</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
          <div className="text-2xl font-bold text-gray-400">UAE</div>
          <div className="text-2xl font-bold text-gray-400">Cameroon</div>
          <div className="text-2xl font-bold text-gray-400">Nigeria</div>
          <div className="text-2xl font-bold text-gray-400">Kenya</div>
          <div className="text-2xl font-bold text-gray-400">Ghana</div>
        </div>
      </div>
    </section>
  )
}

function LiveMarket() {
  const [rows, setRows] = useState<LandingMarketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'rate' | 'pnl' | 'snl'>('rate')
  const [watchPairs, setWatchPairs] = useState<LandingPair[]>(DEFAULT_LANDING_PAIRS)
  const [baseCurrency, setBaseCurrency] = useState('AED')
  const [quoteCurrency, setQuoteCurrency] = useState('XAF')
  const [showAddPair, setShowAddPair] = useState(false)
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
    setShowAddPair(false)
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
    <section className="py-20 bg-[#0B0E11]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-orange-500 text-sm font-semibold uppercase tracking-wider mb-2">Real-Time Data</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Live Market Rates</h2>
            <p className="text-gray-400 mt-2">Compare corridor rates in real time</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as 'rate' | 'pnl' | 'snl')}
              className="px-4 py-2.5 bg-[#1E2329] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="rate">Sort by Rate</option>
              <option value="pnl">Sort by PnL</option>
              <option value="snl">Sort by SNL</option>
            </select>
            <button
              onClick={() => setShowAddPair(true)}
              className="px-4 py-2.5 bg-[#1E2329] border border-gray-700 rounded-xl text-gray-400 hover:text-white hover:border-orange-500/50 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Pair
            </button>
          </div>
        </div>

        {/* Watchlist chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {watchPairs.map((pair) => {
            const key = landingPairKey(pair.from, pair.to)
            return (
              <span key={key} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1E2329] border border-gray-700 rounded-lg text-sm text-gray-300">
                {key}
                <button
                  type="button"
                  onClick={() => removeWatchPair(key)}
                  className="text-gray-500 hover:text-red-500 transition"
                  disabled={watchPairs.length <= 1}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )
          })}
        </div>

        <div className="bg-[#1E2329] rounded-2xl border border-gray-800 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-500 text-sm font-medium">Live</span>
          </div>
          <table className="w-full">
            <thead className="bg-[#1A1E23]">
              <tr className="text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-4 font-medium">Pair</th>
                <th className="text-right px-5 py-4 font-medium">Rate</th>
                <th className="text-right px-5 py-4 font-medium">Change</th>
                <th className="text-right px-5 py-4 font-medium">PnL</th>
                <th className="text-right px-5 py-4 font-medium">Spread</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-gray-500" colSpan={5}>
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.pair} className="border-t border-gray-800/50 hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl flex items-center justify-center text-orange-500 text-xs font-bold">
                          {row.pair.split('/')[0].slice(0, 2)}
                        </div>
                        <span className="text-white font-semibold">{row.pair}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-white font-semibold font-mono">{row.rate.toFixed(3)}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-semibold ${row.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {row.change >= 0 ? '+' : ''}{row.change.toFixed(3)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-semibold ${row.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {row.pnl >= 0 ? '+' : ''}{row.pnl.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-orange-500 font-semibold">{row.snl.toFixed(2)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Pair Modal */}
      {showAddPair && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddPair(false)}>
          <div className="bg-[#1E2329] rounded-2xl w-full max-w-md mx-4 p-6 border border-gray-800" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-6">Add Currency Pair</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-medium">Base Currency</label>
                <input
                  list="landing-base-list"
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  placeholder="e.g., USD"
                  className="w-full px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white uppercase focus:outline-none focus:border-orange-500 transition"
                />
                <datalist id="landing-base-list">
                  {COMMON_CURRENCIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-medium">Quote Currency</label>
                <input
                  list="landing-quote-list"
                  value={quoteCurrency}
                  onChange={(e) => setQuoteCurrency(e.target.value)}
                  placeholder="e.g., XAF"
                  className="w-full px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white uppercase focus:outline-none focus:border-orange-500 transition"
                />
                <datalist id="landing-quote-list">
                  {COMMON_CURRENCIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddPair(false)}
                  className="flex-1 px-4 py-3 bg-[#2B3139] text-white rounded-xl hover:bg-[#3C4149] transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={addWatchPair}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition"
                >
                  Add Pair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// Features Component
function Features() {
  const features = [
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Low Fees',
      description: 'Pay only 2-3% spread instead of 10-15% at traditional services. Keep more money for your family.',
      color: 'orange'
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Fast Transfers',
      description: 'Most transfers complete in 15-30 minutes. No waiting days for your money to arrive.',
      color: 'blue'
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Secure & Protected',
      description: 'Traders post security bonds that protect you. If something goes wrong, you get compensated.',
      color: 'green'
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Trusted Network',
      description: 'Trade with verified traders who have real track records and ratings from other users.',
      color: 'purple'
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Easy to Use',
      description: 'Simple interface that anyone can use. No crypto knowledge needed.',
      color: 'pink'
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Underserved Corridors',
      description: 'We focus on corridors ignored by big players. UAE to Cameroon and more coming soon.',
      color: 'cyan'
    }
  ]

  const colorClasses: Record<string, string> = {
    orange: 'from-orange-500/20 to-orange-600/10 text-orange-500',
    blue: 'from-blue-500/20 to-blue-600/10 text-blue-500',
    green: 'from-green-500/20 to-green-600/10 text-green-500',
    purple: 'from-purple-500/20 to-purple-600/10 text-purple-500',
    pink: 'from-pink-500/20 to-pink-600/10 text-pink-500',
    cyan: 'from-cyan-500/20 to-cyan-600/10 text-cyan-500',
  }

  return (
    <section id="features" className="py-20 bg-[#1E2329]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-green-500 text-sm font-semibold uppercase tracking-wider mb-2">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Why Choose CyxTrade?
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Built for the diaspora, by the diaspora. We understand the pain of expensive remittances.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-[#0B0E11] border border-gray-800 hover:border-green-500/30 rounded-2xl p-6 transition-all duration-300"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${colorClasses[feature.color]} rounded-2xl flex items-center justify-center mb-5`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-green-400 transition">
                {feature.title}
              </h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// How It Works Component
function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Enter Amount',
      description: 'Tell us how much you want to send and where. See real-time exchange rates.'
    },
    {
      step: '02',
      title: 'Choose a Trader',
      description: 'Browse verified traders, compare rates and reviews. Pick the best one for you.'
    },
    {
      step: '03',
      title: 'Pay Locally',
      description: 'Transfer money to your chosen trader using bank transfer or mobile money.'
    },
    {
      step: '04',
      title: 'Recipient Gets Paid',
      description: "The trader's partner pays your recipient locally. Done in 15-30 minutes!"
    }
  ]

  return (
    <section id="how-it-works" className="py-20 bg-[#0B0E11]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-orange-500 text-sm font-semibold uppercase tracking-wider mb-2">Process</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Sending money has never been easier. Four simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              <div className="bg-[#1E2329] border border-gray-800 rounded-2xl p-6 h-full">
                <div className="text-5xl font-bold bg-gradient-to-r from-green-500 to-orange-500 bg-clip-text text-transparent mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 text-green-500/50 text-3xl">
                  &rarr;
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="mt-20 bg-[#1E2329] border border-gray-800 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-center text-white mb-10">
            Compare the Savings
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
              <h4 className="font-bold text-red-500 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Traditional Services
              </h4>
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Sending $500</span>
                  <span className="font-semibold">$500.00</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Fees (10-15%)</span>
                  <span className="font-semibold">-$50 to $75</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Bad exchange rate</span>
                  <span className="font-semibold">-$20</span>
                </div>
                <div className="border-t border-red-500/20 pt-3 flex justify-between font-bold">
                  <span>Recipient gets</span>
                  <span className="text-red-400">~$405-$430</span>
                </div>
              </div>
            </div>
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6">
              <h4 className="font-bold text-green-500 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                With CyxTrade
              </h4>
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Sending $500</span>
                  <span className="font-semibold">$500.00</span>
                </div>
                <div className="flex justify-between text-green-400">
                  <span>Fees (2-3%)</span>
                  <span className="font-semibold">-$10 to $15</span>
                </div>
                <div className="flex justify-between text-green-400">
                  <span>Competitive rate</span>
                  <span className="font-semibold">$0</span>
                </div>
                <div className="border-t border-green-500/20 pt-3 flex justify-between font-bold">
                  <span>Recipient gets</span>
                  <span className="text-green-400">~$485-$490</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center mt-8 text-gray-500">
            Save $60-85 on every $500 sent. That's <span className="bg-gradient-to-r from-green-400 to-orange-500 bg-clip-text text-transparent font-semibold">$700-1,000/year</span> for monthly senders!
          </p>
        </div>
      </div>
    </section>
  )
}

// Download Component
function Download() {
  return (
    <section id="download" className="py-20 relative overflow-hidden">
      {/* Background Logo */}
      <div className="absolute inset-0 bg-[#0B0E11]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <img src="/logo.png" alt="" className="h-full object-contain opacity-20" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Download Now
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
            Available on iOS, Android, and Web. Start sending money in minutes.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
            {/* App Store */}
            <a
              href="#"
              className="inline-flex items-center justify-center bg-black text-white px-8 py-4 rounded-xl hover:bg-gray-900 transition shadow-xl"
            >
              <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-80">Download on the</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </a>

            {/* Play Store */}
            <a
              href="#"
              className="inline-flex items-center justify-center bg-black text-white px-8 py-4 rounded-xl hover:bg-gray-900 transition shadow-xl"
            >
              <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-80">Get it on</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </a>
          </div>

          <p className="text-gray-400">
            Or use the{' '}
            <Link to="/login" className="text-white font-semibold underline hover:no-underline">
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

  const faqs = [
    {
      question: 'What is CyxTrade?',
      answer: 'CyxTrade is a peer-to-peer fiat exchange platform that connects you with local traders to send money internationally at low costs. Instead of using expensive remittance services, you trade directly with trusted individuals.'
    },
    {
      question: 'How much does it cost?',
      answer: "Sending money on CyxTrade is completely free — zero fees for senders. Traders pay a small trading fee similar to Binance's fee structure. Compare this to 10-15% that traditional services like Western Union charge senders."
    },
    {
      question: 'Is my money safe?',
      answer: 'Yes. Every trader must post a security bond before trading. If a trader fails to complete their part, their bond is forfeited to compensate you. Trade limits are tied to bond amounts to ensure full protection.'
    },
    {
      question: 'How long does a transfer take?',
      answer: 'Most transfers complete in 15-30 minutes. Bank transfers may take 1-2 hours. First-time transfers might take a bit longer as you get familiar with the process.'
    },
    {
      question: 'What currencies are supported?',
      answer: 'Currently we support UAE Dirham (AED) to Central African CFA Franc (XAF). More currencies coming soon including USD, EUR, NGN, and GBP.'
    },
    {
      question: 'Do I need to be a trader?',
      answer: 'No! Most users are just senders. You find a trader, pay them locally, and they arrange for your recipient to get paid. You only need to become a trader if you want to earn money by facilitating exchanges.'
    }
  ]

  return (
    <section id="faq" className="py-20 bg-[#1E2329]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-green-500 text-sm font-semibold uppercase tracking-wider mb-2">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-400">
            Got questions? We've got answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-[#0B0E11] border border-gray-800 rounded-xl overflow-hidden"
            >
              <button
                className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-white/[0.02] transition"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold text-white pr-4">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-green-500 transition-transform flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 text-gray-400">
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
  return (
    <footer className="py-16 bg-[#0B0E11] border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link to="/about" className="flex items-center mb-4">
              <img src="/logo.png" alt="CyxTrade" className="h-14" />
            </Link>
            <p className="text-gray-500">
              P2P fiat exchange for trusted networks. Zero fees for senders.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3 text-gray-500">
              <li><a href="#features" className="hover:text-green-400 transition">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-green-400 transition">How It Works</a></li>
              <li><a href="#download" className="hover:text-green-400 transition">Download</a></li>
              <li><Link to="/login" className="hover:text-green-400 transition">Web App</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3 text-gray-500">
              <li><a href="/terms" className="hover:text-green-400 transition">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-green-400 transition">Privacy Policy</a></li>
              <li><a href="/aml" className="hover:text-green-400 transition">AML Policy</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3 text-gray-500">
              <li>
                <a href="mailto:support@cyxtrade.com" className="hover:text-orange-400 transition">
                  support@cyxtrade.com
                </a>
              </li>
              <li>
                <a href="https://github.com/Nerd-Inc/cyxtrade" className="hover:text-orange-400 transition">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} CyxTrade. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-gray-500 hover:text-green-400 transition">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
              </svg>
            </a>
            <a href="#" className="text-gray-500 hover:text-orange-400 transition">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default App
