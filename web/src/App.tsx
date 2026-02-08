import { useState, useEffect, createContext, useContext } from 'react'
import { Link } from 'react-router-dom'

// Dark mode context
const DarkModeContext = createContext({
  dark: false,
  toggle: () => {}
})

function App() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) return saved === 'true'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', String(dark))
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [dark])

  const toggle = () => setDark(!dark)

  return (
    <DarkModeContext.Provider value={{ dark, toggle }}>
      <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-white'}`}>
        <Header />
        <Hero />
        <Features />
        <HowItWorks />
        <Download />
        <FAQ />
        <Footer />
      </div>
    </DarkModeContext.Provider>
  )
}

// Header Component
function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { dark, toggle } = useContext(DarkModeContext)

  return (
    <header className={`fixed top-0 left-0 right-0 backdrop-blur-sm z-50 border-b ${dark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-100'}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="CyxTrade" className="h-8 w-8" />
            <span className="text-xl font-bold text-teal-600">CyxTrade</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'} transition`}>Features</a>
            <a href="#how-it-works" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'} transition`}>How It Works</a>
            <a href="#download" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'} transition`}>Download</a>
            <a href="#faq" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'} transition`}>FAQ</a>

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className={`p-2 rounded-lg ${dark ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'} transition`}
              aria-label="Toggle dark mode"
            >
              {dark ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <Link
              to="/login"
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
            >
              Open App
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggle}
              className={`p-2 rounded-lg ${dark ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
            >
              {dark ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <button
              className={`p-2 ${dark ? 'text-gray-300' : 'text-gray-600'}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className={`md:hidden py-4 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className="flex flex-col space-y-4">
              <a href="#features" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>Features</a>
              <a href="#how-it-works" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>How It Works</a>
              <a href="#download" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>Download</a>
              <a href="#faq" className={`${dark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>FAQ</a>
              <Link
                to="/login"
                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-center hover:bg-teal-700"
              >
                Open App
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

// Hero Component
function Hero() {
  const { dark } = useContext(DarkModeContext)

  return (
    <section className={`pt-24 pb-16 md:pt-32 md:pb-24 ${dark ? 'bg-gradient-to-b from-gray-800 to-gray-900' : 'bg-gradient-to-b from-teal-50 to-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Send Money Home,
            <br />
            <span className="text-teal-500">Without the Fees</span>
          </h1>
          <p className={`text-xl max-w-2xl mx-auto mb-8 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
            CyxTrade connects you with trusted local traders for fast, low-cost international transfers.
            Save up to 80% compared to traditional remittance services.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#download"
              className="bg-teal-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-teal-700 transition shadow-lg shadow-teal-600/30"
            >
              Download App
            </a>
            <Link
              to="/login"
              className={`px-8 py-4 rounded-xl text-lg font-semibold border-2 border-teal-600 transition ${dark ? 'bg-gray-800 text-teal-400 hover:bg-gray-700' : 'bg-white text-teal-600 hover:bg-teal-50'}`}
            >
              Use Web Version
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-teal-500">2-3%</div>
              <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Avg. Fees</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-teal-500">30 min</div>
              <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Avg. Time</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-teal-500">100%</div>
              <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Protected</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Features Component
function Features() {
  const { dark } = useContext(DarkModeContext)

  const features = [
    {
      icon: '💰',
      title: 'Low Fees',
      description: 'Pay only 2-3% spread instead of 10-15% at traditional services. Keep more money for your family.'
    },
    {
      icon: '⚡',
      title: 'Fast Transfers',
      description: 'Most transfers complete in 30-45 minutes. No waiting days for your money to arrive.'
    },
    {
      icon: '🛡️',
      title: 'Secure & Protected',
      description: 'Traders post security bonds that protect you. If something goes wrong, you get compensated.'
    },
    {
      icon: '🤝',
      title: 'Trusted Network',
      description: 'Trade with verified traders who have real track records and ratings from other users.'
    },
    {
      icon: '📱',
      title: 'Easy to Use',
      description: 'Simple interface that anyone can use. No crypto knowledge needed.'
    },
    {
      icon: '🌍',
      title: 'Underserved Corridors',
      description: 'We focus on corridors ignored by big players. UAE to Cameroon and more coming soon.'
    }
  ]

  return (
    <section id="features" className={`py-16 md:py-24 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Why Choose CyxTrade?
          </h2>
          <p className={`text-xl max-w-2xl mx-auto ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Built for the diaspora, by the diaspora. We understand the pain of expensive remittances.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`p-6 rounded-2xl transition group ${dark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-teal-50'}`}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className={`text-xl font-semibold mb-2 group-hover:text-teal-500 transition ${dark ? 'text-white' : 'text-gray-900'}`}>
                {feature.title}
              </h3>
              <p className={dark ? 'text-gray-400' : 'text-gray-600'}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// How It Works Component
function HowItWorks() {
  const { dark } = useContext(DarkModeContext)

  const steps = [
    {
      step: '1',
      title: 'Enter Amount',
      description: 'Tell us how much you want to send and where. See real-time exchange rates.'
    },
    {
      step: '2',
      title: 'Choose a Trader',
      description: 'Browse verified traders, compare rates and reviews. Pick the best one for you.'
    },
    {
      step: '3',
      title: 'Pay Locally',
      description: 'Transfer money to your chosen trader using bank transfer or mobile money.'
    },
    {
      step: '4',
      title: 'Recipient Gets Paid',
      description: 'The trader\'s partner pays your recipient locally. Done in 30-45 minutes!'
    }
  ]

  return (
    <section id="how-it-works" className={`py-16 md:py-24 ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
            How It Works
          </h2>
          <p className={`text-xl max-w-2xl mx-auto ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Sending money has never been easier. Four simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              <div className={`rounded-2xl p-6 shadow-sm h-full ${dark ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {item.title}
                </h3>
                <p className={dark ? 'text-gray-400' : 'text-gray-600'}>{item.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`hidden lg:block absolute top-10 -right-4 text-2xl ${dark ? 'text-teal-500' : 'text-teal-300'}`}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className={`mt-16 rounded-2xl p-8 shadow-sm ${dark ? 'bg-gray-900' : 'bg-white'}`}>
          <h3 className={`text-2xl font-bold text-center mb-8 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Compare the Savings
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className={`p-6 rounded-xl ${dark ? 'bg-red-900/30' : 'bg-red-50'}`}>
              <h4 className="font-semibold text-red-500 mb-4">Traditional Services</h4>
              <div className={`space-y-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="flex justify-between">
                  <span>Sending $500</span>
                  <span className="font-semibold">$500.00</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Fees (10-15%)</span>
                  <span className="font-semibold">-$50 to $75</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Bad exchange rate</span>
                  <span className="font-semibold">-$20</span>
                </div>
                <div className={`border-t pt-2 flex justify-between font-bold ${dark ? 'border-red-800' : 'border-red-200'}`}>
                  <span>Recipient gets</span>
                  <span className="text-red-500">~$405-$430</span>
                </div>
              </div>
            </div>
            <div className={`p-6 rounded-xl ${dark ? 'bg-teal-900/30' : 'bg-teal-50'}`}>
              <h4 className="font-semibold text-teal-500 mb-4">With CyxTrade</h4>
              <div className={`space-y-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="flex justify-between">
                  <span>Sending $500</span>
                  <span className="font-semibold">$500.00</span>
                </div>
                <div className="flex justify-between text-teal-500">
                  <span>Fees (2-3%)</span>
                  <span className="font-semibold">-$10 to $15</span>
                </div>
                <div className="flex justify-between text-teal-500">
                  <span>Competitive rate</span>
                  <span className="font-semibold">$0</span>
                </div>
                <div className={`border-t pt-2 flex justify-between font-bold ${dark ? 'border-teal-800' : 'border-teal-200'}`}>
                  <span>Recipient gets</span>
                  <span className="text-teal-500">~$485-$490</span>
                </div>
              </div>
            </div>
          </div>
          <p className={`text-center mt-6 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
            Save $60-85 on every $500 sent. That's $700-1,000/year for monthly senders!
          </p>
        </div>
      </div>
    </section>
  )
}

// Download Component
function Download() {
  return (
    <section id="download" className="py-16 md:py-24 bg-teal-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Download CyxTrade
          </h2>
          <p className="text-xl text-teal-100 max-w-2xl mx-auto mb-8">
            Available on iOS, Android, and Web. Start sending money in minutes.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            {/* App Store */}
            <a
              href="#"
              className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
            >
              <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs">Download on the</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </a>

            {/* Play Store */}
            <a
              href="#"
              className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
            >
              <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs">Get it on</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </a>
          </div>

          <p className="text-teal-200">
            Or use the{' '}
            <Link to="/login" className="text-white underline hover:no-underline">
              web version
            </Link>
            {' '}directly in your browser
          </p>
        </div>
      </div>
    </section>
  )
}

// FAQ Component
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const { dark } = useContext(DarkModeContext)

  const faqs = [
    {
      question: 'What is CyxTrade?',
      answer: 'CyxTrade is a peer-to-peer fiat exchange platform that connects you with local traders to send money internationally at low costs. Instead of using expensive remittance services, you trade directly with trusted individuals.'
    },
    {
      question: 'How much does it cost?',
      answer: 'CyxTrade charges no platform fees. You only pay the trader\'s spread (difference between buy and sell rates), which is typically 2-3%. Compare this to 10-15% at traditional services like Western Union.'
    },
    {
      question: 'Is my money safe?',
      answer: 'Yes. Every trader must post a security bond before trading. If a trader fails to complete their part, their bond is forfeited to compensate you. Trade limits are tied to bond amounts to ensure full protection.'
    },
    {
      question: 'How long does a transfer take?',
      answer: 'Most transfers complete in 30-45 minutes. Bank transfers may take 1-2 hours. First-time transfers might take a bit longer as you get familiar with the process.'
    },
    {
      question: 'What currencies are supported?',
      answer: 'Currently we support UAE Dirham (AED) to Central African CFA Franc (XAF). More currencies coming soon including USD, EUR, NGN, and GBP.'
    },
    {
      question: 'Do I need to be a trader?',
      answer: 'No! Most users are just senders. You find a trader, pay them locally, and they arrange for your recipient to get paid. You only need to become a trader if you want to earn money by facilitating exchanges.'
    },
    {
      question: 'What if something goes wrong?',
      answer: 'If there\'s a problem, first try to resolve it via chat with the trader. If that fails, raise a dispute with evidence. Our dispute team reviews cases within 24-48 hours. If the trader is at fault, their bond compensates you.'
    },
    {
      question: 'How do I become a trader?',
      answer: 'Go to Profile > Become a Trader in the app. Deposit your security bond (minimum 500 AED), set your exchange rates, and start accepting trade requests. You earn the spread on each completed trade.'
    }
  ]

  return (
    <section id="faq" className={`py-16 md:py-24 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Frequently Asked Questions
          </h2>
          <p className={`text-xl ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Got questions? We've got answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border rounded-xl overflow-hidden ${dark ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <button
                className={`w-full px-6 py-4 text-left flex justify-between items-center transition ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{faq.question}</span>
                <svg
                  className={`w-5 h-5 transition-transform ${openIndex === index ? 'rotate-180' : ''} ${dark ? 'text-gray-400' : 'text-gray-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className={`px-6 pb-4 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Footer Component
function Footer() {
  const { dark } = useContext(DarkModeContext)

  return (
    <footer className={`py-12 ${dark ? 'bg-black' : 'bg-gray-900'} text-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img src="/logo.png" alt="CyxTrade" className="h-8 w-8" />
              <span className="text-xl font-bold">CyxTrade</span>
            </div>
            <p className="text-gray-400">
              P2P fiat exchange for trusted networks. Send money home without the fees.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
              <li><a href="#download" className="hover:text-white transition">Download</a></li>
              <li><Link to="/login" className="hover:text-white transition">Web App</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/terms" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="/aml" className="hover:text-white transition">AML Policy</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="mailto:support@cyxtrade.com" className="hover:text-white transition">
                  support@cyxtrade.com
                </a>
              </li>
              <li>
                <a href="https://github.com/Nerd-Inc/cyxtrade" className="hover:text-white transition">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <p className="text-gray-400 text-sm text-center">
            &copy; 2024 CyxTrade. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default App
