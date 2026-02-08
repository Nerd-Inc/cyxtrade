import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function AppHome() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="CyxTrade" className="h-8 w-8" />
              <span className="text-xl font-bold text-teal-600">CyxTrade</span>
            </div>
            <div className="flex items-center gap-4">
              {user?.isTrader && (
                <Link
                  to="/app/trader-dashboard"
                  className="text-teal-600 hover:text-teal-700 font-medium transition"
                >
                  Trader Dashboard
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user?.displayName || 'there'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            What would you like to do today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link
            to="/app/send"
            className="bg-teal-600 text-white p-6 rounded-2xl hover:bg-teal-700 transition group"
          >
            <div className="text-3xl mb-2">&#128176;</div>
            <h3 className="text-xl font-semibold mb-1">Send Money</h3>
            <p className="text-teal-100 text-sm">
              Transfer to family and friends abroad
            </p>
          </Link>

          <Link
            to="/app/history"
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition"
          >
            <div className="text-3xl mb-2">&#128203;</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">History</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              View your past transactions
            </p>
          </Link>
        </div>

        {/* Become Trader Card */}
        {!user?.isTrader && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-2xl mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-1">Become a Trader</h3>
                <p className="text-purple-100 text-sm">
                  Earn by facilitating currency exchanges
                </p>
              </div>
              <Link
                to="/become-trader"
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center text-2xl">
              {user?.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user?.displayName || 'Complete your profile'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{user?.phone}</p>
              {user?.isTrader && (
                <span className="inline-block bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs px-2 py-1 rounded mt-1">
                  Trader
                </span>
              )}
            </div>
          </div>
          <Link
            to="/app/profile"
            className="text-teal-600 hover:text-teal-700 font-medium text-sm"
          >
            Edit Profile &#8594;
          </Link>
        </div>

        {/* Download App Banner */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Get the best experience with our mobile app
          </p>
          <Link
            to="/download"
            className="inline-block bg-gray-900 dark:bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition"
          >
            Download App
          </Link>
        </div>
      </main>
    </div>
  )
}
