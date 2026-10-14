import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tokens live in the platform keystore. The refresh token is the `tx_refresh`
/// cookie value: the backend's /auth/refresh reads only that cookie.
class SessionStore {
  static const _s = FlutterSecureStorage();
  static const _kAccess = 'tx_access';
  static const _kRefresh = 'tx_refresh';
  static const _kExpires = 'tx_expires_at';

  String? access;
  String? refresh;
  DateTime? expiresAt;

  Future<void> load() async {
    access = await _s.read(key: _kAccess);
    refresh = await _s.read(key: _kRefresh);
    final e = await _s.read(key: _kExpires);
    expiresAt = e == null ? null : DateTime.tryParse(e);
  }

  Future<void> save({String? access, String? refresh, DateTime? expiresAt}) async {
    if (access != null && access.isNotEmpty) {
      this.access = access;
      await _s.write(key: _kAccess, value: access);
    }
    if (refresh != null && refresh.isNotEmpty) {
      this.refresh = refresh;
      await _s.write(key: _kRefresh, value: refresh);
    }
    if (expiresAt != null) {
      this.expiresAt = expiresAt;
      await _s.write(key: _kExpires, value: expiresAt.toIso8601String());
    }
  }

  Future<void> clear() async {
    access = null;
    refresh = null;
    expiresAt = null;
    await _s.deleteAll();
  }

  bool get hasSession => (access ?? '').isNotEmpty;
}
