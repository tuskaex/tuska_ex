import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../state/trading_state.dart';
import '../widgets/common.dart';
import 'positions_screen.dart' show confirm;

class CopyTradingScreen extends StatelessWidget {
  const CopyTradingScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Copy trading'),
          bottom: const TabBar(isScrollable: true, tabAlignment: TabAlignment.start, tabs: [
            Tab(text: 'Top traders'),
            Tab(text: 'My copies'),
            Tab(text: 'PAMM'),
            Tab(text: 'My PAMM'),
          ]),
        ),
        body: const TabBarView(children: [_Leaderboard(), _MyCopies(), _PammBrowse(), _MyPamm()]),
      ),
    );
  }
}

/// Loads a JSON list endpoint and renders it, with pull-to-refresh.
class _ListLoader extends StatefulWidget {
  final String path;
  final Map<String, dynamic>? query;
  final Widget Function(BuildContext, List<Map<String, dynamic>>, Future<void> Function() reload) builder;
  final Widget empty;
  const _ListLoader({super.key, required this.path, this.query, required this.builder, required this.empty});
  @override
  State<_ListLoader> createState() => _ListLoaderState();
}

class _ListLoaderState extends State<_ListLoader> with AutomaticKeepAliveClientMixin {
  List<Map<String, dynamic>>? _items;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final j = await Api.I.get(widget.path, query: widget.query);
      if (mounted) setState(() => _items = asList(j));
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_items == null) return _error != null ? ErrorRetry(message: _error!, onRetry: _load) : const Loading();
    if (_items!.isEmpty) {
      return RefreshIndicator(onRefresh: _load, child: ListView(children: [const SizedBox(height: 100), widget.empty]));
    }
    return RefreshIndicator(onRefresh: _load, child: widget.builder(context, _items!, _load));
  }
}

Widget _stat(String k, String v, {Color? color}) => Expanded(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(color: AppColors.textMute, fontSize: 11)),
        const SizedBox(height: 2),
        Text(v, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: color)),
      ]),
    );

Widget _avatar(String name) => CircleAvatar(
      radius: 22,
      backgroundColor: AppColors.brand.withValues(alpha: 0.2),
      child: Text(name.isEmpty ? '?' : name.trim().split(RegExp(r'\s+')).map((w) => w[0]).take(2).join().toUpperCase(),
          style: TextStyle(color: AppColors.brandLight, fontWeight: FontWeight.w800)),
    );

// ── Signal providers ──

class _Leaderboard extends StatefulWidget {
  const _Leaderboard();
  @override
  State<_Leaderboard> createState() => _LeaderboardState();
}

class _LeaderboardState extends State<_Leaderboard> {
  String _sort = 'total_return_pct';
  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
        child: Row(children: [
          for (final e in const {'total_return_pct': 'Return', 'followers_count': 'Followers', 'sharpe_ratio': 'Sharpe'}.entries)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(label: Text(e.value), selected: _sort == e.key, showCheckmark: false, onSelected: (_) => setState(() => _sort = e.key)),
            ),
        ]),
      ),
      Expanded(
        child: _ListLoader(
          key: ValueKey(_sort),
          path: '/social/leaderboard',
          query: {'sort_by': _sort, 'per_page': 50},
          empty: const EmptyState(icon: Icons.groups_outlined, title: 'No strategy providers yet', subtitle: 'Approved master traders will be listed here.'),
          builder: (context, items, reload) => ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, i) {
              final p = items[i];
              final ret = toD(p['total_return_pct']);
              final name = (p['provider_name'] ?? '').toString();
              return Card(
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () async {
                    await showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      useSafeArea: true,
                      builder: (_) => _ProviderSheet(id: p['id'].toString()),
                    );
                    reload();
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(children: [
                      Row(children: [
                        _avatar(name),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(name.isEmpty ? 'Trader' : name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                            Text('${toI(p['followers_count'])} followers · ${toD(p['performance_fee_pct']).toStringAsFixed(0)}% fee',
                                style: const TextStyle(color: AppColors.textDim, fontSize: 12)),
                          ]),
                        ),
                        if (p['is_copying'] == true) const Pill('COPYING', color: AppColors.profit),
                      ]),
                      const SizedBox(height: 12),
                      Row(children: [
                        _stat('Return', fmtPct(ret), color: AppColors.pnl(ret)),
                        _stat('Max drawdown', '${toD(p['max_drawdown_pct']).toStringAsFixed(1)}%'),
                        _stat('Sharpe', toD(p['sharpe_ratio']).toStringAsFixed(2)),
                        _stat('Min', fmtMoney(toD(p['min_investment']))),
                      ]),
                    ]),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    ]);
  }
}

