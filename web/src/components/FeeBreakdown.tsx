import { useMemo } from 'react'

export interface FeeBreakdownProps {
  sendAmount: number
  sendCurrency: string
  sendCurrencySymbol?: string
  receiveAmount: number
  receiveCurrency: string
  receiveCurrencySymbol?: string
  exchangeRate: number
  marketRate?: number // Optional market rate for comparison
  platformFeePercent?: number // Default 0.5%
  networkFee?: number // Optional network/delivery fee
  estimatedDeliveryTime?: string // e.g., "~15 minutes"
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

export default function FeeBreakdown({
  sendAmount,
  sendCurrency,
  sendCurrencySymbol = '',
  receiveAmount,
  receiveCurrency,
  receiveCurrencySymbol = '',
  exchangeRate,
  marketRate,
  platformFeePercent = 0.5,
  networkFee = 0,
  estimatedDeliveryTime,
  variant = 'default',
  className = ''
}: FeeBreakdownProps) {
  const calculations = useMemo(() => {
    const platformFee = sendAmount * (platformFeePercent / 100)
    const totalFees = platformFee + networkFee
    const effectiveRate = receiveAmount / sendAmount

    // Rate comparison (positive = better than market, negative = worse)
    const rateComparison = marketRate
      ? ((exchangeRate - marketRate) / marketRate) * 100
      : null

    // Cost breakdown
    const feePercentOfTotal = (totalFees / sendAmount) * 100

    return {
      platformFee,
      totalFees,
      effectiveRate,
      rateComparison,
      feePercentOfTotal
    }
  }, [sendAmount, receiveAmount, exchangeRate, marketRate, platformFeePercent, networkFee])

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-[#2B3139] rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Total Fee</span>
          <span className="text-white font-medium">
            {sendCurrencySymbol}{formatNumber(calculations.totalFees)} {sendCurrency}
            <span className="text-gray-500 text-xs ml-1">({formatNumber(calculations.feePercentOfTotal)}%)</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">You Receive</span>
          <span className="text-green-400 font-semibold">
            {receiveCurrencySymbol}{formatNumber(receiveAmount)} {receiveCurrency}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[#2B3139] rounded-xl overflow-hidden ${className}`}>
      {/* Header - What You're Sending */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">You Send</span>
          <span className="text-xl font-bold text-white">
            {sendCurrencySymbol}{formatNumber(sendAmount)} {sendCurrency}
          </span>
        </div>
      </div>

      {/* Fee Breakdown Section */}
      <div className="p-4 space-y-3">
        {/* Exchange Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-gray-400 text-sm">Exchange Rate</span>
          </div>
          <div className="text-right">
            <span className="text-white font-medium">
              1 {sendCurrency} = {formatNumber(exchangeRate)} {receiveCurrency}
            </span>
            {calculations.rateComparison !== null && (
              <div className={`text-xs mt-0.5 ${
                calculations.rateComparison >= 0 ? 'text-green-400' : 'text-orange-400'
              }`}>
                {calculations.rateComparison >= 0 ? (
                  <span className="flex items-center justify-end gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {formatNumber(Math.abs(calculations.rateComparison))}% better than market
                  </span>
                ) : (
                  <span>{formatNumber(Math.abs(calculations.rateComparison))}% below market rate</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Platform Fee */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-400 text-sm">Platform Fee ({platformFeePercent}%)</span>
          </div>
          <span className="text-gray-300">
            -{sendCurrencySymbol}{formatNumber(calculations.platformFee)} {sendCurrency}
          </span>
        </div>

        {/* Network Fee (if applicable) */}
        {networkFee > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-gray-400 text-sm">Network Fee</span>
            </div>
            <span className="text-gray-300">
              -{sendCurrencySymbol}{formatNumber(networkFee)} {sendCurrency}
            </span>
          </div>
        )}

        {/* Estimated Delivery Time */}
        {estimatedDeliveryTime && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-400 text-sm">Estimated Delivery</span>
            </div>
            <span className="text-gray-300">{estimatedDeliveryTime}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-700/50 pt-3 mt-3">
          {/* Total Fees */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Fees</span>
            <span className="text-gray-300">
              {sendCurrencySymbol}{formatNumber(calculations.totalFees)} {sendCurrency}
              <span className="text-gray-500 text-xs ml-1">({formatNumber(calculations.feePercentOfTotal)}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer - What Recipient Gets */}
      <div className="p-4 bg-green-500/10 border-t border-green-500/20">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-green-400 text-sm">Recipient Gets</span>
            {variant === 'detailed' && (
              <p className="text-gray-500 text-xs mt-0.5">After all fees and conversion</p>
            )}
          </div>
          <span className="text-2xl font-bold text-green-400">
            {receiveCurrencySymbol}{formatNumber(receiveAmount)} {receiveCurrency}
          </span>
        </div>
      </div>

      {/* Transparency Notice */}
      {variant === 'detailed' && (
        <div className="px-4 py-3 bg-[#1A1E23] border-t border-gray-700/50">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-500">
              No hidden fees. The rate shown includes all costs. What you see is what you pay.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Inline fee summary for smaller displays
 */
export function FeeSummaryInline({
  sendAmount,
  sendCurrency,
  sendCurrencySymbol = '',
  platformFeePercent = 0.5,
  className = ''
}: {
  sendAmount: number
  sendCurrency: string
  sendCurrencySymbol?: string
  platformFeePercent?: number
  className?: string
}) {
  const platformFee = sendAmount * (platformFeePercent / 100)

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="text-gray-500">Fee:</span>
      <span className="text-gray-300">
        {sendCurrencySymbol}{platformFee.toFixed(2)} {sendCurrency}
      </span>
      <span className="text-gray-600">({platformFeePercent}%)</span>
    </div>
  )
}

/**
 * Rate comparison badge
 */
export function RateComparisonBadge({
  traderRate,
  marketRate,
  className = ''
}: {
  traderRate: number
  marketRate: number
  className?: string
}) {
  const diff = ((traderRate - marketRate) / marketRate) * 100
  const isBetter = diff >= 0

  if (Math.abs(diff) < 0.1) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300 ${className}`}>
        Market rate
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
      isBetter
        ? 'bg-green-500/20 text-green-400'
        : 'bg-orange-500/20 text-orange-400'
    } ${className}`}>
      {isBetter ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          {Math.abs(diff).toFixed(1)}% better
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {Math.abs(diff).toFixed(1)}% below
        </>
      )}
    </span>
  )
}
