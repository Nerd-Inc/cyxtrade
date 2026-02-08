import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTraderStore } from '../store/trader'
import type { PaymentMethod, VerificationResult } from '../store/trader'

type MethodType = 'bank_transfer' | 'mobile_money' | 'cash'

const METHOD_TYPES: { value: MethodType; label: string; icon: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '&#127974;' },
  { value: 'mobile_money', label: 'Mobile Money', icon: '&#128241;' },
  { value: 'cash', label: 'Cash Pickup', icon: '&#128181;' },
]

const BANK_FIELDS = [
  { key: 'bankName', label: 'Bank Name', placeholder: 'e.g., UBA Bank' },
  { key: 'accountName', label: 'Account Name', placeholder: 'Full name on account' },
  { key: 'accountNumber', label: 'Account Number', placeholder: 'Your account number' },
  { key: 'swiftCode', label: 'SWIFT Code (Optional)', placeholder: 'e.g., UABORWX' },
]

const MOBILE_FIELDS = [
  { key: 'provider', label: 'Provider', placeholder: 'e.g., MTN, Orange Money' },
  { key: 'phoneNumber', label: 'Phone Number', placeholder: '+237 6XX XXX XXX' },
  { key: 'accountName', label: 'Account Name', placeholder: 'Name on account' },
]

const CASH_FIELDS = [
  { key: 'location', label: 'Pickup Location', placeholder: 'City or area' },
  { key: 'instructions', label: 'Instructions', placeholder: 'How to collect' },
]

