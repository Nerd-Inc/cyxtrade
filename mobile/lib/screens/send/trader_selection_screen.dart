import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/trade_provider.dart';

class TraderSelectionScreen extends StatefulWidget {
  final double sendAmount;
  final String sendCurrency;
  final String receiveCurrency;
  final String recipientName;
  final String recipientPhone;
  final String recipientMethod;

  const TraderSelectionScreen({
    super.key,
    required this.sendAmount,
    required this.sendCurrency,
    required this.receiveCurrency,
    required this.recipientName,
    required this.recipientPhone,
    this.recipientMethod = 'Orange Money',
  });

  @override
  State<TraderSelectionScreen> createState() => _TraderSelectionScreenState();
}

class _TraderSelectionScreenState extends State<TraderSelectionScreen> {
  @override
  void initState() {
    super.initState();
    // Defer loading to after the build phase
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTraders();
    });
  }

  Future<void> _loadTraders() async {
    await context.read<TradeProvider>().getTraders(
          from: widget.sendCurrency,
          to: widget.receiveCurrency,
        );
  }

  @override
  Widget build(BuildContext context) {
    final trades = context.watch<TradeProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Trader'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          // Summary card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).primaryColor.withOpacity(0.1),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sending ${widget.sendAmount.toStringAsFixed(2)} ${widget.sendCurrency}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'To: ${widget.recipientName} (${widget.recipientPhone})',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          // Traders list
          Expanded(
            child: trades.isLoading
                ? const Center(child: CircularProgressIndicator())
                : trades.traders.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadTraders,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: trades.traders.length,
                          itemBuilder: (context, index) => _TraderCard(
                            trader: trades.traders[index],
                            onSelect: () => _selectTrader(trades.traders[index]),
                          ),
                        ),
                      ),
          ),
        ],
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
              Icons.person_search,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No traders available',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'No traders are currently online for the ${widget.sendCurrency} to ${widget.receiveCurrency} corridor.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            OutlinedButton(
              onPressed: _loadTraders,
              child: const Text('Refresh'),
            ),
          ],
        ),
      ),
    );
  }

  void _selectTrader(Map<String, dynamic> trader) {
    // Calculate receive amount based on trader's rate
    final corridors = trader['corridors'] as List<dynamic>? ?? [];
    double rate = 163; // Default rate

    for (var corridor in corridors) {
      if (corridor['from'] == widget.sendCurrency &&
          corridor['to'] == widget.receiveCurrency) {
        rate = (corridor['buyRate'] ?? 163).toDouble();
        break;
      }
    }

    final receiveAmount = widget.sendAmount * rate;

    context.push('/confirm', extra: {
      'trader': trader,
      'sendAmount': widget.sendAmount,
      'sendCurrency': widget.sendCurrency,
      'receiveAmount': receiveAmount,
      'receiveCurrency': widget.receiveCurrency,
      'rate': rate,
      'recipientName': widget.recipientName,
      'recipientPhone': widget.recipientPhone,
      'recipientMethod': widget.recipientMethod,
    });
  }
}

class _TraderCard extends StatelessWidget {
  final Map<String, dynamic> trader;
  final VoidCallback onSelect;

  const _TraderCard({
    required this.trader,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final name = trader['displayName'] ?? 'Unknown Trader';
    final rating = (trader['rating'] ?? 0).toDouble();
    final totalTrades = trader['totalTrades'] ?? 0;
    final bondAvailable = (trader['bondAvailable'] ?? 0).toDouble();
    final isOnline = trader['isOnline'] ?? false;

    // Get rate for this corridor
    final corridors = trader['corridors'] as List<dynamic>? ?? [];
    double? buyRate;
    for (var corridor in corridors) {
      if (corridor['from'] == 'AED' && corridor['to'] == 'XAF') {
        buyRate = (corridor['buyRate'] ?? 0).toDouble();
        break;
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onSelect,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                    child: Text(
                      name[0].toUpperCase(),
                      style: TextStyle(
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              name,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (isOnline)
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Colors.green,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.star, size: 16, color: Colors.amber.shade700),
                            const SizedBox(width: 4),
                            Text(
                              rating.toStringAsFixed(1),
                              style: const TextStyle(fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '($totalTrades trades)',
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right),
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
                        'Rate',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        buyRate != null
                            ? '1 AED = ${buyRate.toStringAsFixed(2)} XAF'
                            : 'Rate not set',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Max trade',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        '${bondAvailable.toStringAsFixed(0)} AED',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
