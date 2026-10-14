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

Future<void> showOrderSheet(BuildContext context, String symbol, {String side = 'buy', double? lots}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => OrderSheet(symbol: symbol, initialSide: side, initialLots: lots),
  );
}

class OrderSheet extends StatefulWidget {
  final String symbol;
  final String initialSide;
  final double? initialLots;
  const OrderSheet({super.key, required this.symbol, this.initialSide = 'buy', this.initialLots});
  @override
  State<OrderSheet> createState() => _OrderSheetState();
}

class _OrderSheetState extends State<OrderSheet> {
  late String _side = widget.initialSide;
  bool _pending = false;
  String _pendingType = 'limit';
  final _lots = TextEditingController();
  final _price = TextEditingController();
  final _stopLimit = TextEditingController();
  final _sl = TextEditingController();
  final _tp = TextEditingController();
  bool _useSl = false, _useTp = false;
  bool _busy = false;

  Instrument? get _inst => context.read<MarketState>().instruments[widget.symbol];

  @override
  void initState() {
    super.initState();
    final inst = context.read<MarketState>().instruments[widget.symbol];
    _lots.text = fmtLots(widget.initialLots ?? inst?.minLot ?? 0.01);
  }

  double get _lotsVal => double.tryParse(_lots.text) ?? 0;

  void _step(int dir) {
    final i = _inst;
    final step = i?.lotStep ?? 0.01;
    final v = snapLots(_lotsVal + dir * step, step, i?.minLot ?? 0.01, i?.maxLot ?? 100);
    setState(() => _lots.text = fmtLots(v));
  }

  double? _entry(Tick? t) {
    if (_pending) return double.tryParse(_price.text);
    if (t == null) return null;
    return _side == 'buy' ? t.ask : t.bid;
  }

  void _toggleLevel(bool sl, bool on, Tick? t) {
    // A stop-limit fills at its limit price, which is what SL/TP are checked against.
    final p = _pending && _pendingType == 'stop_limit' ? (double.tryParse(_stopLimit.text) ?? _entry(t)) : _entry(t);
    final d = _inst?.digits ?? 5;
    setState(() {
      if (sl) {
        _useSl = on;
        if (on && _sl.text.isEmpty && p != null) _sl.text = (p * (_side == 'buy' ? 0.995 : 1.005)).toStringAsFixed(d);
      } else {
        _useTp = on;
        if (on && _tp.text.isEmpty && p != null) _tp.text = (p * (_side == 'buy' ? 1.01 : 0.99)).toStringAsFixed(d);
      }
    });
  }

  /// Margin exactly as the server computes it when it checks free margin
  /// (trading_service.calc_margin): lots × contract × fill / leverage, with NO
  /// currency conversion. For non-USD-quoted symbols this over-states the real
  /// USD figure, but it is the number the order will be accepted or rejected on.
  double? _margin(Tick? t, int leverage) {
    final i = _inst;
    final p = _entry(t);
    if (i == null || p == null || leverage <= 0) return null;
    return _lotsVal * i.contractSize * p / leverage;
  }

