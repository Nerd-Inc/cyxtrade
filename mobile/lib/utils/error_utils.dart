import 'package:flutter/material.dart';
import '../services/api_error.dart';

/// Show error snackbar with user-friendly message
void showErrorSnackBar(BuildContext context, dynamic error, {VoidCallback? onRetry}) {
  String message;
  bool isRetryable = false;

  if (error is ApiError) {
    message = error.userMessage;
    isRetryable = error.isRetryable;
  } else if (error is Exception) {
    message = error.toString().replaceFirst('Exception: ', '');
  } else {
    message = error?.toString() ?? 'Something went wrong';
  }

  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: Colors.red.shade700,
      behavior: SnackBarBehavior.floating,
      duration: Duration(seconds: isRetryable && onRetry != null ? 5 : 4),
      action: isRetryable && onRetry != null
          ? SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: onRetry,
            )
          : null,
    ),
  );
}

/// Show success snackbar
void showSuccessSnackBar(BuildContext context, String message) {
  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: Colors.green.shade700,
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 3),
    ),
  );
}

/// Show info snackbar
void showInfoSnackBar(BuildContext context, String message, {Duration? duration}) {
  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
      duration: duration ?? const Duration(seconds: 3),
    ),
  );
}

/// Get user-friendly error message from any error
String getUserErrorMessage(dynamic error) {
  if (error is ApiError) {
    return error.userMessage;
  } else if (error is Exception) {
    final message = error.toString().replaceFirst('Exception: ', '');
    // Hide technical details
    if (message.contains('SocketException') ||
        message.contains('Connection refused') ||
        message.contains('Failed host lookup')) {
      return 'No internet connection. Please check your network.';
    }
    if (message.contains('TimeoutException')) {
      return 'Request timed out. Please try again.';
    }
    return message.length > 100 ? 'Something went wrong. Please try again.' : message;
  }
  return error?.toString() ?? 'Something went wrong';
}

/// Check if error is retryable
bool isRetryableError(dynamic error) {
  if (error is ApiError) {
    return error.isRetryable;
  }
  final message = error?.toString() ?? '';
  return message.contains('SocketException') ||
      message.contains('TimeoutException') ||
      message.contains('Connection refused');
}

/// Check if error requires re-authentication
bool isAuthError(dynamic error) {
  if (error is ApiError) {
    return error.code.isAuthError;
  }
  return false;
}
