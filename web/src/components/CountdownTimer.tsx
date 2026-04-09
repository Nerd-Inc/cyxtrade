import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  expiresAt: string
  onExpire?: () => void
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function CountdownTimer({
  expiresAt,
  onExpire,
  showLabel = true,
  size = 'md'
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState('')
  const [isExpired, setIsExpired] = useState(false)
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining('00:00')
        setIsExpired(true)
        onExpire?.()
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)

      // Mark as urgent when less than 3 minutes remaining
      setIsUrgent(minutes < 3)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  }

  const bgColor = isExpired
    ? 'bg-red-500/20 border-red-500/50'
    : isUrgent
      ? 'bg-orange-500/20 border-orange-500/50'
      : 'bg-yellow-500/20 border-yellow-500/50'

  const textColor = isExpired
    ? 'text-red-400'
    : isUrgent
      ? 'text-orange-400'
      : 'text-yellow-400'

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bgColor}`}>
      <svg
        className={`w-5 h-5 ${textColor} ${!isExpired && 'animate-pulse'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="flex flex-col">
        {showLabel && (
          <span className="text-xs text-gray-400">
            {isExpired ? 'Expired' : 'Time Remaining'}
          </span>
        )}
        <span className={`font-mono font-bold ${sizeClasses[size]} ${textColor}`}>
          {timeRemaining}
        </span>
      </div>
    </div>
  )
}
