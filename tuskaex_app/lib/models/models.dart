import '../core/format.dart';

class User {
  final String id, email, firstName, lastName, kycStatus, status;
  final String? phone, country;
  final bool isDemo, twoFactorEnabled, emailVerified;
  final double mainWalletBalance;
  User.fromJson(Map<String, dynamic> j)
      : id = j['id'].toString(),
        email = (j['email'] ?? '').toString(),
        firstName = (j['first_name'] ?? '').toString(),
        lastName = (j['last_name'] ?? '').toString(),
        kycStatus = (j['kyc_status'] ?? 'pending').toString(),
        status = (j['status'] ?? '').toString(),
        phone = j['phone']?.toString(),
        country = j['country']?.toString(),
        isDemo = j['is_demo'] == true,
        twoFactorEnabled = j['two_factor_enabled'] == true,
        emailVerified = j['email_verified'] == true,
        mainWalletBalance = toD(j['main_wallet_balance']);

  String get name {
    final n = '$firstName $lastName'.trim();
    return n.isEmpty ? email : n;
  }

  String get initials {
    final a = firstName.isNotEmpty ? firstName[0] : (email.isNotEmpty ? email[0] : '?');
    final b = lastName.isNotEmpty ? lastName[0] : '';
    return (a + b).toUpperCase();
  }

  bool get kycApproved => kycStatus == 'approved' || kycStatus == 'verified';
}

class Instrument {
  final String id, symbol, displayName, segment, base, quote;
  final int digits;
  final double pipSize, minLot, maxLot, lotStep, contractSize, marginRate;
  Instrument.fromJson(Map<String, dynamic> j)
      : id = j['id'].toString(),
        symbol = j['symbol'].toString(),
        displayName = (j['display_name'] ?? j['symbol']).toString(),
        segment = (j['segment'] is Map ? j['segment']['name'] : j['segment'] ?? 'other').toString().toLowerCase(),
        base = (j['base_currency'] ?? _ccy(j['symbol'], 0) ?? '').toString(),
        quote = (j['quote_currency'] ?? _ccy(j['symbol'], 3) ?? 'USD').toString(),
        digits = toI(j['digits'], 5),
        pipSize = toD(j['pip_size'], 0.0001),
        minLot = toD(j['min_lot'], 0.01),
        maxLot = toD(j['max_lot'], 100),
        lotStep = toD(j['lot_step'], 0.01),
        contractSize = toD(j['contract_size'], 100000),
        marginRate = toD(j['margin_rate'], 0.01);

  static final _metal = RegExp(r'^(XAU|XAG|XPT|XPD)');

  /// Fallback when the API omits a currency: 6-letter FX-style symbols.
  static String? _ccy(dynamic sym, int at) {
    final s = sym?.toString() ?? '';
    return RegExp(r'^[A-Z]{6}$').hasMatch(s) ? s.substring(at, at + 3) : null;
  }

  /// The DB lumps metals into `commodities`; split them out like the web terminal.
  String get group {
    if (_metal.hasMatch(symbol)) return 'metals';
    if (segment.contains('forex') || segment == 'fx') return 'forex';
    if (segment.contains('crypto')) return 'crypto';
    if (segment.contains('indic') || segment.contains('index')) return 'indices';
    if (segment.contains('commod') || segment.contains('energ')) return 'commodities';
    if (segment.contains('stock') || segment.contains('share')) return 'stocks';
    return 'other';
  }
}

class Tick {
  final String symbol;
  final double bid, ask;
  final int tsMs; // 0 = unknown; never substitute the phone clock
  /// The feed marked this quote frozen. Kept (so the row still shows the last
  /// price) but rendered dimmed and excluded from trading decisions.
  final bool stale;
  Tick(this.symbol, this.bid, this.ask, this.tsMs, {this.stale = false});
  static Tick? fromJson(dynamic j) {
    if (j is! Map) return null;
    final s = j['symbol']?.toString();
    final b = toDN(j['bid']), a = toDN(j['ask']);
    if (s == null || b == null || a == null || b <= 0 || a <= 0) return null;
    return Tick(s.toUpperCase(), b, a, toI(j['ts_ms']), stale: j['stale'] == true);
  }

  double get mid => (bid + ask) / 2;
}

class AccountGroup {
  final String id, name;
  final double minimumDeposit, commissionPerLot, spreadMarkup;
  final int leverageDefault, maxLeverage;
  final bool swapFree, kycUnlockRequired;
  final String? description;
  AccountGroup.fromJson(Map<String, dynamic> j)
      : id = j['id'].toString(),
        name = (j['name'] ?? '').toString(),
        description = j['description']?.toString(),
        minimumDeposit = toD(j['minimum_deposit']),
        commissionPerLot = toD(j['commission_per_lot']),
        spreadMarkup = toD(j['spread_markup']),
        leverageDefault = toI(j['leverage_default'], 100),
        maxLeverage = toI(j['effective_max_leverage'] ?? j['max_leverage'] ?? j['leverage_default'], 100),
        swapFree = j['swap_free'] == true,
        kycUnlockRequired = j['kyc_unlock_required'] == true;
}

