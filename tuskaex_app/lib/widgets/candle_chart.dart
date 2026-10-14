import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../models/models.dart';

class PriceLine {
  final double price;
  final Color color;
  final String label;
  final bool dashed;
  const PriceLine(this.price, this.color, this.label, {this.dashed = true});
}

enum ChartStyle { candles, hollow, heikinAshi, bars, line, area }

extension ChartStyleLabel on ChartStyle {
  String get label => switch (this) {
        ChartStyle.candles => 'Candles',
        ChartStyle.hollow => 'Hollow candles',
        ChartStyle.heikinAshi => 'Heikin Ashi',
        ChartStyle.bars => 'OHLC bars',
        ChartStyle.line => 'Line',
        ChartStyle.area => 'Area',
      };
  IconData get icon => switch (this) {
        ChartStyle.candles => Icons.candlestick_chart_rounded,
        ChartStyle.hollow => Icons.candlestick_chart_outlined,
        ChartStyle.heikinAshi => Icons.waterfall_chart_rounded,
        ChartStyle.bars => Icons.align_vertical_center_rounded,
        ChartStyle.line => Icons.show_chart_rounded,
        ChartStyle.area => Icons.area_chart_rounded,
      };
}

/// Up/down colour scheme for the chart.
class CandlePalette {
  final String name;
  final Color up, down;
  const CandlePalette(this.name, this.up, this.down);
  static const classic = CandlePalette('Classic', Color(0xFF26A69A), Color(0xFFEF5350)); // TradingView default
  static const vivid = CandlePalette('Vivid', Color(0xFF22C55E), Color(0xFFEF4444));
  static const blueRed = CandlePalette('Blue / Red', Color(0xFF2962FF), Color(0xFFF23645)); // MT5-style
  static const all = [classic, vivid, blueRed];
}

/// TradingView-style chart: candles or area, pinch to zoom, drag to pan,
/// long-press for a crosshair with an OHLC readout, double-tap to snap back.
class CandleChart extends StatefulWidget {
  final List<Bar> bars;
  final int digits;
  final double? lastPrice;
  final List<PriceLine> lines;
  final int tfSeconds;
  final ChartStyle style;
  final CandlePalette palette;
  const CandleChart({
    super.key,
    required this.bars,
    required this.digits,
    this.lastPrice,
    this.lines = const [],
    this.tfSeconds = 300,
    this.style = ChartStyle.candles,
    this.palette = CandlePalette.classic,
  });

  @override
  State<CandleChart> createState() => _CandleChartState();
}

class _CandleChartState extends State<CandleChart> {
  double _visible = 48;
  double _offset = 0; // bars scrolled back from the latest (fractional = smooth pan)
  double _startVisible = 48;
  double _startOffset = 0;
  Offset _startFocal = Offset.zero;
  double _width = 1;
  Offset? _cross;
  int _lastLen = 0;

  @override
  void didUpdateWidget(covariant CandleChart old) {
    super.didUpdateWidget(old);
    // When a new bar arrives while the user is looking at history, keep the view still.
    final grew = widget.bars.length - _lastLen;
    if (_offset > 0 && grew > 0 && grew < 5) _offset += grew;
    _lastLen = widget.bars.length;
  }

  @override
  Widget build(BuildContext context) {
    _lastLen = widget.bars.length;
    return LayoutBuilder(builder: (context, c) {
      _width = math.max(1, c.maxWidth - _ChartPainter.axisW);
      final n = widget.bars.length.toDouble();
      return GestureDetector(
        onDoubleTap: () => setState(() {
          _offset = 0;
          _visible = 48;
        }),
        onLongPressStart: (d) {
          HapticFeedback.selectionClick();
          setState(() => _cross = d.localPosition);
        },
        onLongPressMoveUpdate: (d) => setState(() => _cross = d.localPosition),
        onLongPressEnd: (_) => setState(() => _cross = null),
        onScaleStart: (d) {
          _startVisible = _visible;
          _startOffset = _offset;
          _startFocal = d.localFocalPoint;
        },
        onScaleUpdate: (d) {
          if (_cross != null) return;
          setState(() {
            _visible = (_startVisible / d.horizontalScale).clamp(20.0, math.max(25.0, math.min(320.0, n)));
            final cw = _width / _visible;
            _offset = (_startOffset + (d.localFocalPoint.dx - _startFocal.dx) / cw).clamp(0.0, math.max(0.0, n - 12));
          });
        },
        child: CustomPaint(
          size: Size(c.maxWidth, c.maxHeight),
          painter: _ChartPainter(
            bars: widget.bars,
            digits: widget.digits,
            visible: _visible,
            offset: _offset,
            lastPrice: widget.lastPrice,
            lines: widget.lines,
            tfSeconds: widget.tfSeconds,
            style: widget.style,
            up: widget.palette.up,
            down: widget.palette.down,
            cross: _cross,
          ),
        ),
      );
    });
  }
}

