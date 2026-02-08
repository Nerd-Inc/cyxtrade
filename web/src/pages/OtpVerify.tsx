import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function OtpVerify() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const phone = location.state?.phone || ''

  const { verifyOtp, requestOtp, isLoading, error, clearError } = useAuthStore()

  useEffect(() => {
    if (!phone) {
      navigate('/login')
    }
  }, [phone, navigate])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when complete
    if (newOtp.every(digit => digit) && newOtp.join('').length === 6) {
      handleSubmit(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = [...otp]
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i]
    }
    setOtp(newOtp)
    if (pastedData.length === 6) {
      handleSubmit(pastedData)
    }
  }

  const handleSubmit = async (otpCode: string) => {
    clearError()
    const success = await verifyOtp(phone, otpCode)
    if (success) {
      // Check if user needs to complete profile
      const currentUser = useAuthStore.getState().user
      if (!currentUser?.displayName) {
        navigate('/complete-profile')
      } else {
        navigate('/app')
      }
    }
  }

  const handleResend = async () => {
    clearError()
    await requestOtp(phone)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <img src="/logo.png" alt="CyxTrade" className="h-12 w-12" />
            <span className="text-2xl font-bold text-teal-600">CyxTrade</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Your Phone
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter the 6-digit code sent to
          </p>
          <p className="text-teal-600 font-medium">{phone}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                disabled={isLoading}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4 text-center">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="text-center text-gray-500 dark:text-gray-400 mb-4">
              Verifying...
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={isLoading}
              className="text-teal-600 hover:text-teal-700 font-medium transition"
            >
              Resend Code
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-gray-500 hover:text-teal-600 transition">
            Use different number
          </Link>
        </div>

        {/* Dev hint */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Dev mode: OTP is 123456
        </div>
      </div>
    </div>
  )
}
