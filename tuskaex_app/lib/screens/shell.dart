import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_state.dart';
import '../state/market_state.dart';
import '../state/trading_state.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';
import 'home_screen.dart';
import 'markets_screen.dart';
import 'more_screen.dart';
import 'positions_screen.dart';
import 'trade_screen.dart';

/// Signed-in root. Owns the trading session lifecycle and the bottom nav.
class Shell extends StatefulWidget {
  const Shell({super.key});
  // Global so pushed routes and bottom sheets (which are not descendants of
  // the Shell) can switch tabs.
  static final globalKey = GlobalKey<ShellState>();
  static ShellState? of(BuildContext _) => globalKey.currentState;
  @override
  State<Shell> createState() => ShellState();
}

class ShellState extends State<Shell> with WidgetsBindingObserver {
  int index = 0;
  StreamSubscription? _events;
  late final TradingState _trading;
  late final MarketState _market;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _trading = context.read<TradingState>();
    _market = context.read<MarketState>();
    // start() notifies listeners immediately; doing that while this widget is
    // still being built leaves the provider's element dirty-but-unscheduled,
    // after which every later notify is silently dropped. Start after the frame.
    WidgetsBinding.instance.addPostFrameCallback((_) => _trading.start());
    _events = _trading.events.listen((e) {
      if (mounted) toast(context, e.message, error: e.isError);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _trading.pause();
      _market.pause();
    } else if (state == AppLifecycleState.resumed) {
      context.read<AuthState>().checkPlatformStatus();
      _market.resume();
      _trading.resume();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _events?.cancel();
    // Signed out: the next session must not see this one's accounts. Deferred
    // so listeners aren't notified mid-unmount.
    Future.microtask(_trading.reset);
    super.dispose();
  }

  /// Jump to the Trade tab on a given symbol (from Markets, Home, etc.).
  void openTrade(String symbol) {
    TradeScreen.selected.value = symbol;
    go(2);
  }

  void go(int i) => setState(() => index = i);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: index, children: const [
        HomeScreen(),
        MarketsScreen(),
        TradeScreen(),
        PositionsScreen(),
        MoreScreen(),
      ]),
      bottomNavigationBar: GlassNavBar(
        index: index,
        onTap: go,
        items: const [
          (Icons.home_outlined, Icons.home_rounded, 'Home', [Color(0xFF93C5FD), Color(0xFF1D4ED8)]),
          (Icons.insights_outlined, Icons.insights_rounded, 'Markets', [Color(0xFF67E8F9), Color(0xFF0E7490)]),
          (Icons.candlestick_chart_outlined, Icons.candlestick_chart_rounded, 'Trade', [Color(0xFFFDE68A), Color(0xFFD97706)]),
          (Icons.layers_outlined, Icons.layers_rounded, 'Positions', [Color(0xFF86EFAC), Color(0xFF15803D)]),
          (Icons.apps_outlined, Icons.apps_rounded, 'More', [Color(0xFFC4B5FD), Color(0xFF6D28D9)]),
        ],
      ),
    );
  }
}
