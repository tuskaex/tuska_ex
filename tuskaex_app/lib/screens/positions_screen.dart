import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../state/market_state.dart';
import '../state/trading_state.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';
import 'shell.dart';

class PositionsScreen extends StatelessWidget {
  const PositionsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final t = context.watch<TradingState>();
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Positions'),
          actions: [
            const AccountChip(),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              color: AppColors.surface2,
              onSelected: (v) => _bulkClose(context, v),
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'all', child: Text('Close all positions')),
                PopupMenuItem(value: 'profit', child: Text('Close profitable')),
                PopupMenuItem(value: 'loss', child: Text('Close losing')),
              ],
            ),
          ],
          bottom: TabBar(tabs: [
            Tab(text: 'Open (${t.positions.length})'),
            Tab(text: 'Pending (${t.orders.length})'),
            const Tab(text: 'History'),
          ]),
        ),
        body: Column(children: [
          const AccountSummaryBar(compact: true),
          const Expanded(child: TabBarView(children: [_OpenTab(), _PendingTab(), _HistoryTab()])),
        ]),
      ),
    );
  }

  Future<void> _bulkClose(BuildContext context, String mode) async {
    final t = context.read<TradingState>();
    if (t.positions.isEmpty) {
      toast(context, 'No open positions.');
      return;
    }
    final label = {'all': 'all positions', 'profit': 'all profitable positions', 'loss': 'all losing positions'}[mode]!;
    final ok = await confirm(context, 'Close $label?', 'They will be closed at the current market price.');
    if (!ok || !context.mounted) return;
    final n = await t.closeAll(profitable: mode == 'all' ? null : mode == 'profit');
    if (context.mounted) toast(context, 'Closed $n position${n == 1 ? '' : 's'}.');
  }
}

Future<bool> confirm(BuildContext context, String title, String body, {String ok = 'Confirm', Color? okColor}) async {
  final r = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      backgroundColor: AppColors.surface,
      title: Text(title),
      content: Text(body, style: const TextStyle(color: AppColors.textDim)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(minimumSize: const Size(100, 44), backgroundColor: okColor),
          onPressed: () => Navigator.pop(c, true),
          child: Text(ok),
        ),
      ],
    ),
  );
  return r == true;
}

class _OpenTab extends StatelessWidget {
  const _OpenTab();
  @override
  Widget build(BuildContext context) {
    final t = context.watch<TradingState>();
    if (t.positions.isEmpty) {
      return EmptyState(
        icon: Icons.inbox_outlined,
        title: 'No open positions',
        subtitle: 'Your trades will appear here.',
        action: SizedBox(
          width: 190,
          child: Button3D(height: 48, onPressed: () => Shell.of(context)?.go(2), child: const Text('Start trading')),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: t.refreshAll,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: t.positions.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _PositionCard(t.positions[i]),
      ),
    );
  }
}

class _PositionCard extends StatelessWidget {
  final Position p;
  const _PositionCard(this.p);
  @override
  Widget build(BuildContext context) {
    final inst = context.watch<MarketState>().instruments[p.symbol];
    final d = inst?.digits ?? 5;
    final sideC = p.isBuy ? AppColors.buy : AppColors.sell;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => showPositionActions(context, p),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(children: [
            Row(children: [
              Text(p.symbol, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
              const SizedBox(width: 8),
              Pill('${p.side.toUpperCase()} ${fmtLots(p.lots)}', color: sideC),
              if (p.isCopy) ...[const SizedBox(width: 6), const Pill('COPY', color: AppColors.cyan)],
              const Spacer(),
              PnlText(p.profit, size: 16),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              _kv('Open', fmtPrice(p.openPrice, d)),
              _kv('Current', fmtPrice(p.currentPrice, d)),
              _kv('S/L', p.stopLoss == null ? '—' : fmtPrice(p.stopLoss, d)),
              _kv('T/P', p.takeProfit == null ? '—' : fmtPrice(p.takeProfit, d)),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              Text(fmtDateTime(p.createdAt), style: const TextStyle(color: AppColors.textMute, fontSize: 11.5)),
              const Spacer(),
              Text('Swap ${p.swap.toStringAsFixed(2)} · Comm ${p.commission.toStringAsFixed(2)}',
                  style: const TextStyle(color: AppColors.textMute, fontSize: 11.5)),
            ]),
          ]),
        ),
      ),
    );
  }

  Widget _kv(String k, String v) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(k, style: const TextStyle(color: AppColors.textMute, fontSize: 11)),
          const SizedBox(height: 2),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, fontFeatures: [FontFeature.tabularFigures()])),
        ]),
      );
}

Future<void> showPositionActions(BuildContext context, Position p) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _PositionSheet(p),
  );
}