  Map<String, dynamic>? _status; // /instruments/market-status/{symbol}

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_status == null) _loadStatus();
  }

  Future<void> _loadStatus() async {
    _status = const {};
    try {
      final j = await Api.I.get('/instruments/market-status/${widget.symbol}', auth: false);
      if (mounted && j is Map) setState(() => _status = Map<String, dynamic>.from(j));
    } catch (_) {}
  }

  bool get _marketClosed => _status?['is_open'] == false;

  String? _validate(Tick? t) {
    final i = _inst;
    if (i == null) return 'Unknown instrument';
    if (_lotsVal < i.minLot - 1e-9 || _lotsVal > i.maxLot + 1e-9) {
      return 'Volume must be between ${fmtLots(i.minLot)} and ${fmtLots(i.maxLot)} lots';
    }
    if (t == null || t.stale) return 'Waiting for a live price…';
    if (!_pending && _marketClosed) {
      return 'Market is closed${_status?['reason'] != null ? ' (${_status!['reason']})' : ''}. Place a pending order instead.';
    }
    final acc = context.read<TradingState>().active;
    final minDep = acc?.group?.minimumDeposit ?? 0;
    if (acc != null && !acc.isDemo && minDep > 0 && acc.balance < minDep) {
      return 'This account needs at least ${fmtMoney(minDep)} balance to trade. Deposit or transfer funds first.';
    }
    if (!_pending) {
      final m = _margin(t, acc?.leverage ?? 100);
      if (m != null && m > context.read<TradingState>().freeMargin) return 'Insufficient free margin for this volume.';
    }
    final buy = _side == 'buy';
    double? entry = _entry(t);
    if (_pending) {
      if (entry == null || entry <= 0) return 'Enter the order price';
      if (_pendingType == 'limit' && (buy ? entry >= t.ask : entry <= t.bid)) {
        return buy ? 'Buy limit must be below the ask (${t.ask})' : 'Sell limit must be above the bid (${t.bid})';
      }
      if ((_pendingType == 'stop' || _pendingType == 'stop_limit') && (buy ? entry <= t.ask : entry >= t.bid)) {
        return buy ? 'Buy stop must be above the ask (${t.ask})' : 'Sell stop must be below the bid (${t.bid})';
      }
      if (_pendingType == 'stop_limit') {
        final sl = double.tryParse(_stopLimit.text);
        if (sl == null) return 'Enter the limit price';
        if (buy ? sl >= entry : sl <= entry) return buy ? 'Limit price must be below the stop price' : 'Limit price must be above the stop price';
        entry = sl;
      }
    }
    final sl = _useSl ? double.tryParse(_sl.text) : null;
    final tp = _useTp ? double.tryParse(_tp.text) : null;
    if (_useSl && sl == null) return 'Enter a stop loss price';
    if (_useTp && tp == null) return 'Enter a take profit price';
    if (sl != null && (buy ? sl >= entry! : sl <= entry!)) return buy ? 'Stop loss must be below the entry price' : 'Stop loss must be above the entry price';
    if (tp != null && (buy ? tp <= entry! : tp >= entry!)) return buy ? 'Take profit must be above the entry price' : 'Take profit must be below the entry price';
    return null;
  }

  Future<void> _submit(Tick? t) async {
    final err = _validate(t);
    if (err != null) {
      toast(context, err, error: true);
      return;
    }
    final tr = context.read<TradingState>();
    setState(() => _busy = true);
    try {
      final r = await tr.placeOrder(
        symbol: widget.symbol,
        side: _side,
        orderType: _pending ? _pendingType : 'market',
        lots: _lotsVal,
        price: _pending ? double.tryParse(_price.text) : null,
        stopLimitPrice: _pending && _pendingType == 'stop_limit' ? double.tryParse(_stopLimit.text) : null,
        stopLoss: _useSl ? double.tryParse(_sl.text) : null,
        takeProfit: _useTp ? double.tryParse(_tp.text) : null,
      );
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      final filled = toDN(r['filled_price']);
      toast(
        context,
        _pending
            ? '${_side.toUpperCase()} ${_pendingType.replaceAll('_', ' ').toUpperCase()} placed'
            : '${_side.toUpperCase()} ${fmtLots(_lotsVal)} ${widget.symbol} filled${filled != null ? ' at ${filled.toStringAsFixed(_inst?.digits ?? 5)}' : ''}',
      );
      Navigator.pop(context);
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final m = context.watch<MarketState>();
    final tr = context.watch<TradingState>();
    final inst = m.instruments[widget.symbol];
    final t = m.ticks[widget.symbol];
    final d = inst?.digits ?? 5;
    final acc = tr.active;
    final margin = _margin(t, acc?.leverage ?? 100);
    final buy = _side == 'buy';

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(widget.symbol, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                Text(inst?.displayName ?? '', style: const TextStyle(color: AppColors.textDim, fontSize: 12.5)),
              ]),
            ),
            if (_status?['is_open'] != null) ...[
              Pill(_marketClosed ? 'CLOSED' : 'OPEN', color: _marketClosed ? AppColors.loss : AppColors.profit),
              const SizedBox(width: 6),
            ],
            if (acc != null) Pill('${acc.isDemo ? 'DEMO' : 'LIVE'} · ${acc.accountNumber}', color: acc.isDemo ? AppColors.warning : AppColors.profit),
          ]),
          const SizedBox(height: 14),
          Row(children: [
            _sideBtn('Sell', t?.bid, d, !buy, AppColors.sell, () => setState(() => _side = 'sell')),
            const SizedBox(width: 10),
            _sideBtn('Buy', t?.ask, d, buy, AppColors.buy, () => setState(() => _side = 'buy')),
          ]),
          if (t != null && inst != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                'Spread ${((t.ask - t.bid) / inst.pipSize).toStringAsFixed(1)} pips',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textMute, fontSize: 11.5),
              ),
            ),
          const SizedBox(height: 14),
          SegmentedButton<bool>(
            segments: const [ButtonSegment(value: false, label: Text('Market')), ButtonSegment(value: true, label: Text('Pending'))],
            selected: {_pending},
            showSelectedIcon: false,
            onSelectionChanged: (s) => setState(() {
              _pending = s.first;
              if (_pending && _price.text.isEmpty && t != null) _price.text = (buy ? t.ask : t.bid).toStringAsFixed(d);
            }),
          ),
          if (_pending) ...[
            const SizedBox(height: 12),
            Row(children: [
              for (final pt in const ['limit', 'stop', 'stop_limit'])
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: ChoiceChip(
                      label: SizedBox(width: double.infinity, child: Text(pt == 'stop_limit' ? 'Stop limit' : titleCase(pt), textAlign: TextAlign.center)),
                      selected: _pendingType == pt,
                      showCheckmark: false,
                      onSelected: (_) => setState(() => _pendingType = pt),
                    ),
                  ),
                ),
            ]),
            const SizedBox(height: 12),
            _numField(_price, _pendingType == 'limit' ? 'Limit price' : 'Stop price'),
            if (_pendingType == 'stop_limit') ...[const SizedBox(height: 10), _numField(_stopLimit, 'Limit price')],
          ],
          const SizedBox(height: 16),
          const Text('Volume (lots)', style: TextStyle(color: AppColors.textDim, fontSize: 12.5)),
          const SizedBox(height: 6),
          Row(children: [
            _stepBtn(Icons.remove, () => _step(-1)),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _lots,
                textAlign: TextAlign.center,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                onChanged: (_) => setState(() {}),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(vertical: 12)),
              ),
            ),
            const SizedBox(width: 10),
            _stepBtn(Icons.add, () => _step(1)),
          ]),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            for (final v in const [0.01, 0.05, 0.1, 0.5, 1.0])
              ActionChip(
                label: Text(fmtLots(v)),
                onPressed: () => setState(() => _lots.text = fmtLots(snapLots(v, inst?.lotStep ?? 0.01, inst?.minLot ?? 0.01, inst?.maxLot ?? 100))),
              ),
          ]),
          const SizedBox(height: 12),
          _levelRow('Stop loss', _useSl, (v) => _toggleLevel(true, v, t), _sl),
          _levelRow('Take profit', _useTp, (v) => _toggleLevel(false, v, t), _tp),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.surface2, borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              _info('Required margin', margin == null ? '—' : fmtMoney(margin)),
              _info('Free margin', fmtMoney(tr.freeMargin)),
              _info('Leverage', '1:${acc?.leverage ?? '—'}'),
              if (inst != null) _info('Contract size', fmtNum(inst.contractSize, 0)),
            ]),
          ),
          if (!_pending && margin != null && margin > tr.freeMargin)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('Not enough free margin for this volume.', style: TextStyle(color: AppColors.loss, fontSize: 12.5)),
            ),
          if (!_pending && _marketClosed)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Market closed${_status?['reason'] != null ? ' — ${_status!['reason']}' : ''}. Use a pending order.',
                  style: const TextStyle(color: AppColors.warning, fontSize: 12.5)),
            ),
          const SizedBox(height: 16),
          Button3D(
            height: 56,
            colors: buy ? const [Color(0xFF60A5FA), Color(0xFF1D4ED8)] : const [Color(0xFFF87171), Color(0xFFB91C1C)],
            onPressed: _busy || acc == null ? null : () => _submit(t),
            child: _busy
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                : Text(
                    '${_pending ? 'Place ' : ''}${buy ? 'Buy' : 'Sell'} ${_pending ? _pendingType.replaceAll('_', ' ') : ''} ${fmtLots(_lotsVal)} lots',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
          ),
          const SizedBox(height: 6),
          const Text('CFDs carry a high risk of losing money due to leverage.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMute, fontSize: 11)),
        ]),
      ),
    );
  }

  Widget _sideBtn(String label, double? price, int d, bool selected, Color c, VoidCallback onTap) => Expanded(
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: selected ? c : c.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.withValues(alpha: selected ? 1 : 0.4)),
            ),
            child: Column(children: [
              Text(label.toUpperCase(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: selected ? Colors.white70 : c)),
              const SizedBox(height: 2),
              Text(fmtPrice(price, d),
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: selected ? Colors.white : c, fontFeatures: const [FontFeature.tabularFigures()])),
            ]),
          ),
        ),
      );

  Widget _stepBtn(IconData i, VoidCallback f) => SizedBox(
        width: 48,
        height: 48,
        child: OutlinedButton(onPressed: f, style: OutlinedButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(48, 48)), child: Icon(i)),
      );

  Widget _numField(TextEditingController c, String label) => TextField(
        controller: c,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(labelText: label),
      );

  Widget _levelRow(String label, bool on, ValueChanged<bool> toggle, TextEditingController c) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(children: [
          SizedBox(
            width: 130,
            child: Row(children: [
              Switch(value: on, onChanged: toggle),
              const SizedBox(width: 4),
              Flexible(child: Text(label, style: const TextStyle(fontSize: 13))),
            ]),
          ),
          Expanded(
            child: on
                ? TextField(
                    controller: c,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
                    decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                  )
                : const Text('Not set', style: TextStyle(color: AppColors.textMute)),
          ),
        ]),
      );

  Widget _info(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Expanded(child: Text(k, style: const TextStyle(color: AppColors.textDim, fontSize: 12.5))),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ]),
      );
}
