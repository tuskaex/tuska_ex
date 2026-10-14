import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../state/auth_state.dart';
import '../widgets/common.dart';
import 'positions_screen.dart' show confirm;
import 'profile_screen.dart';

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});
  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  List<Map<String, dynamic>>? _sessions;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    try {
      final j = await Api.I.get('/profile/sessions');
      if (mounted) setState(() => _sessions = asList(j, 'sessions'));
    } catch (_) {
      if (mounted) setState(() => _sessions = []);
    }
  }

  @override
  Widget build(BuildContext context) {
    final u = context.watch<AuthState>().user;
    return Scaffold(
      appBar: AppBar(title: const Text('Security')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Card(
          child: ListTile(
            leading: Icon(Icons.shield_outlined, color: u?.twoFactorEnabled == true ? AppColors.profit : AppColors.warning),
            title: const Text('Two-factor authentication', style: TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text(u?.twoFactorEnabled == true ? 'Enabled — a code is required at sign-in.' : 'Add an authenticator app for extra protection.',
                style: const TextStyle(color: AppColors.textDim)),
            trailing: u?.twoFactorEnabled == true
                ? const Pill('ON', color: AppColors.profit)
                : FilledButton(
                    style: FilledButton.styleFrom(minimumSize: const Size(80, 38)),
                    onPressed: () async {
                      await Navigator.push(context, MaterialPageRoute(builder: (_) => const _TwoFaSetup()));
                      if (context.mounted) context.read<AuthState>().refreshUser().catchError((_) {});
                    },
                    child: const Text('Enable'),
                  ),
          ),
        ),
        const SizedBox(height: 10),
        Card(
          child: ListTile(
            leading: Icon(Icons.lock_reset, color: AppColors.brandLight),
            title: const Text('Change password', style: TextStyle(fontWeight: FontWeight.w700)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChangePasswordScreen())),
          ),
        ),
        const SizedBox(height: 20),
        const Text('Active sessions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const Text('Includes this device. Signing out a session ends it on that device.', style: TextStyle(color: AppColors.textMute, fontSize: 12)),
        const SizedBox(height: 8),
        if (_sessions == null)
          const SizedBox(height: 80, child: Loading())
        else if (_sessions!.isEmpty)
          const Text('No active sessions.', style: TextStyle(color: AppColors.textMute))
        else
          Card(
            child: Column(children: [
              for (final s in _sessions!)
                ListTile(
                  leading: Icon(_deviceIcon(s['user_agent']?.toString() ?? ''), color: AppColors.textDim),
                  title: Text(_device(s['user_agent']?.toString() ?? ''), style: const TextStyle(fontSize: 14)),
                  subtitle: Text('${s['ip_address'] ?? ''}\n${fmtDateTime(parseTime(s['created_at']))}', style: const TextStyle(color: AppColors.textMute, fontSize: 12)),
                  isThreeLine: true,
                  trailing: IconButton(
                    icon: const Icon(Icons.logout, color: AppColors.loss),
                    tooltip: 'Sign out this session',
                    onPressed: () async {
                      final ok = await confirm(context, 'Sign out this session?', 'That device will need to sign in again.', ok: 'Sign out', okColor: AppColors.sell);
                      if (!ok) return;
                      try {
                        await Api.I.delete('/profile/sessions/${s['id']}');
                        _loadSessions();
                      } on ApiException catch (e) {
                        if (context.mounted) toast(context, e.message, error: true);
                      }
                    },
                  ),
                ),
            ]),
          ),
      ]),
    );
  }

  String _device(String ua) {
    final l = ua.toLowerCase();
    if (l.contains('dart') || l.contains('dio')) return 'SpeedTrader app';
    if (l.contains('android')) return 'Android browser';
    if (l.contains('iphone') || l.contains('ipad')) return 'iOS browser';
    if (l.contains('windows')) return 'Windows';
    if (l.contains('mac os')) return 'Mac';
    return ua.isEmpty ? 'Unknown device' : ua.split(' ').first;
  }

  IconData _deviceIcon(String ua) {
    final l = ua.toLowerCase();
    if (l.contains('android') || l.contains('iphone') || l.contains('dart')) return Icons.smartphone;
    return Icons.computer;
  }
}

class _TwoFaSetup extends StatefulWidget {
  const _TwoFaSetup();
  @override
  State<_TwoFaSetup> createState() => _TwoFaSetupState();
}

class _TwoFaSetupState extends State<_TwoFaSetup> {
  String? _secret, _uri, _error;
  List<String>? _backup;
  final _code = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    try {
      final j = Map<String, dynamic>.from(await Api.I.post('/auth/2fa/setup') as Map);
      if (mounted) {
        setState(() {
          _secret = j['secret']?.toString();
          _uri = (j['qr_uri'] ?? j['otp_uri'])?.toString();
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _verify() async {
    final code = _code.text.replaceAll(RegExp(r'\D'), '');
    if (code.length != 6) return toast(context, 'Enter the 6-digit code', error: true);
    setState(() => _busy = true);
    try {
      // The backend reads `code` as a query parameter.
      final j = await Api.I.post('/auth/2fa/verify', query: {'code': code});
      final codes = (j is Map ? j['backup_codes'] as List? : null)?.map((e) => e.toString()).toList();
      if (mounted) setState(() => _backup = codes ?? []);
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Enable 2FA')),
      body: _backup != null
          ? _done()
          : _uri == null
              ? (_error != null ? ErrorRetry(message: _error!, onRetry: _start) : const Loading())
              : ListView(padding: const EdgeInsets.all(20), children: [
                  const Text('1. Scan this QR code with Google Authenticator, Authy or a similar app.', style: TextStyle(fontSize: 14.5)),
                  const SizedBox(height: 16),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                      child: QrImageView(data: _uri!, size: 200, backgroundColor: Colors.white),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text('Or enter this key manually:', style: TextStyle(color: AppColors.textDim)),
                  const SizedBox(height: 6),
                  Row(children: [
                    Expanded(child: SelectableText(_secret ?? '', style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.5))),
                    IconButton(
                      icon: const Icon(Icons.copy),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: _secret ?? ''));
                        toast(context, 'Key copied');
                      },
                    ),
                  ]),
                  const SizedBox(height: 18),
                  const Text('2. Enter the 6-digit code from the app.', style: TextStyle(fontSize: 14.5)),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _code,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 22, letterSpacing: 8, fontWeight: FontWeight.w700),
                    decoration: const InputDecoration(counterText: ''),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _busy ? null : _verify,
                    child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Verify and enable'),
                  ),
                ]),
    );
  }

  Widget _done() => ListView(padding: const EdgeInsets.all(20), children: [
        const Icon(Icons.verified_user, color: AppColors.profit, size: 56),
        const SizedBox(height: 12),
        const Text('Two-factor authentication is on', textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        const Text('Save these backup codes somewhere safe. Each one signs you in once if you lose your phone. They will not be shown again.',
            textAlign: TextAlign.center, style: TextStyle(color: AppColors.textDim)),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Wrap(spacing: 18, runSpacing: 10, alignment: WrapAlignment.center, children: [
              for (final c in _backup!) SelectableText(c, style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
            ]),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () {
            Clipboard.setData(ClipboardData(text: _backup!.join('\n')));
            toast(context, 'Backup codes copied');
          },
          icon: const Icon(Icons.copy),
          label: const Text('Copy codes'),
        ),
        const SizedBox(height: 10),
        FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Done')),
      ]);
}

