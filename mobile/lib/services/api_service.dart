import 'dart:io';
import 'package:dio/dio.dart';
import '../config/api.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late Dio _dio;
  String? _token;

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Add interceptor for logging
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
    ));
  }

  void setToken(String token) {
    _token = token;
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearToken() {
    _token = null;
    _dio.options.headers.remove('Authorization');
  }

  // Auth
  Future<Map<String, dynamic>> requestOtp(String phone) async {
    final response = await _dio.post(ApiConfig.authOtp, data: {'phone': phone});
    return response.data;
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp) async {
    final response = await _dio.post(ApiConfig.authVerify, data: {
      'phone': phone,
      'otp': otp,
    });
    return response.data;
  }

  Future<void> logout() async {
    await _dio.delete(ApiConfig.authLogout);
    clearToken();
  }

  // Users
  Future<Map<String, dynamic>> getMe() async {
    final response = await _dio.get(ApiConfig.usersMe);
    return response.data;
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final response = await _dio.put(ApiConfig.usersMe, data: data);
    return response.data;
  }

  // Traders
  Future<Map<String, dynamic>> getTraders({String? from, String? to}) async {
    final response = await _dio.get(ApiConfig.traders, queryParameters: {
      if (from != null) 'from': from,
      if (to != null) 'to': to,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getTrader(String id) async {
    final response = await _dio.get(ApiConfig.tradersById(id));
    return response.data;
  }

  // Trades
  Future<Map<String, dynamic>> getMyTrades({String? status}) async {
    final response = await _dio.get(ApiConfig.trades, queryParameters: {
      if (status != null) 'status': status,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getTrade(String id) async {
    final response = await _dio.get(ApiConfig.tradesById(id));
    return response.data;
  }

  Future<Map<String, dynamic>> createTrade(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConfig.trades, data: data);
    return response.data;
  }

  Future<void> markTradePaid(String id, {String? reference, String? proofUrl}) async {
    await _dio.put(ApiConfig.tradesPaid(id), data: {
      if (reference != null) 'paymentReference': reference,
      if (proofUrl != null) 'paymentProofUrl': proofUrl,
    });
  }

  Future<void> completeTrade(String id) async {
    await _dio.put(ApiConfig.tradesComplete(id));
  }

  Future<void> openDispute(String id, String reason) async {
    await _dio.post(ApiConfig.tradesDispute(id), data: {'reason': reason});
  }

  Future<void> rateTrade(String id, int rating, String? comment) async {
    await _dio.post(ApiConfig.tradesRating(id), data: {
      'rating': rating,
      if (comment != null) 'comment': comment,
    });
  }

  // Trader actions
  Future<Map<String, dynamic>> acceptTrade(String id) async {
    final response = await _dio.put(ApiConfig.tradesAccept(id));
    return response.data;
  }

  Future<Map<String, dynamic>> declineTrade(String id) async {
    final response = await _dio.put(ApiConfig.tradesDecline(id));
    return response.data;
  }

  Future<Map<String, dynamic>> markTradeDelivered(String id) async {
    final response = await _dio.put(ApiConfig.tradesDelivered(id));
    return response.data;
  }

  Future<Map<String, dynamic>> cancelTrade(String id) async {
    final response = await _dio.put(ApiConfig.tradesCancel(id));
    return response.data;
  }

  // Trader profile
  Future<Map<String, dynamic>> getTraderProfile() async {
    final response = await _dio.get(ApiConfig.tradersMe);
    return response.data;
  }

  Future<Map<String, dynamic>> updateTraderStatus(bool online) async {
    final response = await _dio.put(ApiConfig.tradersMeStatus, data: {
      'online': online,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> applyAsTrader(List<Map<String, dynamic>> corridors) async {
    final response = await _dio.post(ApiConfig.tradersApply, data: {
      'corridors': corridors,
    });
    return response.data;
  }

  // Chat
  Future<Map<String, dynamic>> getChatMessages(String tradeId) async {
    final response = await _dio.get(ApiConfig.chatMessages(tradeId));
    return response.data;
  }

  Future<Map<String, dynamic>> sendMessage(String tradeId, String content) async {
    final response = await _dio.post(ApiConfig.chatMessages(tradeId), data: {
      'content': content,
    });
    return response.data;
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

    final response = await _dio.post(
      ApiConfig.uploadAvatar,
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );

    return response.data['avatarUrl'];
  }

  Future<String> uploadPaymentProof(String tradeId, File image) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(
        image.path,
        filename: 'payment_proof.jpg',
      ),
    });

    final response = await _dio.post(
      ApiConfig.uploadPaymentProof(tradeId),
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );

    return response.data['proofUrl'];
  }

  // ============================================
  // Payment Methods
  // ============================================

  Future<List<Map<String, dynamic>>> getPaymentMethods() async {
    final response = await _dio.get(ApiConfig.tradersMePaymentMethods);
    return List<Map<String, dynamic>>.from(response.data['paymentMethods'] ?? []);
  }

  Future<Map<String, dynamic>> addPaymentMethod(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConfig.tradersMePaymentMethods, data: data);
    return response.data['paymentMethod'];
  }

  Future<Map<String, dynamic>> updatePaymentMethod(String id, Map<String, dynamic> data) async {
    final response = await _dio.put(ApiConfig.tradersPaymentMethodById(id), data: data);
    return response.data['paymentMethod'];
  }

  Future<void> deletePaymentMethod(String id) async {
    await _dio.delete(ApiConfig.tradersPaymentMethodById(id));
  }

  Future<void> setPaymentMethodPrimary(String id) async {
    await _dio.put(ApiConfig.tradersPaymentMethodPrimary(id));
  }

  Future<Map<String, dynamic>> getTraderPaymentDetails(String traderId) async {
    final response = await _dio.get(ApiConfig.traderPaymentDetails(traderId));
    return response.data['paymentMethod'];
  }
}