class _ChartPainter extends CustomPainter {
  static const axisW = 66.0;
  static const timeH = 22.0;
  static const topH = 22.0; // OHLC readout strip

  final Color up, down;
  final List<Bar> bars;
  final int digits;
  final double visible, offset;
  final double? lastPrice;
  final List<PriceLine> lines;
  final int tfSeconds;
  final ChartStyle style;
  final Offset? cross;

  _ChartPainter({
    required this.bars,
    required this.digits,
    required this.visible,
    required this.offset,
    required this.lastPrice,
    required this.lines,
    required this.tfSeconds,
    required this.style,
    required this.up,
    required this.down,
    required this.cross,
  });

  /// Heikin Ashi over the whole series (each bar depends on the previous one).
  static List<Bar> _heikin(List<Bar> src) {
    final out = <Bar>[];
    for (final b in src) {
      final c = (b.open + b.high + b.low + b.close) / 4;
      final o = out.isEmpty ? (b.open + b.close) / 2 : (out.last.open + out.last.close) / 2;
      out.add(Bar(b.time, o, math.max(b.high, math.max(o, c)), math.min(b.low, math.min(o, c)), c));
    }
    return out;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width - axisW;
    final top = topH;
    final h = size.height - timeH - top;
    if (bars.isEmpty || w <= 0 || h <= 0) return;

    final n = bars.length;
    final whole = offset.floor();
    final frac = offset - whole;
    final end = (n - whole).clamp(1, n);
    final count = visible.ceil() + 1;
    final start = math.max(0, end - count);
    final slice = (style == ChartStyle.heikinAshi ? _heikin(bars) : bars).sublist(start, end);
    final cw = w / visible;
    // Newest candle sits against the price axis; fractional offset pans smoothly.
    double xOf(int i) => w - (slice.length - i - 0.5) * cw + frac * cw;

    var lo = double.infinity, hi = -double.infinity;
    for (var i = 0; i < slice.length; i++) {
      if (xOf(i) < -cw) continue;
      lo = math.min(lo, slice[i].low);
      hi = math.max(hi, slice[i].high);
    }
    if (!lo.isFinite) return;
    if (lastPrice != null && offset < 1) {
      lo = math.min(lo, lastPrice!);
      hi = math.max(hi, lastPrice!);
    }
    final span0 = hi - lo;
    for (final l in lines) {
      if (l.price > lo - span0 * 0.4 && l.price < hi + span0 * 0.4) {
        lo = math.min(lo, l.price);
        hi = math.max(hi, l.price);
      }
    }
    if (hi <= lo) hi = lo + (lo.abs() * 0.001 + 1e-6);
    final pad = (hi - lo) * 0.1;
    lo -= pad;
    hi += pad;
    double y(double p) => top + h - (p - lo) / (hi - lo) * h;
    double priceAt(double yy) => lo + (top + h - yy) / h * (hi - lo);

    canvas.save();
    canvas.clipRect(Rect.fromLTWH(0, 0, size.width, size.height));

    // ── Grid (dotted) + price axis ──
    const axisStyle = TextStyle(color: Color(0xFF7C8AA5), fontSize: 10.5, fontFeatures: [FontFeature.tabularFigures()]);
    final gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.06)
      ..strokeWidth = 1;
    final step = _niceStep((hi - lo) / 5);
    final firstTick = (lo / step).ceil() * step;
    final liveY = lastPrice != null ? y(lastPrice!) : null;
    for (var p = firstTick; p <= hi; p += step) {
      final yy = y(p);
      _dotted(canvas, Offset(0, yy), Offset(w, yy), gridPaint, 3, 4);
      // Skip axis labels the live price tag would sit on top of.
      if (liveY != null && (yy - liveY).abs() < 16) continue;
      _text(canvas, p.toStringAsFixed(digits), Offset(w + 8, yy - 7), axisStyle);
    }
    // Axis separator
    canvas.drawLine(Offset(w, top), Offset(w, top + h), Paint()..color = Colors.white.withValues(alpha: 0.08));

