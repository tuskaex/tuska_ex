import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../services/socket.dart';
import '../state/market_state.dart';
import '../state/trading_state.dart';
import '../widgets/candle_chart.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';
import '../widgets/tv_chart.dart';
import 'markets_screen.dart' show groupLabels;
import 'order_sheet.dart';

class TradeScreen extends StatefulWidget {
  const TradeScreen({super.key});
  static final selected = ValueNotifier<String>('XAUUSD');
  @override
  State<TradeScreen> createState() => _TradeScreenState();
}

class _Tf {
  final String label, rest, ws;
  final int seconds;
  const _Tf(this.label, this.rest, this.ws, this.seconds);
}

const _tfs = [
  _Tf('1m', '1', '1', 60),
  _Tf('5m', '5', '5', 300),
  _Tf('15m', '15', '15', 900),
  _Tf('1H', '60', '60', 3600),
  _Tf('4H', '240', '240', 14400),
  _Tf('1D', 'D', '1D', 86400),
];

class _TradeScreenState extends State<TradeScreen> with WidgetsBindingObserver {
  _Tf _tf = _tfs[1];
  ChartStyle _style = ChartStyle.candles;
  CandlePalette _palette = CandlePalette.classic;
  /// TradingView chart (WebView) always; the built-in chart is only a
  /// fallback for when the TradingView page fails to load.
  bool _tv = true;
  static const _kStyle = 'chart_style_v1', _kPalette = 'chart_palette_v1';

