import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../services/socket.dart';
import '../state/market_state.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';
import 'order_sheet.dart';
import 'shell.dart';

const groupLabels = {
  'all': 'All',
  'watchlist': '★ Watchlist',
  'forex': 'Forex',
  'metals': 'Metals',
  'commodities': 'Commodities',
  'indices': 'Indices',
  'crypto': 'Crypto',
  'stocks': 'Stocks',
  'other': 'Other',
};

class MarketsScreen extends StatefulWidget {
  const MarketsScreen({super.key});
  @override
  State<MarketsScreen> createState() => _MarketsScreenState();
}

class _MarketsScreenState extends State<MarketsScreen> {
  String _filter = 'all';
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final m = context.watch<MarketState>();
    final chips = ['all', 'watchlist', ...m.availableGroups];
    List<Instrument> rows;
    if (_q.isNotEmpty) {
      final q = _q.toUpperCase();
      final base = _filter == 'all' || _filter == 'watchlist' ? m.byGroup('all') : m.byGroup(_filter);
      rows = base.where((i) => i.symbol.contains(q) || i.displayName.toUpperCase().contains(q)).toList();
    } else if (_filter == 'watchlist') {
      rows = [for (final s in m.watchlist) if (m.instruments[s] != null) m.instruments[s]!];
    } else {
      rows = m.byGroup(_filter);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Markets'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: m.wsStatus == SocketStatus.connected ? AppColors.profit : AppColors.warning,
                ),
              ),
              const SizedBox(width: 6),
              Text(m.wsStatus == SocketStatus.connected ? 'Live' : m.wsStatus == SocketStatus.connecting ? 'Connecting' : 'Reconnecting',
                  style: const TextStyle(fontSize: 12, color: AppColors.textDim)),
            ]),
          ),
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: TextField(
            onChanged: (v) => setState(() => _q = v.trim()),
            decoration: const InputDecoration(
              hintText: 'Search symbol or name',
              prefixIcon: Icon(Icons.search, size: 20),
              contentPadding: EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: [
              for (final c in chips)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: ChoiceChip(
                    label: Text(groupLabels[c] ?? titleCase(c)),
                    selected: _filter == c,
                    onSelected: (_) => setState(() => _filter = c),
                    showCheckmark: false,
                    selectedColor: AppColors.brand,
                    backgroundColor: AppColors.surface2,
                    side: BorderSide(color: _filter == c ? AppColors.brand : AppColors.border),
                    labelStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5, color: _filter == c ? Colors.white : AppColors.textDim),
                  ),
                ),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 10, 16, 6),
          child: Row(children: [
            Expanded(child: Text('Symbol', style: TextStyle(color: AppColors.textMute, fontSize: 11.5))),
            SizedBox(width: 92, child: Text('Bid', textAlign: TextAlign.right, style: TextStyle(color: AppColors.textMute, fontSize: 11.5))),
            SizedBox(width: 92, child: Text('Ask', textAlign: TextAlign.right, style: TextStyle(color: AppColors.textMute, fontSize: 11.5))),
            SizedBox(width: 36),
          ]),
        ),
        const Divider(),
        Expanded(
          child: !m.loaded && m.error != null
              ? ErrorRetry(message: m.error!, onRetry: m.retry)
              : !m.loaded
                  ? const Loading()
                  : rows.isEmpty
                      ? EmptyState(
                          icon: _filter == 'watchlist' ? Icons.star_border : Icons.search_off,
                          title: _filter == 'watchlist' ? 'Your watchlist is empty' : 'No markets found',
                          subtitle: _filter == 'watchlist' ? 'Tap the star on any market to add it.' : null,
                        )
                      : ListView.separated(
                          itemCount: rows.length,
                          separatorBuilder: (_, _) => const Divider(indent: 16, endIndent: 16),
                          itemBuilder: (_, i) => _Row(rows[i]),
                        ),
        ),
      ]),
    );
  }
}

class _Row extends StatelessWidget {
  final Instrument inst;
  const _Row(this.inst);
  @override
  Widget build(BuildContext context) {
    final m = context.watch<MarketState>();
    final t = m.ticks[inst.symbol];
    final dir = m.direction[inst.symbol] ?? 0;
    final stale = t?.stale == true;
    final c = stale ? AppColors.textMute : dir > 0 ? AppColors.buy : dir < 0 ? AppColors.sell : AppColors.text;
    final watched = m.isWatched(inst.symbol);
    return InkWell(
      onTap: () => Shell.of(context)?.openTrade(inst.symbol),
      onLongPress: () => showOrderSheet(context, inst.symbol),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 4, 10),
        child: Row(children: [
          SymbolOrb(symbol: inst.symbol, group: inst.group, size: 38),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(inst.symbol, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
              const SizedBox(height: 2),
              Text(inst.displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMute, fontSize: 11.5)),
            ]),
          ),
          _PriceCell(t?.bid, inst.digits, c),
          _PriceCell(t?.ask, inst.digits, c),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: Icon(watched ? Icons.star_rounded : Icons.star_border_rounded, color: watched ? AppColors.warning : AppColors.textMute, size: 22),
            onPressed: () => m.toggleWatch(inst.symbol),
          ),
        ]),
      ),
    );
  }
}

class _PriceCell extends StatelessWidget {
  final double? v;
  final int digits;
  final Color color;
  const _PriceCell(this.v, this.digits, this.color);
  @override
  Widget build(BuildContext context) => SizedBox(
        width: 92,
        child: AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 250),
          style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 14, fontFeatures: const [FontFeature.tabularFigures()]),
          child: Text(fmtPrice(v, digits), textAlign: TextAlign.right),
        ),
      );
}
