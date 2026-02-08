import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/splash_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/otp_screen.dart';
import '../screens/auth/complete_profile_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/send/send_screen.dart';
import '../screens/send/trader_selection_screen.dart';
import '../screens/send/confirm_screen.dart';
import '../screens/trade/trade_detail_screen.dart';
import '../screens/history/history_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/trader/trader_dashboard_screen.dart';
import '../screens/trader/become_trader_screen.dart';
import '../screens/arbitrator/become_arbitrator_screen.dart';
import '../screens/trader/payment_methods_screen.dart';
import '../screens/trader/payment_method_form_screen.dart';
import '../screens/trade/trade_success_screen.dart';
import '../screens/trade/payment_instructions_screen.dart';
import '../screens/trade/rate_trade_screen.dart';
import '../screens/trade/dispute_screen.dart';
import '../screens/trade/receipt_screen.dart';
import '../screens/chat/chat_screen.dart';
import '../screens/profile/edit_profile_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../screens/notifications/notifications_screen.dart';
import '../screens/about/about_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    // Splash
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),

    // Auth
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/otp',
      builder: (context, state) {
        final phone = state.extra as String? ?? '';
        return OtpScreen(phone: phone);
      },
    ),
    GoRoute(
      path: '/complete-profile',
      builder: (context, state) => const CompleteProfileScreen(),
    ),

    // Main app with bottom nav
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(
          path: '/home',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/history',
          builder: (context, state) => const HistoryScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfileScreen(),
        ),
      ],
    ),

    // Send money flow
    GoRoute(
      path: '/send',
      builder: (context, state) => const SendScreen(),
    ),
    GoRoute(
      path: '/traders',
      builder: (context, state) {
        final data = state.extra as Map<String, dynamic>? ?? {};
        return TraderSelectionScreen(
          sendAmount: (data['sendAmount'] ?? 0).toDouble(),
          sendCurrency: data['sendCurrency'] ?? 'AED',
          receiveCurrency: data['receiveCurrency'] ?? 'XAF',
          recipientName: data['recipientName'] ?? '',
          recipientPhone: data['recipientPhone'] ?? '',
          recipientMethod: data['recipientMethod'] ?? 'Orange Money',
        );
      },
    ),
    GoRoute(
      path: '/confirm',
      builder: (context, state) {
        final data = state.extra as Map<String, dynamic>? ?? {};
        return ConfirmScreen(
          trader: data['trader'] ?? {},
          sendAmount: (data['sendAmount'] ?? 0).toDouble(),
          sendCurrency: data['sendCurrency'] ?? 'AED',
          receiveAmount: (data['receiveAmount'] ?? 0).toDouble(),
          receiveCurrency: data['receiveCurrency'] ?? 'XAF',
          rate: (data['rate'] ?? 163).toDouble(),
          recipientName: data['recipientName'] ?? '',
          recipientPhone: data['recipientPhone'] ?? '',
          recipientMethod: data['recipientMethod'] ?? 'Orange Money',
        );
      },
    ),

    // Trade detail
    GoRoute(
      path: '/trade/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return TradeDetailScreen(tradeId: id);
      },
    ),

    // Trader dashboard
    GoRoute(
      path: '/trader-dashboard',
      builder: (context, state) => const TraderDashboardScreen(),
    ),

    // Become a trader
    GoRoute(
      path: '/become-trader',
      builder: (context, state) => const BecomeTraderScreen(),
    ),

    // Become an arbitrator
    GoRoute(
      path: '/become-arbitrator',
      builder: (context, state) => const BecomeArbitratorScreen(),
    ),

    // Payment methods management
    GoRoute(
      path: '/trader/payment-methods',
      builder: (context, state) => const PaymentMethodsScreen(),
    ),
    GoRoute(
      path: '/trader/payment-methods/add',
      builder: (context, state) => const PaymentMethodFormScreen(),
    ),
    GoRoute(
      path: '/trader/payment-methods/:id/edit',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return PaymentMethodFormScreen(methodId: id);
      },
    ),

    // Payment instructions
    GoRoute(
      path: '/payment/:tradeId',
      builder: (context, state) {
        final tradeId = state.pathParameters['tradeId']!;
        final data = state.extra as Map<String, dynamic>? ?? {};
        return PaymentInstructionsScreen(
          tradeId: tradeId,
          amount: (data['amount'] ?? 0).toDouble(),
          currency: data['currency'] ?? 'AED',
          traderName: data['traderName'] ?? 'Trader',
          paymentDetails: data['paymentDetails'] ?? {},
        );
      },
    ),

    // Rate trade
    GoRoute(
      path: '/rate-trade/:tradeId',
      builder: (context, state) {
        final tradeId = state.pathParameters['tradeId']!;
        final data = state.extra as Map<String, dynamic>? ?? {};
        return RateTradeScreen(
          tradeId: tradeId,
          traderName: data['traderName'] ?? 'Trader',
          amount: (data['amount'] ?? 0).toDouble(),
          currency: data['currency'] ?? 'AED',
        );
      },
    ),

    // Trade success
    GoRoute(
      path: '/trade-success',
      builder: (context, state) {
        final data = state.extra as Map<String, dynamic>? ?? {};
        return TradeSuccessScreen(
          tradeId: data['tradeId'] ?? '',
          sendAmount: (data['sendAmount'] ?? 0).toDouble(),
          sendCurrency: data['sendCurrency'] ?? 'AED',
          receiveAmount: (data['receiveAmount'] ?? 0).toDouble(),
          receiveCurrency: data['receiveCurrency'] ?? 'XAF',
          recipientName: data['recipientName'] ?? '',
        );
      },
    ),

    // Chat
    GoRoute(
      path: '/chat/:tradeId',
      builder: (context, state) {
        final tradeId = state.pathParameters['tradeId']!;
        final data = state.extra as Map<String, dynamic>? ?? {};
        return ChatScreen(
          tradeId: tradeId,
          traderName: data['traderName'] ?? 'Trader',
        );
      },
    ),

    // Edit profile
    GoRoute(
      path: '/edit-profile',
      builder: (context, state) => const EditProfileScreen(),
    ),

    // Notifications
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),

    // Settings
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),

    // About
    GoRoute(
      path: '/about',
      builder: (context, state) => const AboutScreen(),
    ),

    // Dispute
    GoRoute(
      path: '/dispute/:tradeId',
      builder: (context, state) {
        final tradeId = state.pathParameters['tradeId']!;
        final data = state.extra as Map<String, dynamic>? ?? {};
        return DisputeScreen(
          tradeId: tradeId,
          traderName: data['traderName'] ?? 'Trader',
          amount: (data['amount'] ?? 0).toDouble(),
          currency: data['currency'] ?? 'AED',
        );
      },
    ),

    // Receipt
    GoRoute(
      path: '/receipt/:tradeId',
      builder: (context, state) {
        final tradeId = state.pathParameters['tradeId']!;
        final data = state.extra as Map<String, dynamic>? ?? {};
        return ReceiptScreen(
          tradeId: tradeId,
          sendAmount: (data['sendAmount'] ?? 0).toDouble(),
          sendCurrency: data['sendCurrency'] ?? 'AED',
          receiveAmount: (data['receiveAmount'] ?? 0).toDouble(),
          receiveCurrency: data['receiveCurrency'] ?? 'XAF',
          recipientName: data['recipientName'] ?? 'Recipient',
          recipientPhone: data['recipientPhone'] ?? '',
          traderName: data['traderName'] ?? 'Trader',
          status: data['status'] ?? 'completed',
          createdAt: data['createdAt'] ?? DateTime.now(),
          completedAt: data['completedAt'],
        );
      },
    ),
  ],
);

// Main shell with bottom navigation
class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _calculateSelectedIndex(context),
        onDestinationSelected: (index) => _onItemTapped(index, context),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: 'History',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  int _calculateSelectedIndex(BuildContext context) {
    final String location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/home')) return 0;
    if (location.startsWith('/history')) return 1;
    if (location.startsWith('/profile')) return 2;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/home');
        break;
      case 1:
        context.go('/history');
        break;
      case 2:
        context.go('/profile');
        break;
    }
  }
}
