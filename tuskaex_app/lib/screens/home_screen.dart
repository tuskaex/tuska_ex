import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../state/auth_state.dart';
import '../state/brand_state.dart';
import '../state/market_state.dart';
import '../state/trading_state.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';
import 'accounts_screen.dart';
import 'kyc_screen.dart';
import 'notifications_screen.dart';
import 'shell.dart';
import 'wallet_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const movers = [
    'XAUUSD',
    'BTCUSD',
    'EURUSD',
    'NAS100',
    'ETHUSD',
    'GBPUSD',
    'XAGUSD',
    'USDJPY',
    'US30',
    'SOLUSD',
    'USOIL',
    'GER40',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final m = context.read<MarketState>();
      m.loadDayOpens(movers);
      m.loadSparks(movers);
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final t = context.watch<TradingState>();
    final a = t.active;
    final name = user?.firstName.isNotEmpty == true ? user!.firstName : 'Trader';
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        toolbarHeight: 64,
        title: Row(
          children: [
            const BrandLogo(height: 34),
            const SizedBox(width: 10),
            Text('Hello, $name', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          ],
        ),
        actions: const [_NotificationBell(), SizedBox(width: 8)],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await t.refreshAll();
          if (context.mounted) await context.read<AuthState>().refreshUser();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 28),
          children: [
            if (t.loadingAccounts && a == null)
              const SizedBox(height: 220, child: Loading())
            else if (a == null)
              const _NoAccount()
            else
              const _BalanceDeck(),
            const SizedBox(height: 26),
            const _QuickActions(),
            const SizedBox(height: 28),
            SectionTitle(
              'Markets',
              trailing: TextButton(onPressed: () => Shell.of(context)?.go(1), child: const Text('See all')),
            ),
            const SizedBox(height: 10),
            const _MarketBoard(movers),
            const SizedBox(height: 22),
            if (a != null) const _OpenPositionsCard(),
            if (user != null && !user.kycApproved && !user.isDemo) ...[const SizedBox(height: 14), _KycBanner(status: user.kycStatus)],
          ],
        ),
      ),
    );
  }
}

/// Notifications aren't pushed over any socket, so the unread count is polled.
class _NotificationBell extends StatefulWidget {
  const _NotificationBell();
  @override
  State<_NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<_NotificationBell> {
  int _unread = 0;
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _poll();
    _t = Timer.periodic(const Duration(seconds: 30), (_) => _poll());
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  Future<void> _poll() async {
    try {
      final j = await Api.I.get('/notifications/unread-count');
      final n = j is Map ? toI(j['unread_count']) : 0;
      if (mounted && n != _unread) setState(() => _unread = n);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () async {
      await Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
      _poll();
    },
    child: GlassCard(
      radius: 16,
      padding: const EdgeInsets.all(10),
      child: Badge(
        isLabelVisible: _unread > 0,
        label: Text(_unread > 99 ? '99+' : '$_unread'),
        backgroundColor: AppColors.loss,
        child: const Icon(Icons.notifications_none_rounded, size: 22),
      ),
    ),
  );
}

/// The hero: a tilting holographic account card resting on a stack of
/// receding "cards" behind it, for depth.
class _BalanceDeck extends StatelessWidget {
  const _BalanceDeck();
  @override
  Widget build(BuildContext context) {
    final t = context.watch<TradingState>();
    final a = t.active!;
    return SizedBox(
      height: 238,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Back cards of the deck.
          for (final (i, c) in [(2, const Color(0xFF312E81)), (1, const Color(0xFF1E3A8A))])
            Positioned(
              left: 14.0 * i,
              right: 14.0 * i,
              top: 22.0 * i + 6,
              bottom: -8.0 * i,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  color: c.withValues(alpha: 0.55),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                ),
              ),
            ),
          Positioned.fill(
            bottom: 18,
            child: Tilt3D(
              radius: 28,
              idle: false,
              maxTilt: 0.05,
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF2563EB), Color(0xFF4F46E5), Color(0xFF7C3AED)],
                  ),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF4F46E5).withValues(alpha: 0.55), blurRadius: 40, offset: const Offset(0, 20)),
                  ],
                ),
                child: Stack(
                  children: [
                    // holographic rings
                    Positioned(
                      right: -40,
                      top: -50,
                      child: Container(
                        width: 190,
                        height: 190,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 26),
                        ),
                      ),
                    ),
                    Positioned(
                      right: 40,
                      bottom: -70,
                      child: Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.06)),
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Spacer(),
                        const Text('Total equity', style: TextStyle(color: Colors.white70, fontSize: 13)),
                        AnimatedNumber(
                          value: t.equity,
                          format: (v) => fmtMoney(v, currency: a.currency),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -1,
                            fontFeatures: [FontFeature.tabularFigures()],
                            shadows: [Shadow(color: Color(0x66000000), blurRadius: 12, offset: Offset(0, 4))],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            _kv('Balance', fmtMoney(t.balance)),
                            _kv(
                              'Floating P/L',
                              fmtMoney(t.floating, sign: true),
                              color: t.floating < 0 ? const Color(0xFFFCA5A5) : const Color(0xFF86EFAC),
                            ),
                            _kv('Free margin', fmtMoney(t.freeMargin)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text('${a.groupName} · Leverage 1:${a.leverage}', style: const TextStyle(color: Colors.white54, fontSize: 11)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _kv(String k, String v, {Color color = Colors.white}) => Expanded(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(k, style: const TextStyle(color: Colors.white60, fontSize: 11)),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            v,
            style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.w800),
          ),
        ),
      ],
    ),
  );
}