class TradingAccount {
  final String id, accountNumber, currency;
  double balance, credit, equity, marginUsed, freeMargin, marginLevel;
  final int leverage;
  final bool isDemo, isActive, isWalletAccount, isCopyTrading;
  final AccountGroup? group;
  TradingAccount.fromJson(Map<String, dynamic> j)
      : id = j['id'].toString(),
        accountNumber = (j['account_number'] ?? '').toString(),
        currency = (j['currency'] ?? 'USD').toString(),
        balance = toD(j['balance']),
        credit = toD(j['credit']),
        equity = toD(j['equity']),
        marginUsed = toD(j['margin_used']),
        freeMargin = toD(j['free_margin']),
        marginLevel = toD(j['margin_level']),
        leverage = toI(j['leverage'], 100),
        isDemo = j['is_demo'] == true,
        isActive = j['is_active'] != false,
        isWalletAccount = j['is_wallet_account'] == true,
        isCopyTrading = j['is_copy_trading'] == true,
        group = j['account_group'] is Map ? AccountGroup.fromJson(Map<String, dynamic>.from(j['account_group'])) : null;

  String get groupName => isWalletAccount ? 'Wallet account' : (group?.name ?? (isDemo ? 'Demo' : 'Live'));
}

class Position {
  final String id, accountId, symbol, side, tradeType;
  final double lots, openPrice, swap, commission, contractSize;
  double? currentPrice, stopLoss, takeProfit;
  double profit;
  final DateTime? createdAt;
  Position.fromJson(Map<String, dynamic> j)
      : id = j['id'].toString(),
        accountId = (j['account_id'] ?? '').toString(),
        symbol = j['symbol'].toString(),
        side = (j['side'] ?? 'buy').toString().toLowerCase(),
        tradeType = (j['trade_type'] ?? 'self_trade').toString(),
        lots = toD(j['lots']),
        openPrice = toD(j['open_price']),
        swap = toD(j['swap']),
        commission = toD(j['commission']),
        contractSize = toD(j['contract_size'], 0),
        currentPrice = toDN(j['current_price']),
        stopLoss = toDN(j['stop_loss']),
        takeProfit = toDN(j['take_profit']),
        profit = toD(j['profit']),
        createdAt = parseTime(j['created_at']);

  bool get isBuy => side == 'buy';
  bool get isCopy => tradeType == 'copy_trade';
}

class PendingOrder {
  final String id, symbol, side, orderType, status;
  final double lots, price;
  final double? stopLoss, takeProfit;
  final DateTime? createdAt;
  PendingOrder.fromJson(Map<String, dynamic> j)
      : id = j['id'].toString(),
        symbol = j['symbol'].toString(),
        side = (j['side'] ?? 'buy').toString().toLowerCase(),
        orderType = (j['order_type'] ?? 'limit').toString().toLowerCase(),
        status = (j['status'] ?? 'pending').toString(),
        lots = toD(j['lots']),
        price = toD(j['price']),
        stopLoss = toDN(j['stop_loss']),
        takeProfit = toDN(j['take_profit']),
        createdAt = parseTime(j['created_at']);

  String get label => '${side.toUpperCase()} ${orderType.replaceAll('_', ' ').toUpperCase()}';
}

class ClosedTrade {
  final String id, symbol, side, closeReason;
  final double lots, openPrice, closePrice, pnl, commission, swap;
  final DateTime? openedAt, closedAt;
  ClosedTrade.fromJson(Map<String, dynamic> j)
      : id = j['id'].toString(),
        symbol = j['symbol'].toString(),
        side = (j['side'] ?? 'buy').toString().toLowerCase(),
        closeReason = (j['close_reason'] ?? 'manual').toString(),
        lots = toD(j['lots']),
        openPrice = toD(j['open_price']),
        closePrice = toD(j['close_price']),
        pnl = toD(j['pnl']),
        commission = toD(j['commission']),
        swap = toD(j['swap']),
        openedAt = parseTime(j['opened_at']),
        closedAt = parseTime(j['close_time']);

  double get net => pnl - commission + swap;
}

class Bar {
  final int time; // epoch seconds, bar start
  double open, high, low, close;
  Bar(this.time, this.open, this.high, this.low, this.close);
  Bar.fromJson(Map<String, dynamic> j)
      : time = toI(j['time']),
        open = toD(j['open']),
        high = toD(j['high']),
        low = toD(j['low']),
        close = toD(j['close']);
}

class WalletTxn {
  final String id, type, method, status, currency;
  final double amount;
  final String? description, paymentLink;
  final DateTime? createdAt;
  WalletTxn.fromJson(Map<String, dynamic> j)
      : id = j['id'].toString(),
        type = (j['type'] ?? '').toString(),
        method = (j['method'] ?? '').toString(),
        status = (j['status'] ?? '').toString(),
        currency = (j['currency'] ?? 'USD').toString(),
        amount = toD(j['amount']),
        description = j['description']?.toString(),
        paymentLink = j['payment_link']?.toString(),
        createdAt = parseTime(j['created_at']);
}

class AppNotification {
  final String id, title, message, type;
  bool isRead;
  final DateTime? createdAt;
  AppNotification.fromJson(Map<String, dynamic> j)
      : id = j['id'].toString(),
        title = (j['title'] ?? '').toString(),
        message = (j['message'] ?? '').toString(),
        type = (j['type'] ?? '').toString(),
        isRead = j['is_read'] == true,
        createdAt = parseTime(j['created_at']);
}

List<Map<String, dynamic>> asList(dynamic data, [String key = 'items']) {
  final raw = data is List ? data : (data is Map ? (data[key] ?? const []) : const []);
  return [for (final e in raw as List) if (e is Map) Map<String, dynamic>.from(e)];
}
