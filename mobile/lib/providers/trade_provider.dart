import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class TradeProvider extends ChangeNotifier {
  bool _isLoading = false;
  List<Map<String, dynamic>> _traders = [];
  List<Map<String, dynamic>> _trades = [];
  Map<String, dynamic>? _currentTrade;

  bool get isLoading => _isLoading;
  List<Map<String, dynamic>> get traders => _traders;
  List<Map<String, dynamic>> get trades => _trades;
  Map<String, dynamic>? get currentTrade => _currentTrade;

  final ApiService _api = ApiService();

  // Get traders for a corridor
  Future<void> getTraders({String? from, String? to}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.getTraders(from: from, to: to);
      _traders = List<Map<String, dynamic>>.from(response['traders'] ?? []);
    } catch (e) {
      _traders = [];
    }

    _isLoading = false;
    notifyListeners();
  }

  // Get my trades
  Future<void> getMyTrades({String? status}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.getMyTrades(status: status);
      _trades = List<Map<String, dynamic>>.from(response['trades'] ?? []);
    } catch (e) {
      _trades = [];
    }

    _isLoading = false;
    notifyListeners();
  }

  // Get trade by ID
  Future<void> getTrade(String id) async {
    _isLoading = true;
    notifyListeners();

    try {
      _currentTrade = await _api.getTrade(id);
    } catch (e) {
      _currentTrade = null;
    }

    _isLoading = false;
    notifyListeners();
  }

  // Create trade
  Future<Map<String, dynamic>> createTrade(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    try {
      final trade = await _api.createTrade(data);
      return trade;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Mark trade as paid
  Future<void> markPaid(String id, {String? reference, String? proofUrl}) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _api.markTradePaid(id, reference: reference, proofUrl: proofUrl);
      await getTrade(id);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Complete trade
  Future<void> completeTrade(String id) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _api.completeTrade(id);
      await getTrade(id);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Open dispute
  Future<void> openDispute(String id, String reason) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _api.openDispute(id, reason);
      await getTrade(id);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Rate trade
  Future<void> rateTrade(String id, int rating, String? comment) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _api.rateTrade(id, rating, comment);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
