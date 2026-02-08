import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isTrader = auth.user?['isTrader'] == true;
    final isArbitrator = auth.user?['isArbitrator'] == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Profile header
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor:
                          Theme.of(context).colorScheme.primaryContainer,
                      child: Text(
                        auth.user?['displayName']?[0] ?? '?',
                        style: TextStyle(
                          fontSize: 24,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                auth.user?['displayName'] ?? 'User',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              if (isTrader) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade100,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    'Trader',
                                    style: TextStyle(
                                      color: Colors.green.shade700,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                              if (isArbitrator) ...[
                                const SizedBox(width: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.purple.shade100,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    'Arbitrator',
                                    style: TextStyle(
                                      color: Colors.purple.shade700,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            auth.user?['phone'] ?? '',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit),
                      onPressed: () => context.push('/edit-profile'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Trader section
            if (isTrader) ...[
              _MenuItem(
                icon: Icons.dashboard,
                title: 'Trader Dashboard',
                subtitle: 'Manage incoming trade requests',
                onTap: () => context.push('/trader-dashboard'),
              ),
              _MenuItem(
                icon: Icons.account_balance_wallet,
                title: 'Bond & Earnings',
                subtitle: 'View your bond balance and earnings',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Coming soon')),
                  );
                },
              ),
            ] else
              _MenuItem(
                icon: Icons.storefront,
                title: 'Become a Trader',
                subtitle: 'Start earning by facilitating trades',
                onTap: () => context.push('/become-trader'),
              ),

            // Arbitrator section
            if (isArbitrator)
              _MenuItem(
                icon: Icons.gavel,
                title: 'Arbitrator Dashboard',
                subtitle: 'View disputes and your arbitrator stats',
                onTap: () {
                  // TODO: Navigate to arbitrator dashboard
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Arbitrator dashboard coming soon')),
                  );
                },
              )
            else
              _MenuItem(
                icon: Icons.gavel,
                title: 'Become an Arbitrator',
                subtitle: isTrader
                    ? 'Help resolve disputes and earn rewards'
                    : 'Become a trader first to unlock',
                onTap: () => context.push('/become-arbitrator'),
              ),

            _MenuItem(
              icon: Icons.notifications,
              title: 'Notifications',
              subtitle: 'View your notifications',
              onTap: () => context.push('/notifications'),
            ),
            _MenuItem(
              icon: Icons.settings,
              title: 'Settings',
              subtitle: 'Security, preferences, and more',
              onTap: () => context.push('/settings'),
            ),
            _MenuItem(
              icon: Icons.help,
              title: 'Help & Support',
              subtitle: 'FAQs and contact support',
              onTap: () => context.push('/about'),
            ),
            _MenuItem(
              icon: Icons.info,
              title: 'About',
              subtitle: 'App version and legal info',
              onTap: () => context.push('/about'),
            ),
            const SizedBox(height: 16),
            _MenuItem(
              icon: Icons.logout,
              title: 'Logout',
              subtitle: 'Sign out of your account',
              isDestructive: true,
              onTap: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Logout'),
                    content:
                        const Text('Are you sure you want to logout?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Cancel'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('Logout'),
                      ),
                    ],
                  ),
                );

                if (confirm == true && context.mounted) {
                  await context.read<AuthProvider>().logout();
                  if (context.mounted) {
                    context.go('/login');
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isDestructive;

  const _MenuItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? Colors.red : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(
          title,
          style: TextStyle(color: color, fontWeight: FontWeight.w500),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            color: isDestructive ? Colors.red.shade300 : Colors.grey.shade600,
            fontSize: 12,
          ),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: color ?? Colors.grey,
        ),
        onTap: onTap,
      ),
    );
  }
}
