import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { sendOtp, login, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendOtp(phone);
      setStep('otp');
    } catch {
      // Error handled in store
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(phone, otp);
      navigate('/');
    } catch {
      // Error handled in store
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0E11',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Watermark Logo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <img
          src="/logo.png"
          alt=""
          style={{
            width: '500px',
            height: '500px',
            opacity: 0.03,
            filter: 'grayscale(100%)',
          }}
        />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '40px',
          background: '#1E2329',
          borderRadius: '8px',
          border: '1px solid #374151',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/logo.png"
            alt="CyxTrade"
            style={{ width: '128px', height: '128px', margin: '0 auto 20px' }}
          />
        </div>
        <h1 style={{ textAlign: 'center', marginBottom: '8px', color: '#00a78e' }}>
          CyxTrade Admin
        </h1>
        <p style={{ textAlign: 'center', color: '#9CA3AF', marginBottom: '32px' }}>
          Sign in with your admin phone number
        </p>

        {error && (
          <div
            style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '4px',
              color: '#f87171',
              marginBottom: '16px',
              cursor: 'pointer',
            }}
            onClick={clearError}
          >
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#D1D5DB' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+971501234567"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #374151',
                borderRadius: '4px',
                fontSize: '16px',
                marginBottom: '16px',
                boxSizing: 'border-box',
                background: '#2B3139',
                color: '#fff',
              }}
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#f7941d',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ marginBottom: '16px', color: '#9CA3AF' }}>
              Enter the OTP sent to <strong style={{ color: '#00a78e' }}>{phone}</strong>
            </p>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#D1D5DB' }}>
              OTP Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #374151',
                borderRadius: '4px',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                marginBottom: '16px',
                boxSizing: 'border-box',
                background: '#2B3139',
                color: '#fff',
              }}
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#f7941d',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: 'none',
                color: '#9CA3AF',
                marginTop: '8px',
                cursor: 'pointer',
              }}
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
