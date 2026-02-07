import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SendScreen extends StatefulWidget {
  const SendScreen({super.key});

  @override
  State<SendScreen> createState() => _SendScreenState();
}

class _SendScreenState extends State<SendScreen> {
  final _amountController = TextEditingController();
  final _recipientNameController = TextEditingController();
  final _recipientPhoneController = TextEditingController();

  static const double _rate = 163.0;
  static const String _sendCurrency = 'AED';
  static const String _receiveCurrency = 'XAF';

  String _selectedPaymentMethod = 'Orange Money';
  final List<Map<String, dynamic>> _paymentMethods = [
    {'name': 'Orange Money', 'icon': '🟠', 'prefix': '+237'},
    {'name': 'MTN Mobile Money', 'icon': '🟡', 'prefix': '+237'},
    {'name': 'Bank Transfer', 'icon': '🏦', 'prefix': ''},
  ];

  double get _sendAmount {
    final text = _amountController.text.replaceAll(',', '');
    return double.tryParse(text) ?? 0;
  }

  double get _receiveAmount => _sendAmount * _rate;

  @override
  void initState() {
    super.initState();
    _amountController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _amountController.dispose();
    _recipientNameController.dispose();
    _recipientPhoneController.dispose();
    super.dispose();
  }

  void _findTraders() {
    // Validate inputs
    if (_sendAmount < 50) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Minimum amount is 50 AED')),
      );
      return;
    }
    if (_sendAmount > 5000) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Maximum amount is 5000 AED')),
      );
      return;
    }
    if (_recipientNameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter recipient name')),
      );
      return;
    }
    if (_recipientPhoneController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter recipient phone')),
      );
      return;
    }

    // Navigate to trader selection
    context.push('/traders', extra: {
      'sendAmount': _sendAmount,
      'sendCurrency': _sendCurrency,
      'receiveCurrency': _receiveCurrency,
      'recipientName': _recipientNameController.text.trim(),
      'recipientPhone': _recipientPhoneController.text.trim(),
      'recipientMethod': _selectedPaymentMethod,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Send Money'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Amount
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('You send'),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _amountController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            style: Theme.of(context).textTheme.headlineMedium,
                            decoration: const InputDecoration(
                              hintText: '0.00',
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            children: [
                              Text('🇦🇪'),
                              SizedBox(width: 4),
                              Text('AED'),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (_sendAmount > 0 && (_sendAmount < 50 || _sendAmount > 5000))
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          _sendAmount < 50
                              ? 'Minimum: 50 AED'
                              : 'Maximum: 5000 AED',
                          style: TextStyle(
                            color: Colors.red.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Recipient gets
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Recipient gets'),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _receiveAmount > 0
                                ? '~${_formatNumber(_receiveAmount.round())}'
                                : '0',
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  color: Colors.green.shade700,
                                ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            children: [
                              Text('🇨🇲'),
                              SizedBox(width: 4),
                              Text('XAF'),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Rate: 1 $_sendCurrency = ${_rate.toStringAsFixed(0)} $_receiveCurrency',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Recipient details
            Text(
              'Recipient Details',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _recipientNameController,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Recipient Name',
                prefixIcon: Icon(Icons.person),
              ),
            ),
            const SizedBox(height: 16),

            // Payment method selector
            Text(
              'Payment Method',
              style: TextStyle(
                color: Colors.grey.shade700,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _paymentMethods.map((method) {
                final isSelected = _selectedPaymentMethod == method['name'];
                return ChoiceChip(
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(method['icon']),
                      const SizedBox(width: 4),
                      Text(method['name']),
                    ],
                  ),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() => _selectedPaymentMethod = method['name']);
                    }
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            TextField(
              controller: _recipientPhoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: _selectedPaymentMethod == 'Bank Transfer'
                    ? 'Account Number'
                    : 'Phone Number',
                prefixIcon: Icon(
                  _selectedPaymentMethod == 'Bank Transfer'
                      ? Icons.account_balance
                      : Icons.phone,
                ),
                hintText: _selectedPaymentMethod == 'Bank Transfer'
                    ? 'Enter account number'
                    : '+237...',
              ),
            ),
            const SizedBox(height: 32),

            // Continue button
            ElevatedButton(
              onPressed: _sendAmount >= 50 && _sendAmount <= 5000 ? _findTraders : null,
              child: const Text('Find Traders'),
            ),
          ],
        ),
      ),
    );
  }

  String _formatNumber(int number) {
    return number.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
}
