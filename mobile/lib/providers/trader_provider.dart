import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class PaymentMethod {
  final String id;
  final String traderId;
  final String methodType;
  final String provider;
  final String accountHolderName;
  final String? phoneNumber;
  final String? bankName;
  final String? accountNumber;
  final String? iban;
  final String? swiftCode;
  final String? currency;
  final bool isPrimary;
  final bool isActive;

  PaymentMethod({
    required this.id,
    required this.traderId,
    required this.methodType,
    required this.provider,
    required this.accountHolderName,
    this.phoneNumber,
    this.bankName,
    this.accountNumber,
    this.iban,
    this.swiftCode,
    this.currency,
    this.isPrimary = false,
    this.isActive = true,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id: json['id'] ?? '',
      traderId: json['trader_id'] ?? '',
      methodType: json['method_type'] ?? json['methodType'] ?? '',
      provider: json['provider'] ?? '',
      accountHolderName: json['account_holder_name'] ?? json['accountHolderName'] ?? '',
      phoneNumber: json['phone_number'] ?? json['phoneNumber'],
      bankName: json['bank_name'] ?? json['bankName'],
      accountNumber: json['account_number'] ?? json['accountNumber'],
      iban: json['iban'],
      swiftCode: json['swift_code'] ?? json['swiftCode'],
      currency: json['currency'],
      isPrimary: json['is_primary'] ?? json['isPrimary'] ?? false,
      isActive: json['is_active'] ?? json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'method_type': methodType,
      'provider': provider,
      'account_holder_name': accountHolderName,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      if (bankName != null) 'bank_name': bankName,
      if (accountNumber != null) 'account_number': accountNumber,
      if (iban != null) 'iban': iban,
      if (swiftCode != null) 'swift_code': swiftCode,
      if (currency != null) 'currency': currency,
      'is_primary': isPrimary,
    };
  }

  String get displayName {
    if (methodType == 'bank') {
      return bankName ?? 'Bank Account';
    } else {
      return _providerDisplayName(provider);
    }
  }

  String get maskedAccount {
    if (methodType == 'bank' && accountNumber != null) {
      return accountNumber!;
    } else if (phoneNumber != null) {
      return phoneNumber!;
    }
    return '';
  }

  static String _providerDisplayName(String provider) {
    switch (provider) {
      case 'orange_money':
        return 'Orange Money';
      case 'mtn_momo':
        return 'MTN Mobile Money';
      case 'mpesa':
        return 'M-Pesa';
      case 'airtel_money':
        return 'Airtel Money';
      case 'wave':
        return 'Wave';
      default:
        return provider;
    }
  }
}

class TraderProvider extends ChangeNotifier {
  bool _isLoading = false;
  List<PaymentMethod> _paymentMethods = [];
  Map<String, dynamic>? _traderProfile;
  bool _isOnline = false;
  String? _error;

  bool get isLoading => _isLoading;
  List<PaymentMethod> get paymentMethods => _paymentMethods;
  Map<String, dynamic>? get traderProfile => _traderProfile;
  bool get isOnline => _isOnline;
  String? get error => _error;
  bool get hasPaymentMethods => _paymentMethods.isNotEmpty;
  PaymentMethod? get primaryPaymentMethod =>
      _paymentMethods.isEmpty ? null : _paymentMethods.firstWhere(
        (m) => m.isPrimary,
        orElse: () => _paymentMethods.first,
      );

  final ApiService _api = ApiService();

  // Load trader profile
  Future<void> loadTraderProfile() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _traderProfile = await _api.getTraderProfile();
      _isOnline = _traderProfile?['isOnline'] ?? false;
    } catch (e) {
      _error = e.toString();
      _traderProfile = null;
    }

    _isLoading = false;
    notifyListeners();
  }

  // Load payment methods
  Future<void> loadPaymentMethods() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final methods = await _api.getPaymentMethods();
      _paymentMethods = methods.map((m) => PaymentMethod.fromJson(m)).toList();
    } catch (e) {
      _error = e.toString();
      _paymentMethods = [];
    }

    _isLoading = false;
    notifyListeners();
  }

  // Add payment method
  Future<PaymentMethod> addPaymentMethod(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _api.addPaymentMethod(data);
      final method = PaymentMethod.fromJson(result);

      // If this is set as primary, update others
      if (method.isPrimary) {
        _paymentMethods = _paymentMethods.map((m) =>
          PaymentMethod(
            id: m.id,
            traderId: m.traderId,
            methodType: m.methodType,
            provider: m.provider,
            accountHolderName: m.accountHolderName,
            phoneNumber: m.phoneNumber,
            bankName: m.bankName,
            accountNumber: m.accountNumber,
            iban: m.iban,
            swiftCode: m.swiftCode,
            currency: m.currency,
            isPrimary: false,
            isActive: m.isActive,
          )
        ).toList();
      }

      _paymentMethods.insert(0, method);
      _isLoading = false;
      notifyListeners();
      return method;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Update payment method
  Future<PaymentMethod> updatePaymentMethod(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _api.updatePaymentMethod(id, data);
      final method = PaymentMethod.fromJson(result);

      final index = _paymentMethods.indexWhere((m) => m.id == id);
      if (index != -1) {
        _paymentMethods[index] = method;
      }

      _isLoading = false;
      notifyListeners();
      return method;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Delete payment method
  Future<void> deletePaymentMethod(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _api.deletePaymentMethod(id);
      _paymentMethods.removeWhere((m) => m.id == id);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Set payment method as primary
  Future<void> setPaymentMethodPrimary(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _api.setPaymentMethodPrimary(id);

      // Update local state
      _paymentMethods = _paymentMethods.map((m) =>
        PaymentMethod(
          id: m.id,
          traderId: m.traderId,
          methodType: m.methodType,
          provider: m.provider,
          accountHolderName: m.accountHolderName,
          phoneNumber: m.phoneNumber,
          bankName: m.bankName,
          accountNumber: m.accountNumber,
          iban: m.iban,
          swiftCode: m.swiftCode,
          currency: m.currency,
          isPrimary: m.id == id,
          isActive: m.isActive,
        )
      ).toList();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Update online status
  Future<void> updateOnlineStatus(bool online) async {
    try {
      await _api.updateTraderStatus(online);
      _isOnline = online;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
