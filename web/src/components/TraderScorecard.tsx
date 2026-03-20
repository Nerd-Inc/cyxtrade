import { TraderScorecard as ScorecardData } from '../store/trader'

interface TraderScorecardProps {
  displayName: string
  rating: number
  tradeCount: number
  completedCount: number
  createdAt: string
  scorecard?: ScorecardData
  variant?: 'compact' | 'full' | 'inline'
  showTrustIndicators?: boolean
}

const TRUST_INDICATOR_LABELS: Record<string, { label: string; icon: string }> = {
  verified: { label: 'Verified', icon: '✓' },
  '6_months_active': { label: '6+ months', icon: '📅' },
  '10_positive_reviews': { label: '10+ reviews', icon: '👍' },
  high_completion: { label: '95%+ completion', icon: '🎯' },
  fast_release: { label: 'Fast release', icon: '⚡' }
}

function formatTime(mins: number | null): string {
  if (mins === null || mins === undefined) return '-'
  if (mins < 1) return '<1 min'
  if (mins < 60) return `~${Math.round(mins)} min`
  const hours = Math.floor(mins / 60)
  const remainingMins = Math.round(mins % 60)
  return remainingMins > 0 ? `~${hours}h ${remainingMins}m` : `~${hours}h`
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
  if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
  return `$${volume.toFixed(0)}`
}

export default function TraderScorecard({
  displayName,
  rating,
  tradeCount,
  completedCount,
  createdAt,
  scorecard,
  variant = 'compact',
  showTrustIndicators = true
}: TraderScorecardProps) {
  const completionRate = tradeCount > 0 ? Math.round((completedCount / tradeCount) * 100) : 100
  const feedbackScore = scorecard?.feedbackScore ?? 100
  const positiveFeedback = scorecard?.positiveFeedback ?? 0
  const negativeFeedback = scorecard?.negativeFeedback ?? 0
  const totalFeedback = positiveFeedback + negativeFeedback

  // Inline variant - single line summary
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="text-yellow-400">★ {rating.toFixed(1)}</span>
        <span>·</span>
        <span>{tradeCount} trades</span>
        {completionRate < 100 && (
          <>
            <span>·</span>
            <span>{completionRate}%</span>
          </>
        )}
        {scorecard?.avgReleaseTimeMins !== null && scorecard?.avgReleaseTimeMins !== undefined && (
          <>
            <span>·</span>
            <span>{formatTime(scorecard.avgReleaseTimeMins)} release</span>
          </>
        )}
      </div>
    )
  }

  // Compact variant - summary card
  if (variant === 'compact') {
    return (
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        {/* Header with rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white">{displayName}</span>
            <span className="text-yellow-400 font-medium">★ {rating.toFixed(1)}</span>
          </div>
          {scorecard?.trades30d !== undefined && scorecard.trades30d > 0 && (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
              {scorecard.trades30d} this month
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">{completedCount}</span>
            <span className="text-gray-500">trades</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={completionRate >= 95 ? 'text-green-400' : completionRate >= 80 ? 'text-yellow-400' : 'text-red-400'}>
              {completionRate}%
            </span>
            <span className="text-gray-500">completion</span>
          </div>
          {scorecard?.avgReleaseTimeMins !== null && scorecard?.avgReleaseTimeMins !== undefined && (
            <div className="flex items-center gap-1">
              <span className={scorecard.avgReleaseTimeMins < 10 ? 'text-green-400' : 'text-gray-300'}>
                {formatTime(scorecard.avgReleaseTimeMins)}
              </span>
              <span className="text-gray-500">release</span>
            </div>
          )}
        </div>

        {/* Trust indicators */}
        {showTrustIndicators && scorecard?.trustIndicators && scorecard.trustIndicators.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {scorecard.trustIndicators.map(indicator => {
              const info = TRUST_INDICATOR_LABELS[indicator]
              if (!info) return null
              return (
                <span
                  key={indicator}
                  className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
                >
                  {info.icon} {info.label}
                </span>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Full variant - detailed scorecard
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 pb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{displayName}</h3>
          <p className="text-sm text-gray-400">
            Member since {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">★ {rating.toFixed(1)}</div>
          <div className="text-xs text-gray-400">{totalFeedback} reviews</div>
        </div>
      </div>

      {/* Trade Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-white">{completedCount}</div>
          <div className="text-xs text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className={`text-xl font-bold ${completionRate >= 95 ? 'text-green-400' : completionRate >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
            {completionRate}%
          </div>
          <div className="text-xs text-gray-400">Completion</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-white">{scorecard?.trades30d ?? 0}</div>
          <div className="text-xs text-gray-400">30-day</div>
        </div>
      </div>

      {/* Response Times */}
      {(scorecard?.avgReleaseTimeMins !== null || scorecard?.avgPayTimeMins !== null) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1">
            <span>⚡</span> Response Times
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between bg-gray-900/30 rounded px-3 py-2">
              <span className="text-sm text-gray-400">Avg release</span>
              <span className={`font-medium ${scorecard?.avgReleaseTimeMins !== null && scorecard.avgReleaseTimeMins < 10 ? 'text-green-400' : 'text-white'}`}>
                {formatTime(scorecard?.avgReleaseTimeMins ?? null)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-gray-900/30 rounded px-3 py-2">
              <span className="text-sm text-gray-400">Avg pay</span>
              <span className="font-medium text-white">
                {formatTime(scorecard?.avgPayTimeMins ?? null)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Score */}
      {totalFeedback > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1">
            <span>👍</span> Feedback
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-900/30 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${feedbackScore}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${feedbackScore >= 90 ? 'text-green-400' : feedbackScore >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
              {feedbackScore}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span className="text-green-400">+{positiveFeedback}</span>
            <span className="text-red-400">-{negativeFeedback}</span>
          </div>
        </div>
      )}

      {/* Volume */}
      {scorecard?.totalVolume !== undefined && scorecard.totalVolume > 0 && (
        <div className="flex items-center justify-between bg-gray-900/30 rounded px-3 py-2">
          <span className="text-sm text-gray-400">Total volume</span>
          <span className="font-medium text-white">{formatVolume(scorecard.totalVolume)}</span>
        </div>
      )}

      {/* Trust Indicators */}
      {showTrustIndicators && scorecard?.trustIndicators && scorecard.trustIndicators.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1">
            <span>🛡️</span> Trust Indicators
          </h4>
          <div className="flex flex-wrap gap-2">
            {scorecard.trustIndicators.map(indicator => {
              const info = TRUST_INDICATOR_LABELS[indicator]
              if (!info) return null
              return (
                <span
                  key={indicator}
                  className="text-sm px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                >
                  {info.icon} {info.label}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
