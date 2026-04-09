import { useEffect, useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdsStore } from '../store/pro'
import { DarkModeContext } from '../App'

type AdTab = 'normal' | 'cash' | 'block' | 'fiat' | 'premium'

export default function MyAds() {
  const { dark } = useContext(DarkModeContext)
  const navigate = useNavigate()
  const { myAds, fetchMyAds, updateAd, deleteAd, isLoading } = useAdsStore()

  const [adTab, setAdTab] = useState<AdTab>('normal')
  const [assetFilter, setAssetFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedAds, setSelectedAds] = useState<string[]>([])

  // Map store data to template shape
  const ads = myAds.map(ad => ({
    id: ad.id,
    type: ad.type,
    asset: ad.asset,
    fiat: ad.fiatCurrency,
    totalAmount: ad.availableAmount || 0,
    completedQty: ad.completedCount || 0,
    minLimit: ad.minAmount,
    maxLimit: ad.maxAmount,
    price: ad.price,
    exchangeRate: null as string | null,
    paymentMethods: ad.paymentMethods || [],
    lastUpdated: ad.createdAt ? new Date(ad.createdAt).toLocaleString() : '--',
    createTime: ad.createdAt ? new Date(ad.createdAt).toLocaleString() : '--',
    status: ad.isActive ? 'online' : 'offline',
  }))

  useEffect(() => {
    fetchMyAds()
  }, [fetchMyAds])

  const handleSelectAll = () => {
    if (selectedAds.length === ads.length) {
      setSelectedAds([])
    } else {
      setSelectedAds(ads.map(ad => ad.id))
    }
  }

  const handleSelectAd = (id: string) => {
    if (selectedAds.includes(id)) {
      setSelectedAds(selectedAds.filter(a => a !== id))
    } else {
      setSelectedAds([...selectedAds, id])
    }
  }

  const handleReset = () => {
    setAssetFilter('all')
    setTypeFilter('all')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Filter ads
  const filteredAds = ads.filter(ad => {
    if (assetFilter !== 'all' && ad.asset !== assetFilter) return false
    if (typeFilter !== 'all' && ad.type !== typeFilter) return false
    if (statusFilter !== 'all' && ad.status !== statusFilter) return false
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
              <Link to="/pro/orders" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Orders
              </Link>
              <Link to="/pro/chat" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Chat
              </Link>
              <Link to="/pro/user-center" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                User Center
              </Link>
              <span className="flex items-center gap-1 text-sm text-orange-500 font-medium">
                More
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Title + Post Now */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>My Ads</h1>
          <Link
            to="/pro/post-ad"
            className="px-6 py-2.5 bg-yellow-500 text-black text-sm font-semibold rounded-lg hover:bg-yellow-400 transition"
          >
            Post now
          </Link>
        </div>

        {/* Ad Type Tabs */}
        <div className="flex items-center gap-6 mb-6">
          {[
            { key: 'normal', label: 'Normal Ads' },
            { key: 'cash', label: 'Cash Ads' },
            { key: 'block', label: 'Block Ads' },
            { key: 'fiat', label: 'Fiat Ads' },
            { key: 'premium', label: 'Premium Ads' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setAdTab(tab.key as AdTab)}
              className={`text-sm font-medium pb-2 border-b-2 transition ${
                adTab === tab.key
                  ? 'text-orange-500 border-orange-500'
                  : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Asset/Type */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Asset/type</span>
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className={`text-sm font-medium bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
            >
              <option value="all">All</option>
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>

          {/* Type */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`text-sm font-medium bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
            >
              <option value="all">All</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          {/* Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`text-sm font-medium bg-transparent border-none focus:outline-none ${dark ? 'text-white' : 'text-gray-900'}`}
            >
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          {/* Date Range */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="YYYY-MM-DD"
              className={`text-sm bg-transparent border-none focus:outline-none w-28 ${dark ? 'text-white' : 'text-gray-900'}`}
            />
            <span className={dark ? 'text-gray-500' : 'text-gray-400'}>→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="YYYY-MM-DD"
              className={`text-sm bg-transparent border-none focus:outline-none w-28 ${dark ? 'text-white' : 'text-gray-900'}`}
            />
            <svg className={`w-4 h-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Filter Button */}
          <button className="px-4 py-2 bg-yellow-500 text-black text-sm font-medium rounded-lg hover:bg-yellow-400 transition">
            Filter
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="text-orange-500 text-sm font-medium hover:underline"
          >
            Reset
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Ad History */}
          <button className={`flex items-center gap-2 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ad History
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedAds.length === ads.length && ads.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-600 bg-transparent"
            />
            <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>({selectedAds.length})</span>
          </label>
          <button
            disabled={selectedAds.length === 0}
            className={`px-4 py-1.5 rounded text-sm font-medium transition ${
              selectedAds.length > 0
                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                : `${dark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
            }`}
          >
            Publish
          </button>
          <button
            disabled={selectedAds.length === 0}
            className={`px-4 py-1.5 rounded text-sm font-medium transition border ${
              selectedAds.length > 0
                ? `${dark ? 'border-gray-600 text-gray-300 hover:border-gray-500' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`
                : `${dark ? 'border-gray-700 text-gray-600' : 'border-gray-200 text-gray-400'} cursor-not-allowed`
            }`}
          >
            Take all offline
          </button>
        </div>

        {/* Table */}
        <div className={`rounded-xl overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Table Header */}
          <div className={`grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium tracking-wider ${dark ? 'text-gray-500 border-b border-gray-700' : 'text-gray-400 border-b border-gray-200'}`}>
            <div className="col-span-2">
              <div>Ad Number</div>
              <div>Type</div>
              <div>Asset/Fiat</div>
            </div>
            <div className="col-span-2">
              <div>Total Amount</div>
              <div>Completed Trade QTY.</div>
              <div>Order Limit</div>
            </div>
            <div className="col-span-1">
              <div>Price</div>
              <div>Exchange Rate</div>
            </div>
            <div className="col-span-2">Payment Method</div>
            <div className="col-span-2">
              <div>Last Updated</div>
              <div>Create Time</div>
            </div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Rows */}
          {filteredAds.length === 0 ? (
            <div className="text-center py-16">
              <div className={`mx-auto w-16 h-16 mb-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`}>
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className={`${dark ? 'text-gray-500' : 'text-gray-400'}`}>No ads found</p>
            </div>
          ) : (
            <div className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredAds.map(ad => (
                <div
                  key={ad.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-4 items-start ${dark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}
                >
                  {/* Ad Number / Type / Asset */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedAds.includes(ad.id)}
                        onChange={() => handleSelectAd(ad.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-transparent"
                      />
                      <button
                        onClick={() => copyToClipboard(ad.id)}
                        className={`text-sm font-medium hover:underline ${dark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {ad.id.slice(0, 18)}...
                      </button>
                    </div>
                    <div className={`text-sm font-medium ml-6 ${ad.type === 'buy' ? 'text-green-500' : 'text-yellow-500'}`}>
                      {ad.type === 'buy' ? 'Buy' : 'Sell'}
                    </div>
                    <div className={`text-sm ml-6 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {ad.asset} / {ad.fiat}
                    </div>
                  </div>

                  {/* Total Amount / Completed / Limit */}
                  <div className="col-span-2">
                    <div className={`text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>
                      {ad.totalAmount.toFixed(2)}
                    </div>
                    <div className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {ad.completedQty.toFixed(2)}
                    </div>
                    <div className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {ad.minLimit.toLocaleString()} - {ad.maxLimit.toLocaleString()} {ad.fiat}
                    </div>
                  </div>

                  {/* Price / Exchange Rate */}
                  <div className="col-span-1">
                    <div className={`text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>
                      {ad.price.toFixed(3)}
                    </div>
                    <div className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {ad.exchangeRate || '--'}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="col-span-2">
                    {ad.paymentMethods.slice(0, 3).map((method, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-0.5">
                        <span className="w-0.5 h-3 bg-yellow-500 rounded-full"></span>
                        <span className={`text-sm truncate ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {method.length > 15 ? method.slice(0, 15) + '...' : method}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Last Updated / Create Time */}
                  <div className="col-span-2">
                    <div className={`text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>
                      {ad.lastUpdated}
                    </div>
                    <div className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {ad.createTime}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-1">
                    <span className={`text-sm font-medium flex items-center gap-1 ${
                      ad.status === 'online' ? 'text-green-500' : dark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {ad.status === 'online' ? 'Online' : 'Offline'}
                      {ad.status === 'online' && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {/* Publish/Unpublish */}
                    <button
                      onClick={() => updateAd(ad.id, { isActive: ad.status !== 'online' }).then(() => fetchMyAds())}
                      className={`p-1.5 rounded transition ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      title={ad.status === 'online' ? 'Take offline' : 'Publish'}
                    >
                      {ad.status === 'online' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      )}
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => navigate(`/pro/post-ad?edit=${ad.id}`)}
                      className={`p-1.5 rounded transition ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Copy */}
                    <button
                      onClick={() => copyToClipboard(ad.id)}
                      className={`p-1.5 rounded transition ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Copy"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {/* Share */}
                    <button
                      className={`p-1.5 rounded transition ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Share"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => { if (confirm('Delete this ad?')) deleteAd(ad.id).then(() => fetchMyAds()) }}
                      className={`p-1.5 rounded transition text-red-500 ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            disabled
            className={`p-2 rounded ${dark ? 'text-gray-600' : 'text-gray-400'} cursor-not-allowed`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="w-8 h-8 rounded bg-yellow-500 text-black text-sm font-medium">
            1
          </button>
          <button
            disabled
            className={`p-2 rounded ${dark ? 'text-gray-600' : 'text-gray-400'} cursor-not-allowed`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
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
