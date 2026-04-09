import { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { DarkModeContext } from '../App'

// Mock chat data
const MOCK_CHATS = [
  { id: '1', username: 'VIP SERVICES 4LIFE', verified: true, lastMessage: 'Cancellation request expire...', date: '03/16', unread: 3, avatarColor: '#6366F1' },
  { id: '2', username: 'YAS_VIP_EXCHANGE', verified: true, lastMessage: 'You have released the USD...', date: '03/16', unread: 1, avatarColor: '#8B5CF6' },
  { id: '3', username: 'princat', verified: true, lastMessage: 'You have released the USD...', date: '03/13', unread: 1, avatarColor: '#EC4899' },
  { id: '4', username: 'User-86fe7', verified: false, lastMessage: 'Your payment has been recei...', date: '03/13', unread: 0, avatarColor: '#F59E0B' },
  { id: '5', username: 'User-64aa1', verified: false, lastMessage: 'Your payment has been rec...', date: '03/13', unread: 1, avatarColor: '#6366F1' },
  { id: '6', username: 'MATENGA-II', verified: true, lastMessage: 'You have released the USDT, ...', date: '03/13', unread: 0, avatarColor: '#10B981' },
  { id: '7', username: 'Sunjei', verified: false, lastMessage: 'Your payment has been rec...', date: '03/13', unread: 1, avatarColor: '#3B82F6' },
  { id: '8', username: 'User-b4dd8', verified: false, lastMessage: 'The order has been cancelled...', date: '03/12', unread: 0, avatarColor: '#8B5CF6' },
]

export default function ProChat() {
  const { dark } = useContext(DarkModeContext)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChat, setSelectedChat] = useState<string | null>(null)

  const filteredChats = MOCK_CHATS.filter(chat =>
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalUnread = MOCK_CHATS.reduce((sum, chat) => sum + chat.unread, 0)

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-6">
              <Link to="/pro" className="flex items-center space-x-2">
                <img src="/logo.png" alt="CyxTrade" className="h-8" />
                <span className="text-xl font-bold bg-gradient-to-r from-[#00a78e] to-[#f7941d] bg-clip-text text-transparent">CyxTrade</span>
              </Link>
              <nav className="hidden md:flex items-center">
                <Link to="/pro" className={`px-4 py-4 text-sm font-medium border-b-2 border-transparent ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                  Express
                </Link>
                <Link to="/pro" className={`px-4 py-4 text-sm font-medium border-b-2 border-transparent ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                  P2P
                </Link>
                <Link to="/pro" className={`px-4 py-4 text-sm font-medium border-b-2 border-transparent ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                  Block Trade
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/pro/orders" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Orders
              </Link>
              <div className="flex items-center gap-1 text-sm text-orange-500 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
                {totalUnread > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {totalUnread}
                  </span>
                )}
              </div>
              <Link to="/pro/user-center" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                User Center
              </Link>
              <Link to="/pro" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                More
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="max-w-7xl mx-auto">
        <div className={`flex h-[calc(100vh-56px)] ${dark ? 'bg-gray-900' : 'bg-white'}`}>
          {/* Left Sidebar - User Avatar */}
          <div className={`w-16 flex flex-col items-center py-4 border-r ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            {/* User Avatar */}
            <div className="relative mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                M
              </div>
            </div>
            {/* Chat Icon with Badge */}
            <div className="relative">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <svg className={`w-5 h-5 ${dark ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-medium">
                  {totalUnread}
                </span>
              )}
            </div>
          </div>

          {/* Chat List */}
          <div className={`w-80 flex flex-col border-r ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Header */}
            <div className={`px-4 py-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Chats</h2>
                <button className={`p-1 rounded hover:bg-gray-700 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
              {/* Search */}
              <div className="relative">
                <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by nickname"
                  className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${dark ? 'bg-gray-700 text-white placeholder-gray-500 border-gray-600' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-200'} border focus:outline-none focus:border-orange-500`}
                />
              </div>
            </div>

            {/* Go to Main Chat */}
            <button
              onClick={() => setSelectedChat('main')}
              className={`flex items-center gap-3 px-4 py-3 border-b transition ${
                selectedChat === 'main'
                  ? dark ? 'bg-gray-700' : 'bg-orange-50'
                  : dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
              } ${dark ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                <svg className={`w-5 h-5 ${dark ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>Go to Main Chat</span>
                  <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>21:31</span>
                </div>
                <p className={`text-sm truncate ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Chat as MrCJ12</p>
              </div>
            </button>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {filteredChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b transition ${
                    selectedChat === chat.id
                      ? dark ? 'bg-gray-700' : 'bg-orange-50'
                      : dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                  } ${dark ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                    style={{ backgroundColor: chat.avatarColor }}
                  >
                    {chat.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`font-medium truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{chat.username}</span>
                        {chat.verified && (
                          <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs flex-shrink-0 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{chat.date}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{chat.lastMessage}</p>
                      {chat.unread > 0 && (
                        <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-medium flex-shrink-0">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Content Area */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className={`px-6 py-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-medium">
                      {selectedChat === 'main' ? 'M' : MOCK_CHATS.find(c => c.id === selectedChat)?.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
                        {selectedChat === 'main' ? 'Main Chat' : MOCK_CHATS.find(c => c.id === selectedChat)?.username}
                      </h3>
                      <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Online</p>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="text-center py-8">
                    <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No messages yet. Start the conversation!</p>
                  </div>
                </div>

                {/* Message Input */}
                <div className={`px-6 py-4 border-t ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className={`flex-1 px-4 py-2 rounded-lg text-sm ${dark ? 'bg-gray-700 text-white placeholder-gray-500 border-gray-600' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-200'} border focus:outline-none focus:border-orange-500`}
                    />
                    <button className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative mb-4">
                  <svg className={`w-20 h-20 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-lg">:)</span>
                  </div>
                </div>
                <p className={`text-lg ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Welcome to CyxTrade Chat.</p>
                <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Select a contact to start chatting.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help Button */}
      <button className="fixed bottom-6 right-6 w-12 h-12 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition flex items-center justify-center">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>
    </div>
  )
}
