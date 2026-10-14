import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme.dart';
import '../state/brand_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Living backdrop: slow-drifting light orbs over a receding perspective grid.
// Painted (not blurred) so it stays cheap enough to animate on every screen.
// ─────────────────────────────────────────────────────────────────────────────

class AppBackground extends StatefulWidget {
  final Widget child;
  final bool grid;
  const AppBackground({super.key, required this.child, this.grid = true});
  @override
  State<AppBackground> createState() => _AppBackgroundState();
}

class _AppBackgroundState extends State<AppBackground> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 24))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(fit: StackFit.expand, children: [
      RepaintBoundary(
        child: AnimatedBuilder(
          animation: _c,
          builder: (_, _) => CustomPaint(painter: _BackdropPainter(_c.value, widget.grid)),
        ),
      ),
      widget.child,
    ]);
  }
}

class _BackdropPainter extends CustomPainter {
  final double t;
  final bool grid;
  _BackdropPainter(this.t, this.grid);

  @override
  void paint(Canvas canvas, Size s) {
    final rect = Offset.zero & s;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF070B1C), Color(0xFF04060E), Color(0xFF060A18)],
        ).createShader(rect),
    );

    final a = t * 2 * math.pi;
    void orb(Offset c, double r, Color col) {
      canvas.drawCircle(
        c,
        r,
        Paint()..shader = RadialGradient(colors: [col, col.withValues(alpha: 0)]).createShader(Rect.fromCircle(center: c, radius: r)),
      );
    }

    orb(Offset(s.width * (0.15 + 0.08 * math.sin(a)), s.height * (0.12 + 0.05 * math.cos(a))), s.width * 0.75,
        const Color(0xFF2563EB).withValues(alpha: 0.32));
    orb(Offset(s.width * (0.95 + 0.06 * math.cos(a * 1.3)), s.height * (0.35 + 0.06 * math.sin(a))), s.width * 0.6,
        const Color(0xFF7C3AED).withValues(alpha: 0.20));
    orb(Offset(s.width * (0.4 + 0.1 * math.sin(a * 0.7)), s.height * (0.92 + 0.03 * math.cos(a * 1.1))), s.width * 0.7,
        const Color(0xFF06B6D4).withValues(alpha: 0.16));

    if (!grid) return;
    // A floor grid receding to a horizon: the cheapest strong "3D" cue.
    final horizon = s.height * 0.62;
    final vx = s.width / 2;
    final line = Paint()..strokeWidth = 1;
    for (var i = -12; i <= 12; i++) {
      final x = vx + i * s.width * 0.16;
      line.shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [const Color(0xFF3B82F6).withValues(alpha: 0), const Color(0xFF3B82F6).withValues(alpha: 0.10)],
      ).createShader(Rect.fromLTRB(0, horizon, s.width, s.height));
      canvas.drawLine(Offset(vx + i * 6, horizon), Offset(x, s.height), line);
    }
    final scroll = t * 8 % 1;
    for (var k = 0; k < 14; k++) {
      final d = (k + scroll) / 14; // 0 = horizon, 1 = viewer
      final y = horizon + (s.height - horizon) * d * d;
      canvas.drawLine(
        Offset(0, y),
        Offset(s.width, y),
        Paint()
          ..color = const Color(0xFF3B82F6).withValues(alpha: 0.09 * d)
          ..strokeWidth = 1,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _BackdropPainter o) => o.t != t;
}

