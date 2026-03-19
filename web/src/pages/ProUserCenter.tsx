import { useState, useContext, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DarkModeContext } from '../App'
import { useAuthStore } from '../store/auth'

// Available payment methods for selection
const AVAILABLE_PAYMENT_METHODS = [
  { id: 'adcb', name: 'Abu Dhabi Commercial Bank ADCB', recommended: true },
  { id: 'bank_transfer', name: 'Bank Transfer', recommended: true },
  { id: 'cash_deposit', name: 'Cash Deposit to Bank', recommended: true },
  { id: 'emirates_nbd', name: 'Emirates NBD', recommended: true },
  { id: 'skrill', name: 'Skrill (Moneybookers)', recommended: true },
  { id: '7eleven', name: '7-Eleven', recommended: false },
  { id: 'aani', name: 'Aani', recommended: false },
  { id: 'adib', name: 'ADIB: Abu Dhabi Islamic Bank', recommended: false },
  { id: 'mashreq', name: 'Mashreq Bank', recommended: false },
  { id: 'fab', name: 'First Abu Dhabi Bank', recommended: false },
]

// Mock user data
const MOCK_USER = {
  username: 'MrCJ12',
  avatar: 'M',
  verified: true,
  verifications: {
    email: true,
    sms: true,
    kyc: true,
    address: true,
  },
  fundingBalance: 12500.00,
  stats: {
    trades30d: 25,
    completionRate: 92.59,
    avgReleaseTime: 4.29,
    avgPayTime: 3.63,
    positiveFeedback: 98.04,
    feedbackCount: 350,
  }
}

// Mock payment methods
const MOCK_PAYMENT_METHODS = [
  {
    id: '1',
    type: 'NMB Bank',
    name: 'JOEL CHICK',
    accountNumber: '4031005239',
  },
  {
    id: '2',
    type: 'Bank Transfer',
    name: 'JOEL CHICK',
    accountNumber: '19341131',
    bankName: 'ADIB',
    iban: 'AE960500000000019341131',
  },
]

// Mock feedback data
const MOCK_FEEDBACK = [
  { id: '1', username: 'User123', rating: 'positive', comment: 'Fast and reliable trader!', date: '03/15' },
  { id: '2', username: 'CryptoKing', rating: 'positive', comment: 'Excellent service', date: '03/14' },
  { id: '3', username: 'Trader99', rating: 'positive', comment: 'Quick release, recommended!', date: '03/13' },
]

type Tab = 'payment-methods' | 'feedback' | 'blocked' | 'follows' | 'restrictions' | 'notifications'

