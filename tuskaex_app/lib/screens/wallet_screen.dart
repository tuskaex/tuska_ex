import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../state/brand_state.dart';
import '../models/models.dart';
import '../state/auth_state.dart';
import '../state/trading_state.dart';
import '../widgets/common.dart';
import 'kyc_screen.dart';

class WalletScreen extends StatefulWidget {
  final int initialTab;
  final String? accountId;
  const WalletScreen({super.key, this.initialTab = 0, this.accountId});
  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Map<String, dynamic>? _summary;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    try {
      final j = await Api.I.get('/wallet/summary');
      if (mounted) setState(() => _summary = Map<String, dynamic>.from(j));
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  /// Wallet-linked users get a wallet-bound trading account that the backend
  /// credits deposits to and withdraws from by default.
  TradingAccount? _walletAcct(BuildContext c) => c.watch<TradingState>().accounts.where((a) => a.isWalletAccount && a.isActive).firstOrNull;

  void _changed() {
    _loadSummary();
    context.read<TradingState>().refreshAccounts(silent: true);
    context.read<AuthState>().refreshUser().catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final s = _summary;
    return DefaultTabController(
      length: 4,
      initialIndex: widget.initialTab,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Wallet'),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'Deposit'),
              Tab(text: 'Withdraw'),
              Tab(text: 'Transfer'),
              Tab(text: 'History'),
            ],
          ),
        ),
        body: Column(
          children: [
            Container(
              margin: const EdgeInsets.fromLTRB(16, 14, 16, 4),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                gradient: const LinearGradient(colors: [Color(0xFF0E1F4D), Color(0xFF13245A)]),
                border: Border.all(color: AppColors.border),
              ),
              child: s == null
                  ? SizedBox(height: 56, child: _error != null ? Center(child: Text(_error!)) : const Loading())
                  : Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Main wallet', style: TextStyle(color: AppColors.textDim, fontSize: 12.5)),
                              const SizedBox(height: 2),
                              Text(
                                fmtMoney(toD(s['main_wallet_balance'])),
                                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                              ),
                              if (_walletAcct(context) != null)
                                Text(
                                  'Wallet account ',
                                  style: TextStyle(color: AppColors.brandLight, fontSize: 12.5, fontWeight: FontWeight.w600),
                                ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'Deposited ${fmtMoney(toD(s['total_deposited']))}',
                              style: const TextStyle(color: AppColors.textDim, fontSize: 12),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Withdrawn ${fmtMoney(toD(s['total_withdrawn']))}',
                              style: const TextStyle(color: AppColors.textDim, fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _gate(context, 'deposits', 'Deposits', _DepositTab(onDone: _changed)),
                  _gate(
                    context,
                    'withdrawals',
                    'Withdrawals',
                    _WithdrawTab(onDone: _changed, mainBalance: toD(s?['main_wallet_balance']), walletAccount: _walletAcct(context)),
                  ),
                  _gate(
                    context,
                    'transfers',
                    'Transfers',
                    _TransferTab(onDone: _changed, available: toD(s?['main_wallet_balance']), preselect: widget.accountId),
                  ),
                  const _HistoryTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AmountField extends StatelessWidget {
  final TextEditingController c;
  const _AmountField(this.c);
  @override
  Widget build(BuildContext context) => TextField(
    controller: c,
    keyboardType: const TextInputType.numberWithOptions(decimal: true),
    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
    decoration: const InputDecoration(labelText: 'Amount (USD)', prefixText: '\$ '),
  );
}

/// A tab whose feature the client's broker switched off in the admin panel.
Widget _gate(BuildContext context, String feature, String label, Widget child) {
  final brand = context.watch<BrandState>();
  if (brand.allows(feature)) return child;
  return EmptyState(
    icon: Icons.block_rounded,
    title: '$label unavailable',
    subtitle: '${brand.name} has not enabled $label for your account. Contact ${brand.supportEmail} for help.',
  );
}

// ── Deposit ──

class _DepositTab extends StatefulWidget {
  final VoidCallback onDone;
  const _DepositTab({required this.onDone});
  @override
  State<_DepositTab> createState() => _DepositTabState();
}

class _DepositTabState extends State<_DepositTab> with AutomaticKeepAliveClientMixin {
  String _method = 'oxapay';
  final _amount = TextEditingController();
  final _txid = TextEditingController();
  Map<String, dynamic>? _details;
  XFile? _proof;
  bool _busy = false;

  @override
  bool get wantKeepAlive => true;

  double get _amt => double.tryParse(_amount.text) ?? 0;

  Future<void> _go(Future<void> Function() f) async {
    setState(() => _busy = true);
    try {
      await f();
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _crypto() => _go(() async {
    if (_amt <= 0) throw ApiException('Enter an amount');
    final j = await Api.I.post('/wallet/deposit', body: {'amount': _amt, 'method': 'oxapay'});
    final url = j is Map ? j['payment_url']?.toString() : null;
    if (url == null || url.isEmpty) throw ApiException('The payment gateway did not return a link. Try again or use manual deposit.');
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    if (!mounted) return;
    toast(context, 'Complete the payment in your browser. Your wallet updates once it is confirmed.');
    widget.onDone();
  });

  Future<void> _loadDetails() => _go(() async {
    final j = await Api.I.post('/wallet/deposit/bank-details', body: {if (_amt > 0) 'amount': _amt});
    setState(() => _details = Map<String, dynamic>.from(j as Map));
  });

  Future<void> _submitManual() => _go(() async {
    if (_amt <= 0) throw ApiException('Enter an amount');
    if (_txid.text.trim().isEmpty) throw ApiException('Enter the transaction / reference ID');
    if (_proof == null) throw ApiException('Attach a screenshot of the payment');
    await Api.I.upload('/wallet/deposit/manual', {'amount': _amt, 'transaction_id': _txid.text.trim()}, {'file': _proof!.path});
    if (!mounted) return;
    toast(context, 'Deposit submitted for review.');
    setState(() {
      _amount.clear();
      _txid.clear();
      _proof = null;
      _details = null;
    });
    widget.onDone();
  });

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Deposits are credited to your main wallet. Transfer to a trading account from the Transfer tab.',
          style: TextStyle(color: AppColors.textDim, fontSize: 12.5),
        ),
        const SizedBox(height: 14),
        _methodTile('oxapay', Icons.currency_bitcoin, 'Crypto (instant)', 'USDT, BTC, ETH and more via secure gateway'),
        const SizedBox(height: 10),
        _methodTile('manual', Icons.account_balance, 'Bank / UPI / QR', 'Pay manually and upload the receipt'),
        const SizedBox(height: 18),
        _AmountField(_amount),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final v in const [50, 100, 250, 500, 1000])
              ActionChip(label: Text('\$$v'), onPressed: () => setState(() => _amount.text = '$v')),
          ],
        ),
        const SizedBox(height: 18),
        if (_method == 'oxapay')
          FilledButton(onPressed: _busy ? null : _crypto, child: _busy ? _spinner() : const Text('Continue to payment'))
        else if (_details == null)
          FilledButton(onPressed: _busy ? null : _loadDetails, child: _busy ? _spinner() : const Text('Show payment details'))
        else ...[
          _DetailsCard(_details!),
          const SizedBox(height: 16),
          TextField(
            controller: _txid,
            decoration: const InputDecoration(labelText: 'Transaction / UTR / reference ID'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () async {
              final f = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85, maxWidth: 2000);
              if (f != null) setState(() => _proof = f);
            },
            icon: Icon(_proof == null ? Icons.upload_file : Icons.check_circle, color: _proof == null ? null : AppColors.profit),
            label: Text(_proof == null ? 'Attach payment screenshot' : _proof!.name, overflow: TextOverflow.ellipsis),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: _busy ? null : _submitManual, child: _busy ? _spinner() : const Text('Submit deposit')),
        ],
      ],
    );
  }

