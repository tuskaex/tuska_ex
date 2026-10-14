import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../models/models.dart';
import '../services/socket.dart';

/// Instruments + live quotes. Ticks arrive many times a second, so listeners
/// are notified on a 250ms frame instead of per tick.
class MarketState extends ChangeNotifier {
  final api = Api.I;
  final Map<String, Instrument> instruments = {};
  final Map<String, Tick> ticks = {};
  final Map<String, int> direction = {}; // +1 up, -1 down
  final Map<String, double> dayOpen = {};
  List<String> watchlist = [];
  SocketStatus wsStatus = SocketStatus.disconnected;
  bool loaded = false;
  String? error;

  static const groupOrder = ['forex', 'metals', 'commodities', 'indices', 'crypto', 'stocks', 'other'];
  static const _defaultWatch = [
    'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'US30', 'NAS100', 'XAGUSD', 'USOIL',
  ];
  static const _kWatch = 'watchlist_v1';

  late final ReconnectingSocket _socket = ReconnectingSocket(
    urlBuilder: () => Uri.parse('${AppConfig.wsBase}/ws/prices'),
    onMessage: _onPriceMsg,
    onStatus: (s) {
      wsStatus = s;
      _dirty = true;
    },
  );
  Timer? _frame, _poll;
  bool _dirty = false;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    watchlist = prefs.getStringList(_kWatch) ?? List.of(_defaultWatch);
    try {
      final list = await api.get('/instruments/', query: {'active_only': true}, auth: false);
      for (final j in asList(list)) {
        final i = Instrument.fromJson(j);
        instruments[i.symbol] = i;
      }
      watchlist = watchlist.where(instruments.containsKey).toList();
      await _pollPrices();
      loaded = true;
      error = null;
    } catch (e) {
      error = e.toString();
    }
    notifyListeners();
    _socket.connect();
    _frame ??= Timer.periodic(const Duration(milliseconds: 150), (_) {
      if (_dirty) {
        _dirty = false;
        notifyListeners();
      }
    });
    // Polled even while the socket is up: the /ws/prices relay can fall tens of
    // seconds behind under load, and REST is ~1s fresh. _apply keeps whichever
    // tick is newer by ts_ms, so the two sources merge cleanly (same as web).
    _poll ??= Timer.periodic(const Duration(seconds: 1), (_) {
      if (!_paused) _pollPrices();
    });
  }

  Future<void> retry() async {
    error = null;
    notifyListeners();
    await init();
  }

  Future<void> _pollPrices() async {
    try {
      final list = await api.get('/instruments/prices/all', auth: false);
      if (list is List) {
        for (final j in list) {
          _apply(Tick.fromJson(j));
        }
        _dirty = true;
      }
    } catch (_) {}
  }

  void _onPriceMsg(dynamic j) {
    if (j is List) {
      for (final e in j) {
        _apply(Tick.fromJson(e));
      }
    } else if (j is Map && (j['prices'] ?? j['ticks'] ?? j['data']) is List) {
      for (final e in (j['prices'] ?? j['ticks'] ?? j['data']) as List) {
        _apply(Tick.fromJson(e));
      }
    } else {
      _apply(Tick.fromJson(j));
    }
    _dirty = true;
  }

  void _apply(Tick? t) {
    if (t == null) return;
    final prev = ticks[t.symbol];
    if (prev != null && t.tsMs > 0 && prev.tsMs > 0 && t.tsMs < prev.tsMs) return;
    if (prev != null && t.bid != prev.bid) direction[t.symbol] = t.bid > prev.bid ? 1 : -1;
    ticks[t.symbol] = t;
  }

  bool _paused = false;

  void pause() {
    _paused = true;
    _socket.close();
  }

  void resume() {
    _paused = false;
    if (_socket.status == SocketStatus.disconnected) _socket.connect();
    _pollPrices();
    final today = DateTime.now().toUtc().day;
    if (today != _dayOpenDay) {
      // Daily candles roll at 00:00 UTC; yesterday's opens would skew the %.
      final syms = dayOpen.keys.toList();
      dayOpen.clear();
      loadDayOpens(syms);
    }
  }

  int _dayOpenDay = DateTime.now().toUtc().day;

  Future<void> loadDayOpens(Iterable<String> symbols) async {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    _dayOpenDay = DateTime.now().toUtc().day;
    final todo = symbols.where((s) => !dayOpen.containsKey(s)).toList();
    // Small parallel waves, like the web: fast without tripping the API rate limit.
    for (var i = 0; i < todo.length; i += 4) {
      await Future.wait(todo.skip(i).take(4).map((s) async {
        try {
          final j = await api.get('/instruments/$s/bars',
              auth: false, query: {'resolution': 'D', 'from': now - 10 * 86400, 'to': now, 'live': 1});
          final bars = asList(j, 'bars');
          if (bars.isNotEmpty) dayOpen[s] = Bar.fromJson(bars.last).open;
        } catch (_) {}
      }));
      notifyListeners();
    }
  }

  /// Recent closes per symbol for the mini sparklines (15m bars, last ~12h).
  final Map<String, List<double>> sparks = {};
  DateTime? _sparksAt;

  Future<void> loadSparks(Iterable<String> symbols, {bool force = false}) async {
    if (!force && _sparksAt != null && DateTime.now().difference(_sparksAt!) < const Duration(minutes: 2)) return;
    _sparksAt = DateTime.now();
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final list = symbols.toList();
    for (var i = 0; i < list.length; i += 4) {
      await Future.wait(list.skip(i).take(4).map((s) async {
        try {
          final j = await api.get('/instruments/$s/bars',
              auth: false, query: {'resolution': '15', 'from': now - 48 * 900, 'to': now, 'live': 1});
          final bars = asList(j, 'bars');
          final closes = bars.map((b) => Bar.fromJson(b).close).where((v) => v > 0).toList();
          if (closes.length > 48) closes.removeRange(0, closes.length - 48);
          if (closes.length >= 2) sparks[s] = closes;
        } catch (_) {}
      }));
      notifyListeners();
    }
  }

  double? changePct(String s) {
    final o = dayOpen[s], t = ticks[s];
    if (o == null || t == null || o <= 0 || t.stale) return null;
    return (t.mid - o) / o * 100;
  }

  bool isWatched(String s) => watchlist.contains(s);

  Future<void> toggleWatch(String s) async {
    isWatched(s) ? watchlist.remove(s) : watchlist.add(s);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_kWatch, watchlist);
  }

  List<Instrument> byGroup(String group) {
    final l = instruments.values.where((i) => group == 'all' || i.group == group).toList()
      ..sort((a, b) {
        final g = groupOrder.indexOf(a.group).compareTo(groupOrder.indexOf(b.group));
        return g != 0 ? g : a.symbol.compareTo(b.symbol);
      });
    return l;
  }

  List<String> get availableGroups =>
      groupOrder.where((g) => instruments.values.any((i) => i.group == g)).toList();

  /// Value of 1 unit of `ccy` in USD, from live quotes.
  double? usdRate(String ccy) {
    if (ccy == 'USD') return 1;
    final direct = ticks['${ccy}USD'];
    if (direct != null) return direct.mid;
    final inverse = ticks['USD$ccy'];
    if (inverse != null && inverse.mid > 0) return 1 / inverse.mid;
    return null;
  }

  @override
  void dispose() {
    _frame?.cancel();
    _poll?.cancel();
    _socket.close();
    super.dispose();
  }
}
