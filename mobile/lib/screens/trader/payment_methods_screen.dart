import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/trader_provider.dart';
import '../../utils/error_utils.dart';

class PaymentMethodsScreen extends StatefulWidget {
  const PaymentMethodsScreen({super.key});

  @override
  State<PaymentMethodsScreen> createState() => _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends State<PaymentMethodsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TraderProvider>().loadPaymentMethods();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TraderProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Methods'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : provider.paymentMethods.isEmpty
              ? _buildEmptyState()
              : _buildMethodsList(provider.paymentMethods),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/trader/payment-methods/add'),
        icon: const Icon(Icons.add),
        label: const Text('Add Method'),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.account_balance_wallet_outlined,
              size: 80,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No Payment Methods',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Add your bank accounts or mobile money numbers to receive payments from users.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.push('/trader/payment-methods/add'),
              icon: const Icon(Icons.add),
              label: const Text('Add Payment Method'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodsList(List<PaymentMethod> methods) {
    return RefreshIndicator(
      onRefresh: () => context.read<TraderProvider>().loadPaymentMethods(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: methods.length,
        itemBuilder: (context, index) {
          final method = methods[index];
          return _PaymentMethodCard(
            method: method,
            onTap: () => context.push('/trader/payment-methods/${method.id}/edit'),
            onSetPrimary: () => _setAsPrimary(method),
            onDelete: () => _confirmDelete(method),
            onVerify: () => _verifyMethod(method),
          );
        },
      ),
    );
  }

  Future<void> _verifyMethod(PaymentMethod method) async {
    final result = await context.push<bool>('/trader/payment-methods/${method.id}/verify');
    if (result == true && mounted) {
      // Refresh the list to show updated verification status
      context.read<TraderProvider>().loadPaymentMethods();
    }
  }

  Future<void> _setAsPrimary(PaymentMethod method) async {
    try {
      await context.read<TraderProvider>().setPaymentMethodPrimary(method.id);
      if (mounted) {
        showSuccessSnackBar(context, '${method.displayName} is now your primary payment method');
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: () => _setAsPrimary(method));
      }
    }
  }

  Future<void> _confirmDelete(PaymentMethod method) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Payment Method'),
        content: Text('Are you sure you want to delete ${method.displayName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      try {
        await context.read<TraderProvider>().deletePaymentMethod(method.id);
        if (mounted) {
          showSuccessSnackBar(context, 'Payment method deleted');
        }
      } catch (e) {
        if (mounted) {
          showErrorSnackBar(context, e, onRetry: () => _confirmDelete(method));
        }
      }
    }
  }
}

class _PaymentMethodCard extends StatelessWidget {
  final PaymentMethod method;
  final VoidCallback onTap;
  final VoidCallback onSetPrimary;
  final VoidCallback onDelete;
  final VoidCallback onVerify;

  const _PaymentMethodCard({
    required this.method,
    required this.onTap,
    required this.onSetPrimary,
    required this.onDelete,
    required this.onVerify,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _buildIcon(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                method.displayName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (method.isPrimary) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).primaryColor,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text(
                                  'Primary',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        _buildVerificationBadge(),
                        const SizedBox(height: 4),
                        Text(
                          method.accountHolderName,
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      switch (value) {
                        case 'verify':
                          onVerify();
                          break;
                        case 'primary':
                          onSetPrimary();
                          break;
                        case 'delete':
                          onDelete();
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      if (!method.isVerified)
                        PopupMenuItem(
                          value: 'verify',
                          child: Row(
                            children: [
                              Icon(
                                method.isPending ? Icons.pending_outlined : Icons.verified_user_outlined,
                                color: method.isPending ? Colors.orange : Colors.blue,
                              ),
                              const SizedBox(width: 8),
                              Text(method.isPending ? 'Continue Verification' : 'Verify'),
                            ],
                          ),
                        ),
                      if (!method.isPrimary)
                        const PopupMenuItem(
                          value: 'primary',
                          child: Row(
                            children: [
                              Icon(Icons.star_outline),
                              SizedBox(width: 8),
                              Text('Set as Primary'),
                            ],
                          ),
                        ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Delete', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                children: [
                  Icon(
                    method.methodType == 'bank' ? Icons.account_balance : Icons.phone_android,
                    size: 16,
                    color: Colors.grey.shade600,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    method.maskedAccount,
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontFamily: 'monospace',
                    ),
                  ),
                  if (method.currency != null) ...[
                    const Spacer(),
                    Text(
                      method.currency!,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVerificationBadge() {
    IconData icon;
    Color color;
    String text;

    if (method.isVerified) {
      icon = Icons.verified;
      color = Colors.green;
      text = 'Verified';
    } else if (method.isPending) {
      icon = Icons.pending;
      color = Colors.orange;
      text = 'Pending';
    } else {
      icon = Icons.warning_amber_outlined;
      color = Colors.red.shade400;
      text = 'Unverified';
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(
            fontSize: 12,
            color: color,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildIcon() {
    IconData icon;
    Color color;

    if (method.methodType == 'bank') {
      icon = Icons.account_balance;
      color = Colors.blue;
    } else {
      switch (method.provider) {
        case 'orange_money':
          icon = Icons.phone_android;
          color = Colors.orange;
          break;
        case 'mtn_momo':
          icon = Icons.phone_android;
          color = Colors.yellow.shade700;
          break;
        case 'mpesa':
          icon = Icons.phone_android;
          color = Colors.green;
          break;
        case 'wave':
          icon = Icons.phone_android;
          color = Colors.blue.shade300;
          break;
        default:
          icon = Icons.phone_android;
          color = Colors.grey;
      }
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color),
    );
  }
}
