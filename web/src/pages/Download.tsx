import { Link } from 'react-router-dom'

export default function Download() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="CyxTrade" className="h-8 w-8" />
              <span className="text-xl font-bold text-teal-600">CyxTrade</span>
            </Link>
            <Link
              to="/login"
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
            >
              Login
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Download CyxTrade
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Send money home with low fees. Available on all platforms.
          </p>
        </div>

        {/* App Preview */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-900 rounded-3xl p-2 shadow-2xl">
            <div className="w-64 h-[500px] bg-gradient-to-b from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">&#128241;</div>
                <p className="font-semibold">CyxTrade App</p>
                <p className="text-sm opacity-75">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* iOS */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-5xl mb-4">&#63743;</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">iOS</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              iPhone and iPad
            </p>
            <a
              href="#"
              className="inline-flex items-center justify-center w-full bg-black text-white px-4 py-3 rounded-xl hover:bg-gray-800 transition"
            >
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              App Store
            </a>
            <p className="text-xs text-gray-500 mt-2">Coming Soon</p>
          </div>

          {/* Android */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-5xl mb-4">&#129302;</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Android</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Phones and tablets
            </p>
            <a
              href="#"
              className="inline-flex items-center justify-center w-full bg-black text-white px-4 py-3 rounded-xl hover:bg-gray-800 transition"
            >
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              Google Play
            </a>
            <p className="text-xs text-gray-500 mt-2">Coming Soon</p>
          </div>

          {/* Web */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-lg border-2 border-teal-500">
            <div className="text-5xl mb-4">&#127760;</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Web App</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Use in your browser
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full bg-teal-600 text-white px-4 py-3 rounded-xl hover:bg-teal-700 transition"
            >
              &#8594; Open Web App
            </Link>
            <p className="text-xs text-teal-600 mt-2">Available Now</p>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Why Download?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="text-2xl">&#128274;</div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Secure P2P Chat</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  End-to-end encrypted messaging with traders
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-2xl">&#128276;</div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Push Notifications</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Get notified when your transfer completes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-2xl">&#9889;</div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Faster Experience</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Native performance, works offline
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-2xl">&#128247;</div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Easy Proof Upload</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Take photos directly for payment proof
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Scan to download on your phone
          </p>
          <div className="inline-block bg-white p-4 rounded-xl">
            <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-400 text-sm">QR Code</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            &copy; 2024 CyxTrade. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
