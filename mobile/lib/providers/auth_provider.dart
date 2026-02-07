import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _token;
  Map<String, dynamic>? _user;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isTrader => _user?['isTrader'] ?? false;
  bool get isAdmin => _user?['isAdmin'] ?? false;

  final ApiService _api = ApiService();
  final StorageService _storage = StorageService();

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
      }
    } catch (e) {
      await _storage.clearToken();
      _isAuthenticated = false;
    }

    _isLoading = false;
    notifyListeners();
  }

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
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

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

  // Logout
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _api.logout();
    } catch (e) {
      // Ignore logout errors
    }

    await _storage.clearToken();
    _token = null;
    _user = null;
    _isAuthenticated = false;

    _isLoading = false;
    notifyListeners();
  }
}
