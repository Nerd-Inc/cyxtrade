class ApiConfig {
  // Base URL - change for production
  static const String baseUrl = 'http://localhost:3000/api';

  // Endpoints
  static const String authOtp = '/auth/otp';
  static const String authVerify = '/auth/verify';
  static const String authRefresh = '/auth/refresh';
  static const String authLogout = '/auth/logout';

  static const String usersMe = '/users/me';
  static String usersById(String id) => '/users/$id';

  static const String traders = '/traders';
  static String tradersById(String id) => '/traders/$id';
  static const String tradersApply = '/traders/apply';
  static const String tradersMe = '/traders/me';
  static const String tradersMeStatus = '/traders/me/status';

  static const String trades = '/trades';
  static String tradesById(String id) => '/trades/$id';
  static String tradesAccept(String id) => '/trades/$id/accept';
  static String tradesDecline(String id) => '/trades/$id/decline';
  static String tradesPaid(String id) => '/trades/$id/paid';
  static String tradesDelivered(String id) => '/trades/$id/delivered';
  static String tradesComplete(String id) => '/trades/$id/complete';
  static String tradesCancel(String id) => '/trades/$id/cancel';
  static String tradesDispute(String id) => '/trades/$id/dispute';
  static String tradesRating(String id) => '/trades/$id/rating';

  static String chatMessages(String tradeId) => '/chat/trades/$tradeId/messages';
  static String chatImage(String tradeId) => '/chat/trades/$tradeId/messages/image';
  static String chatRead(String tradeId) => '/chat/trades/$tradeId/messages/read';
  static String chatTyping(String tradeId) => '/chat/trades/$tradeId/typing';

  // WebSocket
  static const String wsUrl = 'http://localhost:3000';
}
