import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/format.dart';
import '../models/models.dart';
import '../services/socket.dart';
import 'market_state.dart';

class TradeEvent {
  final String message;
  final bool isError;
  TradeEvent(this.message, {this.isError = false});
}

class TradingState extends ChangeNotifier {
  final api = Api.I;
  final MarketState market;

  List<TradingAccount> accounts = [];
  String? activeId;
  List<Position> positions = [];
  List<PendingOrder> orders = [];
  bool loadingAccounts = false;
  String? error;
  SocketStatus tradeWs = SocketStatus.disconnected;
  /// Bumped whenever a trade closes, so the history list knows to reload.
  int historyRev = 0;

  final _events = StreamController<TradeEvent>.broadcast();
  Stream<TradeEvent> get events => _events.stream;

  ReconnectingSocket? _socket;
  Timer? _fast, _slow;
  bool _paused = false;
  static const _kActive = 'active_account_v1';

  TradingState(this.market) {
    market.addListener(_recalc);
  }

  TradingAccount? get active {
    for (final a in accounts) {
      if (a.id == activeId) return a;
    }
    return accounts.isEmpty ? null : accounts.first;
  }

  /// Includes wallet-bound accounts: for wallet-linked users the backend credits
  /// deposits to that account, so hiding it hid their money (web shows it too).
  List<TradingAccount> get tradableAccounts => accounts.where((a) => a.isActive).toList();

  // ── Live account metrics (same formulas as the web terminal) ──
  double get floating => positions.fold(0.0, (s, p) => s + p.profit);
  double get balance => active?.balance ?? 0;
  double get credit => active?.credit ?? 0;
  double get equity => balance + credit + floating;
  double get marginUsed => active?.marginUsed ?? 0;
  double get freeMargin => equity - marginUsed;
  double? get marginLevel => marginUsed > 0 ? equity / marginUsed * 100 : null;

  Future<void> start() async {
    await loadAccounts();
    _fast ??= Timer.periodic(const Duration(seconds: 3), (_) {
      if (!_paused) {
        refreshPositions();
        refreshAccounts(silent: true);
      }
    });
    _slow ??= Timer.periodic(const Duration(seconds: 8), (_) {
      if (!_paused) refreshOrders();
    });
  }

  void pause() {
    _paused = true;
    _socket?.close();
  }

  void resume() {
    _paused = false;
    _connectTradeSocket();
    refreshAll();
  }

  Future<void> refreshAll() async {
    await Future.wait([refreshAccounts(silent: true), refreshPositions(), refreshOrders()]);
  }