class _PositionSheet extends StatefulWidget {
  final Position p;
  const _PositionSheet(this.p);
  @override
  State<_PositionSheet> createState() => _PositionSheetState();
}

class _PositionSheetState extends State<_PositionSheet> {
  late final _sl = TextEditingController(text: widget.p.stopLoss?.toString() ?? '');
  late final _tp = TextEditingController(text: widget.p.takeProfit?.toString() ?? '');
  late final _lots = TextEditingController(text: fmtLots(widget.p.lots));
  bool _busy = false;

  Future<void> _run(Future<String> Function() f) async {
    setState(() => _busy = true);
    try {
      final msg = await f();
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      toast(context, msg);
      Navigator.pop(context);
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<TradingState>();
    final p = t.positions.firstWhere((x) => x.id == widget.p.id, orElse: () => widget.p);
    final inst = context.watch<MarketState>().instruments[p.symbol];
    final d = inst?.digits ?? 5;
    final lots = double.tryParse(_lots.text) ?? p.lots;
    final partial = lots < p.lots - 1e-9;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Text(p.symbol, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(width: 8),
            Pill('${p.side.toUpperCase()} ${fmtLots(p.lots)}', color: p.isBuy ? AppColors.buy : AppColors.sell),
            const Spacer(),
            PnlText(p.profit, size: 18),
          ]),
          const SizedBox(height: 4),
          Text('Opened ${fmtDateTime(p.createdAt)} at ${fmtPrice(p.openPrice, d)} · Ticket ${p.id.substring(0, 8)}',
              style: const TextStyle(color: AppColors.textMute, fontSize: 12)),
          if (p.isCopy)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text('This position is copied from a strategy provider and is managed by the copy engine.',
                  style: TextStyle(color: AppColors.warning, fontSize: 12.5)),
            )
          else ...[
            const SizedBox(height: 20),
            const Text('Modify stop loss / take profit', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _priceField(_sl, 'Stop loss', d)),
              const SizedBox(width: 10),
              Expanded(child: _priceField(_tp, 'Take profit', d)),
            ]),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: _busy
                  ? null
                  : () => _run(() async {
                        final sl = double.tryParse(_sl.text.trim());
                        final tp = double.tryParse(_tp.text.trim());
                        await t.modifyPosition(p, sl: sl, tp: tp, clearSl: _sl.text.trim().isEmpty, clearTp: _tp.text.trim().isEmpty);
                        return 'Position updated';
                      }),
              child: const Text('Save SL / TP'),
            ),
            const SizedBox(height: 22),
            const Text('Close position', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _lots,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(labelText: 'Lots to close'),
                ),
              ),
              const SizedBox(width: 8),
              for (final f in const [0.25, 0.5, 1.0])
                Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: ActionChip(
                    label: Text(f == 1.0 ? 'All' : '${(f * 100).round()}%'),
                    onPressed: () => setState(() => _lots.text = fmtLots(
                        snapLots(p.lots * f, inst?.lotStep ?? 0.01, inst?.minLot ?? 0.01, p.lots))),
                  ),
                ),
            ]),
            const SizedBox(height: 12),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.sell),
              onPressed: _busy || lots <= 0
                  ? null
                  : () => _run(() async {
                        final r = await t.closePosition(p, lots: partial ? lots : null);
                        final profit = toD(r['profit']);
                        return '${partial ? 'Partially closed' : 'Closed'} ${p.symbol} · ${fmtMoney(profit, sign: true)}';
                      }),
              child: _busy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(partial ? 'Close ${fmtLots(lots)} lots' : 'Close position'),
            ),
          ],
          const SizedBox(height: 10),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Shell.of(context)?.openTrade(p.symbol);
            },
            child: const Text('Open chart'),
          ),
        ]),
      ),
    );
  }

  Widget _priceField(TextEditingController c, String label, int d) => TextField(
        controller: c,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
        decoration: InputDecoration(
          labelText: label,
          hintText: 'Not set',
          suffixIcon: IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => c.clear()),
        ),
      );
}

