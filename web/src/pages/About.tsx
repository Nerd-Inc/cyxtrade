import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="min-h-screen bg-[#0B0E11]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0E11]/95 backdrop-blur-md border-b border-gray-800/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center">
              <img src="/logo.png" alt="CyxTrade" className="h-16" />
            </Link>
            <Link
              to="/login"
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-lg shadow-orange-500/25"
            >
              Open App
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src="/logo.png" alt="" className="w-[600px] h-[600px] opacity-[0.03]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            About <span className="text-[#00a78e]">CyxTrade</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Building the future of cross-border payments for underserved communities worldwide.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-[#1E2329]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              CyxTrade exists to make international money transfers accessible, affordable, and fast for everyone.
              We believe that sending money home to your family shouldn't cost 10-15% in fees.
              By connecting trusted local traders, we've created a peer-to-peer network that cuts costs dramatically
              while keeping your money safe and secure.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 bg-[#0B0E11]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">The Problem We Solve</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#1E2329] border border-gray-800 rounded-2xl p-6">
              <div className="text-4xl font-bold text-red-500 mb-2">$48B</div>
              <p className="text-gray-400">Lost to fees annually on $717B in global remittances</p>
            </div>
            <div className="bg-[#1E2329] border border-gray-800 rounded-2xl p-6">
              <div className="text-4xl font-bold text-red-500 mb-2">10-15%</div>
              <p className="text-gray-400">Average fees on Africa corridors - the highest in the world</p>
            </div>
            <div className="bg-[#1E2329] border border-gray-800 rounded-2xl p-6">
              <div className="text-4xl font-bold text-red-500 mb-2">1.4B</div>
              <p className="text-gray-400">Unbanked people excluded by KYC requirements</p>
            </div>
            <div className="bg-[#1E2329] border border-gray-800 rounded-2xl p-6">
              <div className="text-4xl font-bold text-red-500 mb-2">3-5 days</div>
              <p className="text-gray-400">Average wait time for traditional remittance services</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Solution */}
      <section className="py-20 bg-[#1E2329]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Solution</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#00a78e]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-[#00a78e] text-xl font-bold">1</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Peer-to-Peer Network</h3>
                <p className="text-gray-400">Connect directly with trusted local traders who have liquidity in both currencies. No middlemen, no hidden fees.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#00a78e]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-[#00a78e] text-xl font-bold">2</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Security Bonds</h3>
                <p className="text-gray-400">Every trader posts a security bond. If they fail to deliver, you're compensated automatically. Your money is always protected.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#f7941d]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-[#f7941d] text-xl font-bold">3</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Community Arbitration</h3>
                <p className="text-gray-400">Disputes are resolved by staked community arbitrators who review evidence and vote. Fair, transparent, and decentralized.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#f7941d]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-[#f7941d] text-xl font-bold">4</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Fast Settlement</h3>
                <p className="text-gray-400">Most transfers complete in 15-30 minutes. Local payouts through bank transfer, mobile money, or cash.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-[#0B0E11]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00a78e]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#00a78e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Trust</h3>
              <p className="text-gray-400">Security bonds and reputation systems ensure every participant has skin in the game.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#f7941d]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#f7941d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Community</h3>
              <p className="text-gray-400">Built for the diaspora, by the diaspora. We understand your needs because we share them.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00a78e]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#00a78e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Transparency</h3>
              <p className="text-gray-400">No hidden fees, no surprise charges. See exactly what you pay and what your recipient gets.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#1E2329]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start?</h2>
          <p className="text-gray-400 mb-8">Join thousands of users sending money home at fair rates.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/login"
              className="px-8 py-4 bg-gradient-to-r from-[#f7941d] to-[#f7941d] text-white text-lg font-semibold rounded-xl hover:opacity-90 transition shadow-xl"
            >
              Get Started
            </Link>
            <Link
              to="/"
              className="px-8 py-4 bg-white/10 text-white text-lg font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#0B0E11] border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link to="/about" className="inline-block mb-4">
            <img src="/logo.png" alt="CyxTrade" className="h-12 mx-auto" />
          </Link>
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} CyxTrade. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
