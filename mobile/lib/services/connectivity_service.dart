import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';

/// Service to monitor network connectivity
class ConnectivityService extends ChangeNotifier {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;

  bool _isOnline = true;
  bool _isChecking = false;
  Timer? _checkTimer;

  /// Stream controller for connectivity changes
  final _connectivityController = StreamController<bool>.broadcast();

  ConnectivityService._internal() {
    // Start periodic connectivity check
    _startPeriodicCheck();
  }

  /// Current online status
  bool get isOnline => _isOnline;

  /// Whether currently checking connectivity
  bool get isChecking => _isChecking;

  /// Stream of connectivity changes
  Stream<bool> get onConnectivityChanged => _connectivityController.stream;

  /// Start periodic connectivity check
  void _startPeriodicCheck() {
    // Check immediately
    checkConnectivity();

    // Then check every 30 seconds
    _checkTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      checkConnectivity();
    });
  }

  /// Check current connectivity
  Future<bool> checkConnectivity() async {
    if (_isChecking) return _isOnline;

    _isChecking = true;

    try {
      // Try to resolve a DNS lookup
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 5));

      final online = result.isNotEmpty && result[0].rawAddress.isNotEmpty;
      _updateStatus(online);
      return online;
    } on SocketException catch (_) {
      _updateStatus(false);
      return false;
    } on TimeoutException catch (_) {
      _updateStatus(false);
      return false;
    } catch (e) {
      debugPrint('Connectivity check error: $e');
      _updateStatus(false);
      return false;
    } finally {
      _isChecking = false;
    }
  }

  /// Update online status and notify listeners
  void _updateStatus(bool online) {
    if (_isOnline != online) {
      _isOnline = online;
      _connectivityController.add(online);
      notifyListeners();
      debugPrint('Connectivity changed: ${online ? 'online' : 'offline'}');
    }
  }

  /// Force refresh connectivity status
  Future<void> refresh() async {
    await checkConnectivity();
  }

  /// Stop monitoring (call when app is disposed)
  void dispose() {
    _checkTimer?.cancel();
    _connectivityController.close();
    super.dispose();
  }
}
