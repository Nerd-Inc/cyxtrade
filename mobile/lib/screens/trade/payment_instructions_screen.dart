import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

class PaymentInstructionsScreen extends StatefulWidget {
  final String tradeId;
  final double amount;
  final String currency;
  final String traderName;
  final Map<String, dynamic> paymentDetails;

  const PaymentInstructionsScreen({
    super.key,
    required this.tradeId,
    required this.amount,
    required this.currency,
    required this.traderName,
    required this.paymentDetails,
  });

  @override
  State<PaymentInstructionsScreen> createState() => _PaymentInstructionsScreenState();
}

class _PaymentInstructionsScreenState extends State<PaymentInstructionsScreen> {
  bool _paymentConfirmed = false;
  bool _isSubmitting = false;

  Future<void> _confirmPayment() async {
    setState(() => _isSubmitting = true);

    try {
      // Simulate API call
      await Future.delayed(const Duration(seconds: 1));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment confirmation sent to trader'),
            backgroundColor: Colors.green,
          ),
        );
        context.go('/trade/${widget.tradeId}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Mock payment details
    final paymentMethod = widget.paymentDetails['method'] ?? 'Bank Transfer';
    final bankName = widget.paymentDetails['bankName'] ?? 'Emirates NBD';
    final accountName = widget.paymentDetails['accountName'] ?? widget.traderName;
    final accountNumber = widget.paymentDetails['accountNumber'] ?? '1234567890123456';
    final iban = widget.paymentDetails['iban'] ?? 'AE070331234567890123456';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Instructions'),
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
            // Timer warning
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.timer, color: Colors.orange.shade700),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Complete payment within 30 minutes',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.orange.shade900,
                          ),
                        ),
                        Text(
                          'Trade will be cancelled if payment is not confirmed',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.orange.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Amount to pay
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text(
                      'Amount to Pay',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          widget.amount.toStringAsFixed(2),
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          widget.currency,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Payment details
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          paymentMethod == 'Bank Transfer'
                              ? Icons.account_balance
                              : Icons.phone_android,
                          color: Theme.of(context).primaryColor,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          paymentMethod,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    _buildDetailRow('Bank', bankName, copyable: false),
                    _buildDetailRow('Account Name', accountName, copyable: true),
                    _buildDetailRow('Account Number', accountNumber, copyable: true),
                    _buildDetailRow('IBAN', iban, copyable: true),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Important notes
            Card(
              color: Colors.red.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.warning, color: Colors.red.shade700),
                        const SizedBox(width: 8),
                        Text(
                          'Important',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.red.shade700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildWarningItem('Pay exact amount - no more, no less'),
                    _buildWarningItem('Use your registered name only'),
                    _buildWarningItem('Do NOT pay from third-party accounts'),
                    _buildWarningItem('Keep payment receipt/screenshot'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Confirmation checkbox
            CheckboxListTile(
              value: _paymentConfirmed,
              onChanged: (value) {
                setState(() => _paymentConfirmed = value ?? false);
              },
              title: const Text('I have completed the payment'),
              subtitle: const Text(
                'Only check this after you have successfully transferred the money',
                style: TextStyle(fontSize: 12),
              ),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 16),

            // Confirm button
            ElevatedButton(
              onPressed: _paymentConfirmed && !_isSubmitting ? _confirmPayment : null,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('I Have Paid'),
            ),
            const SizedBox(height: 8),

            // Chat with trader
            OutlinedButton.icon(
              onPressed: () {
                context.push('/chat/${widget.tradeId}', extra: {
                  'traderName': widget.traderName,
                });
              },
              icon: const Icon(Icons.chat),
              label: const Text('Chat with Trader'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool copyable = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          if (copyable)
            IconButton(
              icon: const Icon(Icons.copy, size: 18),
              onPressed: () => _copyToClipboard(value, label),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
        ],
      ),
    );
  }

  Widget _buildWarningItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: TextStyle(color: Colors.red.shade700)),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: Colors.red.shade700),
            ),
          ),
        ],
      ),
    );
  }
}
