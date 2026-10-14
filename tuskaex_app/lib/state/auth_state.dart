import 'package:flutter/foundation.dart';

import '../core/api.dart';
import '../models/models.dart';
import 'brand_state.dart';

enum AuthStatus { unknown, offline, loggedOut, loggedIn }

class AuthState extends ChangeNotifier {
  final api = Api.I;
  AuthStatus status = AuthStatus.unknown;
  User? user;
  bool maintenance = false;
  bool registrationsOpen = true;
  String? offlineReason;

  AuthState() {
    api.onSessionExpired = () {
      if (status == AuthStatus.loggedIn) _signOutLocal();
    };
  }

  Future<void> checkPlatformStatus() async {
    try {
      final j = await api.get('/auth/platform-status', auth: false);
      if (j is Map) {
        maintenance = j['maintenance_mode'] == true;
        registrationsOpen = j['allow_new_registrations'] != false;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> bootstrap() async {
    // First call runs from the provider's create (mid-build): notifying there
    // would wedge the provider. Only a retry (from the offline screen) needs it.
    if (status != AuthStatus.unknown) {
      status = AuthStatus.unknown;
      notifyListeners();
    }
    await api.session.load();
    checkPlatformStatus();
    if (!api.session.hasSession && (api.session.refresh ?? '').isEmpty) {
      status = AuthStatus.loggedOut;
      notifyListeners();
      return;
    }
    final exp = api.session.expiresAt;
    if (!api.session.hasSession || (exp != null && exp.isBefore(DateTime.now().add(const Duration(minutes: 2))))) {
      final o = await api.refreshTokens();
      if (o == RefreshOutcome.rejected) {
        await _signOutLocal();
        return;
      }
    }
    try {
      await refreshUser();
      status = AuthStatus.loggedIn;
    } on ApiException catch (e) {
      // Only an auth rejection ends the session. Offline / 5xx keeps the tokens
      // so the user isn't forced to sign in again after a network blip.
      if (e.status == 401 || e.status == 403) {
        await _signOutLocal();
        return;
      }
      offlineReason = e.message;
      status = AuthStatus.offline;
    }
    notifyListeners();
  }

  Future<void> refreshUser() async {
    final j = Map<String, dynamic>.from(await api.get('/auth/me'));
    user = User.fromJson(j);
    // The demo account is shared platform-wide; keep the broker the user picked.
    if (user?.isDemo != true) await BrandState.I.applyFromMe(j);
    notifyListeners();
  }

  Future<void> _completeLogin(dynamic tokenJson) async {
    await api.applyTokenResponse(tokenJson);
    await refreshUser();
    status = AuthStatus.loggedIn;
    notifyListeners();
  }

  /// Throws ApiException; `e.needs2fa` means: ask for the code and call again.
  Future<void> login(String email, String password, {String? totp}) async {
    final j = await api.post('/auth/login', auth: false, body: {
      'email': email.trim().toLowerCase(),
      'password': password,
      'totp_code': (totp == null || totp.isEmpty) ? null : totp,
      // The server refuses an account that isn't this broker's client.
      if (BrandState.I.chosen) 'broker_code': BrandState.I.loginCode,
    });
    await _completeLogin(j);
  }

  Future<void> demoLogin() async {
    final j = await api.post('/auth/demo-login', auth: false);
    await _completeLogin(j);
  }

  /// Returns true when an email OTP step follows. With email verification
  /// turned off the backend signs the user in on this call instead.
  Future<bool> registerStart({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
    String? referralCode,
  }) async {
    final j = await api.post('/auth/register/start', auth: false, body: {
      'email': email.trim().toLowerCase(),
      'password': password,
      'first_name': firstName.trim(),
      'last_name': lastName.trim(),
      if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
      // One field carries both: a broker's public code puts the signup in that
      // broker's pool (tenant_resolver); anything else is an IB referral.
      if (BrandState.I.broker != null)
        'referral_code': BrandState.I.broker!.code
      else if (referralCode != null && referralCode.trim().isNotEmpty)
        'referral_code': referralCode.trim(),
    });
    if (j is Map && (j['access_token'] != null || j['user_id'] != null)) {
      await _completeLogin(j);
      return false;
    }
    return true;
  }

  Future<void> registerVerify(String email, String otp) async {
    final j = await api.post('/auth/register/verify', auth: false, body: {'email': email.trim().toLowerCase(), 'otp': otp});
    await _completeLogin(j);
  }

  Future<void> registerResend(String email) =>
      api.post('/auth/register/resend', auth: false, body: {'email': email.trim().toLowerCase()});

  Future<void> registerCancel(String email) async {
    try {
      await api.post('/auth/register/cancel', auth: false, body: {'email': email.trim().toLowerCase()});
    } catch (_) {}
  }

  Future<void> forgotPassword(String email) =>
      api.post('/auth/forgot-password', auth: false, body: {'email': email.trim().toLowerCase()});

  Future<void> resetPassword(String code, String newPassword) =>
      api.post('/auth/reset-password', auth: false, body: {'token': code.trim(), 'new_password': newPassword});

  Future<void> logout() async {
    // The demo user is shared: server-side logout revokes every refresh token
    // for that user, signing out all other demo visitors. Clear locally only.
    if (user?.isDemo != true) {
      try {
        await api.post('/auth/logout');
      } catch (_) {}
    }
    await _signOutLocal();
  }

  Future<void> _signOutLocal() async {
    await api.session.clear();
    user = null;
    status = AuthStatus.loggedOut;
    notifyListeners();
  }
}
