import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../state/auth_state.dart';
import '../state/trading_state.dart';
import '../widgets/common.dart';
import 'kyc_screen.dart';
import 'shell.dart';
import 'wallet_screen.dart';

class AccountsScreen extends StatelessWidget {
  const AccountsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final t = context.watch<TradingState>();
    final list = t.tradableAccounts;
    return Scaffold(
      appBar: AppBar(title: const Text('Trading accounts')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OpenAccountScreen())),
        icon: const Icon(Icons.add),
        label: const Text('Open account'),
      ),
      body: RefreshIndicator(
        onRefresh: () => t.refreshAccounts(),
        child: list.isEmpty
            ? ListView(children: const [
                SizedBox(height: 120),
                EmptyState(icon: Icons.account_balance_wallet_outlined, title: 'No trading accounts', subtitle: 'Open a demo or live account to start trading.'),
              ])
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _AccountCard(list[i], active: list[i].id == t.active?.id),
              ),
      ),
    );
  }
}

class _AccountCard extends StatelessWidget {
  final TradingAccount a;
  final bool active;
  const _AccountCard(this.a, {required this.active});
  @override
  Widget build(BuildContext context) {
    final t = context.read<TradingState>();
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: active ? AppColors.brand : AppColors.border, width: active ? 1.5 : 1),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Pill(a.isDemo ? 'DEMO' : 'LIVE', color: a.isDemo ? AppColors.warning : AppColors.profit),
          const SizedBox(width: 8),
          Text(a.accountNumber, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const Spacer(),
          if (active) Pill('ACTIVE', color: AppColors.brandLight),
        ]),
        const SizedBox(height: 4),
        Text('${a.groupName} · 1:${a.leverage} · ${a.currency}', style: const TextStyle(color: AppColors.textDim, fontSize: 12.5)),
        const SizedBox(height: 14),
        Row(children: [
          _kv('Balance', fmtMoney(a.balance, currency: a.currency)),
          _kv('Equity', fmtMoney(a.equity, currency: a.currency)),
          _kv('Free margin', fmtMoney(a.freeMargin, currency: a.currency)),
        ]),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(
            child: FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(42)),
              onPressed: () async {
                await t.selectAccount(a.id);
                if (!context.mounted) return;
                Navigator.of(context).popUntil((r) => r.isFirst);
                Shell.of(context)?.go(2);
              },
              child: Text(active ? 'Trade' : 'Switch & trade'),
            ),
          ),
          const SizedBox(width: 10),
          OutlinedButton(
            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 42), padding: const EdgeInsets.symmetric(horizontal: 14)),
            onPressed: () => _changeLeverage(context, a, active),
            child: Text('1:${a.leverage}'),
          ),
          if (!a.isDemo) ...[
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(42)),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => WalletScreen(initialTab: 2, accountId: a.id))),
                child: const Text('Fund'),
              ),
            ),
          ],
        ]),
      ]),
    );
  }

  Widget _kv(String k, String v) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(k, style: const TextStyle(color: AppColors.textMute, fontSize: 11)),
          const SizedBox(height: 2),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
        ]),
      );

  Future<void> _changeLeverage(BuildContext context, TradingAccount a, bool active) async {
    final t = context.read<TradingState>();
    // Same rule as the web terminal: leverage is locked while trades are open.
    if (active && t.positions.isNotEmpty) {
      return toast(context, 'Close all open positions before changing leverage.', error: true);
    }
    var max = a.group?.maxLeverage ?? a.group?.leverageDefault ?? 100;
    // Backend caps live leverage at 1:50 until KYC is approved.
    final kycCapped = !a.isDemo && context.read<AuthState>().user?.kycApproved != true && max > 50;
    if (kycCapped) max = 50;
    final opts = _leverageSteps(max);
    final pick = await showModalBottomSheet<int>(
      context: context,
      builder: (c) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Padding(padding: EdgeInsets.only(bottom: 8), child: Text('Leverage', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700))),
          if (kycCapped)
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text('Complete identity verification to unlock higher leverage.', style: TextStyle(color: AppColors.warning, fontSize: 12.5)),
            ),
          for (final l in opts)
            ListTile(
              title: Text('1:$l'),
              trailing: l == a.leverage ? Icon(Icons.check, color: AppColors.brand) : null,
              onTap: () => Navigator.pop(c, l),
            ),
        ]),
      ),
    );
    if (pick == null || pick == a.leverage || !context.mounted) return;
    try {
      await t.setLeverage(a.id, pick);
      if (context.mounted) toast(context, 'Leverage set to 1:$pick');
    } on ApiException catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}

/// Preset steps up to `max`, always including `max` itself (e.g. a 1:50 KYC cap).
List<int> _leverageSteps(int max) {
  final l = [1, 10, 25, 50, 100, 200, 300, 400, 500, 1000].where((v) => v <= max).toList();
  if (!l.contains(max)) l.add(max);
  return l;
}