/// Page transition that gives every route its own backdrop, so translucent
/// glass screens never show the previous page bleeding through.
class GlassPageTransitions extends PageTransitionsBuilder {
  const GlassPageTransitions();
  @override
  Widget buildTransitions<T>(PageRoute<T> route, BuildContext context, Animation<double> animation,
      Animation<double> secondaryAnimation, Widget child) {
    final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
    return FadeTransition(
      opacity: curved,
      child: SlideTransition(
        position: Tween(begin: const Offset(0, 0.04), end: Offset.zero).animate(curved),
        child: AppBackground(grid: route.isFirst, child: child),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Glass surfaces
// ─────────────────────────────────────────────────────────────────────────────

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double radius;
  final bool blur;
  final Color? glow;
  final VoidCallback? onTap;
  final Gradient? fill;
  const GlassCard({super.key, required this.child, this.padding, this.radius = 20, this.blur = false, this.glow, this.onTap, this.fill});

  @override
  Widget build(BuildContext context) {
    final br = BorderRadius.circular(radius);
    Widget body = Container(
      padding: padding,
      decoration: BoxDecoration(
        borderRadius: br,
        gradient: fill ??
            LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Colors.white.withValues(alpha: 0.075), Colors.white.withValues(alpha: 0.02)],
            ),
      ),
      child: child,
    );
    if (onTap != null) {
      body = Material(type: MaterialType.transparency, child: InkWell(borderRadius: br, onTap: onTap, child: body));
    }
    if (blur) {
      body = ClipRRect(borderRadius: br, child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18), child: body));
    }
    // 1px gradient rim: bright top-left edge catching the light, dim bottom-right.
    return Container(
      decoration: BoxDecoration(
        borderRadius: br,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white.withValues(alpha: 0.22), Colors.white.withValues(alpha: 0.04), (glow ?? AppColors.brandLight).withValues(alpha: 0.25)],
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.45), blurRadius: 24, offset: const Offset(0, 14)),
          if (glow != null) BoxShadow(color: glow!.withValues(alpha: 0.28), blurRadius: 30, spreadRadius: -6),
        ],
      ),
      padding: const EdgeInsets.all(1),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius - 1),
        child: ColoredBox(color: const Color(0xFF0A1022).withValues(alpha: blur ? 0.35 : 0.72), child: body),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D tilt: the child leans toward the finger with a moving specular sheen,
// and gently "breathes" when idle.
// ─────────────────────────────────────────────────────────────────────────────

class Tilt3D extends StatefulWidget {
  final Widget child;
  final double maxTilt;
  final double radius;
  final bool idle;
  const Tilt3D({super.key, required this.child, this.maxTilt = 0.16, this.radius = 24, this.idle = true});
  @override
  State<Tilt3D> createState() => _Tilt3DState();
}

class _Tilt3DState extends State<Tilt3D> with TickerProviderStateMixin {
  Offset _target = Offset.zero;
  late final AnimationController _idle = AnimationController(vsync: this, duration: const Duration(seconds: 7));
  late final AnimationController _settle = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
  Offset _from = Offset.zero;

  @override
  void initState() {
    super.initState();
    if (widget.idle) _idle.repeat();
    _settle.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _idle.dispose();
    _settle.dispose();
    super.dispose();
  }

  Offset get _tilt => _settle.isAnimating ? Offset.lerp(_from, Offset.zero, Curves.easeOutBack.transform(_settle.value))! : _target;

  void _move(Offset local, Size size) {
    _settle.stop();
    setState(() {
      _target = Offset(
        ((local.dx / size.width) - 0.5) * 2,
        ((local.dy / size.height) - 0.5) * 2,
      ).scale(1, 1);
      _target = Offset(_target.dx.clamp(-1.0, 1.0), _target.dy.clamp(-1.0, 1.0));
    });
  }

