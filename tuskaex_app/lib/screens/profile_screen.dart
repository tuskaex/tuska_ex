import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/theme.dart';
import '../state/auth_state.dart';
import '../widgets/common.dart';
import 'auth/auth_scaffold.dart' show PasswordField, validateNewPassword;

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _form = GlobalKey<FormState>();
  final _c = {
    for (final k in ['first_name', 'last_name', 'phone', 'date_of_birth', 'country', 'address', 'city', 'state', 'postal_code']) k: TextEditingController(),
  };
  bool _loaded = false, _busy = false;
  String? _error, _email;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final j = Map<String, dynamic>.from(await Api.I.get('/profile') as Map);
      for (final e in _c.entries) {
        final v = (j[e.key] ?? '').toString();
        e.value.text = e.key == 'date_of_birth' && v.length >= 10 ? v.substring(0, 10) : v;
      }
      _email = j['email']?.toString();
      if (mounted) setState(() => _loaded = true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await Api.I.put('/profile', body: {
        for (final e in _c.entries)
          // An empty date isn't a valid date; omit it rather than send "".
          if (e.key != 'date_of_birth' || e.value.text.trim().isNotEmpty) e.key: e.value.text.trim(),
      });
      if (!mounted) return;
      await context.read<AuthState>().refreshUser();
      if (mounted) toast(context, 'Profile saved');
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    const labels = {
      'first_name': 'First name',
      'last_name': 'Last name',
      'phone': 'Phone',
      'date_of_birth': 'Date of birth (YYYY-MM-DD)',
      'country': 'Country',
      'address': 'Address',
      'city': 'City',
      'state': 'State / region',
      'postal_code': 'Postal code',
    };
    return Scaffold(
      appBar: AppBar(title: const Text('Personal details')),
      body: !_loaded
          ? (_error != null ? ErrorRetry(message: _error!, onRetry: _load) : const Loading())
          : Form(
              key: _form,
              child: ListView(padding: const EdgeInsets.all(16), children: [
                TextFormField(initialValue: _email, enabled: false, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 12),
                for (final e in labels.entries) ...[
                  TextFormField(
                    controller: _c[e.key],
                    textCapitalization: e.key == 'postal_code' ? TextCapitalization.characters : TextCapitalization.words,
                    keyboardType: e.key == 'phone' ? TextInputType.phone : TextInputType.text,
                    validator: (v) {
                      final s = (v ?? '').trim();
                      if ((e.key == 'first_name' || e.key == 'last_name') && s.isEmpty) return 'Required';
                      if (e.key == 'date_of_birth' && s.isNotEmpty && DateTime.tryParse(s) == null) return 'Use YYYY-MM-DD';
                      return null;
                    },
                    decoration: InputDecoration(labelText: e.value),
                  ),
                  const SizedBox(height: 12),
                ],
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: _busy ? null : _save,
                  child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Save changes'),
                ),
              ]),
            ),
    );
  }
}

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});
  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _cur = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await Api.I.put('/profile/password', body: {'current_password': _cur.text, 'new_password': _new.text});
      if (!mounted) return;
      toast(context, 'Password changed');
      Navigator.pop(context);
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change password')),
      body: Form(
        key: _form,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          PasswordField(controller: _cur, label: 'Current password', validator: (v) => (v ?? '').isEmpty ? 'Required' : null),
          const SizedBox(height: 12),
          PasswordField(controller: _new, label: 'New password', validator: validateNewPassword, autofill: const [AutofillHints.newPassword]),
          const SizedBox(height: 12),
          PasswordField(
            controller: _confirm,
            label: 'Confirm new password',
            validator: (v) => v != _new.text ? 'Passwords do not match' : null,
            autofill: const [AutofillHints.newPassword],
          ),
          const SizedBox(height: 8),
          const Text('Use at least 8 characters with 3 of: lowercase, uppercase, number, symbol.', style: TextStyle(color: AppColors.textMute, fontSize: 12)),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Update password'),
          ),
        ]),
      ),
    );
  }
}
