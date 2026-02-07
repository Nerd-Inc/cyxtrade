import 'package:dio/dio.dart';

/// Error codes matching backend ErrorCode enum
enum ApiErrorCode {
  // Client-side errors (0-99)
  unknown(0),
  networkError(1),
  timeout(2),
  noInternet(3),
  serverUnreachable(4),
  cancelled(5),

  // Validation errors (1xxx)
  validationError(1001),
  invalidPhone(1002),
  invalidAmount(1003),
  missingField(1004),
  invalidFormat(1005),
  invalidOtp(1006),
  otpExpired(1007),

  // Auth errors (2xxx)
  invalidToken(2001),
  expiredToken(2002),
  unauthorized(2003),
  forbidden(2004),
  notAuthenticated(2005),

  // Trade errors (3xxx)
  tradeNotFound(3001),
  invalidTradeState(3002),
  insufficientBond(3003),
  tradeExpired(3004),
  tradeAlreadyAccepted(3005),
  tradeCannotBeCancelled(3006),
  tradeAlreadyRated(3007),

  // Trader errors (4xxx)
  traderNotFound(4001),
  traderOffline(4002),
  noPaymentMethod(4003),
  notATrader(4004),
  paymentMethodNotFound(4005),
  traderAlreadyExists(4006),

  // Upload errors (5xxx)
  fileTooLarge(5001),
  invalidFileType(5002),
  uploadFailed(5003),
  noFileProvided(5004),

  // User errors (6xxx)
  userNotFound(6001),
  userAlreadyExists(6002),
  profileUpdateFailed(6003),

  // Server errors (9xxx)
  databaseError(9001),
  externalServiceError(9002),
  rateLimited(9003),
  internalError(9999);

  final int code;
  const ApiErrorCode(this.code);

  /// Get error code from integer
  static ApiErrorCode fromCode(int code) {
    return ApiErrorCode.values.firstWhere(
      (e) => e.code == code,
      orElse: () => ApiErrorCode.unknown,
    );
  }

  /// Check if this error is retryable
  bool get isRetryable => [
        networkError,
        timeout,
        noInternet,
        serverUnreachable,
        databaseError,
        externalServiceError,
        rateLimited,
        internalError,
      ].contains(this);

  /// Check if this is an auth error that requires re-login
  bool get isAuthError => [
        invalidToken,
        expiredToken,
        notAuthenticated,
      ].contains(this);
}

/// API Error class with user-friendly messages
class ApiError implements Exception {
  final ApiErrorCode code;
  final String message;
  final Map<String, dynamic>? details;
  final bool isRetryable;
  final int? statusCode;
  final dynamic originalError;

  ApiError({
    required this.code,
    required this.message,
    this.details,
    bool? isRetryable,
    this.statusCode,
    this.originalError,
  }) : isRetryable = isRetryable ?? code.isRetryable;

  /// Get user-friendly error message
  String get userMessage {
    // Use specific message if provided and not a raw exception
    if (!message.contains('Exception') &&
        !message.contains('Error:') &&
        message.length < 200) {
      return message;
    }

    // Fall back to default messages
    switch (code) {
      // Client-side errors
      case ApiErrorCode.unknown:
        return 'Something went wrong. Please try again.';
      case ApiErrorCode.networkError:
        return 'Network error. Please check your connection.';
      case ApiErrorCode.timeout:
        return 'Request timed out. Please try again.';
      case ApiErrorCode.noInternet:
        return 'No internet connection. Please check your network.';
      case ApiErrorCode.serverUnreachable:
        return 'Unable to reach the server. Please try again later.';
      case ApiErrorCode.cancelled:
        return 'Request was cancelled.';

      // Validation errors
      case ApiErrorCode.validationError:
        return 'Please check your input and try again.';
      case ApiErrorCode.invalidPhone:
        return 'Please enter a valid phone number.';
      case ApiErrorCode.invalidAmount:
        return 'Please enter a valid amount.';
      case ApiErrorCode.missingField:
        return 'Please fill in all required fields.';
      case ApiErrorCode.invalidFormat:
        return 'Invalid format. Please check your input.';
      case ApiErrorCode.invalidOtp:
        return 'Invalid verification code. Please try again.';
      case ApiErrorCode.otpExpired:
        return 'Verification code expired. Please request a new one.';

      // Auth errors
      case ApiErrorCode.invalidToken:
        return 'Session expired. Please log in again.';
      case ApiErrorCode.expiredToken:
        return 'Session expired. Please log in again.';
      case ApiErrorCode.unauthorized:
        return 'You are not authorized to perform this action.';
      case ApiErrorCode.forbidden:
        return 'Access denied.';
      case ApiErrorCode.notAuthenticated:
        return 'Please log in to continue.';

      // Trade errors
      case ApiErrorCode.tradeNotFound:
        return 'Trade not found.';
      case ApiErrorCode.invalidTradeState:
        return 'This action cannot be performed on this trade.';
      case ApiErrorCode.insufficientBond:
        return 'Trader has insufficient bond for this trade.';
      case ApiErrorCode.tradeExpired:
        return 'This trade has expired.';
      case ApiErrorCode.tradeAlreadyAccepted:
        return 'This trade has already been accepted.';
      case ApiErrorCode.tradeCannotBeCancelled:
        return 'This trade cannot be cancelled.';
      case ApiErrorCode.tradeAlreadyRated:
        return 'You have already rated this trade.';

      // Trader errors
      case ApiErrorCode.traderNotFound:
        return 'Trader not found.';
      case ApiErrorCode.traderOffline:
        return 'This trader is currently offline.';
      case ApiErrorCode.noPaymentMethod:
        return 'Trader has no payment method configured.';
      case ApiErrorCode.notATrader:
        return 'You are not registered as a trader.';
      case ApiErrorCode.paymentMethodNotFound:
        return 'Payment method not found.';
      case ApiErrorCode.traderAlreadyExists:
        return 'You are already registered as a trader.';

      // Upload errors
      case ApiErrorCode.fileTooLarge:
        return 'File is too large. Maximum size is 5MB.';
      case ApiErrorCode.invalidFileType:
        return 'Invalid file type. Please upload an image.';
      case ApiErrorCode.uploadFailed:
        return 'Failed to upload file. Please try again.';
      case ApiErrorCode.noFileProvided:
        return 'Please select a file to upload.';

      // User errors
      case ApiErrorCode.userNotFound:
        return 'User not found.';
      case ApiErrorCode.userAlreadyExists:
        return 'User already exists.';
      case ApiErrorCode.profileUpdateFailed:
        return 'Failed to update profile. Please try again.';

      // Server errors
      case ApiErrorCode.databaseError:
        return 'Service temporarily unavailable. Please try again later.';
      case ApiErrorCode.externalServiceError:
        return 'Service temporarily unavailable. Please try again later.';
      case ApiErrorCode.rateLimited:
        return 'Too many requests. Please wait a moment and try again.';
      case ApiErrorCode.internalError:
        return 'Something went wrong. Please try again later.';
    }
  }