  Widget _methodTile(String id, IconData icon, String title, String sub) {
    final sel = _method == id;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => setState(() {
        _method = id;
        _details = null;
      }),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: sel ? AppColors.brand : AppColors.border, width: sel ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Icon(icon, color: sel ? AppColors.brandLight : AppColors.textDim),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(sub, style: const TextStyle(color: AppColors.textDim, fontSize: 12)),
                ],
              ),
            ),
            Icon(sel ? Icons.radio_button_checked : Icons.radio_button_off, color: sel ? AppColors.brand : AppColors.textMute),
          ],
        ),
      ),
    );
  }
}

class _DetailsCard extends StatelessWidget {
  final Map<String, dynamic> d;
  const _DetailsCard(this.d);
  @override
  Widget build(BuildContext context) {
    const labels = {
      'bank_name': 'Bank',
      'account_holder': 'Account holder',
      'account_number': 'Account number',
      'ifsc_code': 'IFSC',
      'upi_id': 'UPI ID',
      'wallet_address': 'Wallet address',
    };
    final rows = labels.entries.where((e) => (d[e.key] ?? '').toString().isNotEmpty).toList();
    final qr = d['qr_code_url']?.toString();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Pay to', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            if (rows.isEmpty) const Text('No payment details are configured. Contact support.', style: TextStyle(color: AppColors.textDim)),
            for (final e in rows)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    SizedBox(
                      width: 120,
                      child: Text(e.value, style: const TextStyle(color: AppColors.textDim, fontSize: 12.5)),
                    ),
                    Expanded(
                      child: SelectableText(d[e.key].toString(), style: const TextStyle(fontWeight: FontWeight.w600)),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      icon: const Icon(Icons.copy, size: 18),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: d[e.key].toString()));
                        toast(context, '${e.value} copied');
                      },
                    ),
                  ],
                ),
              ),
            if (qr != null && qr.isNotEmpty) ...[
              const SizedBox(height: 10),
              Center(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    _abs(qr),
                    width: 200,
                    height: 200,
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => const Text('QR code unavailable', style: TextStyle(color: AppColors.textMute)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _abs(String u) => u.startsWith('http') ? u : 'https://api.tuskaex.com${u.startsWith('/') ? '' : '/'}$u';
}

// ── Withdraw ──

class _WithdrawTab extends StatefulWidget {
  final VoidCallback onDone;
  final double mainBalance;
  final TradingAccount? walletAccount;
  const _WithdrawTab({required this.onDone, required this.mainBalance, this.walletAccount});
  @override
  State<_WithdrawTab> createState() => _WithdrawTabState();
}

class _WithdrawTabState extends State<_WithdrawTab> with AutomaticKeepAliveClientMixin {
  String _network = 'tron';
  String _source = 'wallet';
  final _amount = TextEditingController();
  final _address = TextEditingController();
  bool _busy = false;

  @override
  bool get wantKeepAlive => true;

  static const _nets = {'tron': 'USDT · TRC20', 'bsc': 'USDT · BEP20', 'eth': 'USDT · ERC20'};

  String? _addrError() {
    final a = _address.text.trim();
    if (a.isEmpty) return 'Enter the destination address';
    final ok = _network == 'tron' ? RegExp(r'^T[1-9A-HJ-NP-Za-km-z]{33}$').hasMatch(a) : RegExp(r'^0x[a-fA-F0-9]{40}$').hasMatch(a);
    return ok ? null : 'This is not a valid ${_nets[_network]} address';
  }

  static const _minWithdraw = 5.0;

  bool get _fromWallet => widget.walletAccount != null && _source == 'wallet';
  double get _available => _fromWallet ? widget.walletAccount!.balance - widget.walletAccount!.marginUsed : widget.mainBalance;

  Future<void> _submit() async {
    final amt = double.tryParse(_amount.text) ?? 0;
    if (amt < _minWithdraw) return toast(context, 'Minimum withdrawal is ${fmtMoney(_minWithdraw)}', error: true);
    if (amt > _available) return toast(context, 'Amount exceeds the available balance', error: true);
    final err = _addrError();
    if (err != null) return toast(context, err, error: true);
    setState(() => _busy = true);
    try {
      await Api.I.post(
        '/wallet/withdraw/onchain',
        body: {
          'network': _network,
          'amount': amt,
          'destination_address': _address.text.trim(),
          if (widget.walletAccount != null) 'source': _source,
        },
      );
      if (!mounted) return;
      toast(context, 'Withdrawal requested. You can track it in History.');
      _amount.clear();
      widget.onDone();
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.kycRequired) {
        toast(context, e.message, error: true);
        Navigator.push(context, MaterialPageRoute(builder: (_) => const KycScreen()));
      } else {
        toast(context, e.message, error: true);
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final user = context.watch<AuthState>().user;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (user != null && !user.kycApproved)
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: AppColors.warning, size: 20),
                const SizedBox(width: 10),
                const Expanded(child: Text('Withdrawals require approved KYC.', style: TextStyle(fontSize: 13))),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const KycScreen())),
                  child: const Text('Verify'),
                ),
              ],
            ),
          ),
        if (widget.walletAccount != null) ...[
          const Text('Withdraw from', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: Text('Wallet account · ${fmtMoney(widget.walletAccount!.balance)}'),
                selected: _source == 'wallet',
                showCheckmark: false,
                onSelected: (_) => setState(() => _source = 'wallet'),
              ),
              ChoiceChip(
                label: Text('Main wallet · ${fmtMoney(widget.mainBalance)}'),
                selected: _source == 'main',
                showCheckmark: false,
                onSelected: (_) => setState(() => _source = 'main'),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],
        const Text('Network', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final e in _nets.entries)
              ChoiceChip(
                label: Text(e.value),
                selected: _network == e.key,
                showCheckmark: false,
                onSelected: (_) => setState(() => _network = e.key),
              ),
          ],
        ),
        const SizedBox(height: 16),
        _AmountField(_amount),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => setState(() => _amount.text = (_available < 0 ? 0 : _available).toStringAsFixed(2)),
            child: Text('Max ${fmtMoney(_available < 0 ? 0 : _available)} · min ${fmtMoney(_minWithdraw)}'),
          ),
        ),
        TextField(
          controller: _address,
          decoration: InputDecoration(
            labelText: 'Destination ${_nets[_network]} address',
            prefixIcon: const Icon(Icons.account_balance_wallet_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Double-check the address and network. Funds sent to a wrong address cannot be recovered.',
          style: TextStyle(color: AppColors.textMute, fontSize: 12),
        ),
        const SizedBox(height: 18),
        FilledButton(onPressed: _busy ? null : _submit, child: _busy ? _spinner() : const Text('Request withdrawal')),
      ],
    );
  }
}

