import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/trader_provider.dart';
import '../../utils/error_utils.dart';

class PaymentMethodFormScreen extends StatefulWidget {
  final String? methodId;

  const PaymentMethodFormScreen({super.key, this.methodId});

  @override
  State<PaymentMethodFormScreen> createState() => _PaymentMethodFormScreenState();
}

class _PaymentMethodFormScreenState extends State<PaymentMethodFormScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isPrimary = false;

  String _methodType = 'mobile_money';
  String? _provider;
  final _accountHolderController = TextEditingController();
  final _phoneController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _accountNumberController = TextEditingController();
  final _ibanController = TextEditingController();
  final _swiftController = TextEditingController();
  String? _currency;

  bool get isEditing => widget.methodId != null;

  final List<Map<String, String>> _mobileProviders = [
    {'value': 'orange_money', 'label': 'Orange Money'},
    {'value': 'mtn_momo', 'label': 'MTN Mobile Money'},
    {'value': 'mpesa', 'label': 'M-Pesa'},
    {'value': 'airtel_money', 'label': 'Airtel Money'},
    {'value': 'wave', 'label': 'Wave'},
  ];

  final List<String> _currencies = ['AED', 'XAF', 'KES', 'TZS', 'UGX', 'GHS', 'USD', 'EUR'];

  @override
  void initState() {
    super.initState();
    if (isEditing) {
      _loadExistingMethod();
    }
  }

  void _loadExistingMethod() {
    final provider = context.read<TraderProvider>();
    final method = provider.paymentMethods.where((m) => m.id == widget.methodId).firstOrNull;

    if (method != null) {
      setState(() {
        _methodType = method.methodType;
        _provider = method.provider;
        _accountHolderController.text = method.accountHolderName;
        _phoneController.text = method.phoneNumber ?? '';
        _bankNameController.text = method.bankName ?? '';
        _accountNumberController.text = method.accountNumber ?? '';
        _ibanController.text = method.iban ?? '';
        _swiftController.text = method.swiftCode ?? '';
        _currency = method.currency;
        _isPrimary = method.isPrimary;
      });
    }
  }

  @override
  void dispose() {
    _accountHolderController.dispose();
    _phoneController.dispose();
    _bankNameController.dispose();
    _accountNumberController.dispose();
    _ibanController.dispose();
    _swiftController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Payment Method' : 'Add Payment Method'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Method Type
            Text(
              'Payment Type',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'mobile_money',
                  label: Text('Mobile Money'),
                  icon: Icon(Icons.phone_android),
                ),
                ButtonSegment(
                  value: 'bank',
                  label: Text('Bank Transfer'),
                  icon: Icon(Icons.account_balance),
                ),
              ],
              selected: {_methodType},
              onSelectionChanged: (value) {
                setState(() {
                  _methodType = value.first;
                  _provider = null;
                });
              },
            ),
            const SizedBox(height: 24),

            // Provider (for mobile money)
            if (_methodType == 'mobile_money') ...[
              DropdownButtonFormField<String>(
                value: _provider,
                decoration: const InputDecoration(
                  labelText: 'Provider',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.business),
                ),
                items: _mobileProviders
                    .map((p) => DropdownMenuItem(
                          value: p['value'],
                          child: Text(p['label']!),
                        ))
                    .toList(),
                onChanged: (value) => setState(() => _provider = value),
                validator: (value) {
                  if (_methodType == 'mobile_money' && (value == null || value.isEmpty)) {
                    return 'Please select a provider';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Phone number
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  hintText: '+237 6XX XXX XXX',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone),
                ),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (_methodType == 'mobile_money' && (value == null || value.isEmpty)) {
                    return 'Please enter phone number';
                  }
                  if (value != null && value.isNotEmpty && !value.startsWith('+')) {
                    return 'Include country code (e.g., +237)';
                  }
                  return null;
                },
              ),
            ],

            // Bank fields
            if (_methodType == 'bank') ...[
              TextFormField(
                controller: _bankNameController,
                decoration: const InputDecoration(
                  labelText: 'Bank Name',
                  hintText: 'e.g., Emirates NBD',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.account_balance),
                ),
                validator: (value) {
                  if (_methodType == 'bank' && (value == null || value.isEmpty)) {
                    return 'Please enter bank name';
                  }
                  return null;
                },
                onChanged: (value) {
                  // Set provider to bank name for bank type
                  _provider = value;
                },
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _accountNumberController,
                decoration: const InputDecoration(
                  labelText: 'Account Number',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.numbers),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (_methodType == 'bank' && (value == null || value.isEmpty)) {
                    return 'Please enter account number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _ibanController,
                decoration: const InputDecoration(
                  labelText: 'IBAN (Optional)',
                  hintText: 'e.g., AE12 3456 7890 1234 5678 901',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.credit_card),
                ),
                textCapitalization: TextCapitalization.characters,
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _swiftController,
                decoration: const InputDecoration(
                  labelText: 'SWIFT/BIC Code (Optional)',
                  hintText: 'e.g., EABORXXX',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.code),
                ),
                textCapitalization: TextCapitalization.characters,
              ),
            ],

            const SizedBox(height: 16),

            // Account holder name
            TextFormField(
              controller: _accountHolderController,
              decoration: const InputDecoration(
                labelText: 'Account Holder Name',
                hintText: 'Name as it appears on the account',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
              ),
              textCapitalization: TextCapitalization.words,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter account holder name';
                }
                if (value.length < 2) {
                  return 'Name is too short';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Currency
            DropdownButtonFormField<String>(
              value: _currency,
              decoration: const InputDecoration(
                labelText: 'Currency',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.attach_money),
              ),
              items: _currencies
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (value) => setState(() => _currency = value),
            ),
            const SizedBox(height: 16),

            // Primary switch
            SwitchListTile(
              title: const Text('Set as Primary'),
              subtitle: const Text('Use this method by default for trades'),
              value: _isPrimary,
              onChanged: (value) => setState(() => _isPrimary = value),
              contentPadding: EdgeInsets.zero,
            ),

            const SizedBox(height: 32),

            // Submit button
            FilledButton(
              onPressed: _isLoading ? null : _submit,
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(isEditing ? 'Update' : 'Add Payment Method'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final data = {
        'method_type': _methodType,
        'provider': _methodType == 'bank' ? _bankNameController.text : _provider,
        'account_holder_name': _accountHolderController.text,
        if (_methodType == 'mobile_money') 'phone_number': _phoneController.text,
        if (_methodType == 'bank') ...<String, dynamic>{
          'bank_name': _bankNameController.text,
          'account_number': _accountNumberController.text,
          if (_ibanController.text.isNotEmpty) 'iban': _ibanController.text,
          if (_swiftController.text.isNotEmpty) 'swift_code': _swiftController.text,
        },
        if (_currency != null) 'currency': _currency,
        'is_primary': _isPrimary,
      };

      final provider = context.read<TraderProvider>();

      if (isEditing) {
        await provider.updatePaymentMethod(widget.methodId!, data);
      } else {
        await provider.addPaymentMethod(data);
      }

      if (mounted) {
        showSuccessSnackBar(context, isEditing ? 'Payment method updated' : 'Payment method added');
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _submit);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