  Future<void> loadAccounts() async {
    loadingAccounts = true;
    notifyListeners();
    try {
      await refreshAccounts();
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_kActive);
      final t = tradableAccounts;
      if (saved != null && t.any((a) => a.id == saved)) {
        activeId = saved;
      } else if (t.isNotEmpty) {
        activeId = (t.firstWhere((a) => !a.isDemo, orElse: () => t.first)).id;
      }
      error = null;
      await Future.wait([refreshPositions(), refreshOrders()]);
      _connectTradeSocket();
    } catch (e) {
      error = e.toString();
    }
    loadingAccounts = false;
    notifyListeners();
  }

  Future<void> refreshAccounts({bool silent = false}) async {
    try {
      final j = await api.get('/accounts');
      accounts = asList(j).map(TradingAccount.fromJson).toList();
      if (activeId != null && !accounts.any((a) => a.id == activeId)) activeId = null;
      notifyListeners();
    } catch (e) {
      if (!silent) rethrow;
    }
  }

  Future<void> selectAccount(String id) async {
    if (id == activeId) return;
    activeId = id;
    positions = [];
    orders = [];
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kActive, id);
    _socket?.close();
    _socket = null;
    _connectTradeSocket();
    await Future.wait([refreshPositions(), refreshOrders()]);
  }

  void _connectTradeSocket() {
    final id = active?.id;
    if (id == null || _paused) return;
    _socket ??= ReconnectingSocket(
      urlBuilder: () => Uri.parse('${AppConfig.wsBase}/ws/trades/$id?token=${Uri.encodeComponent(api.session.access ?? '')}'),
      maxBackoff: const Duration(seconds: 48),
      onStatus: (s) {
        tradeWs = s;
        notifyListeners();
      },
      onConnected: refreshAll,
      onMessage: _onTradeMsg,
    );
    _socket!.connect();
  }

  void _onTradeMsg(dynamic j) {
    if (j is! Map) return;
    final type = j['type']?.toString();
    switch (type) {
      case 'position_closed':
        final reason = j['reason']?.toString();
        historyRev++;
        // No reason = the user's own (possibly partial) close, already toasted by
        // the sheet; the same event fires for partial closes, so don't drop the row.
        if (reason == 'sl' || reason == 'tp' || reason == 'copy_close') {
          final p = toD(j['profit']);
          final label = reason == 'sl' ? 'Stop loss hit' : reason == 'tp' ? 'Take profit hit' : 'Closed by strategy provider';
          positions.removeWhere((x) => x.id == j['position_id']?.toString());
          _events.add(TradeEvent('$label · ${fmtMoney(p, sign: true)}', isError: p < 0));
        }
        notifyListeners();
        refreshAll();
        break;
      case 'order_filled':
        _events.add(TradeEvent('Pending ${j['side'] ?? ''} ${j['symbol'] ?? ''} filled at ${j['price'] ?? ''}'));
        refreshAll();
        break;
      case 'stop_out':
        positions.removeWhere((x) => x.id == j['position_id']?.toString());
        historyRev++;
        notifyListeners();
        _events.add(TradeEvent('Stop out: ${j['symbol'] ?? ''} closed · ${fmtMoney(toD(j['profit']), sign: true)}', isError: true));
        refreshAll();
        break;
      case 'margin_call':
        _events.add(TradeEvent('Margin call! Margin level ${toD(j['margin_level']).toStringAsFixed(1)}%', isError: true));
        break;
      case 'position_opened':
      case 'position_updated':
      case 'order_update':
        refreshAll();
        break;
    }
  }

  Future<void> refreshPositions() async {
    final id = active?.id;
    if (id == null) return;
    try {
      final j = await api.get('/positions/', query: {'account_id': id, 'status': 'open'});
      if (id != active?.id) return;
      positions = asList(j).map(Position.fromJson).toList()
        ..sort((a, b) => (b.createdAt ?? DateTime(0)).compareTo(a.createdAt ?? DateTime(0)));
      _recalc(notify: false);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> refreshOrders() async {
    final id = active?.id;
    if (id == null) return;
    try {
      final j = await api.get('/orders/', query: {'account_id': id, 'status': 'pending'});
      if (id != active?.id) return;
      orders = asList(j).map(PendingOrder.fromJson).toList();
      notifyListeners();
    } catch (_) {}
  }

  /// Live P&L from ticks. Converts quote-currency P&L into USD using a direct
  /// or inverse USD pair; if neither is quoted, keeps the server's figure.
  void _recalc({bool notify = true}) {
    var changed = false;
    for (final p in positions) {
      final t = market.ticks[p.symbol];
      final inst = market.instruments[p.symbol];
      if (t == null || inst == null) continue;
      final cp = p.isBuy ? t.bid : t.ask;
      p.currentPrice = cp;
      final cs = p.contractSize > 0 ? p.contractSize : inst.contractSize;
      var pnl = (p.isBuy ? cp - p.openPrice : p.openPrice - cp) * p.lots * cs;
      if (inst.quote != 'USD') {
        if (inst.base == 'USD') {
          pnl = pnl / cp;
        } else {
          final r = market.usdRate(inst.quote);
          if (r == null) continue;
          pnl = pnl * r;
        }
      }
      if ((pnl - p.profit).abs() > 1e-9) {
        p.profit = pnl;
        changed = true;
      }
    }
    if (changed && notify) notifyListeners();
  }

  // ── Actions ──

  Future<Map<String, dynamic>> placeOrder({
    required String symbol,
    required String side,
    required String orderType,
    required double lots,
    double? price,
    double? stopLimitPrice,
    double? stopLoss,
    double? takeProfit,
  }) async {
    final id = active?.id;
    if (id == null) throw ApiException('Select a trading account first.');
    final j = await api.post('/orders/', body: {
      'account_id': id,
      'symbol': symbol,
      'side': side,
      'order_type': orderType,
      'lots': lots,
      'price': price,
      'stop_limit_price': stopLimitPrice,
      'stop_loss': stopLoss,
      'take_profit': takeProfit,
    });
    unawaited(refreshAll());
    return Map<String, dynamic>.from(j as Map);
  }

  Future<Map<String, dynamic>> closePosition(Position p, {double? lots}) async {
    final j = await api.post('/positions/${p.id}/close', body: lots == null || lots >= p.lots ? {} : {'lots': lots});
    positions.removeWhere((x) => x.id == p.id && (lots == null || lots >= p.lots));
    historyRev++;
    notifyListeners();
    unawaited(refreshAll());
    return Map<String, dynamic>.from(j as Map);
  }

  /// Merge-patch: pass `clearSl`/`clearTp` to remove a level.
  Future<void> modifyPosition(Position p, {double? sl, double? tp, bool clearSl = false, bool clearTp = false}) async {
    final body = <String, dynamic>{};
    if (clearSl) {
      body['stop_loss'] = null;
    } else if (sl != null) {
      body['stop_loss'] = sl;
    }
    if (clearTp) {
      body['take_profit'] = null;
    } else if (tp != null) {
      body['take_profit'] = tp;
    }
    await api.put('/positions/${p.id}', body: body);
    await refreshPositions();
  }

  Future<void> cancelOrder(PendingOrder o) async {
    await api.delete('/orders/${o.id}');
    await refreshOrders();
  }

  Future<void> modifyOrder(PendingOrder o, {double? price, double? sl, double? tp}) async {
    await api.put('/orders/${o.id}', body: {
      'price': ?price,
      'stop_loss': ?sl,
      'take_profit': ?tp,
    });
    await refreshOrders();
  }

  Future<int> closeAll({bool? profitable}) async {
    final targets = positions.where((p) => !p.isCopy && (profitable == null || (profitable ? p.profit > 0 : p.profit < 0))).toList();
    final results = await Future.wait(targets.map((p) => api.post('/positions/${p.id}/close', body: {}).then((_) => true).catchError((_) => false)));
    historyRev++;
    await refreshAll();
    return results.where((r) => r).length;
  }

  Future<List<ClosedTrade>> history({int page = 1, int perPage = 50}) async {
    final id = active?.id;
    if (id == null) return [];
    final j = await api.get('/portfolio/trades', query: {'account_id': id, 'page': page, 'per_page': perPage});
    return asList(j).map(ClosedTrade.fromJson).toList();
  }

  Future<void> setLeverage(String accountId, int leverage) async {
    await api.patch('/accounts/$accountId/leverage', body: {'leverage': leverage});
    await refreshAccounts();
  }

  void reset() {
    _socket?.close();
    _socket = null;
    _fast?.cancel();
    _slow?.cancel();
    _fast = _slow = null;
    accounts = [];
    positions = [];
    orders = [];
    activeId = null;
    notifyListeners();
  }

  @override
  void dispose() {
    market.removeListener(_recalc);
    reset();
    _events.close();
    super.dispose();
  }
}
