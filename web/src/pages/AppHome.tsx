import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

// Comprehensive currency list with symbols, flags, and colors
const CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', color: '#2E7D32' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', flag: '🇦🇫', color: '#D32F2F' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷', color: '#1565C0' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', flag: '🇦🇺', color: '#FFB300' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩', color: '#2E7D32' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', color: '#2E7D32' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', flag: '🇨🇦', color: '#D32F2F' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', color: '#D32F2F' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', color: '#C62828' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£', flag: '🇪🇬', color: '#C62828' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', color: '#1565C0' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', color: '#7B1FA2' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭', color: '#FBC02D' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', color: '#C62828' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', color: '#FF6F00' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', color: '#C62828' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', color: '#2E7D32' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', color: '#1565C0' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', flag: '🇲🇦', color: '#C62828' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', color: '#2E7D32' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', color: '#1565C0' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', color: '#2E7D32' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', color: '#1565C0' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰', color: '#2E7D32' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦', color: '#7B1FA2' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦', color: '#2E7D32' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$', flag: '🇸🇬', color: '#C62828' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', color: '#1565C0' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', color: '#C62828' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿', color: '#2E7D32' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬', color: '#FBC02D' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', color: '#2E7D32' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', color: '#C62828' },
  { code: 'XAF', name: 'CFA Franc BEAC', symbol: 'FCFA', flag: '🇨🇲', color: '#2E7D32' },
  { code: 'XOF', name: 'CFA Franc BCEAO', symbol: 'CFA', flag: '🇸🇳', color: '#2E7D32' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', color: '#2E7D32' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', flag: '🇿🇲', color: '#2E7D32' },
]

// Country to currency mapping for IP detection
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'United Arab Emirates': 'AED',
  'UAE': 'AED',
  'Saudi Arabia': 'SAR',
  'Qatar': 'QAR',
  'Kuwait': 'KWD',
  'Bahrain': 'BHD',
  'Oman': 'OMR',
  'United States': 'USD',
  'USA': 'USD',
  'United Kingdom': 'GBP',
  'UK': 'GBP',
  'France': 'EUR',
  'Germany': 'EUR',
  'Italy': 'EUR',
  'Spain': 'EUR',
  'Netherlands': 'EUR',
  'Belgium': 'EUR',
  'Nigeria': 'NGN',
  'Ghana': 'GHS',
  'Kenya': 'KES',
  'Tanzania': 'TZS',
  'Uganda': 'UGX',
  'South Africa': 'ZAR',
  'Cameroon': 'XAF',
  'Senegal': 'XOF',
  'India': 'INR',
  'Pakistan': 'PKR',
  'Bangladesh': 'BDT',
  'Indonesia': 'IDR',
  'Malaysia': 'MYR',
  'Philippines': 'PHP',
  'Thailand': 'THB',
  'Vietnam': 'VND',
  'China': 'CNY',
  'Japan': 'JPY',
  'South Korea': 'KRW',
  'Egypt': 'EGP',
  'Morocco': 'MAD',
  'Turkey': 'TRY',
  'Brazil': 'BRL',
  'Mexico': 'MXN',
  'Canada': 'CAD',
  'Australia': 'AUD',
  'Singapore': 'SGD',
  'Switzerland': 'CHF',
}

