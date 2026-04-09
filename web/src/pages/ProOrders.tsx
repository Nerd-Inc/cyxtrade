import { useEffect, useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useOrdersStore } from '../store/pro'
import { DarkModeContext } from '../App'


type MainTab = 'processing' | 'all' | 'pnl'
type ProcessingSubTab = 'all' | 'unpaid' | 'paid' | 'appeal'
type AllOrdersSubTab = 'all' | 'completed' | 'cancelled'

export default function ProOrders() {
  const { dark } = useContext(DarkModeContext)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { orders: storeOrders, isLoading, error, fetchOrders } = useOrdersStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mainTab, setMainTab] = useState<MainTab>('processing')
  const [processingSubTab, setProcessingSubTab] = useState<ProcessingSubTab>('all')
  const [allOrdersSubTab, setAllOrdersSubTab] = useState<AllOrdersSubTab>('all')
  const [coinFilter, setCoinFilter] = useState('all')
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const [orderTypeFilter, setOrderTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-03-31')
  const [searchQuery, setSearchQuery] = useState('')

  // Map store orders to template shape
  const orders = storeOrders.map(o => ({
    id: o.id,
    type: o.adType,
    asset: o.asset,
    date: o.createdAt ? new Date(o.createdAt).toLocaleString() : '--',
    price: o.price,
    priceCurrency: o.fiatCurrency,
    fiatAmount: o.fiatAmount,
    fiatCurrency: o.fiatCurrency,
    cryptoAmount: o.cryptoAmount,
    counterparty: o.buyerName || o.sellerName || 'Unknown',
    status: o.status,
  }))

  useEffect(() => {
    fetchOrders({})
  }, [fetchOrders])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  const handleReset = () => {
    setCoinFilter('all')
    setCurrencyFilter('all')
    setOrderTypeFilter('all')
    setDateFrom('2025-12-19')
    setDateTo('2026-03-19')
    setSearchQuery('')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Filter orders based on main tab and sub tab
  const filteredOrders = orders.filter(order => {
    // Filter by coin
    if (coinFilter !== 'all' && order.asset !== coinFilter) return false
    // Filter by order type
    if (orderTypeFilter !== 'all' && order.type !== orderTypeFilter) return false
    // Filter by search query
    if (searchQuery && !order.id.includes(searchQuery)) return false

    if (mainTab === 'processing') {
      // Processing tab shows only active orders (pending, unpaid, paid but not released, appeal)
      // For mock data, we'll simulate with status
      if (processingSubTab === 'unpaid') return order.status === 'pending' || order.status === 'unpaid'
      if (processingSubTab === 'paid') return order.status === 'paid'
      if (processingSubTab === 'appeal') return order.status === 'appeal'
      // 'all' in processing shows all non-completed/cancelled
      return order.status !== 'completed' && order.status !== 'cancelled'
    } else if (mainTab === 'all') {
      // All Orders tab filters
      if (allOrdersSubTab === 'completed') return order.status === 'completed'
      if (allOrdersSubTab === 'cancelled') return order.status === 'cancelled'
      return true // 'all' shows everything
    }
    return true
  })

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-6">
              <Link to="/pro" className="flex items-center space-x-2">
                <img src="/logo.png" alt="CyxTrade" className="h-8" />
                <span className="text-xl font-bold bg-gradient-to-r from-[#00a78e] to-[#f7941d] bg-clip-text text-transparent">CyxTrade</span>
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
              <span className="flex items-center gap-1 text-sm text-orange-500 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Orders
              </span>
              <Link to="/pro/chat" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Chat
              </Link>
              <Link to="/pro/user-center" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                User Center
              </Link>
              <Link to="/pro" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                More
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Tabs */}
        <div className={`flex items-center justify-between mb-6`}>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMainTab('processing')}
              className={`text-sm font-medium pb-2 border-b-2 transition ${
                mainTab === 'processing'
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              Processing
            </button>
            <button
              onClick={() => setMainTab('all')}
              className={`text-sm font-medium pb-2 border-b-2 transition ${
                mainTab === 'all'
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setMainTab('pnl')}
              className={`text-sm font-medium pb-2 border-b-2 transition ${
                mainTab === 'pnl'
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              Profit & Loss Statement
            </button>
          </div>
        </div>

        {/* Sub Tabs & Icons - Different for each main tab */}
        {mainTab === 'processing' && (
          <div className="flex items-center justify-between mb-4">
            <div className={`inline-flex rounded-lg p-1 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <button
                onClick={() => setProcessingSubTab('all')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  processingSubTab === 'all'
                    ? `${dark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'}`
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                All
              </button>
              <button
                onClick={() => setProcessingSubTab('unpaid')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  processingSubTab === 'unpaid'
                    ? `${dark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'}`
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Unpaid
              </button>
              <button
                onClick={() => setProcessingSubTab('paid')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  processingSubTab === 'paid'
                    ? `${dark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'}`
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setProcessingSubTab('appeal')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  processingSubTab === 'appeal'
                    ? `${dark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'}`
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Appeal in Progress
              </button>
            </div>

            <button className={`p-2 rounded-lg ${dark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>
        )}

        {mainTab === 'all' && (
          <div className="flex items-center justify-between mb-4">
            <div className={`inline-flex rounded-lg p-1 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <button
                onClick={() => setAllOrdersSubTab('all')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  allOrdersSubTab === 'all'
                    ? `${dark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'}`
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAllOrdersSubTab('completed')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  allOrdersSubTab === 'completed'
                    ? `${dark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'}`
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setAllOrdersSubTab('cancelled')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  allOrdersSubTab === 'cancelled'
                    ? `${dark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'}`
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Cancelled
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button className={`p-2 rounded-lg ${dark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button className={`p-2 rounded-lg ${dark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button className={`p-2 rounded-lg ${dark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Filters - Different for each tab */}
        {(mainTab === 'processing' || mainTab === 'all') && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Coins */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Coins</span>
              <select
                value={coinFilter}
                onChange={(e) => setCoinFilter(e.target.value)}
                className={`text-sm font-medium bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
              >
                <option value="all">All coins</option>
                <option value="USDT">USDT</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>

            {/* Currency */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Currency</span>
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className={`text-sm font-medium bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
              >
                <option value="all">All</option>
                <option value="XAF">XAF</option>
                <option value="AED">AED</option>
                <option value="TZS">TZS</option>
              </select>
            </div>

            {/* Order Type */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Order Type</span>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className={`text-sm font-medium bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
              >
                <option value="all">All</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>

            {/* Search */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <svg className={`w-4 h-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order no."
                className={`text-sm bg-transparent border-none focus:outline-none placeholder-gray-500 ${dark ? 'text-white' : 'text-gray-900'}`}
              />
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="text-orange-500 text-sm font-medium hover:underline"
            >
              Reset
            </button>
          </div>
        )}

        {/* P&L Filters */}
        {mainTab === 'pnl' && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Coins */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Coins</span>
              <select
                value={coinFilter}
                onChange={(e) => setCoinFilter(e.target.value)}
                className={`text-sm font-medium bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
              >
                <option value="all">All coins</option>
                <option value="USDT">USDT</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>

            {/* Type */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Type</span>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className={`text-sm font-medium bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
              >
                <option value="all">All</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>

            {/* Date Range */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Date</span>
              <svg className={`w-4 h-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <input
                type="month"
                value={dateFrom.slice(0, 7)}
                onChange={(e) => setDateFrom(e.target.value + '-01')}
                className={`text-sm bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
              />
              <span className={dark ? 'text-gray-500' : 'text-gray-400'}>→</span>
              <input
                type="month"
                value={dateTo.slice(0, 7)}
                onChange={(e) => setDateTo(e.target.value + '-28')}
                className={`text-sm bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
              />
              <svg className={`w-4 h-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Search Button */}
            <button className="px-4 py-2 bg-yellow-500 text-black text-sm font-medium rounded-lg hover:bg-yellow-400 transition">
              Search
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Reset
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Export Icons */}
            <div className="flex items-center gap-2">
              <button className={`p-2 rounded-lg ${dark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button className={`p-2 rounded-lg ${dark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Orders Table (Processing & All Orders tabs) */}
        {(mainTab === 'processing' || mainTab === 'all') && (
          <div className={`rounded-xl overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Table Header */}
            <div className={`grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium uppercase tracking-wider ${dark ? 'text-gray-500 border-b border-gray-700' : 'text-gray-400 border-b border-gray-200'}`}>
              <div className="col-span-2">Type/Date</div>
              <div className="col-span-2">Order number</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-2">Fiat / Crypto Amount</div>
              <div className="col-span-2">Counterparty</div>
              <div className="col-span-2">Status</div>
            </div>

            {/* Table Rows */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16">
                {/* Empty state icon */}
                <div className={`mx-auto w-16 h-16 mb-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`}>
                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    <circle cx="15" cy="9" r="3" strokeWidth={1} />
                  </svg>
                </div>
                <p className={`${dark ? 'text-gray-500' : 'text-gray-400'}`}>No records</p>
              </div>
            ) : (
              <div className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {filteredOrders.map(order => (
                  <div
                    key={order.id}
                    className={`grid grid-cols-12 gap-4 px-4 py-4 items-center cursor-pointer transition ${dark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                    onClick={() => navigate(`/pro/order/${order.id}`)}
                  >
                    {/* Type/Date */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-medium ${order.type === 'buy' ? 'text-green-500' : 'text-yellow-500'}`}>
                          {order.type === 'buy' ? 'Buy' : 'Sell'}
                        </span>
                        <span className={`text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{order.asset}</span>
                      </div>
                      <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{order.date}</p>
                    </div>

                    {/* Order Number */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <span className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'} font-mono`}>
                          {order.id.slice(0, 18)}...
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(order.id)
                          }}
                          className={`p-1 rounded ${dark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                        >
                          <svg className={`w-3.5 h-3.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="col-span-2">
                      <span className={`text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>
                        {order.price.toLocaleString()} {order.priceCurrency}
                      </span>
                    </div>

                    {/* Fiat / Crypto Amount */}
                    <div className="col-span-2">
                      <p className={`text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>
                        {order.fiatAmount.toLocaleString()} {order.fiatCurrency}
                      </p>
                      <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {order.cryptoAmount} {order.asset}
                      </p>
                    </div>

                    {/* Counterparty */}
                    <div className="col-span-2">
                      <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{order.counterparty}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate('/pro/chat')
                        }}
                        className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs ${dark ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        Chat
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <p className={`text-sm ${order.status === 'completed' ? 'text-green-500' : order.status === 'cancelled' ? dark ? 'text-gray-400' : 'text-gray-500' : 'text-yellow-500'}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </p>
                      {order.status === 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                          className="text-orange-500 text-xs hover:underline"
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profit & Loss Statement Content */}
        {mainTab === 'pnl' && (
          <div className="text-center py-16">
            <div className={`mx-auto w-16 h-16 mb-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`}>
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className={`text-lg font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>P&L Analytics</p>
            <p className={`text-sm mt-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Coming soon — trade P&L tracking is being built</p>
          </div>
        )}
      </main>

      {/* Help Button */}
      <button className="fixed bottom-6 right-6 w-12 h-12 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition flex items-center justify-center">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>
    </div>
  )
}