  Future<void> _loadChartPrefs() async {
    final p = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _style = ChartStyle.values.firstWhere((s) => s.name == p.getString(_kStyle), orElse: () => ChartStyle.candles);
      _palette = CandlePalette.all.firstWhere((c) => c.name == p.getString(_kPalette), orElse: () => CandlePalette.classic);
    });
  }

  String get _tvInterval => _tf.rest == 'D' ? '1D' : _tf.rest;

  Future<void> _pickStyle() async {
    await showModalBottomSheet(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        void apply(VoidCallback f) {
          setState(f);
          setSheet(() {});
          SharedPreferences.getInstance().then((p) {
            p.setString(_kStyle, _style.name);
            p.setString(_kPalette, _palette.name);
          });
        }

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Chart type', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.25,
                children: [
                  for (final s in ChartStyle.values)
                    GestureDetector(
                      onTap: () => apply(() => _style = s),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: s == _style ? AppColors.brand.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.04),
                          border: Border.all(color: s == _style ? AppColors.brand : AppColors.border, width: s == _style ? 1.5 : 1),
                        ),
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Icon(s.icon, color: s == _style ? AppColors.brandLight : AppColors.textDim),
                          const SizedBox(height: 6),
                          Text(s.label,
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: s == _style ? Colors.white : AppColors.textDim)),
                        ]),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 20),
              const Text('Candle colours', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Row(children: [
                for (final c in CandlePalette.all)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: GestureDetector(
                        onTap: () => apply(() => _palette = c),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            color: c == _palette ? AppColors.brand.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.04),
                            border: Border.all(color: c == _palette ? AppColors.brand : AppColors.border, width: c == _palette ? 1.5 : 1),
                          ),
                          child: Column(children: [
                            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                              _swatch(c.up, true),
                              const SizedBox(width: 4),
                              _swatch(c.down, false),
                              const SizedBox(width: 4),
                              _swatch(c.up, true),
                            ]),
                            const SizedBox(height: 8),
                            Text(c.name, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: c == _palette ? Colors.white : AppColors.textDim)),
                          ]),
                        ),
                      ),
                    ),
                  ),
              ]),
            ]),
          ),
        );
      }),
    );
  }

  /// Tiny candle used as a colour swatch.
  Widget _swatch(Color c, bool tall) => Column(children: [
        Container(width: 1.5, height: 5, color: c),
        Container(width: 8, height: tall ? 16 : 11, color: c),
        Container(width: 1.5, height: 5, color: c),
      ]);
  List<Bar> _bars = [];
  bool _loading = true;
  String? _error;
  String _symbol = TradeScreen.selected.value;
  late final ReconnectingSocket _barSock;
  late final MarketState _market;
  Timer? _livePoll;
  int _reqId = 0;
  bool _everConnected = false;
  int _lastTickMs = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _market = context.read<MarketState>()..addListener(_onTick);
    _barSock = ReconnectingSocket(
      urlBuilder: () => Uri.parse('${AppConfig.wsBase}/ws/bars'),
      onConnected: () {
        // After a drop, bars missed while offline are only recoverable via REST.
        if (_everConnected) _load(silent: true);
        _everConnected = true;
        _subscribe();
      },
      onMessage: _onBar,
    )..connect();
    // The /ws/bars relay can lag badly under load (the web chart masks this the
    // same way): re-read the forming bars over REST every few seconds.
    _livePoll = Timer.periodic(const Duration(seconds: 4), (_) => _pollLive());
    TradeScreen.selected.addListener(_onSymbol);
    _loadChartPrefs();
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _market.removeListener(_onTick);
    TradeScreen.selected.removeListener(_onSymbol);
    _livePoll?.cancel();
    _barSock.close();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _livePoll?.cancel();
      _barSock.close();
    } else if (state == AppLifecycleState.resumed) {
      _barSock.connect();
      _livePoll?.cancel();
      _livePoll = Timer.periodic(const Duration(seconds: 4), (_) => _pollLive());
      _load(silent: true);
    }
  }

  void _onSymbol() {
    final s = TradeScreen.selected.value;
    if (s == _symbol) return;
    _unsubscribe();
    setState(() {
      _symbol = s;
      _bars = []; // never draw the previous symbol's candles under the new price
    });
    _load();
  }

  void _subscribe() => _barSock.send({'type': 'subscribe', 'symbol': _symbol, 'resolution': _tf.ws});
  void _unsubscribe() => _barSock.send({'type': 'unsubscribe', 'symbol': _symbol, 'resolution': _tf.ws});

  Future<List<Bar>> _fetch({int? span, bool live = false}) async {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final q = {'resolution': _tf.rest, 'from': now - _tf.seconds * (span ?? 400), 'to': now, if (live) 'live': 1};
    for (var attempt = 0;; attempt++) {
      try {
        final j = await Api.I.get('/instruments/$_symbol/bars', auth: false, query: q);
        return asList(j, 'bars').map(Bar.fromJson).toList();
      } on ApiException catch (e) {
        final transient = e.status == null || (e.status ?? 0) >= 500 || e.status == 429;
        if (!transient || attempt >= 2) rethrow;
        await Future.delayed(Duration(milliseconds: 600 * (attempt + 1)));
      }
    }
  }

  Future<void> _load({bool silent = false}) async {
    final id = ++_reqId;
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final bars = await _fetch();
      if (id != _reqId || !mounted) return;
      setState(() {
        _bars = bars.length > 500 ? bars.sublist(bars.length - 500) : bars;
        _loading = false;
        _error = null;
      });
      _subscribe();
    } on ApiException catch (e) {
      if (id != _reqId || !mounted || silent) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _pollLive() async {
    if (_bars.isEmpty || _loading) return;
    final sym = _symbol, tf = _tf;
    try {
      final recent = await _fetch(span: 5, live: true);
      if (!mounted || sym != _symbol || tf != _tf) return;
      recent.where((b) => b.time >= _bars.last.time - tf.seconds).forEach(_merge);
      setState(() {});
    } catch (_) {}
  }

  /// Insert or replace a server bar by its start time.
  void _merge(Bar b) {
    if (b.time <= 0) return;
    if (_bars.isNotEmpty && _bars.last.time == b.time) {
      // Keep tick-observed extremes the server bar may not include yet.
      final l = _bars.last;
      b.high = b.high > l.high ? b.high : l.high;
      b.low = b.low < l.low ? b.low : l.low;
      _bars[_bars.length - 1] = b;
    } else if (_bars.isEmpty || b.time > _bars.last.time) {
      _bars.add(b);
      if (_bars.length > 600) _bars.removeAt(0);
    } else {
      final i = _bars.indexWhere((x) => x.time == b.time);
      if (i >= 0) _bars[i] = b;
    }
  }

  void _onBar(dynamic j) {
    if (j is! Map || j['symbol']?.toString().toUpperCase() != _symbol || !mounted || _bars.isEmpty) return;
    final tfOk = _tfLabelMatches(j['timeframe']?.toString());
    if (!tfOk) return;
    setState(() => _merge(Bar.fromJson(Map<String, dynamic>.from(j))));
  }

  bool _tfLabelMatches(String? label) {
    if (label == null) return true;
    const map = {'1': '1m', '5': '5m', '15': '15m', '60': '1h', '240': '4h', 'D': '1d'};
    return map[_tf.rest] == label.toLowerCase();
  }

  /// Advance the forming candle from the price stream. Server bars are built
  /// from mid and aligned to UTC epoch multiples, so the same maths applies.
  void _onTick() {
    final t = _market.ticks[_symbol];
    if (t == null || _bars.isEmpty || t.stale || t.tsMs == _lastTickMs) return;
    _lastTickMs = t.tsMs;
    final ts = (t.tsMs > 0 ? t.tsMs : DateTime.now().millisecondsSinceEpoch) ~/ 1000;
    final period = ts ~/ _tf.seconds * _tf.seconds;
    final p = t.mid;
    final last = _bars.last;
    if (period > last.time) {
      _bars.add(Bar(period, last.close, p > last.close ? p : last.close, p < last.close ? p : last.close, p));
      if (_bars.length > 600) _bars.removeAt(0);
    } else if (period == last.time) {
      if (p > last.high) last.high = p;
      if (p < last.low) last.low = p;
      last.close = p;
    }
  }

  void _setTf(_Tf tf) {
    if (tf == _tf) return;
    _unsubscribe();
    setState(() {
      _tf = tf;
      _bars = [];
    });
    _load();
  }

  Future<void> _pickSymbol() async {
    final s = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _SymbolPicker(),
    );
    if (s != null) TradeScreen.selected.value = s;
  }

  @override
  Widget build(BuildContext context) {
    final m = context.watch<MarketState>();
    final tr = context.watch<TradingState>();
    final inst = m.instruments[_symbol];
    final t = m.ticks[_symbol];
    final d = inst?.digits ?? 5;
    final pct = m.changePct(_symbol);
    final mine = tr.positions.where((p) => p.symbol == _symbol).toList();

    final lines = <PriceLine>[
      for (final p in mine) ...[
        PriceLine(p.openPrice, p.isBuy ? AppColors.buy : AppColors.sell, '${p.side.toUpperCase()} ${fmtLots(p.lots)}', dashed: false),
        if (p.stopLoss != null) PriceLine(p.stopLoss!, AppColors.loss, 'SL'),
        if (p.takeProfit != null) PriceLine(p.takeProfit!, AppColors.profit, 'TP'),
      ],
      for (final o in tr.orders.where((o) => o.symbol == _symbol)) PriceLine(o.price, AppColors.warning, o.label),
    ];

    final bars = _bars;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: _pickSymbol,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Text(_symbol, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
              const Icon(Icons.arrow_drop_down),
            ]),
          ),
        ),
        actions: const [AccountChip(), SizedBox(width: 12)],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(fmtPrice(t?.bid, d), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()])),
            const SizedBox(width: 10),
            if (pct != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(fmtPct(pct), style: TextStyle(color: AppColors.pnl(pct), fontWeight: FontWeight.w700)),
              ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(inst?.displayName ?? '', style: const TextStyle(color: AppColors.textMute, fontSize: 12)),
            ),
          ]),
        ),
        // TradingView mode brings its own interval / chart-type / indicator toolbar.
        if (!_tv)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(children: [
            Expanded(
              child: GlassCard(
                radius: 14,
                padding: const EdgeInsets.all(3),
                child: Row(children: [
                  for (final tf in _tfs)
                    Expanded(
                      child: GestureDetector(
                        onTap: () => _setTf(tf),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          height: 32,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(11),
                            gradient: tf == _tf ? const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF6366F1)]) : null,
                            boxShadow: tf == _tf ? [BoxShadow(color: const Color(0xFF3B82F6).withValues(alpha: 0.5), blurRadius: 10)] : null,
                          ),
                          child: Text(tf.label,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: tf == _tf ? Colors.white : AppColors.textDim)),
                        ),
                      ),
                    ),
                ]),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _pickStyle,
              child: GlassCard(
                radius: 14,
                padding: const EdgeInsets.all(9),
                child: Icon(_style.icon, size: 20, color: AppColors.brandLight),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 6),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            // Built as soon as the app starts (this tab lives in the shell's
            // IndexedStack), so the chart is already warm when Trade opens.
            child: _tv
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: TvChart(
                      symbol: _symbol,
                      interval: _tvInterval,
                      accountId: tr.active?.id,
                      token: Api.I.session.access,
                      onFailed: () {
                        if (mounted) setState(() => _tv = false); // fall back to the built-in chart
                      },
                    ),
                  )
                : GlassCard(
            radius: 22,
            glow: AppColors.brand,
            padding: const EdgeInsets.fromLTRB(4, 10, 0, 4),
            child: _loading && _bars.isEmpty
                ? const Loading()
                : _error != null
                    ? ErrorRetry(message: _error!, onRetry: _load)
                    : bars.isEmpty
                        ? const EmptyState(icon: Icons.candlestick_chart_outlined, title: 'No chart data yet')
                        : CandleChart(bars: bars, digits: d, lastPrice: t?.mid, lines: lines, tfSeconds: _tf.seconds, style: _style, palette: _palette),
            ),
          ),
        ),
        if (mine.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(children: [
              Text('${mine.length} open on $_symbol', style: const TextStyle(color: AppColors.textDim, fontSize: 12.5)),
              const Spacer(),
              PnlText(mine.fold(0.0, (s, p) => s + p.profit), size: 13),
            ]),
          ),
        _TradeBar(symbol: _symbol, tick: t, digits: d),
      ]),
    );
  }
}

