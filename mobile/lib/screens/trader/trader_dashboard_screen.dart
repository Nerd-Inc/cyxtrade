import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/trade_provider.dart';
import '../../services/api_service.dart';

class TraderDashboardScreen extends StatefulWidget {
  const TraderDashboardScreen({super.key});

  @override
  State<TraderDashboardScreen> createState() => _TraderDashboardScreenState();
}

class _TraderDashboardScreenState extends State<TraderDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isOnline = true;
  bool _isUpdatingStatus = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTrades();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTrades() async {
    await context.read<TradeProvider>().getMyTrades();
  }

  Future<void> _toggleOnlineStatus() async {
    setState(() => _isUpdatingStatus = true);
    try {
      // TODO: Call API to update status
      setState(() => _isOnline = !_isOnline);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isOnline ? 'You are now online' : 'You are now offline'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdatingStatus = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final trades = context.watch<TradeProvider>();

    // Filter trades by status
    final pendingTrades = trades.trades.where((t) => t['status'] == 'pending').toList();
    final activeTrades = trades.trades
        .where((t) => ['accepted', 'paid', 'delivered'].contains(t['status']))
        .toList();
    final completedTrades = trades.trades
        .where((t) => ['completed', 'cancelled', 'disputed'].contains(t['status']))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trader Dashboard'),
        actions: [
          // Online/Offline toggle
          if (_isUpdatingStatus)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            Switch(
              value: _isOnline,
              onChanged: (_) => _toggleOnlineStatus(),
              activeColor: Colors.green,
            ),
          const SizedBox(width: 8),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Pending'),
                  if (pendingTrades.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${pendingTrades.length}',
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Tab(text: 'Active (${activeTrades.length})'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: trades.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _TradeList(
                  trades: pendingTrades,
                  emptyMessage: 'No pending trade requests',
                  emptyIcon: Icons.inbox,
                  onRefresh: _loadTrades,
                  showAcceptDecline: true,
                ),
                _TradeList(
                  trades: activeTrades,
                  emptyMessage: 'No active trades',
                  emptyIcon: Icons.hourglass_empty,
                  onRefresh: _loadTrades,
                  showDeliverAction: true,
                ),
                _TradeList(
                  trades: completedTrades,
                  emptyMessage: 'No completed trades yet',
                  emptyIcon: Icons.history,
                  onRefresh: _loadTrades,
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // TODO: Navigate to trader settings/rates
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Trader settings coming soon')),
          );
        },
        icon: const Icon(Icons.settings),
        label: const Text('Settings'),
      ),
    );
  }
}

class _TradeList extends StatelessWidget {
  final List<Map<String, dynamic>> trades;
  final String emptyMessage;
  final IconData emptyIcon;
  final Future<void> Function() onRefresh;
  final bool showAcceptDecline;
  final bool showDeliverAction;

  const _TradeList({
    required this.trades,
    required this.emptyMessage,
    required this.emptyIcon,
    required this.onRefresh,
    this.showAcceptDecline = false,
    this.showDeliverAction = false,
  });

  @override
  Widget build(BuildContext context) {
    if (trades.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(emptyIcon, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              emptyMessage,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: trades.length,
        itemBuilder: (context, index) {
          final trade = trades[index];
          return _TraderTradeCard(
            trade: trade,
            showAcceptDecline: showAcceptDecline,
            showDeliverAction: showDeliverAction && trade['status'] == 'paid',
          );
        },
      ),
    );
  }
}

class _TraderTradeCard extends StatelessWidget {
  final Map<String, dynamic> trade;
  final bool showAcceptDecline;
  final bool showDeliverAction;

  const _TraderTradeCard({
    required this.trade,
    this.showAcceptDecline = false,
    this.showDeliverAction = false,
  });

  @override
  Widget build(BuildContext context) {
    final recipientName = trade['recipientName'] ?? 'Unknown';
    final sendAmount = trade['sendAmount'] ?? 0;
    final sendCurrency = trade['sendCurrency'] ?? 'AED';
    final receiveAmount = trade['receiveAmount'] ?? 0;
    final receiveCurrency = trade['receiveCurrency'] ?? 'XAF';
    final status = trade['status'] ?? 'unknown';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => context.push('/trade/${trade['id']}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: Colors.blue.shade100,
                    child: Text(
                      recipientName[0].toUpperCase(),
                      style: TextStyle(
                        color: Colors.blue.shade700,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'To: $recipientName',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          trade['recipientPhone'] ?? '',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: status),
                ],
              ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Receives',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                      Text(
                        '$sendAmount $sendCurrency',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const Icon(Icons.arrow_forward, color: Colors.grey),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Delivers',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                      Text(
                        '$receiveAmount $receiveCurrency',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (showAcceptDecline) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _declineTrade(context),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                        ),
                        child: const Text('Decline'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _acceptTrade(context),
                        child: const Text('Accept'),
                      ),
                    ),
                  ],
                ),
              ],
              if (showDeliverAction) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _markDelivered(context),
                    icon: const Icon(Icons.check),
                    label: const Text('Mark as Delivered'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _acceptTrade(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Accept Trade'),
        content: const Text(
          'Are you sure you want to accept this trade? Your bond will be locked until the trade is complete.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Accept'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ApiService().acceptTrade(trade['id']);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trade accepted!')),
        );
        context.read<TradeProvider>().getMyTrades();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _declineTrade(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Decline Trade'),
        content: const Text('Are you sure you want to decline this trade request?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Decline'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ApiService().declineTrade(trade['id']);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trade declined')),
        );
        context.read<TradeProvider>().getMyTrades();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _markDelivered(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mark as Delivered'),
        content: const Text(
          'Have you delivered the funds to the recipient? This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not Yet'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Yes, Delivered'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ApiService().markTradeDelivered(trade['id']);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Marked as delivered!')),
        );
        context.read<TradeProvider>().getMyTrades();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (status) {
      case 'pending':
        color = Colors.orange;
        label = 'Pending';
        break;
      case 'accepted':
        color = Colors.blue;
        label = 'Awaiting Payment';
        break;
      case 'paid':
        color = Colors.purple;
        label = 'Payment Received';
        break;
      case 'delivered':
        color = Colors.teal;
        label = 'Delivered';
        break;
      case 'completed':
        color = Colors.green;
        label = 'Completed';
        break;
      case 'disputed':
        color = Colors.red;
        label = 'Disputed';
        break;
      case 'cancelled':
        color = Colors.grey;
        label = 'Cancelled';
        break;
      default:
        color = Colors.grey;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