    // ── Time axis ──
    final utc = tfSeconds >= 86400;
    final tf = utc ? DateFormat('dd MMM') : tfSeconds >= 3600 ? DateFormat('dd MMM HH:mm') : DateFormat('HH:mm');
    final labelEvery = math.max(1, (visible / (tfSeconds >= 3600 ? 3.2 : 4.5)).round());
    for (var i = 0; i < slice.length; i++) {
      if ((start + i) % labelEvery != 0) continue;
      final x = xOf(i);
      if (x < 0 || x > w) continue;
      _dotted(canvas, Offset(x, top), Offset(x, top + h), gridPaint, 3, 4);
      final t = DateTime.fromMillisecondsSinceEpoch(slice[i].time * 1000, isUtc: utc);
      final tp = _layout(tf.format(t), axisStyle);
      tp.paint(canvas, Offset((x - tp.width / 2).clamp(0, w - tp.width), top + h + 6));
    }

    canvas.save();
    canvas.clipRect(Rect.fromLTWH(0, top, w, h));

    switch (style) {
      case ChartStyle.area:
        _paintArea(canvas, slice, xOf, y, top, h);
      case ChartStyle.line:
        _paintLine(canvas, slice, xOf, y);
      case ChartStyle.bars:
        _paintOhlcBars(canvas, slice, xOf, y, cw);
      case ChartStyle.candles || ChartStyle.heikinAshi || ChartStyle.hollow:
        _paintCandles(canvas, slice, xOf, y, cw, hollow: style == ChartStyle.hollow);
    }

    // ── Position / order levels ──
    for (final l in lines) {
      if (l.price < lo || l.price > hi) continue;
      final yy = y(l.price);
      final p = Paint()
        ..color = l.color.withValues(alpha: 0.9)
        ..strokeWidth = 1.2;
      l.dashed ? _dotted(canvas, Offset(0, yy), Offset(w, yy), p, 6, 4) : canvas.drawLine(Offset(0, yy), Offset(w, yy), p);
      _pill(canvas, l.label, Offset(6, yy - 9), l.color, fg: Colors.white, small: true);
    }
    canvas.restore();

    // Off-screen level markers so a far TP/SL is never silently hidden.
    for (final l in lines) {
      if (l.price >= lo && l.price <= hi) continue;
      final above = l.price > hi;
      _pill(canvas, '${l.label} ${above ? '▲' : '▼'}', Offset(6, above ? top + 2 : top + h - 18), l.color, fg: Colors.white, small: true);
    }

    // ── Live price line + axis tag ──
    if (lastPrice != null && lastPrice! >= lo && lastPrice! <= hi) {
      final last = slice.last;
      final c = last.close >= last.open ? up : down;
      final yy = y(lastPrice!);
      _dotted(canvas, Offset(0, yy), Offset(w, yy), Paint()
        ..color = c.withValues(alpha: 0.85)
        ..strokeWidth = 1, 2, 3);
      _axisTag(canvas, lastPrice!.toStringAsFixed(digits), w, yy, c, size.width);
    }

    // ── OHLC readout (crosshair bar, else latest) ──
    var focus = slice.last;
    if (cross != null) {
      final i = ((cross!.dx - xOf(0)) / cw).round().clamp(0, slice.length - 1);
      focus = slice[i];
    }
    _ohlc(canvas, focus, w);

