import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/error_utils.dart';

class BecomeArbitratorScreen extends StatefulWidget {
  const BecomeArbitratorScreen({super.key});

  @override
  State<BecomeArbitratorScreen> createState() => _BecomeArbitratorScreenState();
}

class _BecomeArbitratorScreenState extends State<BecomeArbitratorScreen> {
  bool _isLoading = true;
  bool _isSubmitting = false;
  Map<String, dynamic> _eligibility = {};

  // Requirements
  static const int requiredTrades = 50;
  static const int requiredReputation = 200;
  static const int requiredAccountAgeDays = 180;
  static const double maxDisputeRate = 2.0;
  static const double minStake = 500.0;

  @override
  void initState() {
    super.initState();
    _loadEligibility();
  }

  Future<void> _loadEligibility() async {
    setState(() => _isLoading = true);
    try {
      // TODO: Fetch from API/blockchain
      // For now, use mock data based on user state
      final auth = context.read<AuthProvider>();
      final user = auth.user ?? {};

      await Future.delayed(const Duration(milliseconds: 500));

      setState(() {
        _eligibility = {
          'completedTrades': user['completedTrades'] ?? 12,
          'reputation': user['reputation'] ?? 85,
          'accountAgeDays': user['accountAgeDays'] ?? 45,
          'disputeRate': user['disputeRate'] ?? 0.0,
          'isTrader': user['isTrader'] ?? false,
          'isArbitrator': user['isArbitrator'] ?? false,
        };
      });
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _loadEligibility);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  bool get isEligible {
    return (_eligibility['completedTrades'] ?? 0) >= requiredTrades &&
        (_eligibility['reputation'] ?? 0) >= requiredReputation &&
        (_eligibility['accountAgeDays'] ?? 0) >= requiredAccountAgeDays &&
        (_eligibility['disputeRate'] ?? 100) <= maxDisputeRate &&
        (_eligibility['isTrader'] ?? false) == true;
  }

  bool get isAlreadyArbitrator => _eligibility['isArbitrator'] == true;

  Future<void> _registerAsArbitrator() async {
    setState(() => _isSubmitting = true);
    try {
      // TODO: Call blockchain to register
      await Future.delayed(const Duration(seconds: 2));

      if (mounted) {
        context.read<AuthProvider>().updateUser({
          'isArbitrator': true,
        });

        showSuccessSnackBar(context, 'You are now an arbitrator!');
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _registerAsArbitrator);
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Become an Arbitrator'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header
                  _buildHeader(),
                  const SizedBox(height: 24),

                  // Already an arbitrator
                  if (isAlreadyArbitrator) ...[
                    _buildAlreadyArbitratorCard(),
                  ] else ...[
                    // Eligibility Progress
                    _buildEligibilitySection(),
                    const SizedBox(height: 24),

                    // How it works
                    _buildHowItWorksSection(),
                    const SizedBox(height: 24),

                    // Earnings info
                    _buildEarningsSection(),
                    const SizedBox(height: 24),

                    // Register button
                    if (isEligible) _buildRegisterButton(),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.purple.shade400, Colors.purple.shade700],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          const Icon(Icons.gavel, color: Colors.white, size: 48),
          const SizedBox(height: 12),
          const Text(
            'Arbitrators',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Help resolve disputes and earn rewards',
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildAlreadyArbitratorCard() {
    return Card(
      color: Colors.green.shade50,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(Icons.verified, color: Colors.green.shade700, size: 48),
            const SizedBox(height: 12),
            Text(
              'You are an Arbitrator',
              style: TextStyle(
                color: Colors.green.shade700,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'You will be notified when selected for disputes.',
              style: TextStyle(color: Colors.green.shade600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {
                // TODO: Navigate to arbitrator dashboard
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Arbitrator dashboard coming soon')),
                );
              },
              icon: const Icon(Icons.dashboard),
              label: const Text('View Dashboard'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEligibilitySection() {
    final trades = _eligibility['completedTrades'] ?? 0;
    final reputation = _eligibility['reputation'] ?? 0;
    final accountAge = _eligibility['accountAgeDays'] ?? 0;
    final disputeRate = _eligibility['disputeRate'] ?? 0.0;
    final isTrader = _eligibility['isTrader'] ?? false;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isEligible ? Icons.check_circle : Icons.pending,
                  color: isEligible ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 8),
                Text(
                  isEligible ? 'You are eligible!' : 'Eligibility Progress',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Trader requirement
            _buildRequirementItem(
              icon: Icons.storefront,
              title: 'Be a Trader',
              current: isTrader ? 'Yes' : 'No',
              required: 'Required',
              isMet: isTrader,
            ),
            const Divider(height: 24),

            // Trades requirement
            _buildRequirementItem(
              icon: Icons.swap_horiz,
              title: 'Completed Trades',
              current: '$trades',
              required: '$requiredTrades',
              progress: trades / requiredTrades,
              isMet: trades >= requiredTrades,
            ),
            const Divider(height: 24),

            // Reputation requirement
            _buildRequirementItem(
              icon: Icons.star,
              title: 'Reputation Score',
              current: '$reputation',
              required: '$requiredReputation',
              progress: reputation / requiredReputation,
              isMet: reputation >= requiredReputation,
            ),
            const Divider(height: 24),

            // Account age requirement
            _buildRequirementItem(
              icon: Icons.calendar_today,
              title: 'Account Age',
              current: '$accountAge days',
              required: '$requiredAccountAgeDays days',
              progress: accountAge / requiredAccountAgeDays,
              isMet: accountAge >= requiredAccountAgeDays,
            ),
            const Divider(height: 24),

            // Dispute rate requirement
            _buildRequirementItem(
              icon: Icons.gavel,
              title: 'Dispute Rate',
              current: '${disputeRate.toStringAsFixed(1)}%',
              required: '<${maxDisputeRate.toStringAsFixed(0)}%',
              isMet: disputeRate <= maxDisputeRate,
            ),
            const Divider(height: 24),

            // Stake requirement
            _buildRequirementItem(
              icon: Icons.account_balance_wallet,
              title: 'Stake Required',
              current: isEligible ? 'Ready to stake' : 'After eligible',
              required: '\$${minStake.toStringAsFixed(0)} USDT',
              isMet: isEligible,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRequirementItem({
    required IconData icon,
    required String title,
    required String current,
    required String required,
    double? progress,
    required bool isMet,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isMet ? Colors.green.shade50 : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            color: isMet ? Colors.green : Colors.grey,
            size: 20,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 4),
              if (progress != null) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress.clamp(0.0, 1.0),
                    backgroundColor: Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation(
                      isMet ? Colors.green : Colors.blue,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
              ],
              Text(
                '$current / $required',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        Icon(
          isMet ? Icons.check_circle : Icons.radio_button_unchecked,
          color: isMet ? Colors.green : Colors.grey.shade400,
        ),
      ],
    );
  }

  Widget _buildHowItWorksSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'How It Works',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildStep(
              number: '1',
              title: 'Get Selected',
              description: 'When a dispute opens, 5 arbitrators are randomly selected',
            ),
            _buildStep(
              number: '2',
              title: 'Review Evidence',
              description: 'You have 48 hours to review screenshots and chat logs',
            ),
            _buildStep(
              number: '3',
              title: 'Cast Your Vote',
              description: 'Vote on who is right: the user or the trader',
            ),
            _buildStep(
              number: '4',
              title: 'Get Rewarded',
              description: 'Earn fees if you vote with the majority',
              isLast: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep({
    required String number,
    required String title,
    required String description,
    bool isLast = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Colors.purple.shade100,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  number,
                  style: TextStyle(
                    color: Colors.purple.shade700,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                color: Colors.purple.shade100,
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEarningsSection() {
    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.monetization_on, color: Colors.amber.shade700),
                const SizedBox(width: 8),
                Text(
                  'Earnings',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.amber.shade900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildEarningItem(
              label: 'Fee per dispute',
              value: '0.1% of trade value',
            ),
            _buildEarningItem(
              label: 'Split among',
              value: 'Majority voters only',
            ),
            _buildEarningItem(
              label: 'Reputation bonus',
              value: '+1 per correct vote',
            ),
            const SizedBox(height: 12),
            Text(
              'Higher reputation = more selection = more earnings',
              style: TextStyle(
                color: Colors.amber.shade800,
                fontSize: 12,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEarningItem({required String label, required String value}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: Colors.amber.shade900),
          ),
          Text(
            value,
            style: TextStyle(
              color: Colors.amber.shade900,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRegisterButton() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue.shade200),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Registration requires staking 500 USDT. Your stake is returned when you stop being an arbitrator.',
                  style: TextStyle(
                    color: Colors.blue.shade700,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _isSubmitting ? null : _registerAsArbitrator,
            icon: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.gavel),
            label: Text(_isSubmitting ? 'Registering...' : 'Become an Arbitrator'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ),
      ],
    );
  }
}