// Payment methods by currency
const PAYMENT_METHODS_BY_CURRENCY: Record<string, string[]> = {
  XAF: ['MTN Mobile Money', 'Orange Money', 'MoMo', 'Ecobank', 'UBA Cameroun', 'Afriland First Bank', 'Bank Transfer'],
  XOF: ['Orange Money', 'MTN Mobile Money', 'Wave', 'Moov Money', 'Ecobank', 'UBA', 'Bank Transfer'],
  NGN: ['Bank Transfer', 'Opay', 'Palmpay', 'Kuda', 'GTBank', 'Access Bank', 'First Bank'],
  KES: ['M-Pesa', 'Airtel Money', 'Bank Transfer', 'Equity Bank', 'KCB'],
  GHS: ['MTN Mobile Money', 'Vodafone Cash', 'AirtelTigo Money', 'Bank Transfer'],
  AED: ['Bank Transfer', 'ADCB', 'Emirates NBD', 'FAB', 'Mashreq', 'Apple Pay'],
  SAR: ['Bank Transfer', 'Al Rajhi Bank', 'SNB', 'Riyad Bank', 'STC Pay'],
  USD: ['Bank Transfer', 'Zelle', 'Venmo', 'Cash App', 'PayPal', 'Wise'],
  EUR: ['Bank Transfer', 'SEPA', 'Revolut', 'Wise', 'N26', 'PayPal'],
  GBP: ['Bank Transfer', 'Faster Payments', 'Revolut', 'Monzo', 'Wise'],
  INR: ['UPI', 'Paytm', 'PhonePe', 'Google Pay', 'IMPS', 'Bank Transfer'],
  PKR: ['JazzCash', 'Easypaisa', 'Bank Transfer', 'HBL', 'UBL'],
  DEFAULT: ['Bank Transfer', 'Mobile Money', 'PayPal', 'Wise', 'Cash'],
}

// Mock trader data
const MOCK_TRADERS = [
  { id: '1', name: 'Mamadou Diallo', avatar: 'M', avatarColor: '#22C55E', verified: true, orders: 314, completionRate: 99.70, rating: 4.9, responseTime: 15, fromCurrency: 'AED', toCurrency: 'XAF', rate: 163.50, minLimit: 100, maxLimit: 5000, available: 15000, paymentMethods: ['Bank Transfer', 'Emirates NBD'], conditions: 'Please send exact amount. Payment must be from your own bank account. No third-party payments accepted.' },
  { id: '2', name: 'Ibrahim Sow', avatar: 'I', avatarColor: '#F97316', verified: true, orders: 187, completionRate: 98.90, rating: 4.8, responseTime: 10, fromCurrency: 'AED', toCurrency: 'XAF', rate: 162.80, minLimit: 200, maxLimit: 3000, available: 8500, paymentMethods: ['Bank Transfer', 'Orange Money'], conditions: 'Fast delivery within 10 minutes. Please include your order number in the payment reference.' },
  { id: '3', name: 'Fatou Ndiaye', avatar: 'F', avatarColor: '#8B5CF6', verified: true, orders: 421, completionRate: 99.95, rating: 5.0, responseTime: 5, fromCurrency: 'AED', toCurrency: 'XAF', rate: 163.20, minLimit: 50, maxLimit: 10000, available: 45000, paymentMethods: ['MTN Mobile Money', 'Bank Transfer'], conditions: 'Available 24/7. Recipient must have valid ID for cash pickup. MTN Mobile Money preferred for faster processing.' },
  { id: '4', name: 'Ousmane Barry', avatar: 'O', avatarColor: '#06B6D4', verified: false, orders: 89, completionRate: 97.50, rating: 4.6, responseTime: 20, fromCurrency: 'AED', toCurrency: 'XAF', rate: 164.00, minLimit: 100, maxLimit: 2000, available: 5200, paymentMethods: ['Bank Transfer'], conditions: 'Bank transfer only. Processing time may vary on weekends.' },
  { id: '5', name: 'Aminata Camara', avatar: 'A', avatarColor: '#EC4899', verified: true, orders: 256, completionRate: 99.20, rating: 4.85, responseTime: 8, fromCurrency: 'AED', toCurrency: 'XAF', rate: 163.00, minLimit: 150, maxLimit: 8000, available: 22000, paymentMethods: ['MoMo', 'Orange Money', 'Bank Transfer'], conditions: 'Please confirm recipient phone number is active before placing order. I deliver to all regions in Cameroon.' },
  { id: '6', name: 'Moussa Keita', avatar: 'M', avatarColor: '#EAB308', verified: true, orders: 542, completionRate: 99.80, rating: 4.95, responseTime: 3, fromCurrency: 'AED', toCurrency: 'XAF', rate: 162.50, minLimit: 500, maxLimit: 15000, available: 68000, paymentMethods: ['Bank Transfer', 'FAB'], conditions: 'Large amounts welcome. For orders above 10,000 AED, please contact me first via chat. Best rates for repeat customers.' },
  { id: '7', name: 'Aissatou Bah', avatar: 'A', avatarColor: '#14B8A6', verified: false, orders: 45, completionRate: 95.00, rating: 4.4, responseTime: 25, fromCurrency: 'AED', toCurrency: 'XAF', rate: 164.50, minLimit: 100, maxLimit: 1500, available: 3800, paymentMethods: ['MTN Mobile Money'], conditions: 'MTN Mobile Money only. Available from 8AM to 10PM WAT. Please be patient during peak hours.' },
  { id: '8', name: 'Boubacar Traore', avatar: 'B', avatarColor: '#3B82F6', verified: true, orders: 678, completionRate: 99.90, rating: 4.98, responseTime: 4, fromCurrency: 'AED', toCurrency: 'XAF', rate: 163.10, minLimit: 200, maxLimit: 20000, available: 95000, paymentMethods: ['Bank Transfer', 'ADCB', 'Orange Money'], conditions: 'Professional trader with 5+ years experience. Instant release upon payment confirmation. VIP service for orders above 5,000 AED.' },
]

