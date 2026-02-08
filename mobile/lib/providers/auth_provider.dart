import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../services/socket_service.dart';
import '../services/identity_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _token;
  Map<String, dynamic>? _user;
  Identity? _identity;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isTrader => _user?['isTrader'] ?? false;
  bool get isAdmin => _user?['isAdmin'] ?? false;
  Identity? get identity => _identity;

  final ApiService _api = ApiService();
  final StorageService _storage = StorageService();
  final SocketService _socket = SocketService();
  final IdentityService _identityService = IdentityService();

  // Check if user is logged in
  Future<void> checkAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token != null) {
        _token = token;
        _api.setToken(token);

        // Get user profile
        final user = await _api.getMe();
        _user = user;
        _isAuthenticated = true;

        // Load identity if available
        if (await _identityService.hasIdentity()) {
          _identity = await _identityService.getOrCreateIdentity();
        }

        // Connect socket for real-time updates
        await _socket.connect();
      }
    } catch (e) {
      await _storage.clearToken();
      _isAuthenticated = false;
    }

    _isLoading = false;
    notifyListeners();
  }

  // Check if there's a stored identity
  Future<bool> hasStoredIdentity() async {
    return await _identityService.hasIdentity();
  }

  // ============================================
  // Keypair Authentication (Primary)
  // ============================================

  /// Login with keypair (anonymous identity)
  Future<void> loginWithKeypair() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Get or create identity
      _identity = await _identityService.getOrCreateIdentity();

      // Request challenge from server
      final challengeResponse = await _api.requestChallenge(_identity!.publicKey);
      final challenge = challengeResponse['challenge'] as String;

      // Sign challenge with private key
      final signature = await _identityService.signChallenge(challenge);

      // Verify signature and get JWT
      final authResponse = await _api.verifySignature(_identity!.publicKey, signature);

      _token = authResponse['token'];
      _user = authResponse['user'];
      _isAuthenticated = true;

      await _storage.setToken(_token!);
      _api.setToken(_token!);

      // Connect socket for real-time updates
      await _socket.connect();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Export private key for backup
  Future<String?> exportPrivateKey() async {
    return await _identityService.exportPrivateKey();
  }

  /// Import identity from private key backup
  Future<void> importFromPrivateKey(String privateKeyHex) async {
    _isLoading = true;
    notifyListeners();

    try {
      _identity = await _identityService.importFromPrivateKey(privateKeyHex);
      // Now login with the imported key
      await loginWithKeypair();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================
  // OTP Authentication (Legacy/Recovery)
  // ============================================

  // Request OTP
  Future<void> requestOtp(String phone) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _api.requestOtp(phone);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Verify OTP
  Future<void> verifyOtp(String phone, String otp) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.verifyOtp(phone, otp);
      _token = response['token'];
      _user = response['user'];
      _isAuthenticated = true;

      await _storage.setToken(_token!);
      _api.setToken(_token!);

      // Connect socket for real-time updates
      await _socket.connect();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================
  // Profile Management
  // ============================================

  // Update profile
  Future<void> updateProfile(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    try {
      final user = await _api.updateProfile(data);
      _user = user;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Update local user state
  void updateUser(Map<String, dynamic> updates) {
    if (_user != null) {
      _user = {..._user!, ...updates};
      notifyListeners();
    }
  }

  // ============================================
  // Logout
  // ============================================

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _api.logout();
    } catch (e) {
      // Ignore logout errors
    }

    // Disconnect socket
    _socket.disconnect();

    // Clear identity
    await _identityService.clearIdentity();

    await _storage.clearToken();
    _token = null;
    _user = null;
    _identity = null;
    _isAuthenticated = false;

    _isLoading = false;
    notifyListeners();
  }
}