class OpenAccountScreen extends StatefulWidget {
  const OpenAccountScreen({super.key});
  @override
  State<OpenAccountScreen> createState() => _OpenAccountScreenState();
}

class _OpenAccountScreenState extends State<OpenAccountScreen> {
  bool _demo = true;
  List<AccountGroup> _groups = [];
  bool _loading = true;
  String? _error;
  AccountGroup? _sel;
  int? _leverage;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _sel = null;
    });
    try {
      final j = await Api.I.get('/accounts/available-groups', query: {'type': _demo ? 'demo' : 'live'});
      _groups = asList(j).map(AccountGroup.fromJson).toList();
      if (_groups.isNotEmpty) _pick(_groups.first);
    } on ApiException catch (e) {
      _error = e.message;
    }
    if (mounted) setState(() => _loading = false);
  }

  void _pick(AccountGroup g) {
    _sel = g;
    // maxLeverage is the server's effective cap (KYC-aware); the group default
    // can exceed it, and sending that is a guaranteed 400.
    _leverage = g.leverageDefault < g.maxLeverage ? g.leverageDefault : g.maxLeverage;
  }

  List<int> get _levOptions => _leverageSteps(_sel?.maxLeverage ?? 100);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // The backend forces demo for demo users; don't offer a "live" option.
    if (context.read<AuthState>().user?.isDemo == true) _demo = true;
  }

  Future<void> _open() async {
    final g = _sel;
    if (g == null) return;
    setState(() => _busy = true);
    try {
      final j = await Api.I.post('/accounts/open', body: {'account_group_id': g.id, 'leverage': _leverage, 'is_demo': _demo});
      if (!mounted) return;
      final t = context.read<TradingState>();
      await t.refreshAccounts();
      final id = (j is Map ? j['id'] : null)?.toString();
      if (id != null) await t.selectAccount(id);
      if (!mounted) return;
      toast(context, 'Account ${j is Map ? j['account_number'] ?? '' : ''} opened');
      Navigator.pop(context);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.kycRequired) {
        toast(context, 'Complete KYC to open a live account.', error: true);
        Navigator.push(context, MaterialPageRoute(builder: (_) => const KycScreen()));
      } else {
        toast(context, e.message, error: true);
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Open account')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (context.watch<AuthState>().user?.isDemo != true)
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: true, label: Text('Demo'), icon: Icon(Icons.school_outlined)),
            ButtonSegment(value: false, label: Text('Live'), icon: Icon(Icons.bolt)),
          ],
          selected: {_demo},
          onSelectionChanged: (s) {
            setState(() => _demo = s.first);
            _load();
          },
        ),
        const SizedBox(height: 10),
        Text(
          _demo
              ? 'Practise with virtual funds on live prices. Nothing settles.'
              : 'A live account is funded from your main wallet. The account type\'s minimum deposit is transferred on opening.',
          style: const TextStyle(color: AppColors.textDim, fontSize: 13),
        ),
        const SizedBox(height: 16),
        if (_loading)
          const SizedBox(height: 200, child: Loading())
        else if (_error != null)
          ErrorRetry(message: _error!, onRetry: _load)
        else if (_groups.isEmpty)
          const EmptyState(icon: Icons.layers_clear_outlined, title: 'No account types available')
        else ...[
          for (final g in _groups)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => setState(() => _pick(g)),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: _sel?.id == g.id ? AppColors.brand : AppColors.border, width: _sel?.id == g.id ? 1.5 : 1),
                  ),
                  child: Row(children: [
                    Icon(_sel?.id == g.id ? Icons.radio_button_checked : Icons.radio_button_off, color: _sel?.id == g.id ? AppColors.brand : AppColors.textMute),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(g.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        if ((g.description ?? '').isNotEmpty)
                          Padding(padding: const EdgeInsets.only(top: 2), child: Text(g.description!, style: const TextStyle(color: AppColors.textDim, fontSize: 12.5))),
                        const SizedBox(height: 6),
                        Wrap(spacing: 6, runSpacing: 6, children: [
                          Pill('Up to 1:${g.maxLeverage}'),
                          if (!_demo) Pill('Min ${fmtMoney(g.minimumDeposit)}', color: AppColors.cyan),
                          if (g.commissionPerLot > 0) Pill('\$${g.commissionPerLot.toStringAsFixed(2)}/lot', color: AppColors.textDim),
                          if (g.swapFree) const Pill('Swap free', color: AppColors.profit),
                        ]),
                      ]),
                    ),
                  ]),
                ),
              ),
            ),
          const SizedBox(height: 8),
          const Text('Leverage', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final l in _levOptions)
              ChoiceChip(label: Text('1:$l'), selected: _leverage == l, showCheckmark: false, onSelected: (_) => setState(() => _leverage = l)),
          ]),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _busy || _sel == null ? null : _open,
            child: _busy
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Open ${_demo ? 'demo' : 'live'} account'),
          ),
        ],
      ]),
    );
  }
}
