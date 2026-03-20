import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import type { Trade } from '../store/trade'
import { useTradeStore } from '../store/trade'
import CountdownTimer from '../components/CountdownTimer'
import ScamWarningModal, { WarningBanner, ReportSuspiciousModal } from '../components/ScamWarningModal'
import { useRiskAssessment } from '../hooks/useRiskAssessment'

const API_URL = import.meta.env.VITE_API_URL || '/api'

type MessageType = 'text' | 'image' | 'system' | 'payment_confirmed' | 'payment_sent'

interface EncryptedPayload {
  nonce: string
  ciphertext: string
}

interface ChatMessage {
  id: string
  tradeId: string
  senderId: string
  messageType: MessageType
  encrypted?: EncryptedPayload | null
  content?: string
  imageUrl?: string
  createdAt: string
  readAt?: string
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function encodeMessage(plaintext: string): EncryptedPayload {
  const nonce = new Uint8Array(24)
  crypto.getRandomValues(nonce)

  return {
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(textEncoder.encode(plaintext))
  }
}

function decodeMessage(message: ChatMessage): string {
  if (message.messageType === 'system' || message.messageType === 'payment_confirmed' || message.messageType === 'payment_sent') {
    return message.content || ''
  }

  if (message.messageType === 'image') {
    return message.imageUrl ? `Image: ${message.imageUrl}` : 'Image message'
  }

  if (!message.encrypted?.ciphertext) {
    return ''
  }

  try {
    return textDecoder.decode(base64ToBytes(message.encrypted.ciphertext))
  } catch {
    return '[Encrypted message]'
  }
}

function getAuthHeaders() {
  const token = useAuthStore.getState().token
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
}

// Mock payment methods for demo
const MOCK_PAYMENT_METHODS = [
  {
    id: '1',
    type: 'Bank Transfer',
    name: 'Emirates NBD',
    details: {
      account_holder: 'Mamadou Diallo',
      account_number: '1234567890123456',
      iban: 'AE123456789012345678901',
      swift: 'EABORAAD'
    }
  },
  {
    id: '2',
    type: 'Mobile Money',
    name: 'Orange Money',
    details: {
      phone: '+237 6XX XXX XXX',
      name: 'Mamadou Diallo'
    }
  }
]

export default function Chat() {
  const { tradeId } = useParams<{ tradeId: string }>()
  const location = useLocation()
  const { user } = useAuthStore()
  const { getTrade, markPaid, completeTrade, cancelTrade, createTrade } = useTradeStore()
  const navigate = useNavigate()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [trade, setTrade] = useState<Trade | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tradeExpired, setTradeExpired] = useState(false)

  // Proof of payment
  const [showProofUpload, setShowProofUpload] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [paymentReference, setPaymentReference] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Risk assessment
  const { assessment, assessTrade, reportSuspicious } = useRiskAssessment()
  const [showRiskWarning, setShowRiskWarning] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [riskChecked, setRiskChecked] = useState(false)

  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const pollingRef = useRef<number | null>(null)