// ── Transfer ──

class _TransferTab extends StatefulWidget {
  final VoidCallback onDone;
  final double available;
  final String? preselect;
  const _TransferTab({required this.onDone, required this.available, this.preselect});
  @override
  State<_TransferTab> createState() => _TransferTabState();
}

class _TransferTabState extends State<_TransferTab> with AutomaticKeepAliveClientMixin {
  bool _toAccount = true;
  String? _accountId;
  final _amount = TextEditingController();
  bool _busy = false;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _accountId = widget.preselect;
  }

  /// What the backend lets you move out of a trading account: balance not tied up as margin.
  double _withdrawable(TradingAccount a) {
    final v = a.balance - a.marginUsed;
    return v < 0 ? 0 : v;
  }

  Future<void> _submit(List<TradingAccount> live) async {
    final amt = double.tryParse(_amount.text) ?? 0;
    final acc = live.where((a) => a.id == _accountId).firstOrNull;
    if (acc == null) return toast(context, 'Choose a trading account', error: true);
    if (amt <= 0) return toast(context, 'Enter an amount', error: true);
    setState(() => _busy = true);
    try {
      if (_toAccount) {
        await Api.I.post('/wallet/transfer-main-to-trading', body: {'to_account_id': acc.id, 'amount': amt});
      } else {
        await Api.I.post('/wallet/transfer-trading-to-main', body: {'from_account_id': acc.id, 'amount': amt});
      }
      if (!mounted) return;
      toast(context, 'Transferred ${fmtMoney(amt)} ${_toAccount ? 'to' : 'from'} ${acc.accountNumber}');
      _amount.clear();
      widget.onDone();
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final live = context.watch<TradingState>().tradableAccounts.where((a) => !a.isDemo).toList();
    if (live.isEmpty) {
      return const EmptyState(
        icon: Icons.swap_horiz,
        title: 'No live accounts',
        subtitle: 'Open a live trading account to transfer funds.',
      );
    }
    _accountId ??= live.first.id;
    final acc = live.where((a) => a.id == _accountId).firstOrNull ?? live.first;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: true, label: Text('Wallet → Account')),
            ButtonSegment(value: false, label: Text('Account → Wallet')),
          ],
          selected: {_toAccount},
          showSelectedIcon: false,
          onSelectionChanged: (s) => setState(() => _toAccount = s.first),
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          initialValue: acc.id,
          dropdownColor: AppColors.surface2,
          decoration: const InputDecoration(labelText: 'Trading account'),
          items: [
            for (final a in live)
              DropdownMenuItem(value: a.id, child: Text('${a.accountNumber} · ${a.groupName} · ${fmtMoney(a.balance)}')),
          ],
          onChanged: (v) => setState(() => _accountId = v),
        ),
        const SizedBox(height: 14),
        _AmountField(_amount),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => setState(() => _amount.text = (_toAccount ? widget.available : _withdrawable(acc)).toStringAsFixed(2)),
            child: Text('Max ${fmtMoney(_toAccount ? widget.available : _withdrawable(acc))}'),
          ),
        ),
        const SizedBox(height: 8),
        FilledButton(onPressed: _busy ? null : () => _submit(live), child: _busy ? _spinner() : const Text('Transfer')),
      ],
    );
  }
}

