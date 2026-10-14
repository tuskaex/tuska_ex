import 'dart:convert';

import 'package:flutter/foundation.dart' show mapEquals;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/theme.dart';
import '../models/models.dart' show asList;

/// A white-label broker from the admin panel (a sub-admin with a public code).
class Broker {
  final String code;
  final String? name, logoUrl, supportEmail, supportWhatsapp;
  /// `#RRGGBB` set by the admin for this broker; null = platform blue.
  final String? color;
  /// Client features the admin switched on/off for this broker
  /// (see BrandState.features). Missing keys mean "on".
  final Map<String, bool> features;
  const Broker({
    required this.code,
    this.name,
    this.logoUrl,
    this.supportEmail,
    this.supportWhatsapp,
    this.color,
    this.features = const {},
  });

  static Broker? fromJson(dynamic j) {
    if (j is! Map) return null;
    final code = (j['code'] ?? '').toString().trim().toUpperCase();
    if (code.isEmpty) return null;
    String? s(String k) {
      final v = (j[k] ?? '').toString().trim();
      return v.isEmpty ? null : v;
    }

    return Broker(
      code: code,
      name: s('brand_name'),
      logoUrl: _absolute(s('logo_url')),
      supportEmail: s('support_email'),
      supportWhatsapp: s('support_whatsapp'),
      color: s('brand_color'),
      features: {
        if (j['features'] is Map)
          for (final e in (j['features'] as Map).entries)
            if (e.value is bool) e.key.toString(): e.value as bool,
      },
    );
  }

  /// Same broker, same look and same switches — nothing to re-apply.
  bool sameAs(Broker? o) =>
      o != null &&
      o.code == code &&
      o.name == name &&
      o.logoUrl == logoUrl &&
      o.supportEmail == supportEmail &&
      o.supportWhatsapp == supportWhatsapp &&
      o.color == color &&
      mapEquals(o.features, features);

  Map<String, dynamic> toJson() => {
        'code': code,
        'brand_name': name,
        'logo_url': logoUrl,
        'support_email': supportEmail,
        'support_whatsapp': supportWhatsapp,
        'brand_color': color,
        'features': features,
      };

  /// Media paths come back origin-relative ("/api/v1/public/broker-media/x.png").
  static String? _absolute(String? u) {
    if (u == null) return null;
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (!u.startsWith('/')) return null;
    return Uri.parse(AppConfig.apiBase).replace(path: u, query: null).toString();
  }
}

/// One app, many brokers. Which broker the app is dressed as:
///   * before sign-in — the code the user picked on the login/register screen;
///   * after sign-in  — whatever /auth/me says the account belongs to (the
///     server is the source of truth, so a wrong pick is corrected on login).
/// No broker means the TuskaEx platform itself.
class BrandState extends ChangeNotifier {
  BrandState._();
  static final BrandState I = BrandState._();
  static const _k = 'broker_v1';
  static const _kChosen = 'broker_chosen_v1';

  Broker? broker;

  /// Has the user picked where they sign in — a broker, or TuskaEx itself?
  /// Until then the login screen shows the broker list first.
  bool chosen = false;

  /// What login sends as `broker_code`: "" = TuskaEx's own clients.
  String get loginCode => broker?.code ?? '';

  String get name => broker?.name ?? AppConfig.brandName;
  String? get logoUrl => broker?.logoUrl;
  String get supportEmail => broker?.supportEmail ?? AppConfig.supportEmail;
  String? get supportWhatsapp => broker?.supportWhatsapp;
  bool get isPlatform => broker == null;

  /// Client features a broker can switch off from the admin panel. Kept in step
  /// with gateway/src/api/brokers.py CLIENT_FEATURES.
  static const features = ['deposits', 'withdrawals', 'transfers', 'copy_trading', 'ib_program'];

  /// Is [feature] available to this broker's clients? Default on, so a broker
  /// the admin never configured — or an older server — loses nothing.
  bool allows(String feature) => broker?.features[feature] ?? true;

  Color get color => parseColor(broker?.color) ?? AppColors.platformBrand;

  static Color? parseColor(String? hex) {
    final h = (hex ?? '').replaceFirst('#', '');
    if (h.length != 6) return null;
    final v = int.tryParse(h, radix: 16);
    return v == null ? null : Color(0xFF000000 | v);
  }

  /// Push the broker colour into the shared palette. Widgets read AppColors at
  /// build time, so the app root rebuilds on this (see main.dart).
  void _applyColor() {
    final c = color;
    AppColors.brand = c;
    AppColors.brandLight = Color.lerp(c, Colors.white, 0.35)!;
  }

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_k);
      if (raw != null) broker = Broker.fromJson(jsonDecode(raw));
      chosen = prefs.getBool(_kChosen) ?? broker != null;
    } catch (_) {}
    _applyColor();
  }

  /// Throws ApiException (404 = unknown code).
  Future<Broker> lookup(String code) async {
    final c = code.trim().toUpperCase();
    final j = await Api.I.get('/public/broker/${Uri.encodeComponent(c)}', auth: false);
    final b = Broker.fromJson(j);
    if (b == null) throw ApiException('Broker not found', status: 404);
    return b;
  }

  /// Every active broker, for the "choose your broker" list.
  Future<List<Broker>> listBrokers() async {
    final j = await Api.I.get('/public/brokers', auth: false);
    return asList(j, 'items').map(Broker.fromJson).whereType<Broker>().toList();
  }

  /// Back to the broker list (the "Change broker" link on the sign-in form).
  Future<void> unchoose() async {
    chosen = false;
    notifyListeners();
    try {
      (await SharedPreferences.getInstance()).setBool(_kChosen, false);
    } catch (_) {}
  }

  Future<void> set(Broker? b) async {
    broker = b;
    chosen = true;
    _applyColor();
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_kChosen, true);
      if (b == null) {
        await prefs.remove(_k);
      } else {
        await prefs.setString(_k, jsonEncode(b.toJson()));
      }
    } catch (_) {}
  }

  /// From /auth/me. A missing `broker` key means an older server: keep the
  /// user's pick rather than wiping it. An explicit null means the platform pool.
  Future<void> applyFromMe(Map<String, dynamic> me) async {
    if (!me.containsKey('broker')) return;
    final b = Broker.fromJson(me['broker']);
    if (b == null ? broker == null : b.sameAs(broker)) return;
    await set(b);
  }
}

/// The current broker's logo, falling back to the TuskaEx mark.
class BrandLogo extends StatelessWidget {
  final double height;
  const BrandLogo({super.key, this.height = 36});
  @override
  Widget build(BuildContext context) {
    final url = context.select<BrandState, String?>((b) => b.logoUrl);
    final fallback = Image.asset('assets/images/logo.png', height: height);
    if (url == null) return fallback;
    return Image.network(
      url,
      height: height,
      fit: BoxFit.contain,
      errorBuilder: (_, _, _) => fallback,
      frameBuilder: (_, child, frame, sync) => (sync || frame != null) ? child : SizedBox(height: height, width: height),
    );
  }
}