  // Check if we have trade data from navigation state (new trade)
  const locationState = location.state as {
    traderId?: string
    traderName?: string
    sendAmount?: number
    sendCurrency?: string
    receiveAmount?: number
    receiveCurrency?: string
    rate?: number
    recipientName?: string
    recipientPhone?: string
    recipientBank?: string
    recipientAccount?: string
  } | null

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  )

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Create trade from location state if no tradeId
  useEffect(() => {
    const initTrade = async () => {
      if (!tradeId && locationState?.traderId) {
        setIsLoading(true)
        try {
          const newTrade = await createTrade({
            traderId: locationState.traderId,
            sendCurrency: locationState.sendCurrency || 'AED',
            sendAmount: locationState.sendAmount || 0,
            receiveCurrency: locationState.receiveCurrency || 'XAF',
            receiveAmount: locationState.receiveAmount || 0,
            rate: locationState.rate || 0,
            recipientName: locationState.recipientName || '',
            recipientPhone: locationState.recipientPhone || '',
            recipientMethod: locationState.recipientBank || ''
          })
          if (newTrade?.id) {
            navigate(`/app/chat/${newTrade.id}`, { replace: true })
          }
        } catch (err) {
          setError('Failed to create trade')
        } finally {
          setIsLoading(false)
        }
      }
    }
    initTrade()
  }, [locationState, tradeId])

  const fetchMessages = async (silent: boolean = false) => {
    if (!tradeId) return
    if (!silent) setIsLoading(true)

    try {
      const res = await fetch(`${API_URL}/chat/trades/${tradeId}/messages`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to load chat messages')

      setMessages(data.data?.messages || [])
      if (!silent) setError(null)
    } catch (err) {
      if (!silent) setError((err as Error).message)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const markRead = async () => {
    if (!tradeId) return
    try {
      await fetch(`${API_URL}/chat/trades/${tradeId}/messages/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
    } catch {
      // Best effort read receipt.
    }
  }

  const fetchTrade = async () => {
    if (!tradeId) return
    const tradeData = await getTrade(tradeId)
    if (tradeData) {
      setTrade(tradeData)
      // Check if already expired
      if (tradeData.status === 'expired' || tradeData.status === 'cancelled') {
        setTradeExpired(true)
      }
    } else if (locationState) {
      // Mock trade from location state for demo
      setTrade({
        id: tradeId || 'demo',
        status: 'pending',
        sendCurrency: locationState.sendCurrency || 'AED',
        sendAmount: locationState.sendAmount || 0,
        receiveCurrency: locationState.receiveCurrency || 'XAF',
        receiveAmount: locationState.receiveAmount || 0,
        exchangeRate: locationState.rate || 0,
        traderId: locationState.traderId || '',
        traderName: locationState.traderName || 'Trader',
        traderPaymentMethods: MOCK_PAYMENT_METHODS,
        userId: user?.id || '',
        recipientName: locationState.recipientName || '',
        recipientPhone: locationState.recipientPhone || '',
        recipientBank: locationState.recipientBank || '',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      } as Trade)
    }
  }

  const handleExpire = async () => {
    setTradeExpired(true)
    if (tradeId) {
      await cancelTrade(tradeId)
      await fetchTrade()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProofFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProofPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMarkPaid = async () => {
    if (!tradeId || isMarkingPaid) return
    setIsMarkingPaid(true)
    try {
      // In real implementation, upload proof file here
      const success = await markPaid(tradeId, {
        paymentReference,
        paymentProofUrl: proofPreview || undefined
      })
      if (success) {
        await fetchTrade()
        setShowProofUpload(false)
        setProofFile(null)
        setProofPreview(null)
        setPaymentReference('')
      }
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const handleConfirmReceived = async () => {
    if (!tradeId || isConfirming) return
    setIsConfirming(true)
    try {
      const success = await completeTrade(tradeId)
      if (success) {
        await fetchTrade()
      }
    } finally {
      setIsConfirming(false)
    }
  }

  useEffect(() => {
    if (!tradeId) return

    fetchMessages()
    fetchTrade()
    markRead()

    pollingRef.current = window.setInterval(() => {
      fetchMessages(true)
      fetchTrade()
    }, 3000)

    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current)
      }
    }
  }, [tradeId])

  useEffect(() => {
    scrollToBottom()
  }, [sortedMessages.length])

  // Risk assessment when trade loads
  useEffect(() => {
    const checkRisk = async () => {
      if (!trade || !trade.traderId || riskChecked) return

      // Get payment method identifier from trader's payment methods
      const paymentMethod = trade.traderPaymentMethods?.[0]
      const paymentIdentifier = paymentMethod?.details?.account_number ||
                                paymentMethod?.details?.phone ||
                                paymentMethod?.details?.iban

      const result = await assessTrade({
        traderId: trade.traderId,
        paymentMethodType: paymentMethod?.type?.toLowerCase().includes('bank') ? 'bank' : 'mobile_money',
        paymentIdentifier,
        amount: trade.sendAmount
      })

      setRiskChecked(true)

      // Show warning modal if high/critical risk
      if (result && result.requiresConfirmation) {
        setShowRiskWarning(true)
      }
    }

    checkRisk()
  }, [trade?.id])

  const sendMessage = async () => {
    const text = draft.trim()
    if (!tradeId || !text || isSending) return

    setIsSending(true)
    try {
      const res = await fetch(`${API_URL}/chat/trades/${tradeId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messageType: 'text',
          encrypted: encodeMessage(text)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send message')

      setDraft('')
      await fetchMessages(true)
      await markRead()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSending(false)
    }
  }

  // Get status step for progress indicator
  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending': return 1
      case 'accepted': return 1
      case 'paid': return 2
      case 'delivering': return 3
      case 'completed': return 4
      default: return 0
    }
  }

  const currentStep = trade ? getStatusStep(trade.status) : 0

  return (
    <div className="min-h-screen bg-[#0B0E11]">
      <header className="bg-[#1E2329] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/app/history" className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Trade Chat</h1>
                <p className="text-xs text-gray-500">
                  {trade?.traderName || locationState?.traderName || 'Trader'} • #{tradeId?.slice(0, 8).toUpperCase() || 'NEW'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {trade?.expiresAt && !tradeExpired && (trade.status === 'pending' || trade.status === 'accepted') && (
                <CountdownTimer
                  expiresAt={trade.expiresAt}
                  onExpire={handleExpire}
                  showLabel={false}
                  size="sm"
                />
              )}
              <Link
                to={`/app/trade/${tradeId}`}
                className="text-sm px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#2B3139] transition"
              >
                Details
              </Link>
              {/* Report Suspicious Activity */}
              {trade && !tradeExpired && trade.status !== 'completed' && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition"
                  title="Report Suspicious Activity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-28">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Progress Steps */}
        {trade && !tradeExpired && trade.status !== 'cancelled' && (
          <div className="mb-6 bg-[#1E2329] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              {['Pay', 'Paid', 'Delivering', 'Completed'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      currentStep > index + 1
                        ? 'bg-green-500 text-white'
                        : currentStep === index + 1
                        ? 'bg-green-500 text-white animate-pulse'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {currentStep > index + 1 ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${currentStep >= index + 1 ? 'text-green-400' : 'text-gray-500'}`}>
                      {step}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`w-12 sm:w-20 h-0.5 mx-1 ${
                      currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trade Expired Banner */}
        {tradeExpired && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-400">Trade Expired</h3>
                <p className="text-sm text-red-400/80">
                  This trade has been cancelled due to timeout. Please start a new trade.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app')}
              className="mt-3 w-full bg-red-500/20 text-red-400 py-2 rounded-lg font-medium hover:bg-red-500/30 transition"
            >
              Start New Trade
            </button>
          </div>
        )}

        {/* Risk Warning Banner */}
        {trade && assessment && assessment.warnings.length > 0 && !tradeExpired && (
          <WarningBanner
            warnings={assessment.warnings}
            onViewDetails={() => setShowRiskWarning(true)}
            className="mb-4"
          />
        )}

        {/* Payment Instructions Banner - Show payment methods prominently */}
        {trade && !tradeExpired && (trade.status === 'pending' || trade.status === 'accepted') && (
          <div className="mb-4 p-4 bg-[#1E2329] border border-green-500/30 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Send Payment</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Transfer <span className="font-bold text-green-400">{trade.sendAmount?.toLocaleString()} {trade.sendCurrency}</span> to the trader using one of the methods below:
                </p>

                {/* Payment Methods */}
                <div className="space-y-3">
                  {(trade.traderPaymentMethods || MOCK_PAYMENT_METHODS).map((method: any) => (
                    <div key={method.id} className="bg-[#2B3139] rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                          {method.type}
                        </span>
                        <span className="text-white font-medium">{method.name}</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(method.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-mono text-sm">{value as string}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(value as string)}
                                className="p-1 hover:bg-white/10 rounded transition"
                                title="Copy"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mark as Paid Button */}
            {!showProofUpload ? (
              <button
                onClick={() => setShowProofUpload(true)}
                className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                I've Sent the Payment
              </button>
            ) : (
              /* Proof of Payment Upload */
              <div className="bg-[#2B3139] rounded-xl p-4 border border-gray-700">
                <h4 className="text-white font-medium mb-3">Upload Proof of Payment</h4>

                {/* File Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-green-500/50 transition mb-4"
                >
                  {proofPreview ? (
                    <div className="relative">
                      <img src={proofPreview} alt="Proof" className="max-h-48 mx-auto rounded-lg" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setProofFile(null)
                          setProofPreview(null)
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <p className="text-gray-400 text-sm">Click to upload payment screenshot</p>
                      <p className="text-gray-500 text-xs mt-1">PNG, JPG up to 5MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Payment Reference */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Payment Reference (Optional)</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID or reference number"
                    className="w-full px-4 py-3 bg-[#1E2329] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowProofUpload(false)
                      setProofFile(null)
                      setProofPreview(null)
                      setPaymentReference('')
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkPaid}
                    disabled={isMarkingPaid}
                    className="flex-1 px-4 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {isMarkingPaid ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Confirm Payment Sent'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trade Status: Paid - Waiting for delivery */}
        {trade && !tradeExpired && trade.status === 'paid' && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
              <div>
                <h3 className="font-semibold text-blue-400">Payment Sent</h3>
                <p className="text-sm text-blue-400/80">
                  Waiting for trader to verify payment and deliver <span className="font-bold">{trade.receiveAmount?.toLocaleString()} {trade.receiveCurrency}</span> to {trade.recipientName}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trade Status: Delivering - User to confirm receipt */}
        {trade && !tradeExpired && trade.status === 'delivering' && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-green-400">Delivery in Progress</h3>
                <p className="text-sm text-green-400/80">
                  The trader has sent <span className="font-bold">{trade.receiveAmount?.toLocaleString()} {trade.receiveCurrency}</span> to {trade.recipientName}. Please confirm once received.
                </p>
              </div>
            </div>
            <button
              onClick={handleConfirmReceived}
              disabled={isConfirming}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isConfirming ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Receipt & Release Payment
                </>
              )}
            </button>
          </div>
        )}

        {/* Trade Status: Completed */}
        {trade && !tradeExpired && trade.status === 'completed' && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-green-400">Trade Completed!</h3>
                <p className="text-sm text-green-400/80">
                  {trade.receiveAmount?.toLocaleString()} {trade.receiveCurrency} has been successfully delivered to {trade.recipientName}.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigate('/app')}
                className="flex-1 bg-green-500/20 text-green-400 py-2.5 rounded-xl font-medium hover:bg-green-500/30 transition"
              >
                Start New Trade
              </button>
              <button
                onClick={() => navigate('/app/history')}
                className="flex-1 bg-[#2B3139] text-white py-2.5 rounded-xl font-medium hover:bg-[#3C4149] transition"
              >
                View Orders
              </button>
            </div>
          </div>
        )}

        {/* Trade Summary Card */}
        {trade && !tradeExpired && (
          <div className="mb-4 bg-[#1E2329] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">You Send</span>
              <span className="text-white font-semibold">{trade.sendAmount?.toLocaleString()} {trade.sendCurrency}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Recipient Gets</span>
              <span className="text-green-400 font-semibold">{trade.receiveAmount?.toLocaleString()} {trade.receiveCurrency}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Recipient</span>
              <span className="text-white">{trade.recipientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Rate</span>
              <span className="text-gray-300">1 {trade.sendCurrency} = {trade.exchangeRate} {trade.receiveCurrency}</span>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="bg-[#1E2329] border border-gray-800 rounded-xl p-4 min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center py-14">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="text-center py-14">
              <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500">No messages yet. Start the conversation with the trader.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMessages.map((message) => {
                const mine = message.senderId === user?.id
                const text = decodeMessage(message)
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2 ${
                        mine
                          ? 'bg-green-500 text-white'
                          : 'bg-[#2B3139] text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{text}</p>
                      <p className={`text-[11px] mt-1 ${mine ? 'text-green-200' : 'text-gray-500'}`}>
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messageEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Message Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1E2329]/95 border-t border-gray-800 backdrop-blur">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-end gap-3">
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-[#2B3139] rounded-xl text-gray-400 hover:text-white hover:bg-[#3C4149] transition"
              title="Upload image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              rows={1}
              placeholder="Type a message..."
              className="flex-1 resize-none rounded-xl border border-gray-700 bg-[#2B3139] px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition"
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !draft.trim()}
              className="p-3 rounded-xl bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scam Warning Modal */}
      {assessment && (
        <ScamWarningModal
          isOpen={showRiskWarning}
          onClose={() => setShowRiskWarning(false)}
          onProceed={() => setShowRiskWarning(false)}
          onCancel={() => navigate('/app')}
          assessment={assessment}
          actionLabel="Continue with Trade"
        />
      )}

      {/* Report Suspicious Activity Modal */}
      {trade && (
        <ReportSuspiciousModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={async (data) => {
            const paymentMethod = trade.traderPaymentMethods?.[0]
            const methodType = paymentMethod?.type?.toLowerCase().includes('bank') ? 'bank' : 'mobile_money'
            const identifier = paymentMethod?.details?.account_number ||
                              paymentMethod?.details?.phone ||
                              paymentMethod?.details?.iban || ''
            await reportSuspicious({
              tradeId: trade.id,
              methodType,
              identifier,
              ...data
            })
          }}
          tradeId={trade.id}
          methodType={trade.traderPaymentMethods?.[0]?.type?.toLowerCase().includes('bank') ? 'bank' : 'mobile_money'}
          identifier={trade.traderPaymentMethods?.[0]?.details?.account_number ||
                      trade.traderPaymentMethods?.[0]?.details?.phone ||
                      trade.traderPaymentMethods?.[0]?.details?.iban || ''}
        />
      )}
    </div>
  )
}
