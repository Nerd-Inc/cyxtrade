import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/trade_provider.dart';

class TradeDetailScreen extends StatefulWidget {
  final String tradeId;

  const TradeDetailScreen({super.key, required this.tradeId});

  @override
  State<TradeDetailScreen> createState() => _TradeDetailScreenState();
}

class _TradeDetailScreenState extends State<TradeDetailScreen> {
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    // Defer loading to after the build phase
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTrade();
    });
  }

  Future<void> _loadTrade() async {
    await context.read<TradeProvider>().getTrade(widget.tradeId);
  }

  Future<void> _markAsPaid() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Payment'),
        content: const Text(
          'Have you sent the payment to the trader? Make sure you have completed the payment before confirming.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Yes, I\'ve Paid'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isSubmitting = true);
    try {
      await context.read<TradeProvider>().markPaid(widget.tradeId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment marked as sent')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _confirmReceipt() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Receipt'),
        content: const Text(
          'Has your recipient received the money? This action will complete the trade and cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not Yet'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Yes, Received'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isSubmitting = true);
    try {
      await context.read<TradeProvider>().completeTrade(widget.tradeId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trade completed successfully!')),
        );
        // Show rating dialog
        _showRatingDialog();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _showRatingDialog() async {
    int rating = 5;
    final controller = TextEditingController();

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Rate This Trade'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('How was your experience with this trader?'),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  return IconButton(
                    onPressed: () => setDialogState(() => rating = index + 1),
                    icon: Icon(
                      index < rating ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 32,
                    ),
                  );
                }),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'Comment (optional)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Skip'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                await context.read<TradeProvider>().rateTrade(
                  widget.tradeId,
                  rating,
                  controller.text.isEmpty ? null : controller.text,
                );
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openDispute() async {
    final controller = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Open Dispute'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Please describe the issue with this trade:'),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Reason',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                Navigator.pop(context, true);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Open Dispute'),
          ),
        ],
      ),
    );

    if (confirm != true || controller.text.trim().isEmpty) return;

    setState(() => _isSubmitting = true);
    try {
      await context.read<TradeProvider>().openDispute(
        widget.tradeId,
        controller.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Dispute opened. Admin will review.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trades = context.watch<TradeProvider>();
    final trade = trades.currentTrade;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trade Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (trade != null && _canDispute(trade['status']))
            IconButton(
              icon: const Icon(Icons.flag_outlined),
              onPressed: _openDispute,
              tooltip: 'Open Dispute',
            ),
        ],
      ),
      body: trades.isLoading || _isSubmitting
          ? const Center(child: CircularProgressIndicator())
          : trade == null
              ? const Center(child: Text('Trade not found'))
              : RefreshIndicator(
                  onRefresh: _loadTrade,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Status card
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                _StatusIcon(status: trade['status']),
                                const SizedBox(height: 12),
                                Text(
                                  _getStatusTitle(trade['status']),
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleLarge
                                      ?.copyWith(fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _getStatusDescription(trade['status']),
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Trader payment info (when accepted)
                        if (trade['status'] == 'accepted' && trade['trader'] != null)
                          _TraderPaymentCard(trade: trade),

                        // Amount card
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('You send'),
                                    Text(
                                      '${trade['sendAmount']} ${trade['sendCurrency']}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                const Divider(height: 24),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('Recipient gets'),
                                    Text(
                                      '${trade['receiveAmount']} ${trade['receiveCurrency']}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                const Divider(height: 24),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('Rate'),
                                    Text('1 ${trade['sendCurrency']} = ${trade['rate']} ${trade['receiveCurrency']}'),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Recipient card
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Recipient',
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    const Icon(Icons.person, size: 20),
                                    const SizedBox(width: 8),
                                    Text(trade['recipientName'] ?? 'Unknown'),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(Icons.phone, size: 20),
                                    const SizedBox(width: 8),
                                    Text(trade['recipientPhone'] ?? 'Unknown'),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Action buttons
                        if (trade['status'] == 'accepted')
                          ElevatedButton.icon(
                            onPressed: _markAsPaid,
                            icon: const Icon(Icons.check),
                            label: const Text('I\'ve Sent Payment'),
                          ),
                        if (trade['status'] == 'paid')
                          Card(
                            color: Colors.blue.shade50,
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Icon(Icons.hourglass_empty, color: Colors.blue.shade700),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Waiting for trader to deliver funds to your recipient',
                                      style: TextStyle(color: Colors.blue.shade700),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        if (trade['status'] == 'delivered')
                          ElevatedButton.icon(
                            onPressed: _confirmReceipt,
                            icon: const Icon(Icons.done_all),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                            ),
                            label: const Text('Confirm Receipt'),
                          ),
                        if (trade['status'] == 'completed')
                          Card(
                            color: Colors.green.shade50,
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Icon(Icons.check_circle, color: Colors.green.shade700),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'This trade has been completed successfully!',
                                      style: TextStyle(color: Colors.green.shade700),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: () {
                            final traderName = trade['trader']?['displayName'] ?? 'Trader';
                            context.push('/chat/${widget.tradeId}', extra: {
                              'traderName': traderName,
                            });
                          },
                          icon: const Icon(Icons.chat_bubble_outline),
                          label: const Text('Chat with Trader'),
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }

  bool _canDispute(String? status) {
    return status == 'accepted' || status == 'paid' || status == 'delivered';
  }

  String _getStatusTitle(String? status) {
    switch (status) {
      case 'pending':
        return 'Waiting for Trader';
      case 'accepted':
        return 'Send Payment';
      case 'paid':
        return 'Payment Sent';
      case 'delivered':
        return 'Delivery Complete';
      case 'completed':
        return 'Trade Complete';
      case 'disputed':
        return 'Under Review';
      case 'cancelled':
        return 'Trade Cancelled';
      default:
        return 'Unknown';
    }
  }

  String _getStatusDescription(String? status) {
    switch (status) {
      case 'pending':
        return 'Waiting for the trader to accept your request';
      case 'accepted':
        return 'Send payment to the trader\'s bank account below';
      case 'paid':
        return 'Waiting for trader to deliver funds to your recipient';
      case 'delivered':
        return 'Confirm that your recipient received the money';
      case 'completed':
        return 'This trade has been completed successfully';
      case 'disputed':
        return 'This trade is under review by admin';
      case 'cancelled':
        return 'This trade was cancelled';
      default:
        return '';
    }
  }
}

class _TraderPaymentCard extends StatelessWidget {
  final Map<String, dynamic> trade;

  const _TraderPaymentCard({required this.trade});

  @override
  Widget build(BuildContext context) {
    final trader = trade['trader'] as Map<String, dynamic>?;

    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.account_balance, color: Colors.amber.shade700),
                const SizedBox(width: 8),
                Text(
                  'Payment Details',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.amber.shade900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Send ${trade['sendAmount']} ${trade['sendCurrency']} to:',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            _PaymentDetailRow(
              label: 'Trader',
              value: trader?['displayName'] ?? 'Unknown',
            ),
            _PaymentDetailRow(
              label: 'Bank',
              value: 'Emirates NBD', // TODO: Get from trader profile
            ),
            _PaymentDetailRow(
              label: 'Account',
              value: '1234 5678 9012 3456', // TODO: Get from trader profile
              canCopy: true,
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning, size: 16, color: Colors.red.shade700),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Only send from YOUR account. Third-party payments will be rejected.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.red.shade700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentDetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool canCopy;

  const _PaymentDetailRow({
    required this.label,
    required this.value,
    this.canCopy = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 80,
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
          if (canCopy)
            IconButton(
              icon: const Icon(Icons.copy, size: 18),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: value));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Copied to clipboard')),
                );
              },
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
        ],
      ),
    );
  }
}

class _StatusIcon extends StatelessWidget {
  final String? status;

  const _StatusIcon({this.status});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (status) {
      case 'completed':
        icon = Icons.check_circle;
        color = Colors.green;
        break;
      case 'disputed':
        icon = Icons.error;
        color = Colors.red;
        break;
      case 'pending':
        icon = Icons.hourglass_empty;
        color = Colors.orange;
        break;
      case 'cancelled':
        icon = Icons.cancel;
        color = Colors.grey;
        break;
      case 'delivered':
        icon = Icons.local_shipping;
        color = Colors.green;
        break;
      default:
        icon = Icons.sync;
        color = Colors.blue;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 40, color: color),
    );
  }
}