class _TradeBar extends StatelessWidget {
  final String symbol;
  final Tick? tick;
  final int digits;
  const _TradeBar({required this.symbol, required this.tick, required this.digits});
  @override
  Widget build(BuildContext context) {
    Widget btn(String side, double? price, List<Color> c) => Expanded(
          child: Button3D(
            height: 60,
            radius: 18,
            colors: c,
            onPressed: () => showOrderSheet(context, symbol, side: side),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(side.toUpperCase(), style: const TextStyle(color: Colors.white70, fontSize: 11.5, fontWeight: FontWeight.w800, letterSpacing: 1.5)),
              Text(fmtPrice(price, digits), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, fontFeatures: [FontFeature.tabularFigures()])),
            ]),
          ),
        );
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Row(children: [
          btn('sell', tick?.bid, const [Color(0xFFF87171), Color(0xFFB91C1C)]),
          const SizedBox(width: 12),
          btn('buy', tick?.ask, const [Color(0xFF60A5FA), Color(0xFF1D4ED8)]),
        ]),
      ),
    );
  }
}

class _SymbolPicker extends StatefulWidget {
  const _SymbolPicker();
  @override
  State<_SymbolPicker> createState() => _SymbolPickerState();
}

class _SymbolPickerState extends State<_SymbolPicker> {
  String _q = '';
  @override
  Widget build(BuildContext context) {
    final m = context.watch<MarketState>();
    final q = _q.toUpperCase();
    final all = m.byGroup('all').where((i) => q.isEmpty || i.symbol.contains(q) || i.displayName.toUpperCase().contains(q)).toList();
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.8,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: TextField(
            autofocus: true,
            onChanged: (v) => setState(() => _q = v.trim()),
            decoration: const InputDecoration(hintText: 'Search markets', prefixIcon: Icon(Icons.search)),
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: all.length,
            itemBuilder: (_, i) {
              final inst = all[i];
              final showHeader = i == 0 || all[i - 1].group != inst.group;
              final t = m.ticks[inst.symbol];
              return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (showHeader && q.isEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                    child: Text((groupLabels[inst.group] ?? inst.group).toUpperCase(),
                        style: TextStyle(color: AppColors.brandLight, fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: 1)),
                  ),
                ListTile(
                  dense: true,
                  onTap: () => Navigator.pop(context, inst.symbol),
                  title: Text(inst.symbol, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(inst.displayName, style: const TextStyle(color: AppColors.textMute)),
                  trailing: Text(fmtPrice(t?.bid, inst.digits), style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
              ]);
            },
          ),
        ),
      ]),
    );
  }
}