  void _release() {
    _from = _target;
    _target = Offset.zero;
    _settle.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      final size = Size(c.maxWidth, c.maxHeight.isFinite ? c.maxHeight : 200);
      return Listener(
        onPointerDown: (e) => _move(e.localPosition, size),
        onPointerMove: (e) => _move(e.localPosition, size),
        onPointerUp: (_) => _release(),
        onPointerCancel: (_) => _release(),
        child: AnimatedBuilder(
          animation: _idle,
          builder: (context, child) {
            final ia = _idle.value * 2 * math.pi;
            final idle = widget.idle ? Offset(math.sin(ia) * 0.25, math.cos(ia) * 0.18) : Offset.zero;
            final t = _tilt + idle;
            final m = Matrix4.identity()
              ..setEntry(3, 2, 0.0011)
              ..rotateX(-t.dy * widget.maxTilt)
              ..rotateY(t.dx * widget.maxTilt);
            return Transform(
              transform: m,
              alignment: Alignment.center,
              child: Stack(children: [
                child!,
                // Specular sheen sliding opposite the tilt, like light on glass.
                Positioned.fill(
                  child: IgnorePointer(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(widget.radius),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment(-1.4 - t.dx, -1.2 - t.dy),
                            end: Alignment(1.4 - t.dx, 1.2 - t.dy),
                            colors: [
                              Colors.white.withValues(alpha: 0),
                              Colors.white.withValues(alpha: 0.13),
                              Colors.white.withValues(alpha: 0),
                            ],
                            stops: const [0.35, 0.5, 0.65],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ]),
            );
          },
          child: widget.child,
        ),
      );
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Physical 3D key: a raised top face over a darker base that presses down.
// ─────────────────────────────────────────────────────────────────────────────

class Button3D extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final List<Color> colors;
  final double height;
  final double radius;
  final double depth;
  const Button3D({
    super.key,
    required this.child,
    required this.onPressed,
    this.colors = const [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
    this.height = 54,
    this.radius = 16,
    this.depth = 5,
  });
  @override
  State<Button3D> createState() => _Button3DState();
}

/// Professional primary button: solid fill with a barely-there vertical
/// gradient, crisp 12px corners, a soft coloured shadow, and a subtle
/// scale-down on press. (Name kept for call sites; no "game" depth/gloss.)
class _Button3DState extends State<Button3D> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null;
    final cols = enabled ? widget.colors : [const Color(0xFF263045), const Color(0xFF1E2636)];
    final top = Color.lerp(cols.first, cols.last, 0.55)!; // keep the gradient restrained
    final radius = math.min(widget.radius, 12.0);
    return GestureDetector(
      onTapDown: enabled ? (_) => setState(() => _down = true) : null,
      onTapCancel: () => setState(() => _down = false),
      onTapUp: enabled
          ? (_) {
              setState(() => _down = false);
              HapticFeedback.lightImpact();
              widget.onPressed!();
            }
          : null,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 90),
        scale: _down ? 0.98 : 1,
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 90),
          opacity: _down ? 0.88 : 1,
          child: Container(
            height: widget.height,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [top, cols.last]),
              boxShadow: [
                if (enabled) BoxShadow(color: cols.last.withValues(alpha: 0.28), blurRadius: 14, offset: const Offset(0, 4)),
              ],
            ),
            child: DefaultTextStyle.merge(
              style: TextStyle(
                color: enabled ? Colors.white : AppColors.textMute,
                fontWeight: FontWeight.w700,
                fontSize: 15,
                letterSpacing: 0.2,
              ),
              child: IconTheme.merge(data: const IconThemeData(color: Colors.white), child: widget.child),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon tile: a tinted rounded square, like the action icons in pro trading
// and banking apps. (Name kept for call sites.)
// ─────────────────────────────────────────────────────────────────────────────

class Orb extends StatelessWidget {
  final Widget child;
  final List<Color> colors;
  final double size;
  const Orb({super.key, required this.child, this.colors = const [Color(0xFF60A5FA), Color(0xFF1D4ED8)], this.size = 56});
  @override
  Widget build(BuildContext context) {
    final accent = colors.first;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.3),
        color: colors.last.withValues(alpha: 0.18),
        border: Border.all(color: accent.withValues(alpha: 0.22)),
      ),
      alignment: Alignment.center,
      child: IconTheme.merge(
        data: IconThemeData(color: accent, size: size * 0.46),
        child: DefaultTextStyle.merge(style: TextStyle(color: accent), child: child),
      ),
    );
  }
}

/// Per-market-group orb palette.
List<Color> groupColors(String group) => switch (group) {
      'forex' => const [Color(0xFF60A5FA), Color(0xFF1D4ED8)],
      'metals' => const [Color(0xFFFDE68A), Color(0xFFB45309)],
      'commodities' => const [Color(0xFFFDBA74), Color(0xFFC2410C)],
      'indices' => const [Color(0xFFC4B5FD), Color(0xFF6D28D9)],
      'crypto' => const [Color(0xFF67E8F9), Color(0xFF0E7490)],
      'stocks' => const [Color(0xFF86EFAC), Color(0xFF15803D)],
      _ => const [Color(0xFF94A3B8), Color(0xFF334155)],
    };

