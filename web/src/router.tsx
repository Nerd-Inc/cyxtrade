import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import App from './App'
import Login from './pages/Login'
import OtpVerify from './pages/OtpVerify'
import CompleteProfile from './pages/CompleteProfile'
import BecomeTrader from './pages/BecomeTrader'
import Download from './pages/Download'
import About from './pages/About'
import AppHome from './pages/AppHome'
// SendMoney removed - marketplace flow is now in AppHome
import History from './pages/History'
import TradeDetails from './pages/TradeDetails'
import Chat from './pages/Chat'
import TraderDashboard from './pages/TraderDashboard'
import PaymentMethods from './pages/PaymentMethods'
import PostTraderAd from './pages/PostTraderAd'
import Settings from './pages/Settings'
// Pro pages
import ProMarketplace from './pages/ProMarketplace'
import ProWallet from './pages/ProWallet'
import ProOrders from './pages/ProOrders'
import ProOrderDetails from './pages/ProOrderDetails'
import ProTrade from './pages/ProTrade'
import PostAd from './pages/PostAd'
import ProChat from './pages/ProChat'
import ProUserCenter from './pages/ProUserCenter'
import MyAds from './pages/MyAds'

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

  // About page
  {
    path: '/about',
    element: <About />
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
  // /app/send removed - marketplace flow is now in AppHome
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
  {
    path: '/app/post-ad',
    element: (
      <ProtectedRoute>
        <PostTraderAd />
      </ProtectedRoute>
    )
  },
  {
    path: '/app/trader',
    element: (
      <ProtectedRoute>
        <TraderDashboard />
      </ProtectedRoute>
    )
  },

  // Placeholder routes
  {
    path: '/app/chat',
    element: (
      <ProtectedRoute>
        <Chat />
      </ProtectedRoute>
    )
  },
  {
    path: '/app/chat/:tradeId',
    element: (
      <ProtectedRoute>
        <Chat />
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
        <Settings />
      </ProtectedRoute>
    )
  },

  // ============================================
  // CyxTrade Pro Routes
  // ============================================
  {
    path: '/pro',
    element: (
      <ProtectedRoute>
        <ProMarketplace />
      </ProtectedRoute>
    )
  },
  {
    path: '/pro/wallet',
    element: (
      <ProtectedRoute>
        <ProWallet />
      </ProtectedRoute>
    )
  },
  {
    path: '/pro/orders',
    element: (
      <ProtectedRoute>
        <ProOrders />
      </ProtectedRoute>
    )
  },
  {
    path: '/pro/order/:id',
    element: (
      <ProtectedRoute>
        <ProOrderDetails />
      </ProtectedRoute>
    )
  },
  {
    path: '/pro/trade/:id',
    element: (
      <ProtectedRoute>
        <ProTrade />
      </ProtectedRoute>
    )
  },
  {
    path: '/pro/post-ad',
    element: (
      <ProtectedRoute>
        <PostAd />
      </ProtectedRoute>
    )
  },
  {
    path: '/pro/my-ads',
    element: (
      <ProtectedRoute>
        <MyAds />
      </ProtectedRoute>
    )
  },
  {
    path: '/pro/chat',
    element: (
      <ProtectedRoute>
        <ProChat />
      </ProtectedRoute>
    )
  },
  {
    path: '/pro/user-center',
    element: (
      <ProtectedRoute>
        <ProUserCenter />
      </ProtectedRoute>
    )
  },

  // Catch all - redirect to home
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
])