class _ProviderSheet extends StatefulWidget {
  final String id;
  const _ProviderSheet({required this.id});
  @override
  State<_ProviderSheet> createState() => _ProviderSheetState();
}

class _ProviderSheetState extends State<_ProviderSheet> {
  Map<String, dynamic>? _p;
  String? _error;
  final _amount = TextEditingController();
  final _dd = TextEditingController();
  String _target = 'new';
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final j = await Api.I.get('/social/providers/${widget.id}');
      final p = Map<String, dynamic>.from(j as Map);
      if (!mounted) return;
      setState(() {
        _p = p;
        _amount.text = toD(p['min_investment']).toStringAsFixed(0);
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _copy() async {
    final amt = double.tryParse(_amount.text) ?? 0;
    final min = toD(_p?['min_investment']);
    if (amt < min || amt <= 0) return toast(context, 'Minimum investment is ${fmtMoney(min)}', error: true);
    setState(() => _busy = true);
    try {
      await Api.I.post('/social/copy', query: {
        'master_id': widget.id,
        'amount': amt,
        if (_target != 'new') 'account_id': _target,
        if ((double.tryParse(_dd.text) ?? 0) > 0) 'max_drawdown_pct': double.parse(_dd.text),
      });
      if (!mounted) return;
      toast(context, 'You are now copying ${_p?['provider_name'] ?? 'this trader'}');
      context.read<TradingState>().refreshAccounts(silent: true);
      Navigator.pop(context);
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final p = _p;
    if (p == null) {
      return SizedBox(height: 300, child: _error != null ? ErrorRetry(message: _error!, onRetry: _load) : const Loading());
    }
    final name = (p['provider_name'] ?? 'Trader').toString();
    final ret = toD(p['total_return_pct']);
    final monthly = asList(p, 'monthly_breakdown');
    final live = context.watch<TradingState>().tradableAccounts.where((a) => !a.isDemo && !a.isCopyTrading).toList();
    final copying = p['is_copying'] == true;
    final self = p['is_self'] == true;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            _avatar(name),
            const SizedBox(width: 12),
            Expanded(child: Text(name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800))),
            Text(fmtPct(ret), style: TextStyle(color: AppColors.pnl(ret), fontSize: 18, fontWeight: FontWeight.w800)),
          ]),
          if ((p['description'] ?? '').toString().isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(p['description'].toString(), style: const TextStyle(color: AppColors.textDim)),
          ],
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(children: [
                Row(children: [
                  _stat('Followers', '${toI(p['followers_count'])}'),
                  _stat('Trades', '${toI(p['total_trades'])}'),
                  _stat('Win rate', '${toD(p['win_rate']).toStringAsFixed(0)}%'),
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  _stat('Max DD', '${toD(p['max_drawdown_pct']).toStringAsFixed(1)}%'),
                  _stat('Perf. fee', '${toD(p['performance_fee_pct']).toStringAsFixed(0)}%'),
                  _stat('Total profit', fmtMoney(toD(p['total_profit'])), color: AppColors.pnl(toD(p['total_profit']))),
                ]),
              ]),
            ),
          ),
          if (monthly.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text('Monthly profit', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            for (final m in monthly.reversed.take(6))
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(children: [
                  // "2026-09-01 00:00:00+00:00" — read the UTC month directly; toLocal()
                  // would roll it back to August west of UTC.
                  Expanded(child: Text(fmtMonth(DateTime.tryParse('${m['month'].toString().padRight(7).substring(0, 7)}-01')), style: const TextStyle(color: AppColors.textDim))),
                  PnlText(toD(m['profit']), size: 13),
                ]),
              ),
          ],
          const SizedBox(height: 18),
          if (self)
            const Text('This is your own strategy.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textDim))
          else if (copying)
            const Text('You are already copying this trader. Manage it under "My copies".',
                textAlign: TextAlign.center, style: TextStyle(color: AppColors.profit))
          else ...[
            const Text('Start copying', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 10),
            TextField(
              controller: _amount,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: InputDecoration(labelText: 'Investment amount', prefixText: '\$ ', helperText: 'Minimum ${fmtMoney(toD(p['min_investment']))}'),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _target,
              dropdownColor: AppColors.surface2,
              decoration: const InputDecoration(labelText: 'Copy into'),
              items: [
                const DropdownMenuItem(value: 'new', child: Text('New copy account (from main wallet)')),
                for (final a in live) DropdownMenuItem(value: a.id, child: Text('${a.accountNumber} · ${fmtMoney(a.balance)}')),
              ],
              onChanged: (v) => setState(() => _target = v ?? 'new'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _dd,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Stop copying at drawdown % (optional)', suffixText: '%'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _copy,
              child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Copy trader'),
            ),
            const SizedBox(height: 6),
            const Text('Past performance does not guarantee future results. Copied trades can lose money.',
                textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMute, fontSize: 11)),
          ],
        ]),
      ),
    );
  }
}

