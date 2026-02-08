import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/api.dart';
import 'api_error.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late Dio _dio;
  String? _token;

  // Callback for auth errors (to trigger logout)
  void Function()? onAuthError;

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Add interceptors
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: _onRequest,
      onResponse: _onResponse,
      onError: _onError,
    ));

    // Add logging in debug mode
    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (log) => debugPrint(log.toString()),
      ));
    }
  }

  void _onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Add auth token if available
    if (_token != null) {
      options.headers['Authorization'] = 'Bearer $_token';
    }
    handler.next(options);
  }

  void _onResponse(Response response, ResponseInterceptorHandler handler) {
    // Handle new structured response format
    final data = response.data;
    if (data is Map<String, dynamic> && data['success'] == true) {
      // Extract data from structured response
      response.data = data['data'] ?? data;
    }
    handler.next(response);
  }

  void _onError(DioException error, ErrorInterceptorHandler handler) {
    final apiError = ApiError.fromDioException(error);

    // Handle auth errors
    if (apiError.code.isAuthError) {
      debugPrint('Auth error detected: ${apiError.code}');
      onAuthError?.call();
    }

    // Reject with our ApiError
    handler.reject(DioException(
      requestOptions: error.requestOptions,
      response: error.response,
      type: error.type,
      error: apiError,
    ));
  }

  void setToken(String token) {
    _token = token;
  }

  void clearToken() {
    _token = null;
  }

  /// Execute API call with error handling
  Future<T> _call<T>(Future<Response<T>> Function() request) async {
    try {
      final response = await request();
      return response.data as T;
    } on DioException catch (e) {
      if (e.error is ApiError) {
        throw e.error as ApiError;
      }
      throw ApiError.fromDioException(e);
    } catch (e) {
      throw ApiError(
        code: ApiErrorCode.unknown,
        message: e.toString(),
        originalError: e,
      );
    }
  }

  // ============================================
  // Keypair Authentication (Primary)
  // ============================================

  /// Request a challenge to sign with private key
  Future<Map<String, dynamic>> requestChallenge(String publicKey) async {
    return _call(() => _dio.post(ApiConfig.authChallenge, data: {
          'publicKey': publicKey,
        }));
  }

  /// Verify signed challenge and get JWT
  Future<Map<String, dynamic>> verifySignature(String publicKey, String signature) async {
    return _call(() => _dio.post(ApiConfig.authVerifySignature, data: {
          'publicKey': publicKey,
          'signature': signature,
        }));
  }

  // ============================================
  // OTP Authentication (Legacy/Recovery)
  // ============================================

  Future<Map<String, dynamic>> requestOtp(String phone) async {
    return _call(() => _dio.post(ApiConfig.authOtp, data: {'phone': phone}));
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp) async {
    return _call(() => _dio.post(ApiConfig.authVerify, data: {
          'phone': phone,
          'otp': otp,
        }));
  }

  Future<void> logout() async {
    try {
      await _call(() => _dio.delete(ApiConfig.authLogout));
    } finally {
      clearToken();
    }
  }

  // Users
  Future<Map<String, dynamic>> getMe() async {
    return _call(() => _dio.get(ApiConfig.usersMe));
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    return _call(() => _dio.put(ApiConfig.usersMe, data: data));
  }

  // Traders
  Future<Map<String, dynamic>> getTraders({String? from, String? to}) async {
    return _call(() => _dio.get(ApiConfig.traders, queryParameters: {
          if (from != null) 'from': from,
          if (to != null) 'to': to,
        }));
  }

  Future<Map<String, dynamic>> getTrader(String id) async {
    return _call(() => _dio.get(ApiConfig.tradersById(id)));
  }

  // Trades
  Future<Map<String, dynamic>> getMyTrades({String? status, String? role}) async {
    return _call(() => _dio.get(ApiConfig.trades, queryParameters: {
          if (status != null) 'status': status,
          if (role != null) 'role': role,
        }));
  }

  Future<Map<String, dynamic>> getTrade(String id) async {
    return _call(() => _dio.get(ApiConfig.tradesById(id)));
  }

  Future<Map<String, dynamic>> createTrade(Map<String, dynamic> data) async {
    return _call(() => _dio.post(ApiConfig.trades, data: data));
  }

  Future<void> markTradePaid(String id, {String? reference, String? proofUrl}) async {
    await _call(() => _dio.put(ApiConfig.tradesPaid(id), data: {
          if (reference != null) 'paymentReference': reference,
          if (proofUrl != null) 'paymentProofUrl': proofUrl,
        }));
  }

  Future<void> completeTrade(String id) async {
    await _call(() => _dio.put(ApiConfig.tradesComplete(id)));
  }

  Future<void> openDispute(String id, String reason) async {
    await _call(() => _dio.post(ApiConfig.tradesDispute(id), data: {'reason': reason}));
  }

  Future<void> rateTrade(String id, int rating, String? comment) async {
    await _call(() => _dio.post(ApiConfig.tradesRating(id), data: {
          'rating': rating,
          if (comment != null) 'comment': comment,
        }));
  }

  // Trader actions
  Future<Map<String, dynamic>> acceptTrade(String id) async {
    return _call(() => _dio.put(ApiConfig.tradesAccept(id)));
  }

  Future<Map<String, dynamic>> declineTrade(String id) async {
    return _call(() => _dio.put(ApiConfig.tradesDecline(id)));
  }

  Future<Map<String, dynamic>> markTradeDelivered(String id) async {
    return _call(() => _dio.put(ApiConfig.tradesDelivered(id)));
  }

  Future<Map<String, dynamic>> cancelTrade(String id) async {
    return _call(() => _dio.put(ApiConfig.tradesCancel(id)));
  }

  // Trader profile
  Future<Map<String, dynamic>> getTraderProfile() async {
    return _call(() => _dio.get(ApiConfig.tradersMe));
  }

  Future<Map<String, dynamic>> updateTraderStatus(bool online) async {
    return _call(() => _dio.put(ApiConfig.tradersMeStatus, data: {
          'online': online,
        }));
  }

  Future<Map<String, dynamic>> applyAsTrader(List<Map<String, dynamic>> corridors) async {
    return _call(() => _dio.post(ApiConfig.tradersApply, data: {
          'corridors': corridors,
        }));
  }

  // Chat
  Future<Map<String, dynamic>> getChatMessages(String tradeId) async {
    return _call(() => _dio.get(ApiConfig.chatMessages(tradeId)));
  }

  Future<Map<String, dynamic>> sendMessage(String tradeId, String content) async {
    return _call(() => _dio.post(ApiConfig.chatMessages(tradeId), data: {
          'content': content,
        }));
  }

  // ============================================
  // Image Uploads
  // ============================================

  Future<String> uploadAvatar(File image) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(
        image.path,
        filename: 'avatar.jpg',
      ),
    });

    final response = await _call(() => _dio.post(
          ApiConfig.uploadAvatar,
          data: formData,
          options: Options(contentType: 'multipart/form-data'),
        ));

    return (response as Map<String, dynamic>)['avatarUrl'];
  }

  Future<String> uploadPaymentProof(String tradeId, File image) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(
        image.path,
        filename: 'payment_proof.jpg',
      ),
    });

    final response = await _call(() => _dio.post(
          ApiConfig.uploadPaymentProof(tradeId),
          data: formData,
          options: Options(contentType: 'multipart/form-data'),
        ));

    return (response as Map<String, dynamic>)['proofUrl'];
  }

  // ============================================
  // Payment Methods
  // ============================================

  Future<List<Map<String, dynamic>>> getPaymentMethods() async {
    final response = await _call(() => _dio.get(ApiConfig.tradersMePaymentMethods));
    return List<Map<String, dynamic>>.from(
        (response as Map<String, dynamic>)['paymentMethods'] ?? []);
  }

  Future<Map<String, dynamic>> addPaymentMethod(Map<String, dynamic> data) async {
    final response = await _call(() => _dio.post(ApiConfig.tradersMePaymentMethods, data: data));
    return (response as Map<String, dynamic>)['paymentMethod'];
  }

  Future<Map<String, dynamic>> updatePaymentMethod(String id, Map<String, dynamic> data) async {
    final response = await _call(() => _dio.put(ApiConfig.tradersPaymentMethodById(id), data: data));
    return (response as Map<String, dynamic>)['paymentMethod'];
  }

  Future<void> deletePaymentMethod(String id) async {
    await _call(() => _dio.delete(ApiConfig.tradersPaymentMethodById(id)));
  }

  Future<void> setPaymentMethodPrimary(String id) async {
    await _call(() => _dio.put(ApiConfig.tradersPaymentMethodPrimary(id)));
  }

  Future<Map<String, dynamic>> getTraderPaymentDetails(String traderId) async {
    final response = await _call(() => _dio.get(ApiConfig.traderPaymentDetails(traderId)));
    return (response as Map<String, dynamic>)['paymentMethod'];
  }

  // ============================================
  // Payment Method Verification
  // ============================================

  /// Initiate verification for a payment method
  Future<Map<String, dynamic>> initiateVerification(String methodId) async {
    return _call(() => _dio.post(ApiConfig.tradersPaymentMethodVerify(methodId)));
  }

  /// Submit verification proof (screenshot URL)
  Future<Map<String, dynamic>> submitVerificationProof(String methodId, String proofUrl) async {
    return _call(() => _dio.post(ApiConfig.tradersPaymentMethodProof(methodId), data: {
          'proofUrl': proofUrl,
        }));
  }

  /// Get verification status for a payment method
  Future<Map<String, dynamic>> getVerificationStatus(String methodId) async {
    return _call(() => _dio.get(ApiConfig.tradersPaymentMethodVerificationStatus(methodId)));
  }

  /// Cancel pending verification
  Future<void> cancelVerification(String methodId) async {
    await _call(() => _dio.delete(ApiConfig.tradersPaymentMethodVerify(methodId)));
  }

  // ============================================
  // E2E Encryption Key Exchange
  // ============================================

  /// Register or update my public key
  Future<Map<String, dynamic>> registerPublicKey(String publicKey, {String? identityKey}) async {
    return _call(() => _dio.post(ApiConfig.keysRegister, data: {
          'publicKey': publicKey,
          if (identityKey != null) 'identityKey': identityKey,
        }));
  }

  /// Get my registered key info
  Future<Map<String, dynamic>> getMyKeyInfo() async {
    return _call(() => _dio.get(ApiConfig.keysMe));
  }

  /// Get another user's public key
  Future<Map<String, dynamic>> getUserPublicKey(String userId) async {
    return _call(() => _dio.get(ApiConfig.keysUser(userId)));
  }

  /// Register trade-specific ephemeral key
  Future<Map<String, dynamic>> registerTradeKey(String tradeId, String publicKey) async {
    return _call(() => _dio.post(ApiConfig.keysTrade(tradeId), data: {
          'publicKey': publicKey,
        }));
  }

  /// Get all participant keys for a trade
  Future<Map<String, dynamic>> getTradeKeys(String tradeId) async {
    return _call(() => _dio.get(ApiConfig.keysTrade(tradeId)));
  }

  // ============================================
  // E2E Encrypted Chat
  // ============================================

  /// Send an encrypted message
  Future<Map<String, dynamic>> sendEncryptedMessage(
    String tradeId,
    Map<String, dynamic> encrypted, {
    String messageType = 'text',
  }) async {
    return _call(() => _dio.post(ApiConfig.chatMessages(tradeId), data: {
          'encrypted': encrypted,
          'messageType': messageType,
        }));
  }

  /// Send a system message (not E2E encrypted)
  Future<Map<String, dynamic>> sendSystemMessage(
    String tradeId,
    String content, {
    String messageType = 'system',
  }) async {
    return _call(() => _dio.post(ApiConfig.chatSystem(tradeId), data: {
          'content': content,
          'messageType': messageType,
        }));
  }

  // ============================================
  // P2P Bootstrap & Relay
  // ============================================

  /// Register P2P node ID with bootstrap server
  Future<Map<String, dynamic>> registerP2PNode({
    required String nodeId,
    String? onionPubkey,
  }) async {
    return _call(() => _dio.post('/api/bootstrap/register', data: {
          'nodeId': nodeId,
          if (onionPubkey != null) 'onionPubkey': onionPubkey,
        }));
  }

  /// Send heartbeat to bootstrap server
  Future<Map<String, dynamic>> sendP2PHeartbeat() async {
    return _call(() => _dio.post('/api/bootstrap/heartbeat'));
  }

  /// Get P2P peer info for a user
  Future<Map<String, dynamic>> getP2PPeerInfo(String userId) async {
    return _call(() => _dio.get('/api/bootstrap/peer/$userId'));
  }

  /// Unregister from P2P network
  Future<Map<String, dynamic>> unregisterP2PNode() async {
    return _call(() => _dio.delete('/api/bootstrap/unregister'));
  }

  /// Queue a message for offline delivery via relay
  Future<Map<String, dynamic>> queueRelayMessage({
    required String recipientId,
    required String tradeId,
    required Map<String, dynamic> encrypted,
  }) async {
    return _call(() => _dio.post('/api/relay/queue', data: {
          'recipientId': recipientId,
          'tradeId': tradeId,
          'encrypted': encrypted,
        }));
  }

  /// Get pending messages from relay
  Future<Map<String, dynamic>> getPendingRelayMessages() async {
    return _call(() => _dio.get('/api/relay/pending'));
  }

  /// Acknowledge message delivery
  Future<Map<String, dynamic>> acknowledgeRelayMessage(String messageId) async {
    return _call(() => _dio.delete('/api/relay/pending/$messageId'));
  }

  /// Get relay queue status
  Future<Map<String, dynamic>> getRelayStatus() async {
    return _call(() => _dio.get('/api/relay/status'));
  }
}
