import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'core/config.dart';
import 'core/theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/shell.dart';
import 'state/auth_state.dart';
import 'state/brand_state.dart';
import 'state/market_state.dart';
import 'state/trading_state.dart';
import 'widgets/common.dart';
import 'widgets/fx.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await BrandState.I.load();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AppColors.surface,
  ));
  runApp(const TuskaExApp());
}

class TuskaExApp extends StatelessWidget {
  const TuskaExApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: BrandState.I),
        ChangeNotifierProvider(create: (_) => AuthState()..bootstrap()),
        ChangeNotifierProvider(create: (_) => MarketState()..init()),
        ChangeNotifierProxyProvider<MarketState, TradingState>(
          create: (c) => TradingState(c.read<MarketState>()),
          update: (_, _, t) => t!,
        ),
      ],
      // A broker's colour lives in AppColors, read at build time, so the tree
      // under the app is rebuilt from scratch when it changes. That only
      // happens on choosing a broker or signing in, never mid-trade.
      child: Selector<BrandState, int>(
        selector: (_, b) => b.color.toARGB32(),
        builder: (_, color, _) => MaterialApp(
          key: ValueKey(color),
          title: AppConfig.brandName,
          debugShowCheckedModeBanner: false,
          theme: buildTheme(),
          home: const _Root(),
        ),
      ),
    );
  }
}

class _StatusScreen extends StatelessWidget {
  final IconData icon;
  final String title, body;
  final VoidCallback onRetry;
  const _StatusScreen({required this.icon, required this.title, required this.body, required this.onRetry});
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const AppLogo(height: 48),
                const SizedBox(height: 40),
                Icon(icon, size: 56, color: AppColors.brandLight),
                const SizedBox(height: 16),
                Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(body, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textDim)),
                const SizedBox(height: 24),
                OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Try again')),
              ]),
            ),
          ),
        ),
      );
}

class _Root extends StatelessWidget {
  const _Root();
  @override
  Widget build(BuildContext context) {
    final status = context.select<AuthState, AuthStatus>((a) => a.status);
    final maintenance = context.select<AuthState, bool>((a) => a.maintenance);
    final brand = context.select<BrandState, String>((b) => b.name);
    if (maintenance) {
      return _StatusScreen(
        icon: Icons.construction_rounded,
        title: 'Scheduled maintenance',
        body: '$brand is being upgraded. Trading will be back shortly â€” your positions and funds are safe.',
        onRetry: () => context.read<AuthState>().checkPlatformStatus(),
      );
    }
    switch (status) {
      case AuthStatus.offline:
        return _StatusScreen(
          icon: Icons.wifi_off_rounded,
          title: "Can't reach $brand",
          body: 'Check your internet connection and try again. You are still signed in.',
          onRetry: () => context.read<AuthState>().bootstrap(),
        );
      case AuthStatus.unknown:
        return Scaffold(
          body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            const FloatingLogo3D(height: 120),
            Text(brand, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
            const SizedBox(height: 6),
            const Text('trade Â· grow Â· beyond', style: TextStyle(color: AppColors.textDim, letterSpacing: 3, fontSize: 12.5)),
            const SizedBox(height: 36),
            const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
          ])),
        );
      case AuthStatus.loggedOut:
        return const LoginScreen();
      case AuthStatus.loggedIn:
        return Shell(key: Shell.globalKey);
    }
  }
}

