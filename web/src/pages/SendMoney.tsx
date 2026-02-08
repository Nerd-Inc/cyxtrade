import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTradeStore } from '../store/trade'
import type { Trader } from '../store/trade'

type Step = 'corridor' | 'trader' | 'amount' | 'recipient' | 'confirm'

const CORRIDORS = [
  { from: 'AED', to: 'XAF', fromFlag: '🇦🇪', toFlag: '🇨🇲', fromName: 'UAE Dirham', toName: 'CFA Franc' },
  { from: 'USD', to: 'XAF', fromFlag: '🇺🇸', toFlag: '🇨🇲', fromName: 'US Dollar', toName: 'CFA Franc' },
  { from: 'EUR', to: 'XAF', fromFlag: '🇪🇺', toFlag: '🇨🇲', fromName: 'Euro', toName: 'CFA Franc' },
  { from: 'GBP', to: 'XAF', fromFlag: '🇬🇧', toFlag: '🇨🇲', fromName: 'British Pound', toName: 'CFA Franc' },
]

export default function SendMoney() {
  const navigate = useNavigate()
  const { traders, selectedTrader, isLoading, error, getTraders, selectTrader, createTrade, clearError } = useTradeStore()

  const [step, setStep] = useState<Step>('corridor')
  const [corridor, setCorridor] = useState(CORRIDORS[0])
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState({
    name: '',
    phone: '',
    bank: '',
    accountNumber: ''
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (step === 'trader') {
      getTraders(corridor.from, corridor.to)
    }
  }, [step, corridor])

  const getRate = () => {
    if (selectedTrader) {
      const traderCorridor = selectedTrader.corridors?.find(
        c => c.from === corridor.from && c.to === corridor.to
      )
      return traderCorridor?.rate || 163
    }
    return 163 // Default rate
  }

  const receiveAmount = parseFloat(amount || '0') * getRate()

  const handleSelectTrader = (trader: Trader) => {
    selectTrader(trader)
    setStep('amount')
  }

  const handleSubmit = async () => {
    if (!selectedTrader) return

    setCreating(true)
    const trade = await createTrade({
      traderId: selectedTrader.id,
      sendAmount: parseFloat(amount),
      sendCurrency: corridor.from,
      receiveCurrency: corridor.to,
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      recipientBank: recipient.bank,
      recipientAccountNumber: recipient.accountNumber
    })
    setCreating(false)

    if (trade) {
      navigate(`/app/trade/${trade.id}`)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 'corridor': return true
      case 'trader': return selectedTrader !== null
      case 'amount': return parseFloat(amount) > 0
      case 'recipient': return recipient.name && recipient.phone
      case 'confirm': return true
      default: return false
    }
  }

  const nextStep = () => {
    switch (step) {
      case 'corridor': setStep('trader'); break
      case 'trader': setStep('amount'); break
      case 'amount': setStep('recipient'); break
      case 'recipient': setStep('confirm'); break
      case 'confirm': handleSubmit(); break
    }
  }

  const prevStep = () => {
    switch (step) {
      case 'trader': setStep('corridor'); break
      case 'amount': setStep('trader'); break
      case 'recipient': setStep('amount'); break
      case 'confirm': setStep('recipient'); break
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/app" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Send Money</h1>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2">
          {['corridor', 'trader', 'amount', 'recipient', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-teal-600 text-white' :
                ['corridor', 'trader', 'amount', 'recipient', 'confirm'].indexOf(step) > i ?
                'bg-teal-100 text-teal-600 dark:bg-teal-900/30' :
                'bg-gray-200 text-gray-500 dark:bg-gray-700'
              }`}>
                {i + 1}
              </div>
              {i < 4 && (
                <div className={`flex-1 h-1 mx-2 ${
                  ['corridor', 'trader', 'amount', 'recipient', 'confirm'].indexOf(step) > i ?
                  'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={clearError} className="text-red-700 dark:text-red-300 underline text-sm mt-1">
              Dismiss
            </button>
          </div>
        )}

        {/* Step: Corridor */}
        {step === 'corridor' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Currency Corridor
            </h2>
            {CORRIDORS.map((c) => (
              <button
                key={`${c.from}-${c.to}`}
                onClick={() => setCorridor(c)}
                className={`w-full p-4 rounded-xl border-2 transition text-left ${
                  corridor.from === c.from && corridor.to === c.to
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-teal-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.fromFlag}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{c.from}</p>
                      <p className="text-sm text-gray-500">{c.fromName}</p>
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">{c.to}</p>
                      <p className="text-sm text-gray-500">{c.toName}</p>
                    </div>
                    <span className="text-2xl">{c.toFlag}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: Trader */}
        {step === 'trader' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select a Trader
            </h2>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
              </div>
            ) : traders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No traders available for this corridor</p>
              </div>
            ) : (
              traders.map((trader) => {
                const traderCorridor = trader.corridors?.find(
                  c => c.from === corridor.from && c.to === corridor.to
                )
                return (
                  <button
                    key={trader.id}
                    onClick={() => handleSelectTrader(trader)}
                    className={`w-full p-4 rounded-xl border-2 transition text-left ${
                      selectedTrader?.id === trader.id
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                        {trader.avatarUrl ? (
                          <img src={trader.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-teal-600">
                            {trader.displayName?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">{trader.displayName}</p>
                          {trader.online && (
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>&#11088; {trader.rating?.toFixed(1) || '5.0'}</span>
                          <span>{trader.tradeCount || 0} trades</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          1 {corridor.from} = {traderCorridor?.rate || 163} {corridor.to}
                        </p>
                        <p className="text-sm text-gray-500">
                          {traderCorridor?.minAmount || 100} - {traderCorridor?.maxAmount || 5000} {corridor.from}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Step: Amount */}
        {step === 'amount' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Enter Amount
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                You send
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 text-3xl font-bold bg-transparent border-none focus:outline-none text-gray-900 dark:text-white"
                />
                <div className="flex items-center gap-2 text-lg">
                  <span>{corridor.fromFlag}</span>
                  <span className="font-medium">{corridor.from}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="bg-teal-100 dark:bg-teal-900/30 text-teal-600 px-4 py-2 rounded-full text-sm">
                1 {corridor.from} = {getRate()} {corridor.to}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                Recipient gets
              </label>
              <div className="flex items-center gap-4">
                <span className="flex-1 text-3xl font-bold text-gray-900 dark:text-white">
                  {receiveAmount.toLocaleString()}
                </span>
                <div className="flex items-center gap-2 text-lg">
                  <span>{corridor.toFlag}</span>
                  <span className="font-medium">{corridor.to}</span>
                </div>
              </div>
            </div>

            {selectedTrader && (
              <div className="text-sm text-gray-500 text-center">
                Trading with <span className="font-medium text-gray-900 dark:text-white">{selectedTrader.displayName}</span>
              </div>
            )}
          </div>
        )}

        {/* Step: Recipient */}
        {step === 'recipient' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recipient Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={recipient.name}
                  onChange={(e) => setRecipient(r => ({ ...r, name: e.target.value }))}
                  placeholder="Enter recipient's full name"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={recipient.phone}
                  onChange={(e) => setRecipient(r => ({ ...r, phone: e.target.value }))}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Name (Optional)
                </label>
                <input
                  type="text"
                  value={recipient.bank}
                  onChange={(e) => setRecipient(r => ({ ...r, bank: e.target.value }))}
                  placeholder="e.g., UBA Cameroon"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Number (Optional)
                </label>
                <input
                  type="text"
                  value={recipient.accountNumber}
                  onChange={(e) => setRecipient(r => ({ ...r, accountNumber: e.target.value }))}
                  placeholder="Enter account number"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Transfer
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">You send</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {parseFloat(amount).toLocaleString()} {corridor.from}
                </p>
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">Recipient gets</p>
                <p className="text-2xl font-bold text-teal-600">
                  {receiveAmount.toLocaleString()} {corridor.to}
                </p>
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">Exchange rate</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  1 {corridor.from} = {getRate()} {corridor.to}
                </p>
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">Trader</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedTrader?.displayName}
                </p>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500">Recipient</p>
                <p className="font-medium text-gray-900 dark:text-white">{recipient.name}</p>
                <p className="text-sm text-gray-500">{recipient.phone}</p>
                {recipient.bank && (
                  <p className="text-sm text-gray-500">{recipient.bank} - {recipient.accountNumber}</p>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Important</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    After creating this trade, you'll need to send the payment to the trader. The recipient will receive funds only after you confirm payment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          {step !== 'corridor' && (
            <button
              onClick={prevStep}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Back
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={!canProceed() || creating}
            className="flex-1 py-3 px-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            )}
            {step === 'confirm' ? 'Create Trade' : 'Continue'}
          </button>
        </div>
      </main>
    </div>
  )
}
