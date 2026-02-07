import 'package:flutter/material.dart';
import '../services/api_error.dart';
import '../utils/error_utils.dart';

/// Widget to display error state with retry option
class ErrorDisplay extends StatelessWidget {
  final dynamic error;
  final VoidCallback? onRetry;
  final String? retryText;
  final bool compact;

  const ErrorDisplay({
    super.key,
    required this.error,
    this.onRetry,
    this.retryText,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final message = getUserErrorMessage(error);
    final canRetry = onRetry != null && isRetryableError(error);

    if (compact) {
      return _buildCompact(context, message, canRetry);
    }

    return _buildFull(context, message, canRetry);
  }

  Widget _buildFull(BuildContext context, String message, bool canRetry) {
    IconData icon;
    Color iconColor;

    if (error is ApiError) {
      final apiError = error as ApiError;
      if (apiError.code == ApiErrorCode.noInternet ||
          apiError.code == ApiErrorCode.networkError) {
        icon = Icons.wifi_off;
        iconColor = Colors.orange;
      } else if (apiError.code == ApiErrorCode.timeout) {
        icon = Icons.timer_off;
        iconColor = Colors.orange;
      } else if (apiError.code.isAuthError) {
        icon = Icons.lock_outline;
        iconColor = Colors.red;
      } else {
        icon = Icons.error_outline;
        iconColor = Colors.red;
      }
    } else {
      icon = Icons.error_outline;
      iconColor = Colors.red;
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 64,
              color: iconColor.withOpacity(0.7),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade700,
              ),
            ),
            if (canRetry) ...[
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(retryText ?? 'Try Again'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCompact(BuildContext context, String message, bool canRetry) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            color: Colors.red.shade700,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: Colors.red.shade900,
                fontSize: 14,
              ),
            ),
          ),
          if (canRetry)
            TextButton(
              onPressed: onRetry,
              child: Text(retryText ?? 'Retry'),
            ),
        ],
      ),
    );
  }
}

/// Widget for empty state with optional action
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  final String? actionText;
  final VoidCallback? onAction;

  const EmptyState({
    super.key,
    required this.icon,
    required this.message,
    this.actionText,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
              ),
            ),
            if (actionText != null && onAction != null) ...[
              const SizedBox(height: 24),
              FilledButton(
                onPressed: onAction,
                child: Text(actionText!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