/// Market avatar: flat tinted circle with the instrument's base code, as in
/// pro trading apps' watchlists.
class SymbolOrb extends StatelessWidget {
  final String symbol;
  final String group;
  final double size;
  const SymbolOrb({super.key, required this.symbol, required this.group, this.size = 40});
  @override
  Widget build(BuildContext context) {
    final label = symbol.length >= 3 ? symbol.substring(0, symbol.startsWith('X') && group == 'metals' ? 3 : (group == 'indices' ? 2 : 3)) : symbol;
    final c = groupColors(group);
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: c.last.withValues(alpha: 0.2),
        border: Border.all(color: c.first.withValues(alpha: 0.3)),
      ),
      child: Text(label, style: TextStyle(fontSize: size * 0.27, fontWeight: FontWeight.w800, color: c.first, letterSpacing: -0.2)),
    );
  }
}

/// Mini price chart: smooth line + fading gradient fill, coloured by direction.
/// The last point tracks the live price so the line moves with the market.
class Sparkline extends StatelessWidget {
  final List<double> values;
  final double? live;
  final Color color;
  const Sparkline({super.key, required this.values, required this.color, this.live});
  @override
  Widget build(BuildContext context) => CustomPaint(painter: _SparkPainter([...values, ?live], color), size: Size.infinite);
}

class _SparkPainter extends CustomPainter {
  final List<double> v;
  final Color c;
  _SparkPainter(this.v, this.c);

  @override
  void paint(Canvas canvas, Size s) {
    if (v.length < 2 || s.width <= 0) return;
    var lo = v.reduce(math.min), hi = v.reduce(math.max);
    if (hi == lo) {
      hi += 1;
      lo -= 1;
    }
    Offset pt(int i) => Offset(i / (v.length - 1) * s.width, s.height - 2 - (v[i] - lo) / (hi - lo) * (s.height - 6));
    // Smoothed with quadratic midpoints so it reads as a chart, not a zig-zag.
    final line = Path()..moveTo(pt(0).dx, pt(0).dy);
    for (var i = 1; i < v.length; i++) {
      final a = pt(i - 1), b = pt(i);
      final m = Offset((a.dx + b.dx) / 2, (a.dy + b.dy) / 2);
      line.quadraticBezierTo(a.dx, a.dy, m.dx, m.dy);
    }
    line.lineTo(pt(v.length - 1).dx, pt(v.length - 1).dy);
    final area = Path.from(line)
      ..lineTo(s.width, s.height)
      ..lineTo(0, s.height)
      ..close();
    canvas.drawPath(
      area,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [c.withValues(alpha: 0.32), c.withValues(alpha: 0)],
        ).createShader(Offset.zero & s),
    );
    canvas.drawPath(
      line,
      Paint()
        ..color = c
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
    final end = pt(v.length - 1);
    canvas.drawCircle(end, 5, Paint()..color = c.withValues(alpha: 0.25));
    canvas.drawCircle(end, 2.6, Paint()..color = c);
  }