class _MyCopies extends StatelessWidget {
  const _MyCopies();
  @override
  Widget build(BuildContext context) {
    return _ListLoader(
      path: '/social/my-copies',
      empty: const EmptyState(icon: Icons.copy_all_outlined, title: 'You are not copying anyone', subtitle: 'Pick a trader from Top traders to start.'),
      builder: (context, items, reload) => ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final c = items[i];
          final name = (c['provider_name'] ?? 'Trader').toString();
          final profit = toD(c['total_profit']);
          final pending = c['status'] == 'pending';
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(children: [
                Row(children: [
                  _avatar(name),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(name, style: const TextStyle(fontWeight: FontWeight.w800)),
                      Text('Since ${fmtDate(parseTime(c['created_at']))} · ${titleCase(c['copy_type'].toString())}',
                          style: const TextStyle(color: AppColors.textDim, fontSize: 12)),
                    ]),
                  ),
                  Pill(c['status'].toString().toUpperCase(), color: pending ? AppColors.warning : AppColors.profit),
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  _stat('Invested', fmtMoney(toD(c['allocation_amount']))),
                  _stat('Profit', fmtMoney(profit, sign: true), color: AppColors.pnl(profit)),
                  _stat('Open / closed', '${toI(c['open_trades'])} / ${toI(c['closed_trades'])}'),
                ]),
                if (c['status'] == 'active') ...[
                  const SizedBox(height: 12),
                  Builder(builder: (context) {
                    // Pooled (PAMM/MAM) allocations must be settled through the
                    // pool-withdraw route; the signal stop route pays out the raw
                    // allocation and would credit the wrong amount.
                    final pooled = ['pamm', 'mam', 'mamm'].contains(c['copy_type'].toString().toLowerCase());
                    return OutlinedButton(
                      style: OutlinedButton.styleFrom(foregroundColor: AppColors.loss, side: const BorderSide(color: AppColors.loss), minimumSize: const Size.fromHeight(42)),
                      onPressed: () async {
                        final ok = await confirm(
                          context,
                          pooled ? 'Withdraw from $name?' : 'Stop copying $name?',
                          pooled
                              ? 'Your share of the pool will be returned to your main wallet.'
                              : 'Open copied positions will be closed at market and the remaining funds returned.',
                          ok: pooled ? 'Withdraw' : 'Stop copying',
                          okColor: AppColors.sell,
                        );
                        if (!ok) return;
                        try {
                          await Api.I.delete(pooled ? '/social/mamm-pamm/${c['id']}/withdraw' : '/social/copy/${c['id']}');
                          if (context.mounted) toast(context, pooled ? 'Withdrawal requested' : 'Stopped copying $name');
                          reload();
                        } on ApiException catch (e) {
                          if (context.mounted) toast(context, e.message, error: true);
                        }
                      },
                      child: Text(pooled ? 'Withdraw' : 'Stop copying'),
                    );
                  }),
                ],
              ]),
            ),
          );
        },
      ),
    );
  }
}