const VERIFICATION_STATUS_COLORS = {
  unverified: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  verified: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

const VERIFICATION_STATUS_LABELS = {
  unverified: 'Unverified',
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
}

function PaymentMethodCard({
  method,
  onSetPrimary,
  onDelete,
  onVerify,
  isLoading
}: {
  method: PaymentMethod
  onSetPrimary: () => void
  onDelete: () => void
  onVerify: () => void
  isLoading: boolean
}) {
  const typeInfo = METHOD_TYPES.find(t => t.value === method.type)
  const verificationStatus = method.verificationStatus || 'unverified'

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-4 transition ${
      method.isPrimary
        ? 'border-teal-500'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" dangerouslySetInnerHTML={{ __html: typeInfo?.icon || '' }} />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{method.name}</p>
            <p className="text-sm text-gray-500">{typeInfo?.label}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {method.isPrimary && (
            <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-600 text-xs px-2 py-1 rounded-full">
              Primary
            </span>
          )}
          <span className={`text-xs px-2 py-1 rounded-full ${VERIFICATION_STATUS_COLORS[verificationStatus]}`}>
            {VERIFICATION_STATUS_LABELS[verificationStatus]}
          </span>
        </div>
      </div>

      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4">
        {Object.entries(method.details).map(([key, value]) => (
          <p key={key}>
            <span className="text-gray-500">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
            <span className="text-gray-900 dark:text-white">{value}</span>
          </p>
        ))}
      </div>

      {/* Verification warning for unverified methods */}
      {verificationStatus === 'unverified' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Verification Required</p>
              <p className="text-yellow-700 dark:text-yellow-300">Verify this payment method to accept trades. This prevents third-party payment scams.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {verificationStatus === 'unverified' && (
          <button
            onClick={onVerify}
            disabled={isLoading}
            className="flex-1 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
          >
            Verify Now
          </button>
        )}
        {verificationStatus === 'pending' && (
          <button
            onClick={onVerify}
            disabled={isLoading}
            className="flex-1 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50"
          >
            Continue Verification
          </button>
        )}
        {verificationStatus === 'expired' && (
          <button
            onClick={onVerify}
            disabled={isLoading}
            className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
          >
            Restart Verification
          </button>
        )}
        {!method.isPrimary && verificationStatus === 'verified' && (
          <button
            onClick={onSetPrimary}
            disabled={isLoading}
            className="flex-1 py-2 text-sm border border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition disabled:opacity-50"
          >
            Set as Primary
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="py-2 px-4 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function PaymentMethods() {
  const {
    paymentMethods,
    isLoading,
    error,
    getPaymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    setPrimaryPaymentMethod,
    initiateVerification,
    submitVerificationProof,
    clearError
  } = useTraderStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyingMethod, setVerifyingMethod] = useState<PaymentMethod | null>(null)
  const [verificationData, setVerificationData] = useState<VerificationResult | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [methodType, setMethodType] = useState<MethodType>('bank_transfer')
  const [methodName, setMethodName] = useState('')
  const [details, setDetails] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [verificationStep, setVerificationStep] = useState<'instructions' | 'upload'>('instructions')

  useEffect(() => {
    getPaymentMethods()
  }, [])

  const getFields = () => {
    switch (methodType) {
      case 'bank_transfer': return BANK_FIELDS
      case 'mobile_money': return MOBILE_FIELDS
      case 'cash': return CASH_FIELDS
      default: return []
    }
  }

  const handleAdd = async () => {
    if (!methodName.trim()) return

    setSubmitting(true)
    const result = await addPaymentMethod({
      type: methodType,
      name: methodName,
      details
    })
    setSubmitting(false)

    if (result) {
      setShowAddModal(false)
      setMethodName('')
      setDetails({})
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return
    setProcessingId(id)
    await deletePaymentMethod(id)
    setProcessingId(null)
  }

  const handleSetPrimary = async (id: string) => {
    setProcessingId(id)
    await setPrimaryPaymentMethod(id)
    setProcessingId(null)
  }

  const handleStartVerification = async (method: PaymentMethod) => {
    setVerifyingMethod(method)
    setShowVerifyModal(true)
    setVerificationStep('instructions')
    setProofUrl('')

    // Initiate verification
    const result = await initiateVerification(method.id)
    if (result) {
      setVerificationData(result)
    }
  }

  const handleSubmitProof = async () => {
    if (!verifyingMethod || !proofUrl.trim()) return

    setSubmitting(true)
    const success = await submitVerificationProof(verifyingMethod.id, proofUrl)
    setSubmitting(false)

    if (success) {
      setShowVerifyModal(false)
      setVerifyingMethod(null)
      setVerificationData(null)
      setProofUrl('')
    }
  }

  const closeVerifyModal = () => {
    setShowVerifyModal(false)
    setVerifyingMethod(null)
    setVerificationData(null)
    setProofUrl('')
    setVerificationStep('instructions')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/app/trader-dashboard" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payment Methods</h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
            >
              Add New
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={clearError} className="text-red-700 underline text-sm mt-1">Dismiss</button>
          </div>
        )}

        {/* Info banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Verified Payment Methods Only</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                To protect against third-party payment scams, all payment methods must be verified before you can accept trades.
                Verification proves you own the account by making a small self-transfer.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 dark:text-white mb-2">No payment methods</p>
            <p className="text-sm text-gray-500 mb-4">Add a payment method to start receiving payments</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-block bg-teal-600 text-white px-6 py-2 rounded-xl hover:bg-teal-700 transition"
            >
              Add Payment Method
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onSetPrimary={() => handleSetPrimary(method.id)}
                onDelete={() => handleDelete(method.id)}
                onVerify={() => handleStartVerification(method)}
                isLoading={processingId === method.id}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Add Payment Method
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Method Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {METHOD_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setMethodType(type.value)
                        setDetails({})
                      }}
                      className={`p-3 rounded-xl border-2 text-center transition ${
                        methodType === type.value
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-teal-400'
                      }`}
                    >
                      <span className="text-2xl" dangerouslySetInnerHTML={{ __html: type.icon }} />
                      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={methodName}
                  onChange={(e) => setMethodName(e.target.value)}
                  placeholder="e.g., My UBA Account"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Dynamic Fields */}
              {getFields().map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={details[field.key] || ''}
                    onChange={(e) => setDetails(d => ({ ...d, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setMethodName('')
                  setDetails({})
                }}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting || !methodName.trim()}
                className="flex-1 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Method'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && verifyingMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Verify Payment Method
              </h3>
              <p className="text-sm text-gray-500 mt-1">{verifyingMethod.name}</p>
            </div>

            <div className="p-6">
              {!verificationData ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
                </div>
              ) : verificationStep === 'instructions' ? (
                <div className="space-y-4">
                  <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      <h4 className="font-medium text-teal-800 dark:text-teal-200">Make a Self-Transfer</h4>
                    </div>
                    <p className="text-sm text-teal-700 dark:text-teal-300 ml-8">
                      Send exactly <strong>{verificationData.amount} XAF</strong> from this account to any other account you control.
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-yellow-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Include Verification Code</h4>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 ml-8 mb-2">
                      Add this code in the payment reference/description:
                    </p>
                    <div className="ml-8 bg-white dark:bg-gray-700 border-2 border-dashed border-yellow-400 rounded-lg p-3 text-center">
                      <code className="text-lg font-bold text-gray-900 dark:text-white tracking-wider">
                        {verificationData.code}
                      </code>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200">Take a Screenshot</h4>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 ml-8">
                      Screenshot the transaction confirmation showing the sender account, amount, and reference code.
                    </p>
                  </div>

                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Code expires: {new Date(verificationData.expiresAt).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Upload the screenshot of your transaction showing the verification code <strong>{verificationData.code}</strong>.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Proof URL *
                    </label>
                    <input
                      type="url"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="https://example.com/screenshot.png"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload your screenshot to an image host and paste the URL here
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={closeVerifyModal}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              {verificationStep === 'instructions' ? (
                <button
                  onClick={() => setVerificationStep('upload')}
                  disabled={!verificationData}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-50"
                >
                  I've Made the Transfer
                </button>
              ) : (
                <button
                  onClick={handleSubmitProof}
                  disabled={submitting || !proofUrl.trim()}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Proof'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