  @override
  bool shouldRepaint(covariant _SparkPainter o) => true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text helpers
// ─────────────────────────────────────────────────────────────────────────────

class GradientText extends StatelessWidget {
  final String text;
  final TextStyle style;
  final List<Color> colors;
  const GradientText(this.text, {super.key, required this.style, this.colors = const [Colors.white, Color(0xFF93C5FD)]});
  @override
  Widget build(BuildContext context) => ShaderMask(
        blendMode: BlendMode.srcIn,
        shaderCallback: (r) => LinearGradient(colors: colors).createShader(r),
        child: Text(text, style: style),
      );
}

/// Smoothly rolls a number to its new value.
class AnimatedNumber extends StatelessWidget {
  final double value;
  final String Function(double) format;
  final TextStyle style;
  const AnimatedNumber({super.key, required this.value, required this.format, required this.style});
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
        tween: Tween(end: value),
        duration: const Duration(milliseconds: 650),
        curve: Curves.easeOutCubic,
        builder: (_, v, _) => Text(format(v), style: style),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating 3D logo with glow and a mirrored reflection.
// ─────────────────────────────────────────────────────────────────────────────

class FloatingLogo3D extends StatefulWidget {
  final double height;
  const FloatingLogo3D({super.key, this.height = 110});
  @override
  State<FloatingLogo3D> createState() => _FloatingLogo3DState();
}

class _FloatingLogo3DState extends State<FloatingLogo3D> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 6))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = widget.height;
    return AnimatedBuilder(
      animation: _c,
      builder: (_, _) {
        final a = _c.value * 2 * math.pi;
        final lift = math.sin(a) * 6;
        final m = Matrix4.identity()
          ..setEntry(3, 2, 0.0015)
          ..rotateY(math.sin(a) * 0.35)
          ..rotateX(math.cos(a) * 0.08);
        final logo = BrandLogo(height: h);
        return SizedBox(
          height: h * 1.75,
          child: Stack(alignment: Alignment.topCenter, clipBehavior: Clip.none, children: [
            // halo
            Positioned(
              top: h * 0.05,
              child: Container(
                width: h * 1.6,
                height: h * 0.9,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withValues(alpha: 0.45), blurRadius: h * 0.6, spreadRadius: h * 0.05)],
                ),
              ),
            ),
            Transform.translate(offset: Offset(0, lift), child: Transform(transform: m, alignment: Alignment.center, child: logo)),
            // reflection on the "floor"
            Positioned(
              top: h * 1.08,
              child: Opacity(
                opacity: 0.18 - lift.abs() * 0.008,
                child: ShaderMask(
                  blendMode: BlendMode.dstIn,
                  shaderCallback: (r) => const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.white, Colors.transparent],
                  ).createShader(r),
                  child: Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.diagonal3Values(1, -0.55, 1)..multiply(m),
                    child: logo,
                  ),
                ),
              ),
            ),
          ]),
        );
      },
    );
  }
}

/// One bottom-nav destination: outline icon, filled icon, label, orb palette.
typedef NavItem = (IconData, IconData, String, List<Color>);

/// Floating glass bottom bar. Each tab has its own colour; the active tab's
/// icon rises out of the bar as a glossy 3D orb with a glow beneath it.
class GlassNavBar extends StatelessWidget {
  final int index;
  final ValueChanged<int> onTap;
  final List<NavItem> items;
  const GlassNavBar({super.key, required this.index, required this.onTap, required this.items});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
        child: SizedBox(
          height: 68,
          child: Stack(clipBehavior: Clip.none, alignment: Alignment.bottomCenter, children: [
            const Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              top: 0,
              child: GlassCard(blur: true, radius: 22, child: SizedBox.expand()),
            ),
            Positioned.fill(
              child: Row(children: [
                for (var i = 0; i < items.length; i++) Expanded(child: _NavButton(item: items[i], active: i == index, onTap: () => onTap(i))),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  final NavItem item;
  final bool active;
  final VoidCallback onTap;
  const _NavButton({required this.item, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final (outline, filled, label, colors) = item;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      // Clean pro-app tab: indicator bar on top, tinted icon chip, coloured
      // label. No floating orbs.
      child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          width: active ? 22 : 0,
          height: 3,
          margin: const EdgeInsets.only(bottom: 7),
          decoration: BoxDecoration(color: colors.first, borderRadius: BorderRadius.circular(3)),
        ),
        AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: active ? colors.last.withValues(alpha: 0.22) : Colors.transparent,
          ),
          child: Icon(active ? filled : outline, size: 23, color: active ? colors.first : AppColors.textMute),
        ),
        const SizedBox(height: 3),
        AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 220),
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
            color: active ? colors.first : AppColors.textMute,
          ),
          child: Text(label),
        ),
        const SizedBox(height: 9),
      ]),
    );
  }
}

/// Section header with a small glowing accent bar.
class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const SectionTitle(this.text, {super.key, this.trailing});
  @override
  Widget build(BuildContext context) => Row(children: [
        Container(
          width: 4,
          height: 18,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF60A5FA), Color(0xFF6366F1)]),
            boxShadow: [BoxShadow(color: const Color(0xFF3B82F6).withValues(alpha: 0.7), blurRadius: 8)],
          ),
        ),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -0.2))),
        ?trailing,
      ]);
}
