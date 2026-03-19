import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

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

export default function Chat() {
  const { tradeId } = useParams<{ tradeId: string }>()
  const { user } = useAuthStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const pollingRef = useRef<number | null>(null)

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  )

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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

  useEffect(() => {
    if (!tradeId) return

    fetchMessages()
    markRead()

    pollingRef.current = window.setInterval(() => {
      fetchMessages(true)
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={`/app/trade/${tradeId}`} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trade Chat</h1>
                <p className="text-xs text-gray-500">Trade #{tradeId?.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
            <Link
              to={`/app/trade/${tradeId}`}
              className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Trade Details
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-28">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 min-h-[420px]">
          {isLoading ? (
            <div className="flex justify-center py-14">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-gray-500">No messages yet. Start the conversation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMessages.map((message) => {
                const mine = message.senderId === user?.id
                const text = decodeMessage(message)
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        mine
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{text}</p>
                      <p className={`text-[11px] mt-1 ${mine ? 'text-teal-100' : 'text-gray-500 dark:text-gray-300'}`}>
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

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-700 backdrop-blur">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Type a message..."
              className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !draft.trim()}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
