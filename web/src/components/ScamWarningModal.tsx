import { useState } from 'react'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskWarning {
  level: RiskLevel
  code: string
  message: string
  details?: string
}

export interface RiskAssessment {
  overallRisk: RiskLevel
  score: number
  warnings: RiskWarning[]
  canProceed: boolean
  requiresConfirmation: boolean
}

interface ScamWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  onCancel: () => void
  assessment: RiskAssessment
  actionLabel?: string
}

const RISK_COLORS: Record<RiskLevel, { bg: string; border: string; text: string; icon: string }> = {
  low: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: 'text-blue-400'
  },
  medium: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    icon: 'text-yellow-400'
  },
  high: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    icon: 'text-orange-400'
  },
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: 'text-red-400'
  }
}

const RISK_ICONS: Record<RiskLevel, string> = {
  low: 'ℹ️',
  medium: '⚠️',
  high: '🚨',
  critical: '🛑'
}

const RISK_TITLES: Record<RiskLevel, string> = {
  low: 'Notice',
  medium: 'Caution Advised',
  high: 'Warning',
  critical: 'High Risk Detected'
}

export default function ScamWarningModal({
  isOpen,
  onClose,
  onProceed,
  onCancel,
  assessment,
  actionLabel = 'Continue'
}: ScamWarningModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  if (!isOpen) return null

  const colors = RISK_COLORS[assessment.overallRisk]
  const icon = RISK_ICONS[assessment.overallRisk]
  const title = RISK_TITLES[assessment.overallRisk]

  const handleProceed = () => {
    if (assessment.requiresConfirmation && !acknowledged) return
    onProceed()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-md mx-4 rounded-2xl border ${colors.border} ${colors.bg} bg-gray-900/95 shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${colors.border}`}>
          <span className="text-2xl">{icon}</span>
          <div>
            <h2 className={`text-lg font-bold ${colors.text}`}>{title}</h2>
            <p className="text-sm text-gray-400">
              Risk Score: {assessment.score}/100
            </p>
          </div>
        </div>

        {/* Warnings List */}
        <div className="px-6 py-4 space-y-3 max-h-64 overflow-y-auto">
          {assessment.warnings.map((warning, idx) => {
            const warningColors = RISK_COLORS[warning.level]
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${warningColors.border} ${warningColors.bg}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-sm ${warningColors.icon}`}>
                    {RISK_ICONS[warning.level]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${warningColors.text}`}>
                      {warning.message}
                    </p>
                    {warning.details && (
                      <p className="text-sm text-gray-400 mt-1">
                        {warning.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Acknowledgment Checkbox for high/critical */}
        {assessment.requiresConfirmation && (
          <div className="px-6 py-3 border-t border-gray-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-900"
              />
              <span className="text-sm text-gray-300">
                I understand the risks and want to proceed anyway. I will verify all payment details carefully before sending money.
              </span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition"
          >
            Cancel Trade
          </button>
          {assessment.canProceed && (
            <button
              onClick={handleProceed}
              disabled={assessment.requiresConfirmation && !acknowledged}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition ${
                assessment.requiresConfirmation && !acknowledged
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : assessment.overallRisk === 'critical'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : assessment.overallRisk === 'high'
                      ? 'bg-orange-600 hover:bg-orange-500 text-white'
                      : 'bg-yellow-600 hover:bg-yellow-500 text-black'
              }`}
            >
              {actionLabel}
            </button>
          )}
          {!assessment.canProceed && (
            <div className="flex-1 px-4 py-2.5 rounded-lg bg-red-900/50 text-red-400 font-medium text-center">
              Cannot Proceed
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline warning banner for trade screens
 */
interface WarningBannerProps {
  warnings: RiskWarning[]
  onViewDetails?: () => void
  className?: string
}

export function WarningBanner({ warnings, onViewDetails, className = '' }: WarningBannerProps) {
  if (warnings.length === 0) return null

  // Get highest risk level
  const highestRisk = warnings.reduce<RiskLevel>((max, w) => {
    const order: RiskLevel[] = ['low', 'medium', 'high', 'critical']
    return order.indexOf(w.level) > order.indexOf(max) ? w.level : max
  }, 'low')

  const colors = RISK_COLORS[highestRisk]
  const icon = RISK_ICONS[highestRisk]

  return (
    <div className={`p-3 rounded-lg border ${colors.border} ${colors.bg} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className={`font-medium ${colors.text}`}>
            {warnings.length === 1 ? warnings[0].message : `${warnings.length} warnings detected`}
          </span>
        </div>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className={`text-sm ${colors.text} hover:underline`}
          >
            View Details
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Report suspicious activity modal
 */
interface ReportSuspiciousModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { reason: string; evidenceUrl?: string }) => Promise<void>
  tradeId: string
  methodType: string
  identifier: string
}

export function ReportSuspiciousModal({
  isOpen,
  onClose,
  onSubmit,
  tradeId: _tradeId,
  methodType,
  identifier
}: ReportSuspiciousModalProps) {
  const [reason, setReason] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the report')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onSubmit({ reason: reason.trim(), evidenceUrl: evidenceUrl.trim() || undefined })
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Report Suspicious Activity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Info */}
          <div className="p-3 rounded-lg bg-gray-800 text-sm">
            <p className="text-gray-400">Reporting payment method:</p>
            <p className="text-white font-medium mt-1">
              {methodType === 'bank' ? 'Bank Account' : methodType === 'mobile_money' ? 'Mobile Money' : 'Cash'}: {identifier}
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for report *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the suspicious activity..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Evidence URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Evidence URL (optional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="Link to screenshot or proof"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
