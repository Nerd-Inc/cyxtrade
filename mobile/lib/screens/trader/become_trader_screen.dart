import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/error_utils.dart';

class BecomeTraderScreen extends StatefulWidget {
  const BecomeTraderScreen({super.key});

  @override
  State<BecomeTraderScreen> createState() => _BecomeTraderScreenState();
}

class _BecomeTraderScreenState extends State<BecomeTraderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _displayNameController = TextEditingController();
  final _bondAmountController = TextEditingController(text: '1000');

  bool _isSubmitting = false;
  String _selectedFromCurrency = 'AED';
  String _selectedToCurrency = 'XAF';
  double _buyRate = 163.0;
  double _sellRate = 160.0;

  final List<String> _currencies = ['AED', 'XAF', 'USD', 'EUR', 'GBP', 'NGN'];

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _displayNameController.text = user?['displayName'] ?? '';
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _bondAmountController.dispose();
    super.dispose();
  }

  Future<void> _submitApplication() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      // Simulate API call
      await Future.delayed(const Duration(seconds: 2));

      // Update user as trader (mock)
      if (mounted) {
        context.read<AuthProvider>().updateUser({
          'isTrader': true,
          'traderStatus': 'active',
          'displayName': _displayNameController.text.trim(),
        });

        showSuccessSnackBar(context, 'Congratulations! You are now a trader.');
        context.go('/trader-dashboard');
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _submitApplication);
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Become a Trader'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Info banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue.shade100),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue.shade700),
                        const SizedBox(width: 8),
                        Text(
                          'How Trading Works',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'As a trader, you help users send money across borders. You set your rates and earn the spread. A security bond protects users from fraud.',
                      style: TextStyle(color: Colors.blue.shade700),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Display Name
              Text(
                'Trader Profile',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _displayNameController,
                decoration: const InputDecoration(
                  labelText: 'Display Name',
                  hintText: 'Name shown to users',
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter a display name';
                  }
                  if (value.trim().length < 3) {
                    return 'Name must be at least 3 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),

              // Trading Corridor
              Text(
                'Trading Corridor',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedFromCurrency,
                      decoration: const InputDecoration(
                        labelText: 'From',
                      ),
                      items: _currencies.map((currency) {
                        return DropdownMenuItem(
                          value: currency,
                          child: Text(currency),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _selectedFromCurrency = value);
                        }
                      },
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Icon(Icons.arrow_forward),
                  ),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedToCurrency,
                      decoration: const InputDecoration(
                        labelText: 'To',
                      ),
                      items: _currencies.map((currency) {
                        return DropdownMenuItem(
                          value: currency,
                          child: Text(currency),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _selectedToCurrency = value);
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Rates
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      initialValue: _buyRate.toString(),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Buy Rate',
                        helperText: '1 $_selectedFromCurrency = ? $_selectedToCurrency',
                      ),
                      onChanged: (value) {
                        _buyRate = double.tryParse(value) ?? 163.0;
                      },
                      validator: (value) {
                        if (value == null || double.tryParse(value) == null) {
                          return 'Enter a valid rate';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      initialValue: _sellRate.toString(),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Sell Rate',
                        helperText: '1 $_selectedFromCurrency = ? $_selectedToCurrency',
                      ),
                      onChanged: (value) {
                        _sellRate = double.tryParse(value) ?? 160.0;
                      },
                      validator: (value) {
                        if (value == null || double.tryParse(value) == null) {
                          return 'Enter a valid rate';
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Security Bond
              Text(
                'Security Bond',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Your bond determines the maximum trade size. Users are protected up to your bond amount.',
                style: TextStyle(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _bondAmountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Bond Amount (AED)',
                  prefixIcon: Icon(Icons.shield),
                  helperText: 'Minimum: 500 AED',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter bond amount';
                  }
                  final amount = double.tryParse(value);
                  if (amount == null || amount < 500) {
                    return 'Minimum bond is 500 AED';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info, size: 20, color: Colors.amber.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Your bond is held in escrow and returned when you stop trading.',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.amber.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Terms
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'By becoming a trader, you agree to:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    _buildTermItem('Complete trades within 30 minutes'),
                    _buildTermItem('Only accept direct payments (no third parties)'),
                    _buildTermItem('Verify payment before marking complete'),
                    _buildTermItem('Respond to disputes within 24 hours'),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Submit button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitApplication,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Start Trading'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTermItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.check_circle, size: 18, color: Colors.green.shade600),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
