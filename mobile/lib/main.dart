import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'config/router.dart';
import 'providers/auth_provider.dart';
import 'providers/trade_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CyxTradeApp());
}

class CyxTradeApp extends StatelessWidget {
  const CyxTradeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => TradeProvider()),
      ],
      child: MaterialApp.router(
        title: 'CyxTrade',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        routerConfig: appRouter,
      ),
    );
  }
}
