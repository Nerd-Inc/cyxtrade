import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import App from './App'
import Login from './pages/Login'
import OtpVerify from './pages/OtpVerify'
import CompleteProfile from './pages/CompleteProfile'
import BecomeTrader from './pages/BecomeTrader'
import Download from './pages/Download'
import AppHome from './pages/AppHome'
import SendMoney from './pages/SendMoney'
import History from './pages/History'
import TradeDetails from './pages/TradeDetails'
import TraderDashboard from './pages/TraderDashboard'
import PaymentMethods from './pages/PaymentMethods'

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore.getState().token
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

// Guest route wrapper (redirect to app if logged in)
function GuestRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore.getState().token
  if (token) {
    return <Navigate to="/app" replace />
  }
  return <>{children}</>
}

export const router = createBrowserRouter([
  // Landing page
  {
    path: '/',
    element: <App />
  },

  // Auth routes
  {
    path: '/login',
    element: (
      <GuestRoute>
        <Login />
      </GuestRoute>
    )
  },
  {
    path: '/otp',
    element: (
      <GuestRoute>
        <OtpVerify />
      </GuestRoute>
    )
  },

  // Profile completion (after first login)
  {
    path: '/complete-profile',
    element: (
      <ProtectedRoute>
        <CompleteProfile />
      </ProtectedRoute>
    )
  },

  // Become trader
  {
    path: '/become-trader',
    element: (
      <ProtectedRoute>
        <BecomeTrader />
      </ProtectedRoute>
    )
  },

  // Download page
  {
    path: '/download',
    element: <Download />
  },

  // App routes (protected)
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppHome />
      </ProtectedRoute>
    )
  },
  {
    path: '/app/send',
    element: (
      <ProtectedRoute>
        <SendMoney />
      </ProtectedRoute>
    )
  },
  {
    path: '/app/history',
    element: (
      <ProtectedRoute>
        <History />
      </ProtectedRoute>
    )
  },
  {
    path: '/app/trade/:id',
    element: (
      <ProtectedRoute>
        <TradeDetails />
      </ProtectedRoute>
    )
  },
  {
    path: '/app/profile',
    element: (
      <ProtectedRoute>
        <CompleteProfile />
      </ProtectedRoute>
    )
  },

  // Trader routes
  {
    path: '/app/trader-dashboard',
    element: (
      <ProtectedRoute>
        <TraderDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: '/app/payment-methods',
    element: (
      <ProtectedRoute>
        <PaymentMethods />
      </ProtectedRoute>
    )
  },

  // Placeholder routes
  {
    path: '/app/chat/:tradeId',
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Chat</h1>
            <p className="text-gray-600 dark:text-gray-400">Chat feature coming soon - use the mobile app for real-time messaging</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  },
  {
    path: '/app/dispute/:tradeId',
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Open Dispute</h1>
            <p className="text-gray-600 dark:text-gray-400">Dispute feature coming soon</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  },
  {
    path: '/app/settings',
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Settings page coming soon</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  },

  // Catch all - redirect to home
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
])