export default function AppHome() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Currency selection
  const [fromCurrency, setFromCurrency] = useState('AED')
  const [toCurrency, setToCurrency] = useState('XAF')
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null)

  // Modal states
  const [showFromCurrencyModal, setShowFromCurrencyModal] = useState(false)
  const [showToCurrencyModal, setShowToCurrencyModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAmountModal, setShowAmountModal] = useState(false)
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)

  // Filters
  const [currencySearch, setCurrencySearch] = useState('')
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [amountFilter, setAmountFilter] = useState('')

  // Expanded trader form
  const [expandedTraderId, setExpandedTraderId] = useState<string | null>(null)
  const [sendAmount, setSendAmount] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientBank, setRecipientBank] = useState('')
  const [recipientAccount, setRecipientAccount] = useState('')

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedTrader, setSelectedTrader] = useState<typeof MOCK_TRADERS[0] | null>(null)
  const [isCreatingTrade, setIsCreatingTrade] = useState(false)

  const moreDropdownRef = useRef<HTMLDivElement>(null)

  // Detect user's currency based on IP
  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const res = await fetch('https://ip-api.com/json/?fields=country')
        const data = await res.json()
        if (data.country) {
          setDetectedCountry(data.country)
          const currency = COUNTRY_TO_CURRENCY[data.country]
          if (currency) {
            setFromCurrency(currency)
          }
        }
      } catch (e) {
        console.log('Could not detect location')
      }
    }
    detectCurrency()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setShowMoreDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  // Filter currencies
  const filteredCurrencies = useMemo(() => {
    const search = currencySearch.toLowerCase()
    return CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(search) ||
      c.name.toLowerCase().includes(search)
    )
  }, [currencySearch])

  // Get payment methods for selected fromCurrency
  const availablePaymentMethods = useMemo(() => {
    return PAYMENT_METHODS_BY_CURRENCY[fromCurrency] || PAYMENT_METHODS_BY_CURRENCY.DEFAULT
  }, [fromCurrency])

  // Filter traders based on corridor and filters
  const filteredTraders = useMemo(() => {
    let traders = MOCK_TRADERS.map(t => ({
      ...t,
      fromCurrency,
      toCurrency,
      // Adjust rate based on currencies (mock calculation)
      rate: t.rate * (fromCurrency === 'USD' ? 4 : fromCurrency === 'EUR' ? 4.4 : fromCurrency === 'GBP' ? 5.1 : 1)
    }))

    // Filter by amount
    if (amountFilter) {
      const amount = parseFloat(amountFilter)
      if (!isNaN(amount)) {
        traders = traders.filter(t => amount >= t.minLimit && amount <= t.maxLimit)
      }
    }

    // Filter by payment methods
    if (selectedPayments.length > 0) {
      traders = traders.filter(t =>
        t.paymentMethods.some(pm => selectedPayments.includes(pm))
      )
    }

    return traders
  }, [fromCurrency, toCurrency, amountFilter, selectedPayments])

  const fromCurrencyData = CURRENCIES.find(c => c.code === fromCurrency)
  const toCurrencyData = CURRENCIES.find(c => c.code === toCurrency)

  const handleSelectFromCurrency = (code: string) => {
    setFromCurrency(code)
    setShowFromCurrencyModal(false)
    setCurrencySearch('')
    setSelectedPayments([])
  }

  const handleSelectToCurrency = (code: string) => {
    setToCurrency(code)
    setShowToCurrencyModal(false)
    setCurrencySearch('')
  }

  const handleTogglePayment = (method: string) => {
    setSelectedPayments(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    )
  }

  const handleStartTrade = (traderId: string) => {
    if (expandedTraderId === traderId) {
      setExpandedTraderId(null)
    } else {
      setExpandedTraderId(traderId)
      setSendAmount('')
      setRecipientName('')
      setRecipientPhone('')
      setRecipientBank('')
      setRecipientAccount('')
    }
  }

  const handleConfirmTrade = (trader: typeof MOCK_TRADERS[0]) => {
    if (!sendAmount || !recipientName || !recipientPhone) {
      return
    }
    // Show confirmation modal
    setSelectedTrader(trader)
    setShowConfirmModal(true)
  }

  const handleCreateTrade = async () => {
    if (!selectedTrader) return

    setIsCreatingTrade(true)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Navigate to chat with trade details
    navigate('/app/chat', {
      state: {
        traderId: selectedTrader.id,
        traderName: selectedTrader.name,
        sendAmount: parseFloat(sendAmount),
        sendCurrency: fromCurrency,
        receiveAmount: parseFloat(sendAmount) * selectedTrader.rate,
        receiveCurrency: toCurrency,
        rate: selectedTrader.rate,
        recipientName,
        recipientPhone,
        recipientBank,
        recipientAccount,
      }
    })
  }

  const calculateReceiveAmount = (amount: string, rate: number) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0.00'
    return (num * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="min-h-screen bg-[#0B0E11]">
      {/* Header */}
      <header className="bg-[#0B0E11]/95 backdrop-blur-md border-b border-gray-800/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link to="/app" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-green-500">CyxTrade</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {/* Orders */}
              <Link to="/app/history" className="text-sm text-gray-400 hover:text-white transition">
                Orders
              </Link>

              {/* Chat */}
              <Link to="/app/chat" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </Link>

              {/* User Center */}
              <Link to="/app/profile" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                User Center
              </Link>

              {/* CyxTrade Pro - Prominent link */}
              <Link to="/pro" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-500 bg-orange-500/10 border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Pro
              </Link>

              {/* More Dropdown */}
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition"
                >
                  More
                  <svg className={`w-4 h-4 transition-transform ${showMoreDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showMoreDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#1E2329] border border-gray-700 rounded-xl shadow-xl py-2">
                    {user?.isTrader && (
                      <>
                        <Link to="/app/trader-dashboard" className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-white/5 transition">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Trader Dashboard
                        </Link>
                        <Link to="/app/post-ad" className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-white/5 transition">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Post Ad
                        </Link>
                      </>
                    )}
                    <Link to="/become-trader" className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-white/5 transition">
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Become a Trader
                    </Link>
                    <Link to="/app/settings" className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-white/5 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <div className="border-t border-gray-700 my-2" />
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Location Banner */}
        {detectedCountry && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Detected location: <span className="text-white font-medium">{detectedCountry}</span></span>
          </div>
        )}

        {/* Currency Filters */}
        <div className="bg-[#1E2329] rounded-2xl border border-gray-800 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* I Have */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">I Have</label>
              <button
                onClick={() => setShowFromCurrencyModal(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white hover:border-green-500/50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{fromCurrencyData?.flag}</span>
                  <div className="text-left">
                    <span className="font-semibold">{fromCurrency}</span>
                    <span className="text-gray-400 text-sm ml-2">{fromCurrencyData?.name}</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Swap Arrow */}
            <div className="hidden md:flex items-center justify-center w-10 h-10 mt-6">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>

            {/* Recipient Gets */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Recipient Gets</label>
              <button
                onClick={() => setShowToCurrencyModal(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white hover:border-orange-500/50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{toCurrencyData?.flag}</span>
                  <div className="text-left">
                    <span className="font-semibold">{toCurrency}</span>
                    <span className="text-gray-400 text-sm ml-2">{toCurrencyData?.name}</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-700/50">
            {/* Amount Filter */}
            <button
              onClick={() => setShowAmountModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                amountFilter
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-[#2B3139] border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {amountFilter ? `${fromCurrency} ${amountFilter}` : 'Amount'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Payment Method Filter */}
            <button
              onClick={() => setShowPaymentModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                selectedPayments.length > 0
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-[#2B3139] border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {selectedPayments.length > 0 ? `${selectedPayments.length} selected` : 'Payment Method'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Clear Filters */}
            {(amountFilter || selectedPayments.length > 0) && (
              <button
                onClick={() => {
                  setAmountFilter('')
                  setSelectedPayments([])
                }}
                className="text-sm text-gray-500 hover:text-white transition"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Traders Count */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Available Traders <span className="text-gray-500">({filteredTraders.length})</span>
          </h2>
          <div className="text-sm text-gray-400">
            Best rate: <span className="text-green-400 font-semibold">{Math.max(...filteredTraders.map(t => t.rate)).toFixed(2)} {toCurrency}/{fromCurrency}</span>
          </div>
        </div>

        {/* Trader List */}
        <div className="space-y-3">
          {filteredTraders.map((trader) => (
            <div
              key={trader.id}
              className="bg-[#1E2329] rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition"
            >
              {/* Trader Card */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Trader Info */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: trader.avatarColor }}
                    >
                      {trader.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{trader.name}</span>
                        {trader.verified && (
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>{trader.orders} orders</span>
                        <span>|</span>
                        <span>{trader.completionRate}% completion</span>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {trader.rating}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {trader.paymentMethods.map((pm) => (
                          <span
                            key={pm}
                            className="px-2 py-0.5 bg-[#2B3139] text-gray-400 text-xs rounded"
                          >
                            {pm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rate & Action */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-white">{trader.rate.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{toCurrency} per {fromCurrency}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Limit: {fromCurrencyData?.symbol}{trader.minLimit.toLocaleString()} - {fromCurrencyData?.symbol}{trader.maxLimit.toLocaleString()}
                    </div>
                    <button
                      onClick={() => handleStartTrade(trader.id)}
                      className={`mt-3 px-6 py-2 font-semibold text-sm rounded-lg transition ${
                        expandedTraderId === trader.id
                          ? 'bg-gray-600 text-white'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {expandedTraderId === trader.id ? 'Cancel' : `Buy ${toCurrency}`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Trade Form */}
              {expandedTraderId === trader.id && (
                <div className="border-t border-gray-700 p-4 bg-[#1A1E23]">
                  {/* Trader Conditions */}
                  <div className="mb-4 p-3 bg-[#2B3139] rounded-xl border border-gray-700">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Trader's Conditions</p>
                        <p className="text-sm text-gray-300">{trader.conditions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Send Amount */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                        I want to send
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={sendAmount}
                          onChange={(e) => setSendAmount(e.target.value)}
                          placeholder={`${trader.minLimit} - ${trader.maxLimit}`}
                          className="w-full px-4 py-3 pr-16 bg-[#2B3139] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                          {fromCurrency}
                        </span>
                      </div>
                      {sendAmount && (
                        <p className="text-sm text-gray-400 mt-2">
                          Recipient gets: <span className="text-green-400 font-semibold">{calculateReceiveAmount(sendAmount, trader.rate)} {toCurrency}</span>
                        </p>
                      )}
                    </div>

                    {/* Recipient Name */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                        Recipient Name *
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Full name as on ID"
                        className="w-full px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                    </div>

                    {/* Recipient Phone */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                        Recipient Phone *
                      </label>
                      <input
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="+237 6XX XXX XXX"
                        className="w-full px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                    </div>

                    {/* Recipient Bank (Optional) */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                        Bank / Mobile Money (Optional)
                      </label>
                      <input
                        type="text"
                        value={recipientBank}
                        onChange={(e) => setRecipientBank(e.target.value)}
                        placeholder="e.g., MTN Mobile Money"
                        className="w-full px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                    </div>

                    {/* Recipient Account (Optional) */}
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                        Account Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={recipientAccount}
                        onChange={(e) => setRecipientAccount(e.target.value)}
                        placeholder="Bank account or mobile money number"
                        className="w-full px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                      <span className="text-gray-500">Fee:</span> <span className="text-gray-300">0.5%</span>
                      <span className="mx-2">|</span>
                      <span className="text-gray-500">Time:</span> <span className="text-white">~{trader.responseTime} min</span>
                    </div>
                    <button
                      onClick={() => handleConfirmTrade(trader)}
                      disabled={!sendAmount || !recipientName || !recipientPhone}
                      className="px-8 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
                    >
                      Confirm Trade
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredTraders.length === 0 && (
            <div className="text-center py-16 bg-[#1E2329] rounded-xl border border-gray-800">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-white mb-2">No traders found</h3>
              <p className="text-gray-400">Try adjusting your filters or selecting a different currency pair.</p>
            </div>
          )}
        </div>
      </main>

      {/* Static Assistant Button */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center text-white hover:scale-105 transition-transform"
        onClick={() => navigate('/app/support')}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* From Currency Modal */}
      {showFromCurrencyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowFromCurrencyModal(false)}>
          <div className="bg-[#1E2329] rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Select Currency (I Have)</h3>
                <button onClick={() => setShowFromCurrencyModal(false)} className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={currencySearch}
                onChange={(e) => setCurrencySearch(e.target.value)}
                placeholder="Search currency..."
                className="w-full px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {filteredCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => handleSelectFromCurrency(currency.code)}
                  className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition ${
                    fromCurrency === currency.code ? 'bg-green-500/10' : ''
                  }`}
                >
                  <span className="text-2xl">{currency.flag}</span>
                  <div className="text-left">
                    <span className="text-white font-medium">{currency.code}</span>
                    <span className="text-gray-400 text-sm ml-2">{currency.name}</span>
                  </div>
                  {fromCurrency === currency.code && (
                    <svg className="w-5 h-5 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* To Currency Modal */}
      {showToCurrencyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowToCurrencyModal(false)}>
          <div className="bg-[#1E2329] rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Select Currency (Recipient Gets)</h3>
                <button onClick={() => setShowToCurrencyModal(false)} className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={currencySearch}
                onChange={(e) => setCurrencySearch(e.target.value)}
                placeholder="Search currency..."
                className="w-full px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {filteredCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => handleSelectToCurrency(currency.code)}
                  className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition ${
                    toCurrency === currency.code ? 'bg-orange-500/10' : ''
                  }`}
                >
                  <span className="text-2xl">{currency.flag}</span>
                  <div className="text-left">
                    <span className="text-white font-medium">{currency.code}</span>
                    <span className="text-gray-400 text-sm ml-2">{currency.name}</span>
                  </div>
                  {toCurrency === currency.code && (
                    <svg className="w-5 h-5 text-orange-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-[#1E2329] rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Payment Methods</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-4">
              {availablePaymentMethods.map((method) => (
                <button
                  key={method}
                  onClick={() => handleTogglePayment(method)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-2 transition ${
                    selectedPayments.includes(method)
                      ? 'bg-orange-500/10 border border-orange-500/30'
                      : 'bg-[#2B3139] border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <span className="text-white">{method}</span>
                  {selectedPayments.includes(method) && (
                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setSelectedPayments([])}
                className="flex-1 px-4 py-3 bg-[#2B3139] text-white rounded-xl hover:bg-[#3C4149] transition"
              >
                Reset
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amount Filter Modal */}
      {showAmountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAmountModal(false)}>
          <div className="bg-[#1E2329] rounded-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Filter by Amount</h3>
                <button onClick={() => setShowAmountModal(false)} className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-400 mb-2">Enter amount in {fromCurrency}</label>
              <input
                type="number"
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
                placeholder="e.g., 500"
                className="w-full px-4 py-3 bg-[#2B3139] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">Only show traders who accept this amount</p>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setAmountFilter('')
                  setShowAmountModal(false)
                }}
                className="flex-1 px-4 py-3 bg-[#2B3139] text-white rounded-xl hover:bg-[#3C4149] transition"
              >
                Clear
              </button>
              <button
                onClick={() => setShowAmountModal(false)}
                className="flex-1 px-4 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Confirmation Modal */}
      {showConfirmModal && selectedTrader && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !isCreatingTrade && setShowConfirmModal(false)}>
          <div className="bg-[#1E2329] rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Confirm Trade</h3>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isCreatingTrade}
                  className="text-gray-400 hover:text-white disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Timer Warning */}
            <div className="mx-4 mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold">15-Minute Timer</p>
                  <p className="text-orange-300/80 text-sm mt-1">
                    Once you create this trade, you have <span className="font-bold">15 minutes</span> to complete the payment.
                    The trade will be automatically cancelled if payment is not confirmed within this time.
                  </p>
                </div>
              </div>
            </div>

            {/* Trade Summary */}
            <div className="p-4">
              <h4 className="text-sm text-gray-400 font-medium uppercase tracking-wide mb-3">Trade Summary</h4>

              {/* Amount Section */}
              <div className="bg-[#2B3139] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">You Send</span>
                  <span className="text-xl font-bold text-white">
                    {fromCurrencyData?.symbol} {parseFloat(sendAmount).toLocaleString()} {fromCurrency}
                  </span>
                </div>
                <div className="flex items-center justify-center my-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Recipient Gets</span>
                  <span className="text-xl font-bold text-green-400">
                    {toCurrencyData?.symbol} {calculateReceiveAmount(sendAmount, selectedTrader.rate)} {toCurrency}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Exchange Rate</span>
                  <span className="text-gray-300">1 {fromCurrency} = {selectedTrader.rate.toFixed(2)} {toCurrency}</span>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="bg-[#2B3139] rounded-xl p-4 mb-4">
                <h5 className="text-sm text-gray-400 font-medium mb-3">Recipient Details</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="text-white font-medium">{recipientName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-white font-medium">{recipientPhone}</span>
                  </div>
                  {recipientBank && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Bank / Mobile Money</span>
                      <span className="text-white font-medium">{recipientBank}</span>
                    </div>
                  )}
                  {recipientAccount && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Account Number</span>
                      <span className="text-white font-medium">{recipientAccount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Trader Info */}
              <div className="bg-[#2B3139] rounded-xl p-4 mb-4">
                <h5 className="text-sm text-gray-400 font-medium mb-3">Trader</h5>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: selectedTrader.avatarColor }}
                  >
                    {selectedTrader.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{selectedTrader.name}</span>
                      {selectedTrader.verified && (
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{selectedTrader.orders} orders</span>
                      <span>|</span>
                      <span>{selectedTrader.completionRate}%</span>
                      <span>|</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {selectedTrader.rating}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Info */}
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-gray-500">Platform Fee (0.5%)</span>
                <span className="text-gray-300 font-medium">
                  {fromCurrencyData?.symbol} {(parseFloat(sendAmount) * 0.005).toFixed(2)} {fromCurrency}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isCreatingTrade}
                className="flex-1 px-4 py-3 bg-[#2B3139] text-white rounded-xl hover:bg-[#3C4149] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTrade}
                disabled={isCreatingTrade}
                className="flex-1 px-4 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreatingTrade ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Trade...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Trade
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
