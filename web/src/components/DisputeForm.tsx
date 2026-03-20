import { useState, useEffect } from 'react'

// Types
export type DisputeClaimType =
  | 'item_not_received'
  | 'not_as_described'
  | 'payment_not_received'
  | 'wrong_amount'
  | 'unauthorized_transaction'
  | 'other'

export interface EvidenceRequirement {
  category: string
  label: string
  description: string
  evidenceType: 'screenshot' | 'document' | 'message' | 'other'
}

export interface DisputeClaimTypeInfo {
  id: DisputeClaimType
  name: string
  description: string
  required_evidence: EvidenceRequirement[]
  optional_evidence: EvidenceRequirement[]
  available_for_buyer: boolean
  available_for_seller: boolean
}

interface DisputeFormProps {
  orderId: string
  userRole: 'buyer' | 'seller'
  onSubmit: (data: {
    claimType: DisputeClaimType
    reason: string
  }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

// Claim type icons
const CLAIM_TYPE_ICONS: Record<DisputeClaimType, string> = {
  item_not_received: '📦',
  not_as_described: '⚠️',
  payment_not_received: '💳',
  wrong_amount: '💰',
  unauthorized_transaction: '🔒',
  other: '❓'
}

// Hardcoded claim types (since we don't have API integration yet)
const CLAIM_TYPES: DisputeClaimTypeInfo[] = [
  {
    id: 'item_not_received',
    name: 'Item/Funds Not Received',
    description: 'Payment sent but goods, crypto, or fiat never received',
    required_evidence: [
      { category: 'payment_screenshot', label: 'Payment Screenshot', description: 'Screenshot showing your payment was sent', evidenceType: 'screenshot' },
      { category: 'transaction_reference', label: 'Transaction Reference', description: 'Bank or payment provider reference number', evidenceType: 'document' },
    ],
    optional_evidence: [
      { category: 'chat_logs', label: 'Chat Logs', description: 'Relevant conversation with counterparty', evidenceType: 'screenshot' },
    ],
    available_for_buyer: true,
    available_for_seller: false
  },
  {
    id: 'not_as_described',
    name: 'Not as Described',
    description: 'Received item or amount differs from what was promised',
    required_evidence: [
      { category: 'original_agreement', label: 'Original Agreement', description: 'Screenshot of original ad or agreed terms', evidenceType: 'screenshot' },
      { category: 'received_proof', label: 'Proof of What Received', description: 'Screenshot showing what you actually received', evidenceType: 'screenshot' },
    ],
    optional_evidence: [],
    available_for_buyer: true,
    available_for_seller: false
  },
  {
    id: 'payment_not_received',
    name: 'Payment Not Received',
    description: 'Buyer claims to have paid but seller never received payment',
    required_evidence: [
      { category: 'account_statement', label: 'Account Statement', description: 'Bank statement showing no incoming transaction', evidenceType: 'document' },
    ],
    optional_evidence: [],
    available_for_buyer: false,
    available_for_seller: true
  },
  {
    id: 'wrong_amount',
    name: 'Wrong Amount',
    description: 'Received a different amount than what was agreed',
    required_evidence: [
      { category: 'agreed_amount_proof', label: 'Agreed Amount Proof', description: 'Order details or chat showing agreed amount', evidenceType: 'screenshot' },
      { category: 'received_amount_proof', label: 'Received Amount Proof', description: 'Screenshot showing actual amount received', evidenceType: 'screenshot' },
    ],
    optional_evidence: [],
    available_for_buyer: true,
    available_for_seller: true
  },
  {
    id: 'unauthorized_transaction',
    name: 'Unauthorized Transaction',
    description: 'Transaction was made without your consent or by a third party',
    required_evidence: [
      { category: 'unauthorized_proof', label: 'Proof of Unauthorized Access', description: 'Evidence that transaction was not initiated by you', evidenceType: 'document' },
    ],
    optional_evidence: [],
    available_for_buyer: true,
    available_for_seller: true
  },
  {
    id: 'other',
    name: 'Other Issue',
    description: 'Problem not covered by the categories above',
    required_evidence: [],
    optional_evidence: [],
    available_for_buyer: true,
    available_for_seller: true
  }
]

export default function DisputeForm({
  orderId: _orderId,
  userRole,
  onSubmit,
  onCancel,
  isLoading = false
}: DisputeFormProps) {
  const [step, setStep] = useState<'claim' | 'details' | 'review'>('claim')
  const [claimType, setClaimType] = useState<DisputeClaimType | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // Filter claim types based on user role
  const availableClaimTypes = CLAIM_TYPES.filter(ct =>
    userRole === 'buyer' ? ct.available_for_buyer : ct.available_for_seller
  )

  const selectedClaimType = CLAIM_TYPES.find(ct => ct.id === claimType)

  const handleSubmit = async () => {
    if (!claimType) {
      setError('Please select a claim type')
      return
    }
    if (reason.trim().length < 20) {
      setError('Please provide more details (at least 20 characters)')
      return
    }

    setError('')
    try {
      await onSubmit({ claimType, reason: reason.trim() })
    } catch (e) {
      setError((e as Error).message || 'Failed to submit dispute')
    }
  }

  // Reset error when changing steps
  useEffect(() => {
    setError('')
  }, [step])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">Open Dispute</h2>
            <p className="text-sm text-gray-400">
              Step {step === 'claim' ? '1' : step === 'details' ? '2' : '3'} of 3
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <StepDot active={step === 'claim'} completed={step !== 'claim'} label="Claim Type" />
            <div className={`flex-1 h-0.5 mx-2 ${step !== 'claim' ? 'bg-orange-500' : 'bg-gray-700'}`} />
            <StepDot active={step === 'details'} completed={step === 'review'} label="Details" />
            <div className={`flex-1 h-0.5 mx-2 ${step === 'review' ? 'bg-orange-500' : 'bg-gray-700'}`} />
            <StepDot active={step === 'review'} completed={false} label="Review" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Claim Type Selection */}
          {step === 'claim' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                Select the type of issue you're experiencing:
              </p>
              {availableClaimTypes.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => setClaimType(ct.id)}
                  className={`w-full p-4 rounded-xl text-left transition border ${
                    claimType === ct.id
                      ? 'bg-orange-500/20 border-orange-500'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{CLAIM_TYPE_ICONS[ct.id]}</span>
                    <div className="flex-1">
                      <p className={`font-medium ${claimType === ct.id ? 'text-orange-400' : 'text-white'}`}>
                        {ct.name}
                      </p>
                      <p className="text-sm text-gray-400 mt-0.5">{ct.description}</p>
                    </div>
                    {claimType === ct.id && (
                      <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Details */}
          {step === 'details' && selectedClaimType && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CLAIM_TYPE_ICONS[selectedClaimType.id]}</span>
                  <span className="font-medium text-white">{selectedClaimType.name}</span>
                </div>
              </div>

              {/* Evidence Requirements Info */}
              {selectedClaimType.required_evidence.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                  <p className="text-sm font-medium text-blue-400 mb-2">Required Evidence:</p>
                  <ul className="space-y-1">
                    {selectedClaimType.required_evidence.map(ev => (
                      <li key={ev.category} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-blue-400">•</span>
                        {ev.label}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">
                    You can submit evidence after opening the dispute.
                  </p>
                </div>
              )}

              {/* Reason Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Describe the issue in detail *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain what happened, including dates, amounts, and any relevant details..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                />
                <p className={`text-xs mt-1 ${reason.length < 20 ? 'text-gray-500' : 'text-green-400'}`}>
                  {reason.length}/20 characters minimum
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && selectedClaimType && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Claim Type</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CLAIM_TYPE_ICONS[selectedClaimType.id]}</span>
                  <span className="font-medium text-white">{selectedClaimType.name}</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Your Description</p>
                <p className="text-white text-sm whitespace-pre-wrap">{reason}</p>
              </div>

              <div className="p-3 rounded-lg bg-orange-900/20 border border-orange-500/30">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-orange-400">Important</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Opening a dispute will freeze this order. An arbitrator will review the case within 24-48 hours.
                      You will have 48 hours to submit evidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 mt-4">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
          {step === 'claim' && (
            <>
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('details')}
                disabled={!claimType}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </>
          )}

          {step === 'details' && (
            <>
              <button
                onClick={() => setStep('claim')}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep('review')}
                disabled={reason.trim().length < 20}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                onClick={() => setStep('details')}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition disabled:opacity-50"
              >
                {isLoading ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Step indicator dot
function StepDot({ active, completed, label }: { active: boolean; completed: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-3 h-3 rounded-full ${
        completed ? 'bg-orange-500' : active ? 'bg-orange-500 ring-2 ring-orange-500/30' : 'bg-gray-600'
      }`} />
      <span className={`text-xs mt-1 ${active || completed ? 'text-orange-400' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  )
}