class _NoAccount extends StatelessWidget {
  const _NoAccount();
  @override
  Widget build(BuildContext context) => GlassCard(
    glow: AppColors.brand,
    padding: const EdgeInsets.all(20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Orb(size: 52, child: Icon(Icons.rocket_launch_rounded)),
        const SizedBox(height: 14),
        const Text('Open your first trading account', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        const Text('Start with a free demo funded with virtual money, or open a live account.', style: TextStyle(color: AppColors.textDim)),
        const SizedBox(height: 16),
        Button3D(
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OpenAccountScreen())),
          child: const Text('Open account'),
        ),
      ],
    ),
  );
}

class _QuickActions extends StatelessWidget {
  const _QuickActions();
  @override
  Widget build(BuildContext context) {
    void go(Widget w) => Navigator.push(context, MaterialPageRoute(builder: (_) => w));
    final brand = context.watch<BrandState>();
    final items = [
      if (brand.allows('deposits'))
        (Icons.add_rounded, 'Deposit', const [Color(0xFF4ADE80), Color(0xFF15803D)], () => go(const WalletScreen(initialTab: 0))),
      if (brand.allows('withdrawals'))
        (Icons.north_east_rounded, 'Withdraw', const [Color(0xFFFCA5A5), Color(0xFFB91C1C)], () => go(const WalletScreen(initialTab: 1))),
      if (brand.allows('transfers'))
        (Icons.swap_horiz_rounded, 'Transfer', const [Color(0xFF67E8F9), Color(0xFF0E7490)], () => go(const WalletScreen(initialTab: 2))),
      (Icons.account_balance_wallet_rounded, 'Accounts', const [Color(0xFFC4B5FD), Color(0xFF6D28D9)], () => go(const AccountsScreen())),
    ];
    return Row(
      children: [
        for (final it in items)
          Expanded(
            child: GestureDetector(
              onTap: it.$4,
              child: Column(
                children: [
                  Orb(colors: it.$3, size: 58, child: Icon(it.$1)),
                  const SizedBox(height: 10),
                  Text(it.$2, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Home market board: Popular / Gainers / Losers tabs over a single glass
/// panel of rows (badge · name · live sparkline · price + change pill), the
/// layout pro trading apps use instead of a grid of tiles.
class _MarketBoard extends StatefulWidget {
  final List<String> symbols;
  const _MarketBoard(this.symbols);
  @override
  State<_MarketBoard> createState() => _MarketBoardState();
}

class _MarketBoardState extends State<_MarketBoard> {
  int _tab = 0; // 0 popular, 1 gainers, 2 losers

  @override
  Widget build(BuildContext context) {
    final m = context.watch<MarketState>();
    var list = widget.symbols.where(m.instruments.containsKey).toList();
    if (_tab != 0) {
      final withPct = list.where((s) => m.changePct(s) != null).toList()..sort((a, b) => m.changePct(b)!.compareTo(m.changePct(a)!));
      list = (_tab == 1 ? withPct.where((s) => m.changePct(s)! >= 0) : withPct.reversed.where((s) => m.changePct(s)! < 0)).take(6).toList();
    } else {
      list = list.take(6).toList();
    }

    return Column(
      children: [
        Row(
          children: [
            for (final (i, label, icon) in const [
              (0, 'Popular', Icons.local_fire_department_rounded),
              (1, 'Gainers', Icons.trending_up_rounded),
              (2, 'Losers', Icons.trending_down_rounded),
            ])
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () => setState(() => _tab = i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      color: _tab == i ? _tabColor(i).withValues(alpha: 0.16) : Colors.white.withValues(alpha: 0.04),
                      border: Border.all(color: _tab == i ? _tabColor(i).withValues(alpha: 0.45) : AppColors.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(icon, size: 15, color: _tab == i ? _tabColor(i) : AppColors.textMute),
                        const SizedBox(width: 5),
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: _tab == i ? _tabColor(i) : AppColors.textDim,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        GlassCard(
          radius: 20,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            child: list.isEmpty
                ? Padding(
                    key: ValueKey('empty$_tab'),
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      m.dayOpen.isEmpty ? 'Loading market moves…' : (_tab == 1 ? 'No gainers right now' : 'No losers right now'),
                      style: const TextStyle(color: AppColors.textMute),
                    ),
                  )
                : Column(
                    key: ValueKey('list$_tab${list.join()}'),
                    children: [
                      for (var i = 0; i < list.length; i++) ...[if (i > 0) const Divider(indent: 64, endIndent: 14), _MarketRow(list[i])],
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  Color _tabColor(int i) => i == 1
      ? AppColors.profit
      : i == 2
      ? AppColors.loss
      : AppColors.warning;
}

class _MarketRow extends StatelessWidget {
  final String symbol;
  const _MarketRow(this.symbol);
  @override
  Widget build(BuildContext context) {
    final m = context.watch<MarketState>();
    final inst = m.instruments[symbol]!;
    final t = m.ticks[symbol];
    final pct = m.changePct(symbol);
    final spark = m.sparks[symbol];
    final up = pct != null ? pct >= 0 : (spark == null || (t?.mid ?? spark.last) >= spark.first);
    final c = up ? AppColors.profit : AppColors.loss;
    return InkWell(
      onTap: () => Shell.of(context)?.openTrade(symbol),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            SymbolOrb(symbol: symbol, group: inst.group, size: 38),
            const SizedBox(width: 12),
            Expanded(
              flex: 5,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(symbol, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(
                    inst.displayName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.textMute, fontSize: 11),
                  ),
                ],
              ),
            ),
            SizedBox(
              width: 64,
              height: 30,
              child: spark == null ? const SizedBox() : Sparkline(values: spark, live: t?.mid, color: c),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: 92,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      fmtPrice(t?.mid, inst.digits),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, fontFeatures: [FontFeature.tabularFigures()]),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: c.withValues(alpha: pct == null ? 0.06 : 0.16),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      pct == null ? '—' : fmtPct(pct),
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: pct == null ? AppColors.textMute : c),
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

class _OpenPositionsCard extends StatelessWidget {
  const _OpenPositionsCard();
  @override
  Widget build(BuildContext context) {
    final t = context.watch<TradingState>();
    return GlassCard(
      onTap: () => Shell.of(context)?.go(3),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          const Orb(size: 46, colors: [Color(0xFF93C5FD), Color(0xFF1D4ED8)], child: Icon(Icons.receipt_long_rounded)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${t.positions.length} open position${t.positions.length == 1 ? '' : 's'}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                Text(
                  '${t.orders.length} pending order${t.orders.length == 1 ? '' : 's'}',
                  style: const TextStyle(color: AppColors.textDim, fontSize: 12.5),
                ),
              ],
            ),
          ),
          PnlText(t.floating, size: 15),
          const Icon(Icons.chevron_right, color: AppColors.textMute),
        ],
      ),
    );
  }
}

class _KycBanner extends StatelessWidget {
  final String status;
  const _KycBanner({required this.status});
  @override
  Widget build(BuildContext context) {
    final pending = status == 'submitted' || status == 'under_review';
    return GlassCard(
      glow: AppColors.warning,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          const Orb(size: 42, colors: [Color(0xFFFDE68A), Color(0xFFB45309)], child: Icon(Icons.verified_user_rounded)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              pending ? 'Your documents are under review.' : 'Verify your identity to unlock withdrawals and higher leverage.',
              style: const TextStyle(fontSize: 13),
            ),
          ),
          if (!pending)
            TextButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const KycScreen())),
              child: const Text('Verify'),
            ),
        ],
      ),
    );
  }
}
