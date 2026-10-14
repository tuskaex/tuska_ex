import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../state/trading_state.dart';
import '../widgets/common.dart';

class PortfolioScreen extends StatefulWidget {
  const PortfolioScreen({super.key});
  @override
  State<PortfolioScreen> createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends State<PortfolioScreen> {
  String _period = 'all';
  Map<String, dynamic>? _summary, _perf;
  String? _error, _accountId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final id = Provider.of<TradingState>(context).active?.id;
    if (id != _accountId) {
      _accountId = id;
      Future.microtask(_load);
    }
  }

  Future<void> _load() async {
    final id = _accountId;
    if (id == null) return;
    setState(() => _error = null);
    try {
      final r = await Future.wait([
        Api.I.get('/portfolio/summary', query: {'account_id': id}),
        Api.I.get('/portfolio/performance', query: {'account_id': id, 'period': _period}),
      ]);
      if (!mounted) return;
      setState(() {
        _summary = Map<String, dynamic>.from(r[0] as Map);
        _perf = Map<String, dynamic>.from(r[1] as Map);
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = _summary, p = _perf;
    return Scaffold(
      appBar: AppBar(title: const Text('Portfolio'), actions: const [AccountChip(), SizedBox(width: 12)]),
      body: _accountId == null
          ? const EmptyState(icon: Icons.pie_chart_outline, title: 'No trading account selected')
          : (s == null || p == null)
              ? (_error != null ? ErrorRetry(message: _error!, onRetry: _load) : const Loading())
              : RefreshIndicator(onRefresh: _load, child: _body(s, p)),
    );
  }

  Widget _body(Map<String, dynamic> s, Map<String, dynamic> p) {
    final b = Map<String, dynamic>.from(s['pnl_breakdown'] as Map? ?? {});
    final st = Map<String, dynamic>.from(p['stats'] as Map? ?? {});
    final curve = asList(p, 'equity_curve').map((e) => toD(e['equity'])).where((v) => v.isFinite).toList();
    final symbols = asList(p, 'symbol_breakdown');
    final months = asList(p, 'monthly_breakdown');

    return ListView(padding: const EdgeInsets.all(16), children: [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Equity', style: TextStyle(color: AppColors.textDim, fontSize: 12.5)),
            Text(fmtMoney(toD(s['total_equity'])), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            Row(children: [
              for (final e in const {'today': 'Today', 'this_week': 'Week', 'this_month': 'Month', 'all_time': 'All time'}.entries)
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(e.value, style: const TextStyle(color: AppColors.textMute, fontSize: 11)),
                    const SizedBox(height: 2),
                    PnlText(toD(b[e.key]), size: 13),
                  ]),
                ),
            ]),
          ]),
        ),
      ),
      const SizedBox(height: 16),
      Row(children: [
        const Expanded(child: Text('Performance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
        for (final per in const ['1m', '3m', '6m', '1y', 'all'])
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: ChoiceChip(
              label: Text(per.toUpperCase()),
              selected: _period == per,
              showCheckmark: false,
              visualDensity: VisualDensity.compact,
              onSelected: (_) {
                setState(() => _period = per);
                _load();
              },
            ),
          ),
      ]),
      const SizedBox(height: 10),
      Container(
        height: 180,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
        child: curve.length < 2
            ? const Center(child: Text('Close a few trades to see your equity curve.', style: TextStyle(color: AppColors.textMute)))
            : CustomPaint(painter: _CurvePainter(curve), size: Size.infinite),
      ),
      const SizedBox(height: 12),
      GridView.count(
        crossAxisCount: 3,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 1.6,
        children: [
          _tile('Return', fmtPct(toD(st['total_return_pct'])), AppColors.pnl(toD(st['total_return_pct']))),
          _tile('Net profit', fmtMoney(toD(st['total_return']), sign: true), AppColors.pnl(toD(st['total_return']))),
          _tile('Win rate', '${toD(st['win_rate']).toStringAsFixed(1)}%', AppColors.text),
          _tile('Trades', '${toI(st['total_trades'])}', AppColors.text),
          _tile('Wins / losses', '${toI(st['total_wins'])} / ${toI(st['total_losses'])}', AppColors.text),
          _tile('Max drawdown', '${toD(st['max_drawdown_pct']).toStringAsFixed(1)}%', AppColors.loss),
        ],
      ),
      if (symbols.isNotEmpty) ...[
        const SizedBox(height: 18),
        const Text('By symbol', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Card(
          child: Column(children: [
            for (final sy in symbols)
              ListTile(
                dense: true,
                title: Text(sy['symbol'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('${toI(sy['trades'])} trades · ${toD(sy['win_rate']).toStringAsFixed(0)}% win', style: const TextStyle(color: AppColors.textMute)),
                trailing: PnlText(toD(sy['profit'] ?? sy['pnl'])),
              ),
          ]),
        ),
      ],
      if (months.isNotEmpty) ...[
        const SizedBox(height: 18),
        const Text('By month', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Card(
          child: Column(children: [
            for (final m in months.reversed)
              ListTile(dense: true, title: Text(m['month'].toString()), trailing: PnlText(toD(m['profit'] ?? m['pnl']))),
          ]),
        ),
      ],
    ]);
  }

  Widget _tile(String k, String v, Color c) => Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(k, style: const TextStyle(color: AppColors.textMute, fontSize: 11)),
          const SizedBox(height: 4),
          FittedBox(child: Text(v, style: TextStyle(color: c, fontWeight: FontWeight.w800, fontSize: 14))),
        ]),
      );
}

class _CurvePainter extends CustomPainter {
  final List<double> v;
  _CurvePainter(this.v);
  @override
  void paint(Canvas canvas, Size size) {
    final lo = v.reduce(math.min), hi = v.reduce(math.max);
    final span = hi - lo == 0 ? 1 : hi - lo;
    final pts = [
      for (var i = 0; i < v.length; i++) Offset(i / (v.length - 1) * size.width, size.height - (v[i] - lo) / span * size.height * 0.9 - size.height * 0.05),
    ];
    final up = v.last >= v.first;
    final c = up ? AppColors.profit : AppColors.loss;
    final line = Path()..moveTo(pts.first.dx, pts.first.dy);
    for (final p in pts.skip(1)) {
      line.lineTo(p.dx, p.dy);
    }
    final area = Path.from(line)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(
      area,
      Paint()..shader = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [c.withValues(alpha: 0.3), c.withValues(alpha: 0)])
          .createShader(Offset.zero & size),
    );
    canvas.drawPath(line, Paint()
      ..color = c
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2);
  }

  @override
  bool shouldRepaint(covariant _CurvePainter o) => o.v != v;
}