  /// Create ApiError from DioException
  factory ApiError.fromDioException(DioException e) {
    // Handle connection errors
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiError(
          code: ApiErrorCode.timeout,
          message: 'Connection timed out',
          statusCode: null,
          originalError: e,
        );

      case DioExceptionType.connectionError:
        return ApiError(
          code: ApiErrorCode.networkError,
          message: 'Connection error',
          statusCode: null,
          originalError: e,
        );

      case DioExceptionType.cancel:
        return ApiError(
          code: ApiErrorCode.cancelled,
          message: 'Request cancelled',
          statusCode: null,
          originalError: e,
        );

      case DioExceptionType.badResponse:
        return _parseServerError(e);

      case DioExceptionType.badCertificate:
        return ApiError(
          code: ApiErrorCode.networkError,
          message: 'Security certificate error',
          statusCode: null,
          originalError: e,
        );

      case DioExceptionType.unknown:
      default:
        // Check if it's a socket exception (no internet)
        final errorMessage = e.error?.toString() ?? '';
        if (errorMessage.contains('SocketException') ||
            errorMessage.contains('Failed host lookup')) {
          return ApiError(
            code: ApiErrorCode.noInternet,
            message: 'No internet connection',
            statusCode: null,
            originalError: e,
          );
        }
        return ApiError(
          code: ApiErrorCode.unknown,
          message: e.message ?? 'Unknown error',
          statusCode: null,
          originalError: e,
        );
    }
  }

  /// Parse server error response
  static ApiError _parseServerError(DioException e) {
    final statusCode = e.response?.statusCode;
    final data = e.response?.data;

    // Try to parse structured error response
    if (data is Map<String, dynamic>) {
      final error = data['error'];
      if (error is Map<String, dynamic>) {
        final code = error['code'] as int?;
        final message = error['message'] as String?;
        final details = error['details'] as Map<String, dynamic>?;
        final isRetryable = error['isRetryable'] as bool?;

        return ApiError(
          code: code != null ? ApiErrorCode.fromCode(code) : _statusCodeToErrorCode(statusCode),
          message: message ?? 'Server error',
          details: details,
          isRetryable: isRetryable,
          statusCode: statusCode,
          originalError: e,
        );
      } else if (error is String) {
        // Legacy error format: { error: "message" }
        return ApiError(
          code: _statusCodeToErrorCode(statusCode),
          message: error,
          statusCode: statusCode,
          originalError: e,
        );
      }
    }

    // Fallback for unparseable responses
    return ApiError(
      code: _statusCodeToErrorCode(statusCode),
      message: 'Server error',
      statusCode: statusCode,
      originalError: e,
    );
  }

  /// Convert HTTP status code to error code
  static ApiErrorCode _statusCodeToErrorCode(int? statusCode) {
    switch (statusCode) {
      case 400:
        return ApiErrorCode.validationError;
      case 401:
        return ApiErrorCode.notAuthenticated;
      case 403:
        return ApiErrorCode.forbidden;
      case 404:
        return ApiErrorCode.unknown; // Could be trade, trader, or user not found
      case 429:
        return ApiErrorCode.rateLimited;
      case 500:
        return ApiErrorCode.internalError;
      case 502:
      case 503:
      case 504:
        return ApiErrorCode.serverUnreachable;
      default:
        return ApiErrorCode.unknown;
    }
  }

  @override
  String toString() => 'ApiError(code: $code, message: $message, statusCode: $statusCode)';
}