// ── History ──

class _HistoryTab extends StatefulWidget {
  const _HistoryTab();
  @override
  State<_HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<_HistoryTab> with AutomaticKeepAliveClientMixin {
  List<WalletTxn>? _items;
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
      final r = await Future.wait([Api.I.get('/wallet/deposits'), Api.I.get('/wallet/withdrawals'), Api.I.get('/wallet/transactions')]);
      final seen = <String>{};
      final all = <WalletTxn>[];
      for (final j in [...asList(r[0]), ...asList(r[1])]) {
        final t = WalletTxn.fromJson(j);
        if (seen.add(t.id)) all.add(t);
      }
      for (final j in asList(r[2])) {
        final t = WalletTxn.fromJson(j);
        if (t.type.contains('transfer') && seen.add(t.id)) all.add(t);
      }
      all.sort((a, b) => (b.createdAt ?? DateTime(0)).compareTo(a.createdAt ?? DateTime(0)));
      if (mounted) setState(() => _items = all);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_error != null && _items == null) return ErrorRetry(message: _error!, onRetry: _load);
    if (_items == null) return const Loading();
    if (_items!.isEmpty) return const EmptyState(icon: Icons.receipt_outlined, title: 'No transactions yet');
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _items!.length,
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final t = _items![i];
          final out = t.type.contains('withdraw') || (t.type.contains('transfer') && t.amount < 0);
          final icon = t.type.contains('deposit')
              ? Icons.south_west
              : t.type.contains('withdraw')
              ? Icons.north_east
              : Icons.swap_horiz;
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: (out ? AppColors.loss : AppColors.profit).withValues(alpha: 0.12),
                child: Icon(icon, color: out ? AppColors.loss : AppColors.profit, size: 20),
              ),
              title: Text(
                t.type.contains('transfer') && (t.description ?? '').isNotEmpty
                    ? t.description!
                    : '${titleCase(t.type)}${t.method.isNotEmpty ? ' · ${titleCase(t.method)}' : ''}',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              subtitle: Text(fmtDateTime(t.createdAt), style: const TextStyle(color: AppColors.textMute, fontSize: 12)),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('${out ? '-' : '+'}${fmtMoney(t.amount.abs())}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Pill(t.status.toUpperCase(), color: statusColor(t.status)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

Widget _spinner() => const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white));

