import 'package:intl/intl.dart';

/// The API mixes JSON numbers and Decimal-as-string ("10000.00000000", "0E-8").
double toD(dynamic v, [double fallback = 0]) {
  if (v == null) return fallback;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString()) ?? fallback;
}

double? toDN(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

int toI(dynamic v, [int fallback = 0]) {
  if (v == null) return fallback;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString()) ?? double.tryParse(v.toString())?.toInt() ?? fallback;
}

String fmtMoney(double v, {String currency = 'USD', bool sign = false}) {
  final f = NumberFormat('#,##0.00', 'en_US').format(v.abs());
  final s = v < 0 ? '-' : (sign && v > 0 ? '+' : '');
  final sym = currency == 'USD' ? '\$' : '$currency ';
  return '$s$sym$f';
}

String fmtNum(double v, int decimals) {
  if (!v.isFinite) return '—';
  return NumberFormat.decimalPatternDigits(locale: 'en_US', decimalDigits: decimals).format(v);
}

String fmtPrice(double? v, int digits) => v == null ? '—' : v.toStringAsFixed(digits);

String fmtLots(double v) {
  final s = v.toStringAsFixed(2);
  return s;
}

String fmtPct(double v, {bool sign = true}) => '${sign && v > 0 ? '+' : ''}${v.toStringAsFixed(2)}%';

DateTime? parseTime(dynamic v) {
  if (v == null) return null;
  return DateTime.tryParse(v.toString())?.toLocal();
}

String fmtDateTime(DateTime? d) => d == null ? '—' : DateFormat('dd MMM yyyy, HH:mm').format(d);

String fmtDate(DateTime? d) => d == null ? '—' : DateFormat('dd MMM yyyy').format(d);

String fmtMonth(DateTime? d) => d == null ? '—' : DateFormat('MMM yyyy').format(d);

/// Snap to the instrument's lot step, guarding against float drift.
double snapLots(double lots, double step, double min, double max) {
  if (step <= 0) step = 0.01;
  final snapped = (lots / step).round() * step;
  return double.parse(snapped.clamp(min, max).toStringAsFixed(2));
}

String titleCase(String s) => s.isEmpty
    ? s
    : s.split(RegExp(r'[_\s]+')).map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