// ── PAMM ──

class _PammBrowse extends StatelessWidget {
  const _PammBrowse();
  @override
  Widget build(BuildContext context) {
    return _ListLoader(
      path: '/social/mamm-pamm',
      empty: const EmptyState(icon: Icons.account_tree_outlined, title: 'No PAMM managers yet', subtitle: 'Managed pools will be listed here.'),
      builder: (context, items, reload) => ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final m = items[i];
          final name = (m['manager_name'] ?? 'Manager').toString();
          final ret = toD(m['total_return_pct']);
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(children: [
                Row(children: [
                  _avatar(name),
                  const SizedBox(width: 12),
                  Expanded(child: Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
                  Text(fmtPct(ret), style: TextStyle(color: AppColors.pnl(ret), fontWeight: FontWeight.w800)),
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  _stat('Max DD', '${toD(m['max_drawdown_pct']).toStringAsFixed(1)}%'),
                  _stat('Perf. fee', '${toD(m['performance_fee_pct']).toStringAsFixed(0)}%'),
                  _stat('Mgmt fee', '${toD(m['management_fee_pct']).toStringAsFixed(1)}%'),
                  _stat('Min', fmtMoney(toD(m['min_investment']))),
                ]),
                const SizedBox(height: 12),
                FilledButton(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(42)),
                  onPressed: () => _invest(context, m, reload),
                  child: const Text('Invest'),
                ),
              ]),
            ),
          );
        },
      ),
    );
  }

  Future<void> _invest(BuildContext context, Map<String, dynamic> m, Future<void> Function() reload) async {
    final c = TextEditingController(text: toD(m['min_investment']).toStringAsFixed(0));
    final amount = await showDialog<double>(
      context: context,
      builder: (d) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Invest with ${m['manager_name'] ?? 'manager'}'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Funds are taken from your main wallet.', style: TextStyle(color: AppColors.textDim)),
          const SizedBox(height: 12),
          TextField(controller: c, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(prefixText: '\$ ', labelText: 'Amount')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(d), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(100, 44)),
            onPressed: () => Navigator.pop(d, double.tryParse(c.text)),
            child: const Text('Invest'),
          ),
        ],
      ),
    );
    if (amount == null || amount <= 0 || !context.mounted) return;
    try {
      await Api.I.post('/social/mamm-pamm/${m['id']}/invest', query: {'amount': amount});
      if (context.mounted) toast(context, 'Invested ${fmtMoney(amount)}');
      reload();
    } on ApiException catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}

class _MyPamm extends StatelessWidget {
  const _MyPamm();
  @override
  Widget build(BuildContext context) {
    return _ListLoader(
      path: '/social/my-allocations',
      empty: const EmptyState(icon: Icons.savings_outlined, title: 'No PAMM investments'),
      builder: (context, items, reload) => ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final a = items[i];
          final pnl = toD(a['total_pnl']);
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(children: [
                Row(children: [
                  Expanded(child: Text((a['manager_name'] ?? 'Manager').toString(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
                  Text(fmtPct(toD(a['pnl_pct'])), style: TextStyle(color: AppColors.pnl(pnl), fontWeight: FontWeight.w800)),
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  _stat('Invested', fmtMoney(toD(a['allocation_amount']))),
                  _stat('Value', fmtMoney(toD(a['current_value']))),
                  _stat('P/L', fmtMoney(pnl, sign: true), color: AppColors.pnl(pnl)),
                ]),
                const SizedBox(height: 12),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(42)),
                  onPressed: () async {
                    final ok = await confirm(context, 'Withdraw investment?', 'Your share of the pool will be returned to your main wallet.', ok: 'Withdraw');
                    if (!ok) return;
                    try {
                      await Api.I.delete('/social/mamm-pamm/${a['id']}/withdraw');
                      if (context.mounted) toast(context, 'Withdrawal requested');
                      reload();
                    } on ApiException catch (e) {
                      if (context.mounted) toast(context, e.message, error: true);
                    }
                  },
                  child: const Text('Withdraw'),
                ),
              ]),
            ),
          );
        },
      ),
    );
  }
}