    // ── Crosshair ──
    if (cross != null) {
      final i = ((cross!.dx - xOf(0)) / cw).round().clamp(0, slice.length - 1);
      final cx = xOf(i);
      final cy = cross!.dy.clamp(top, top + h);
      final p = Paint()
        ..color = Colors.white.withValues(alpha: 0.55)
        ..strokeWidth = 1;
      _dotted(canvas, Offset(cx, top), Offset(cx, top + h), p, 4, 3);
      _dotted(canvas, Offset(0, cy), Offset(w, cy), p, 4, 3);
      canvas.drawCircle(Offset(cx, cy), 4, Paint()..color = Colors.white);
      canvas.drawCircle(Offset(cx, cy), 8, Paint()..color = Colors.white.withValues(alpha: 0.18));
      _axisTag(canvas, priceAt(cy).toStringAsFixed(digits), w, cy, const Color(0xFF334155), size.width);
      final t = DateTime.fromMillisecondsSinceEpoch(slice[i].time * 1000, isUtc: utc);
      final label = (utc ? DateFormat('EEE dd MMM yyyy') : DateFormat('dd MMM HH:mm')).format(t);
      final tp = _layout(label, const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700));
      final bx = (cx - tp.width / 2 - 6).clamp(0.0, w - tp.width - 12);
      canvas.drawRRect(
        RRect.fromRectAndRadius(Rect.fromLTWH(bx, top + h + 3, tp.width + 12, tp.height + 6), const Radius.circular(5)),
        Paint()..color = const Color(0xFF334155),
      );
      tp.paint(canvas, Offset(bx + 6, top + h + 6));
    }

    canvas.restore();
  }

  /// Flat, pixel-crisp candles as drawn by TradingView / MT5: solid body,
  /// thin wick in the same colour, square corners. `hollow` draws rising
  /// candles as outlines (TradingView "Hollow candles").
  void _paintCandles(Canvas canvas, List<Bar> slice, double Function(int) xOf, double Function(double) y, double cw, {bool hollow = false}) {
    final bodyW = math.max(1.0, (cw * 0.72).floorToDouble());
    final wickW = cw < 6 ? 1.0 : 1.4;
    final lastX = xOf(slice.length - 1);
    for (var i = 0; i < slice.length; i++) {
      final x = xOf(i);
      if (x < -cw || x > lastX + cw) continue;
      final b = slice[i];
      final bull = b.close >= b.open;
      final c = bull ? up : down;
      final t = y(math.max(b.open, b.close));
      final bt = math.max(y(math.min(b.open, b.close)), t + 1);
      final body = Rect.fromLTRB(x - bodyW / 2, t, x + bodyW / 2, bt);
      final wick = Paint()
        ..color = c
        ..strokeWidth = wickW;
      if (hollow && bull && bodyW >= 3) {
        // Wick stops at the body so the outline stays clean.
        canvas.drawLine(Offset(x, y(b.high)), Offset(x, body.top), wick);
        canvas.drawLine(Offset(x, body.bottom), Offset(x, y(b.low)), wick);
        canvas.drawRect(body.deflate(0.5), Paint()
          ..color = c
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1);
      } else {
        canvas.drawLine(Offset(x, y(b.high)), Offset(x, y(b.low)), wick);
        canvas.drawRect(body, Paint()..color = c);
      }
    }
  }

  /// Classic OHLC bars: high–low stem, open tick left, close tick right.
  void _paintOhlcBars(Canvas canvas, List<Bar> slice, double Function(int) xOf, double Function(double) y, double cw) {
    final tick = math.max(2.0, cw * 0.35);
    final sw = cw < 6 ? 1.0 : 1.5;
    for (var i = 0; i < slice.length; i++) {
      final x = xOf(i);
      if (x < -cw) continue;
      final b = slice[i];
      final p = Paint()
        ..color = b.close >= b.open ? up : down
        ..strokeWidth = sw;
      canvas.drawLine(Offset(x, y(b.high)), Offset(x, y(b.low)), p);
      canvas.drawLine(Offset(x - tick, y(b.open)), Offset(x, y(b.open)), p);
      canvas.drawLine(Offset(x, y(b.close)), Offset(x + tick, y(b.close)), p);
    }
  }

  /// Plain close line, no fill.
  void _paintLine(Canvas canvas, List<Bar> slice, double Function(int) xOf, double Function(double) y) {
    if (slice.length < 2) return;
    final path = Path()..moveTo(xOf(0), y(slice[0].close));
    for (var i = 1; i < slice.length; i++) {
      path.lineTo(xOf(i), y(slice[i].close));
    }
    canvas.drawPath(path, Paint()
      ..color = const Color(0xFF60A5FA)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeJoin = StrokeJoin.round);
  }

  void _paintArea(Canvas canvas, List<Bar> slice, double Function(int) xOf, double Function(double) y, double top, double h, {bool glowOnly = false}) {
    if (slice.length < 2) return;
    final line = Path()..moveTo(xOf(0), y(slice[0].close));
    for (var i = 1; i < slice.length; i++) {
      line.lineTo(xOf(i), y(slice[i].close));
    }
    final area = Path.from(line)
      ..lineTo(xOf(slice.length - 1), top + h)
      ..lineTo(xOf(0), top + h)
      ..close();
    final rect = Rect.fromLTWH(0, top, 10000, h);
    canvas.drawPath(
      area,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [const Color(0xFF3B82F6).withValues(alpha: glowOnly ? 0.10 : 0.38), const Color(0xFF3B82F6).withValues(alpha: 0)],
        ).createShader(rect),
    );
    if (glowOnly) return;
    canvas.drawPath(
      line,
      Paint()
        ..color = const Color(0xFF60A5FA).withValues(alpha: 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4),
    );
    canvas.drawPath(
      line,
      Paint()
        ..color = const Color(0xFF60A5FA)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeJoin = StrokeJoin.round,
    );
  }

  void _ohlc(Canvas canvas, Bar b, double w) {
    final c = b.close >= b.open ? up : down;
    final chg = b.open == 0 ? 0 : (b.close - b.open) / b.open * 100;
    final spans = <InlineSpan>[];
    void kv(String k, String v) {
      spans.add(TextSpan(text: '$k ', style: const TextStyle(color: Color(0xFF7C8AA5))));
      spans.add(TextSpan(text: '$v   ', style: TextStyle(color: c, fontWeight: FontWeight.w700)));
    }

    kv('O', b.open.toStringAsFixed(digits));
    kv('H', b.high.toStringAsFixed(digits));
    kv('L', b.low.toStringAsFixed(digits));
    kv('C', b.close.toStringAsFixed(digits));
    spans.add(TextSpan(text: '${chg >= 0 ? '+' : ''}${chg.toStringAsFixed(2)}%', style: TextStyle(color: c, fontWeight: FontWeight.w800)));
    final tp = TextPainter(
      text: TextSpan(style: const TextStyle(fontSize: 10.5, fontFeatures: [FontFeature.tabularFigures()]), children: spans),
      textDirection: TextDirection.ltr,
      maxLines: 1,
      ellipsis: '…',
    )..layout(maxWidth: w - 8);
    tp.paint(canvas, const Offset(8, 4));
  }

  void _axisTag(Canvas canvas, String s, double w, double yy, Color bg, double fullW) {
    final tp = _layout(s, const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()]));
    final r = RRect.fromRectAndRadius(Rect.fromLTWH(w + 2, yy - tp.height / 2 - 3, fullW - w - 4, tp.height + 6), const Radius.circular(5));
    canvas.drawRRect(r, Paint()
      ..color = bg.withValues(alpha: 0.45)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6));
    canvas.drawRRect(r, Paint()..color = bg);
    tp.paint(canvas, Offset(w + 8, yy - tp.height / 2));
  }

  void _pill(Canvas canvas, String s, Offset at, Color bg, {Color fg = Colors.white, bool small = false}) {
    final tp = _layout(s, TextStyle(color: fg, fontSize: small ? 9.5 : 10.5, fontWeight: FontWeight.w800));
    final r = RRect.fromRectAndRadius(Rect.fromLTWH(at.dx, at.dy, tp.width + 10, tp.height + 4), const Radius.circular(4));
    canvas.drawRRect(r, Paint()..color = bg.withValues(alpha: 0.9));
    tp.paint(canvas, Offset(at.dx + 5, at.dy + 2));
  }

  void _dotted(Canvas canvas, Offset a, Offset b, Paint p, double dash, double gap) {
    final d = (b - a).distance;
    if (d <= 0) return;
    final dir = (b - a) / d;
    for (double s = 0; s < d; s += dash + gap) {
      canvas.drawLine(a + dir * s, a + dir * math.min(s + dash, d), p);
    }
  }

  static double _niceStep(double raw) {
    if (raw <= 0 || !raw.isFinite) return 1;
    final mag = math.pow(10, (math.log(raw) / math.ln10).floor()).toDouble();
    final n = raw / mag;
    final nice = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return nice * mag;
  }

  TextPainter _layout(String s, TextStyle st) => TextPainter(text: TextSpan(text: s, style: st), textDirection: TextDirection.ltr)..layout();

  void _text(Canvas canvas, String s, Offset at, TextStyle st) => _layout(s, st).paint(canvas, at);

  @override
  bool shouldRepaint(covariant _ChartPainter o) => true; // bars mutate in place
}
