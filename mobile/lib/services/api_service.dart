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

  // Auth
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
}
