import 'dart:async';

import 'package:dio/dio.dart';

import 'config.dart';
import 'session_store.dart';

class ApiException implements Exception {
  final String message;
  final int? status;
  final dynamic detail;
  ApiException(this.message, {this.status, this.detail});

  bool get kycRequired => detail == 'KYC_REQUIRED';
  bool get needs2fa => status == 400 && message.toLowerCase().contains('2fa code required');

  @override
  String toString() => message;
}

enum RefreshOutcome { ok, rejected, transient }

class Api {
  Api._();
  static final Api I = Api._();

  final session = SessionStore();
  void Function()? onSessionExpired;

  late final Dio _dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiBase,
    connectTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 40),
    headers: {'Accept': 'application/json'},
  ))
    ..interceptors.add(InterceptorsWrapper(
      onRequest: (o, h) {
        final t = session.access;
        if (t != null && t.isNotEmpty && o.extra['noAuth'] != true) {
          o.headers['Authorization'] = 'Bearer $t';
          o.extra['tok'] = t;
        }
        h.next(o);
      },
      onResponse: (r, h) {
        _captureCookies(r);
        h.next(r);
      },
      onError: (e, h) async {
        final r = e.response;
        if (r != null) _captureCookies(r);
        final req = e.requestOptions;
        final isSession401 = r?.statusCode == 401 && _sessionDetails.contains(_detail(r!.data));
        final eligible = isSession401 &&
            req.extra['retried'] != true &&
            req.extra['noAuth'] != true &&
            !req.path.startsWith('/auth/');
        if (!eligible) return h.next(e);

        // Sent with a token that has since been rotated: just retry with the new one.
        var outcome = req.extra['tok'] != session.access && (session.access ?? '').isNotEmpty
            ? RefreshOutcome.ok
            : await refreshTokens();
        if (outcome == RefreshOutcome.ok) {
          try {
            req.extra['retried'] = true;
            req.headers['Authorization'] = 'Bearer ${session.access}';
            if (req.data is FormData) req.data = (req.data as FormData).clone();
            return h.resolve(await _dio.fetch(req));
          } on DioException catch (e2) {
            return h.next(e2);
          }
        }
        // Only a refresh the server actively rejected ends the session; a network
        // blip or 5xx/429 keeps the stored tokens for the next attempt.
        if (outcome == RefreshOutcome.rejected) onSessionExpired?.call();
        h.next(e);
      },
    ));

  static const _sessionDetails = {
    'Not authenticated',
    'Token expired',
    'Invalid token',
    'Account not found',
    'Invalid or expired session',
  };

  static String? _detail(dynamic data) => data is Map ? data['detail']?.toString() : null;

  Completer<RefreshOutcome>? _refreshing;

  /// Single-flight: concurrent 401s share one refresh call.
  Future<RefreshOutcome> refreshTokens() async {
    if (_refreshing != null) return _refreshing!.future;
    final c = _refreshing = Completer<RefreshOutcome>();
    RefreshOutcome out;
    try {
      final rt = session.refresh;
      if (rt == null || rt.isEmpty) {
        out = RefreshOutcome.rejected;
      } else {
        final r = await _dio.post('/auth/refresh',
            options: Options(headers: {'Cookie': '${AppConfig.refreshCookie}=$rt'}, extra: {'noAuth': true}));
        await applyTokenResponse(r.data);
        out = RefreshOutcome.ok;
      }
    } on DioException catch (e) {
      final s = e.response?.statusCode;
      out = (s == 401 || s == 403) ? RefreshOutcome.rejected : RefreshOutcome.transient;
    } catch (_) {
      out = RefreshOutcome.transient;
    }
    _refreshing = null;
    c.complete(out);
    return out;
  }

  /// Refresh proactively when the access token has less than [min] left.
  Future<void> ensureFresh({Duration min = const Duration(minutes: 10)}) async {
    final exp = session.expiresAt;
    if (exp == null || exp.isBefore(DateTime.now().add(min))) await refreshTokens();
  }

  Future<void> applyTokenResponse(dynamic data) async {
    if (data is! Map) return;
    await session.save(
      access: data['access_token']?.toString(),
      expiresAt: DateTime.tryParse(data['expires_at']?.toString() ?? ''),
    );
  }

  void _captureCookies(Response r) {
    final cookies = r.headers.map['set-cookie'];
    if (cookies == null) return;
    for (final c in cookies) {
      final m = RegExp(r'^\s*(' '${AppConfig.accessCookie}|${AppConfig.refreshCookie}' r')=([^;]*)').firstMatch(c);
      if (m == null || m.group(2)!.isEmpty) continue;
      if (m.group(1) == AppConfig.refreshCookie) {
        session.save(refresh: m.group(2));
      } else if ((session.access ?? '').isEmpty) {
        session.save(access: m.group(2));
      }
    }
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query, bool auth = true}) =>
      _send(() => _dio.get(path, queryParameters: _clean(query), options: Options(extra: {'noAuth': !auth})));

  Future<dynamic> post(String path, {Object? body, Map<String, dynamic>? query, bool auth = true}) =>
      _send(() => _dio.post(path, data: body, queryParameters: _clean(query), options: Options(extra: {'noAuth': !auth})));

  Future<dynamic> put(String path, {Object? body, Map<String, dynamic>? query}) =>
      _send(() => _dio.put(path, data: body, queryParameters: _clean(query)));

  Future<dynamic> patch(String path, {Object? body}) => _send(() => _dio.patch(path, data: body));

  Future<dynamic> delete(String path, {Object? body}) => _send(() => _dio.delete(path, data: body));

  Future<dynamic> upload(String path, Map<String, dynamic> fields, Map<String, String> files) async {
    final form = FormData.fromMap({
      ..._clean(fields) ?? {},
      for (final e in files.entries) e.key: await MultipartFile.fromFile(e.value, filename: e.value.split(RegExp(r'[\\/]')).last),
    });
    return _send(() => _dio.post(path, data: form));
  }

  Map<String, dynamic>? _clean(Map<String, dynamic>? m) {
    if (m == null) return null;
    return {
      for (final e in m.entries)
        if (e.value != null && e.value.toString().isNotEmpty) e.key: e.value
    };
  }

  Future<dynamic> _send(Future<Response> Function() f) async {
    try {
      final r = await f();
      return r.data;
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  ApiException _toApiException(DioException e) {
    final r = e.response;
    if (r == null) {
      if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
        return ApiException('Connection timed out. Check your internet.');
      }
      return ApiException('Cannot reach server. Check your internet connection.');
    }
    final data = r.data;
    dynamic detail;
    String msg = 'Request failed (${r.statusCode})';
    if (data is Map && data['detail'] != null) {
      detail = data['detail'];
      if (detail is String) {
        msg = detail;
      } else if (detail is List) {
        msg = detail.map((d) => d is Map ? (d['msg'] ?? '').toString().replaceFirst('Value error, ', '') : d.toString()).join('\n');
      }
    } else if (r.statusCode == 429) {
      msg = 'Too many requests. Please wait a moment.';
    } else if (r.statusCode == 503) {
      msg = 'Service temporarily unavailable.';
    }
    if (detail == 'KYC_REQUIRED') msg = 'Please complete KYC verification first.';
    return ApiException(msg, status: r.statusCode, detail: detail);
  }
}