class _PendingTab extends StatelessWidget {
  const _PendingTab();
  @override
  Widget build(BuildContext context) {
    final t = context.watch<TradingState>();
    final m = context.watch<MarketState>();
    if (t.orders.isEmpty) {
      return const EmptyState(icon: Icons.schedule, title: 'No pending orders', subtitle: 'Limit and stop orders wait here until triggered.');
    }
    return RefreshIndicator(
      onRefresh: t.refreshOrders,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: t.orders.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final o = t.orders[i];
          final d = m.instruments[o.symbol]?.digits ?? 5;
          final tick = m.ticks[o.symbol];
          return Card(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 6, 12),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Text(o.symbol, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      const SizedBox(width: 8),
                      Pill(o.label, color: o.side == 'buy' ? AppColors.buy : AppColors.sell),
                    ]),
                    const SizedBox(height: 6),
                    Text('${fmtLots(o.lots)} lots @ ${fmtPrice(o.price, d)}  ·  now ${fmtPrice(o.side == 'buy' ? tick?.ask : tick?.bid, d)}',
                        style: const TextStyle(fontSize: 13)),
                    const SizedBox(height: 2),
                    Text('SL ${o.stopLoss == null ? '—' : fmtPrice(o.stopLoss, d)} · TP ${o.takeProfit == null ? '—' : fmtPrice(o.takeProfit, d)} · ${fmtDateTime(o.createdAt)}',
                        style: const TextStyle(color: AppColors.textMute, fontSize: 11.5)),
                  ]),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.loss),
                  onPressed: () async {
                    final ok = await confirm(context, 'Cancel order?', '${o.label} ${fmtLots(o.lots)} ${o.symbol} @ ${fmtPrice(o.price, d)}', ok: 'Cancel order', okColor: AppColors.sell);
                    if (!ok || !context.mounted) return;
                    try {
                      await t.cancelOrder(o);
                      if (context.mounted) toast(context, 'Order cancelled');
                    } on ApiException catch (e) {
                      if (context.mounted) toast(context, e.message, error: true);
                    }
                  },
                ),
              ]),
            ),
          );
        },
      ),
    );
  }
}

class _HistoryTab extends StatefulWidget {
  const _HistoryTab();
  @override
  State<_HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<_HistoryTab> with AutomaticKeepAliveClientMixin {
  final List<ClosedTrade> _items = [];
  int _page = 1;
  bool _loading = false, _done = false;
  String? _error, _accountId;
  int _rev = -1;

  @override
  bool get wantKeepAlive => true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final t = Provider.of<TradingState>(context);
    final id = t.active?.id;
    if (id != _accountId || t.historyRev != _rev) {
      _accountId = id;
      _rev = t.historyRev;
      // A close is recorded a moment after the event; give the server a beat.
      Future.delayed(const Duration(milliseconds: 600), _reload);
    }
  }

  Future<void> _reload() async {
    if (!mounted || _loading) return;
    _items.clear();
    _page = 1;
    _done = false;
    await _more();
  }

  Future<void> _more() async {
    if (_loading || _done) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await context.read<TradingState>().history(page: _page, perPage: 50);
      _items.addAll(list);
      _page++;
      if (list.length < 50) _done = true;
    } on ApiException catch (e) {
      _error = e.message;
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final m = context.watch<MarketState>();
    if (_error != null && _items.isEmpty) return ErrorRetry(message: _error!, onRetry: _reload);
    if (_items.isEmpty && _loading) return const Loading();
    if (_items.isEmpty) return const EmptyState(icon: Icons.history, title: 'No closed trades yet');
    final total = _items.fold(0.0, (s, t) => s + t.net);
    return RefreshIndicator(
      onRefresh: _reload,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.pixels > n.metrics.maxScrollExtent - 300) _more();
          return false;
        },
        child: ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: _items.length + 2,
          itemBuilder: (_, i) {
            if (i == 0) {
              return Padding(
                padding: const EdgeInsets.fromLTRB(4, 0, 4, 10),
                child: Row(children: [
                  Text('${_items.length}${_done ? '' : '+'} trades', style: const TextStyle(color: AppColors.textDim)),
                  const Spacer(),
                  const Text('Net ', style: TextStyle(color: AppColors.textDim)),
                  PnlText(total),
                ]),
              );
            }
            if (i == _items.length + 1) {
              return _loading ? const Padding(padding: EdgeInsets.all(16), child: Loading()) : const SizedBox(height: 20);
            }
            final tr = _items[i - 1];
            final d = m.instruments[tr.symbol]?.digits ?? 5;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Text(tr.symbol, style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(width: 6),
                          Pill('${tr.side.toUpperCase()} ${fmtLots(tr.lots)}', color: tr.side == 'buy' ? AppColors.buy : AppColors.sell),
                          if (tr.closeReason == 'sl' || tr.closeReason == 'tp') ...[
                            const SizedBox(width: 6),
                            Pill(tr.closeReason.toUpperCase(), color: tr.closeReason == 'tp' ? AppColors.profit : AppColors.loss),
                          ],
                        ]),
                        const SizedBox(height: 4),
                        Text('${fmtPrice(tr.openPrice, d)} → ${fmtPrice(tr.closePrice, d)}', style: const TextStyle(fontSize: 12.5)),
                        Text(fmtDateTime(tr.closedAt), style: const TextStyle(color: AppColors.textMute, fontSize: 11.5)),
                      ]),
                    ),
                    PnlText(tr.net),
                  ]),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