export default function ProUserCenter() {
  const { dark } = useContext(DarkModeContext)
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('payment-methods')
  const [showBalance, setShowBalance] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState(MOCK_PAYMENT_METHODS)

  // Add Payment Method Modal State
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false)
  const [paymentSearch, setPaymentSearch] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)

  // Form fields
  const [formName, setFormName] = useState(user?.name || 'JOEL CHICK')
  const [formAccountNumber, setFormAccountNumber] = useState('')
  const [formBankName, setFormBankName] = useState('')
  const [formBranch, setFormBranch] = useState('')
  const [formIban, setFormIban] = useState('')
  const [formQrCode, setFormQrCode] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDeletePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
  }

  const filteredPaymentMethods = AVAILABLE_PAYMENT_METHODS.filter(pm =>
    pm.name.toLowerCase().includes(paymentSearch.toLowerCase())
  )

  const selectedMethodData = AVAILABLE_PAYMENT_METHODS.find(pm => pm.id === selectedPaymentMethod)

  const handleSelectPaymentMethod = (methodId: string) => {
    setSelectedPaymentMethod(methodId)
    setPaymentDropdownOpen(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.size <= 1024 * 1024) { // 1MB limit
      setFormQrCode(file)
    }
  }

  const handleAddPaymentMethod = () => {
    if (!selectedPaymentMethod || !formAccountNumber) return

    const newMethod = {
      id: Date.now().toString(),
      type: selectedMethodData?.name || '',
      name: formName,
      accountNumber: formAccountNumber,
      bankName: formBankName || undefined,
      iban: formIban || undefined,
    }

    setPaymentMethods(prev => [...prev, newMethod])

    // Reset form
    setShowAddPaymentModal(false)
    setSelectedPaymentMethod(null)
    setFormAccountNumber('')
    setFormBankName('')
    setFormBranch('')
    setFormIban('')
    setFormQrCode(null)
  }

  const resetAndCloseModal = () => {
    setShowAddPaymentModal(false)
    setSelectedPaymentMethod(null)
    setPaymentDropdownOpen(false)
    setPaymentSearch('')
    setFormAccountNumber('')
    setFormBankName('')
    setFormBranch('')
    setFormIban('')
    setFormQrCode(null)
  }

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-6">
              <Link to="/pro" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-orange-500">CyxTrade</span>
              </Link>
              <nav className="hidden md:flex items-center">
                <Link to="/pro" className={`px-4 py-4 text-sm font-medium border-b-2 border-transparent ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                  Express
                </Link>
                <Link to="/pro" className={`px-4 py-4 text-sm font-medium border-b-2 border-transparent ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                  P2P
                </Link>
                <Link to="/pro" className={`px-4 py-4 text-sm font-medium border-b-2 border-transparent ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                  Block Trade
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/pro/orders" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Orders
              </Link>
              <Link to="/pro/chat" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Chat
              </Link>
              <span className="flex items-center gap-1 text-sm text-orange-500 font-medium">
                User Center
              </span>
              <Link to="/pro" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                More
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* User Profile Section */}
        <div className={`rounded-xl p-6 mb-6 ${dark ? 'bg-gray-800' : 'bg-white'} relative overflow-hidden`}>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500"></div>
            <div className="absolute top-16 right-24 w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500"></div>
          </div>

          <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* User Info */}
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                  {MOCK_USER.avatar}
                </div>
              </div>

              <div>
                {/* Username */}
                <div className="flex items-center gap-2 mb-2">
                  <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{MOCK_USER.username}</h1>
                  {MOCK_USER.verified && (
                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  <button className={`p-1 rounded ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <svg className={`w-4 h-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>

                {/* Verification Badges */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`flex items-center gap-1 text-xs ${MOCK_USER.verifications.email ? 'text-green-500' : dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Email
                  </span>
                  <span className={`flex items-center gap-1 text-xs ${MOCK_USER.verifications.sms ? 'text-green-500' : dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    SMS
                  </span>
                  <span className={`flex items-center gap-1 text-xs ${MOCK_USER.verifications.kyc ? 'text-green-500' : dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    KYC
                  </span>
                  <span className={`flex items-center gap-1 text-xs ${MOCK_USER.verifications.address ? 'text-green-500' : dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Address
                  </span>
                </div>
              </div>
            </div>

            {/* Funding Account & Become Merchant */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`px-4 py-3 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Funding Account Value</span>
                  <svg className={`w-3.5 h-3.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${dark ? 'text-white' : 'text-gray-900'}`}>
                    {showBalance ? `$${MOCK_USER.fundingBalance.toLocaleString()}` : '••••••••••••••'}
                  </span>
                  <button onClick={() => setShowBalance(!showBalance)} className={`p-1 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                    {showBalance ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button className="px-6 py-2.5 bg-yellow-500 text-gray-900 font-semibold rounded-lg hover:bg-yellow-400 transition">
                Become merchant
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className={`rounded-xl p-4 mb-6 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`text-center p-3 rounded-lg ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <p className={`text-xs mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>30d Trades</p>
              <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{MOCK_USER.stats.trades30d} <span className="text-sm font-normal">Time(s)</span></p>
            </div>
            <div className={`text-center p-3 rounded-lg ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <p className={`text-xs mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>30d Completion Rate</p>
              <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{MOCK_USER.stats.completionRate} %</p>
            </div>
            <div className={`text-center p-3 rounded-lg ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <p className={`text-xs mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Avg. Release Time</p>
              <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{MOCK_USER.stats.avgReleaseTime} <span className="text-sm font-normal">Minute(s)</span></p>
            </div>
            <div className={`text-center p-3 rounded-lg ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <p className={`text-xs mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Avg. Pay Time</p>
              <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{MOCK_USER.stats.avgPayTime} <span className="text-sm font-normal">Minute(s)</span></p>
            </div>
            <div className={`text-center p-3 rounded-lg ${dark ? 'bg-gray-700/50' : 'bg-gray-50'} flex items-center justify-between`}>
              <div>
                <p className={`text-xs mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Positive Feedback</p>
                <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{MOCK_USER.stats.positiveFeedback}% <span className="text-sm font-normal">({MOCK_USER.stats.feedbackCount})</span></p>
              </div>
              <button className={`p-2 rounded-full ${dark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}>
                <svg className={`w-5 h-5 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`rounded-xl ${dark ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Tab Headers */}
          <div className={`flex overflow-x-auto border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('payment-methods')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === 'payment-methods'
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              P2P Payment Methods
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === 'feedback'
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              Feedback ({MOCK_USER.stats.feedbackCount})
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === 'blocked'
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              Blocked Users
            </button>
            <button
              onClick={() => setActiveTab('follows')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === 'follows'
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              Follows
            </button>
            <button
              onClick={() => setActiveTab('restrictions')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === 'restrictions'
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              Restrictions Removal Center
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === 'notifications'
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              Notification Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'payment-methods' && (
              <div>
                {/* Description */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    P2P payment methods: When you sell cryptocurrencies, the payment method added will be displayed to buyer as options to accept payment.
                    Please ensure that the account owner's name is consistent with your verified name on CyxTrade. You can add up to 20 payment methods.
                  </p>
                  <button
                    onClick={() => setShowAddPaymentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg text-sm font-medium transition whitespace-nowrap text-orange-500 border-orange-500 hover:bg-orange-500/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add a payment method
                  </button>
                </div>

                {/* Payment Methods List */}
                <div className="space-y-4">
                  {paymentMethods.map(pm => (
                    <div key={pm.id} className={`rounded-lg border ${dark ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      {/* Header */}
                      <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-orange-500 rounded"></div>
                          <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{pm.type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="text-orange-500 text-sm font-medium hover:underline">Edit</button>
                          <button
                            onClick={() => handleDeletePaymentMethod(pm.id)}
                            className="text-red-500 text-sm font-medium hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className={`text-xs mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Name</p>
                          <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{pm.name}</p>
                        </div>
                        <div>
                          <p className={`text-xs mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Bank Card/Account Number</p>
                          <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{pm.accountNumber}</p>
                        </div>
                        {pm.bankName && (
                          <div>
                            <p className={`text-xs mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Bank name</p>
                            <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{pm.bankName}</p>
                          </div>
                        )}
                        {pm.iban && (
                          <div>
                            <p className={`text-xs mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>IBAN</p>
                            <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{pm.iban}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {paymentMethods.length === 0 && (
                    <div className="text-center py-12">
                      <svg className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <p className={`${dark ? 'text-gray-400' : 'text-gray-500'}`}>No payment methods added yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'feedback' && (
              <div>
                <div className="space-y-4">
                  {MOCK_FEEDBACK.map(fb => (
                    <div key={fb.id} className={`p-4 rounded-lg ${dark ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {fb.username.charAt(0)}
                          </div>
                          <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{fb.username}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${fb.rating === 'positive' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {fb.rating === 'positive' ? 'Positive' : 'Negative'}
                          </span>
                        </div>
                        <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{fb.date}</span>
                      </div>
                      <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{fb.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'blocked' && (
              <div className="text-center py-12">
                <svg className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <p className={`${dark ? 'text-gray-400' : 'text-gray-500'}`}>No blocked users</p>
              </div>
            )}

            {activeTab === 'follows' && (
              <div className="text-center py-12">
                <svg className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className={`${dark ? 'text-gray-400' : 'text-gray-500'}`}>No followed users</p>
              </div>
            )}

            {activeTab === 'restrictions' && (
              <div className="text-center py-12">
                <svg className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className={`${dark ? 'text-gray-400' : 'text-gray-500'}`}>No restrictions on your account</p>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-4 rounded-lg ${dark ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                  <div>
                    <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>Order notifications</p>
                    <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Receive notifications for new orders</p>
                  </div>
                  <button className="w-12 h-6 bg-orange-500 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </button>
                </div>
                <div className={`flex items-center justify-between p-4 rounded-lg ${dark ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                  <div>
                    <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>Chat notifications</p>
                    <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Receive notifications for new messages</p>
                  </div>
                  <button className="w-12 h-6 bg-orange-500 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </button>
                </div>
                <div className={`flex items-center justify-between p-4 rounded-lg ${dark ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                  <div>
                    <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>Marketing emails</p>
                    <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Receive promotional emails and updates</p>
                  </div>
                  <button className={`w-12 h-6 rounded-full relative ${dark ? 'bg-gray-600' : 'bg-gray-300'}`}>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Payment Method Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl max-h-[90vh] overflow-y-auto ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Set my payment method</h3>
              <button onClick={resetAndCloseModal} className={dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              {/* Tips Banner - Only show after selecting a method */}
              {selectedPaymentMethod && (
                <div className={`p-3 rounded-lg mb-4 ${dark ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                  <div className="flex gap-2">
                    <span className="text-blue-400 mt-0.5">ⓘ</span>
                    <p className={`text-xs ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Tips: The added payment method will be shown to the buyer during the transaction to accept fiat transfers. Please ensure that the information is correct, real, and matches your KYC information on CyxTrade.
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Method Dropdown */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Payment Method</label>
                <div className="relative">
                  <button
                    onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                      paymentDropdownOpen ? 'border-orange-500' : dark ? 'border-gray-600' : 'border-gray-300'
                    } ${dark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                  >
                    {selectedPaymentMethod ? (
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                        <span>{selectedMethodData?.name}</span>
                        {selectedMethodData?.recommended && (
                          <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-500">Recommended</span>
                        )}
                      </div>
                    ) : (
                      <span className={dark ? 'text-gray-400' : 'text-gray-500'}>Select Payment Method</span>
                    )}
                    <svg className={`w-5 h-5 transition-transform ${paymentDropdownOpen ? 'rotate-180' : ''} ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {paymentDropdownOpen && (
                    <div className={`absolute left-0 right-0 top-full mt-1 rounded-lg border shadow-xl z-10 ${dark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      {/* Search */}
                      <div className="p-3 border-b border-gray-600">
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={paymentSearch}
                            onChange={(e) => setPaymentSearch(e.target.value)}
                            placeholder="Search"
                            className={`w-full pl-9 pr-4 py-2 rounded-lg border ${
                              dark ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Payment Methods List */}
                      <div className="max-h-64 overflow-y-auto p-2">
                        {filteredPaymentMethods.map(method => (
                          <button
                            key={method.id}
                            onClick={() => handleSelectPaymentMethod(method.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition ${
                              selectedPaymentMethod === method.id
                                ? dark ? 'bg-gray-600' : 'bg-orange-50'
                                : dark ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                            <span className={dark ? 'text-white' : 'text-gray-900'}>{method.name}</span>
                            {method.recommended && (
                              <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-500">Recommended</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Fields - Show after selecting payment method */}
              {selectedPaymentMethod && (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Bank Card/Account Number */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Bank Card/Account Number</label>
                    <input
                      type="text"
                      value={formAccountNumber}
                      onChange={(e) => setFormAccountNumber(e.target.value)}
                      placeholder="Please enter your bank account/card number"
                      className={`w-full px-4 py-3 rounded-lg border ${
                        dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* Bank Name */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Bank name</label>
                    <input
                      type="text"
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      placeholder="Enter the name of your bank"
                      className={`w-full px-4 py-3 rounded-lg border ${
                        dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* Account Opening Branch */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Account opening branch <span className={dark ? 'text-gray-500' : 'text-gray-400'}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formBranch}
                      onChange={(e) => setFormBranch(e.target.value)}
                      placeholder="Enter bank branch information"
                      className={`w-full px-4 py-3 rounded-lg border ${
                        dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* IBAN */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                      IBAN <span className={dark ? 'text-gray-500' : 'text-gray-400'}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formIban}
                      onChange={(e) => setFormIban(e.target.value)}
                      placeholder="IBAN"
                      className={`w-full px-4 py-3 rounded-lg border ${
                        dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* QR Code Upload */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                      QR Code <span className={dark ? 'text-gray-500' : 'text-gray-400'}>(Optional)</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.bmp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed transition ${
                        dark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {formQrCode ? (
                        <span className={`text-xs text-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{formQrCode.name.slice(0, 10)}...</span>
                      ) : (
                        <>
                          <svg className={`w-6 h-6 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Upload</span>
                        </>
                      )}
                    </button>
                    <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>(JPG/JPEG/PNG/BMP, less than 1MB)</p>
                  </div>

                  {/* Warning */}
                  <div className={`p-3 rounded-lg ${dark ? 'bg-gray-700/50' : 'bg-yellow-50'}`}>
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="text-yellow-500 font-medium">Warning:</span> Please make sure you add your bank card number for instant payments. Do not include details of other banks or payment methods. You must add the payment details of the selected bank.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={resetAndCloseModal}
                className={`flex-1 py-2.5 rounded-lg font-medium ${
                  dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPaymentMethod}
                disabled={!selectedPaymentMethod || !formAccountNumber}
                className={`flex-1 py-2.5 rounded-lg font-medium transition ${
                  selectedPaymentMethod && formAccountNumber
                    ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                    : dark ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
