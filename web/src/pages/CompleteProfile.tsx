import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getErrorMessage(payload: any, fallback: string): string {
  if (!payload) return fallback
  if (typeof payload.error === 'string') return payload.error
  if (payload.error?.message) return payload.error.message
  return fallback
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function CompleteProfile() {
  const { updateProfile, isLoading, error, clearError, user, token } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [username, setUsername] = useState(user?.username || '')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [displayNameStatus, setDisplayNameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [displayNameError, setDisplayNameError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setDisplayName(user?.displayName || '')
    setUsername(user?.username || '')
    setAvatarPreview(user?.avatarUrl || '')
    setAvatarFile(null)
    setRemoveAvatar(false)
  }, [user?.displayName, user?.username, user?.avatarUrl])

  useEffect(() => {
    if (!avatarFile) return
    const objectUrl = URL.createObjectURL(avatarFile)
    setAvatarPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [avatarFile])

  // Debounced display name uniqueness check
  useEffect(() => {
    const trimmed = displayName.trim()
    if (trimmed.length < 2) {
      setDisplayNameStatus('idle')
      setDisplayNameError(null)
      return
    }
    if (user?.displayName?.toLowerCase() === trimmed.toLowerCase()) {
      setDisplayNameStatus('available')
      setDisplayNameError(null)
      return
    }
    setDisplayNameStatus('checking')
    setDisplayNameError(null)
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/users/check-displayname/${encodeURIComponent(trimmed)}`)
        if (!res.ok) { setDisplayNameStatus('idle'); return }
        const data = await res.json()
        if (data.data?.available === true) {
          setDisplayNameStatus('available')
          setDisplayNameError(null)
        } else if (data.data?.available === false) {
          setDisplayNameStatus('taken')
          setDisplayNameError(data.data?.reason || 'This display name is already taken')
        } else {
          setDisplayNameStatus('idle')
        }
      } catch {
        setDisplayNameStatus('idle')
        setDisplayNameError(null)
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [displayName, user?.displayName])

  // Debounced username availability check
  useEffect(() => {
    const trimmedUsername = username.trim()

    // Reset if empty or too short
    if (trimmedUsername.length < 3) {
      setUsernameStatus('idle')
      setUsernameError(trimmedUsername.length > 0 ? 'Username must be at least 3 characters' : null)
      return
    }

    // Validate format locally first
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmedUsername)) {
      setUsernameStatus('invalid')
      setUsernameError('Username must start with a letter and contain only letters, numbers, and underscores')
      return
    }

    if (trimmedUsername.length > 30) {
      setUsernameStatus('invalid')
      setUsernameError('Username must be at most 30 characters')
      return
    }

    // Client-side blocked name check (mirrors backend validation)
    const lower = trimmedUsername.toLowerCase()
    const blockedPrefixes = [
      'cyx', 'binance', 'coinbase', 'kraken', 'bybit', 'okx', 'kucoin',
      'paxful', 'wise', 'westernunion', 'paypal', 'admin_', 'mod_', 'official_', 'support_',
    ]
    const blockedSubstrings = [
      'crypto', 'bitcoin', 'ethereum', 'blockchain', 'admin', 'official', 'support',
      'scam', 'fraud', 'hack', 'freemoney', 'airdrop', 'giveaway',
      'customer_service', 'guaranteed', 'profit',
    ]
    if (blockedPrefixes.some(p => lower.startsWith(p))) {
      setUsernameStatus('invalid')
      setUsernameError('This username contains a restricted prefix')
      return
    }
    if (blockedSubstrings.some(s => lower.includes(s))) {
      setUsernameStatus('invalid')
      setUsernameError('This username contains a restricted word')
      return
    }
    if (/(.)\1{4,}/.test(lower)) {
      setUsernameStatus('invalid')
      setUsernameError('Username contains too many repeated characters')
      return
    }

    // If user already has this username, it's available (no change)
    if (user?.username?.toLowerCase() === trimmedUsername.toLowerCase()) {
      setUsernameStatus('available')
      setUsernameError(null)
      return
    }

    setUsernameStatus('checking')
    setUsernameError(null)

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/users/check-username/${encodeURIComponent(trimmedUsername)}`)
        if (!res.ok) { setUsernameStatus('idle'); return }
        const data = await res.json()

        if (data.data?.available === true) {
          setUsernameStatus('available')
          setUsernameError(null)
        } else if (data.data?.available === false) {
          setUsernameStatus('taken')
          setUsernameError(data.data?.reason || 'Username is already taken')
        } else {
          setUsernameStatus('idle')
        }
      } catch {
        setUsernameStatus('idle')
        setUsernameError(null)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, user?.username])

  const identityLabel = useMemo(() => {
    if (user?.phone) return `Phone: ${user.phone}`
    if (user?.fingerprint) return `Key ID: ${user.fingerprint}`
    return 'Key-based account'
  }, [user?.phone, user?.fingerprint])

  const uploadAvatar = async (): Promise<string> => {
    if (!avatarFile) {
      throw new Error('Please choose an image first')
    }
    if (!token) {
      throw new Error('You are not authenticated')
    }

    const formData = new FormData()
    formData.append('image', avatarFile)

    setIsUploadingAvatar(true)
    try {
      const res = await fetch(`${API_URL}/uploads/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const text = await res.text()
      let payload: any = null
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = null
      }

      if (!res.ok) {
        throw new Error(getErrorMessage(payload, 'Failed to upload avatar'))
      }

      const uploadedUrl = payload?.data?.avatarUrl || payload?.avatarUrl
      if (!uploadedUrl) {
        throw new Error('Upload completed but avatar URL was missing in response')
      }

      return uploadedUrl
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setLocalError('Please select an image file (JPG, PNG, or WebP).')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('Image is too large. Maximum size is 5MB.')
      e.target.value = ''
      return
    }

    setLocalError(null)
    setAvatarFile(file)
    setRemoveAvatar(false)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setRemoveAvatar(true)
    setAvatarPreview('')
    setLocalError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)

    const cleanName = displayName.trim()
    const cleanUsername = username.trim()

    if (cleanName.length < 2) {
      setLocalError('Display name must be at least 2 characters')
      return
    }

    if (cleanUsername.length < 3) {
      setLocalError('Username is required (minimum 3 characters)')
      return
    }

    if (displayNameStatus === 'taken') {
      setLocalError('Please choose a different display name — this one is taken')
      return
    }

    if (usernameStatus !== 'available' && user?.username?.toLowerCase() !== cleanUsername.toLowerCase()) {
      setLocalError('Please choose an available username')
      return
    }

    try {
      let avatarUrlUpdate: string | null | undefined = undefined

      if (avatarFile) {
        avatarUrlUpdate = await uploadAvatar()
      } else if (removeAvatar) {
        avatarUrlUpdate = null
      }

      const payload: { displayName: string; username: string; avatarUrl?: string | null } = {
        displayName: cleanName,
        username: cleanUsername,
      }

      if (avatarUrlUpdate !== undefined) {
        payload.avatarUrl = avatarUrlUpdate
      }

      const success = await updateProfile(payload)
      if (success) {
        navigate('/app')
      }
    } catch (err) {
      setLocalError((err as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-cyx-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img src="/logo.png" alt="CyxTrade" className="h-20 mx-auto" />
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            {user?.displayName ? 'Edit Profile' : 'Complete Your Profile'}
          </h1>
          <p className="text-gray-400">
            Add a name so traders can identify you.
          </p>
        </div>

        <div className="bg-cyx-card rounded-lg border border-gray-800 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-yellow-500">
                  {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  className={`w-full px-4 pr-10 py-3 rounded-lg border bg-cyx-card-hover text-white placeholder-gray-500 focus:outline-none transition ${
                    displayNameStatus === 'available' ? 'border-green-500' :
                    displayNameStatus === 'taken' ? 'border-red-500' :
                    'border-gray-700 focus:border-yellow-500'
                  }`}
                  required
                  minLength={2}
                  maxLength={100}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {displayNameStatus === 'checking' && (
                    <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {displayNameStatus === 'available' && (
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {displayNameStatus === 'taken' && (
                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
              {displayNameError ? (
                <p className="mt-2 text-sm text-red-400">{displayNameError}</p>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  This is how traders will see you. Must be unique.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_username"
                  className={`w-full pl-8 pr-10 py-3 rounded-lg border bg-cyx-card-hover text-white placeholder-gray-500 focus:outline-none transition ${
                    usernameStatus === 'available' ? 'border-green-500' :
                    usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-500' :
                    'border-gray-700 focus:border-yellow-500'
                  }`}
                  required
                  minLength={3}
                  maxLength={30}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {usernameStatus === 'available' && (
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
              {usernameError ? (
                <p className="mt-2 text-sm text-red-400">{usernameError}</p>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Choose a unique username. Letters, numbers, and underscores only.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="avatarImage" className="block text-sm font-medium text-gray-300 mb-2">
                Avatar (optional)
              </label>
              <input
                id="avatarImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-yellow-500/20 file:text-yellow-500 hover:file:bg-yellow-500/30"
              />
              <p className="mt-2 text-sm text-gray-500">
                JPG, PNG, or WebP. Max 5MB.
              </p>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="mt-2 text-sm text-red-400 hover:text-red-300"
                >
                  Remove avatar
                </button>
              )}
            </div>

            <div className="bg-cyx-card-hover rounded-lg p-4">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <span className="text-xl">ID</span>
                <span>{identityLabel}</span>
              </div>
            </div>

            {(localError || error) && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {localError || error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                isLoading ||
                isUploadingAvatar ||
                displayName.trim().length < 2 ||
                username.trim().length < 3 ||
                displayNameStatus === 'taken' ||
                displayNameStatus === 'checking' ||
                usernameStatus === 'taken' ||
                usernameStatus === 'invalid' ||
                usernameStatus === 'checking'
              }
              className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isUploadingAvatar ? 'Uploading avatar...' : isLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
