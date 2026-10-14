import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../state/auth_state.dart';
import '../../widgets/common.dart';
import 'auth_scaffold.dart';

class ForgotScreen extends StatefulWidget {
  const ForgotScreen({super.key});
  @override
  State<ForgotScreen> createState() => _ForgotScreenState();
}

class _ForgotScreenState extends State<ForgotScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _pass = TextEditingController();
  bool _sent = false;
  bool _busy = false;

  Future<void> _run(Future<void> Function() f) async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await f();
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthState>();
    return AuthScaffold(
      showBack: true,
      title: _sent ? 'Set a new password' : 'Reset password',
      subtitle: _sent
          ? 'Enter the 6-digit code we emailed to ${_email.text.trim()}. It is valid for 15 minutes.'
          : 'We will email you a code to reset your password.',
      children: [
        Form(
          key: _form,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (!_sent)
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                validator: validateEmail,
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline, size: 20)),
              )
            else ...[
              TextFormField(
                controller: _code,
                keyboardType: TextInputType.number,
                maxLength: 6,
                validator: (v) => (v ?? '').trim().length != 6 ? 'Enter the 6-digit code' : null,
                decoration: const InputDecoration(labelText: 'Reset code', counterText: '', prefixIcon: Icon(Icons.pin_outlined, size: 20)),
              ),
              const SizedBox(height: 14),
              PasswordField(controller: _pass, label: 'New password', validator: validateNewPassword, autofill: const [AutofillHints.newPassword]),
            ],
          ]),
        ),
        const SizedBox(height: 20),
        BusyButton(
          busy: _busy,
          label: _sent ? 'Update password' : 'Send reset code',
          onPressed: () => _run(() async {
            if (!_sent) {
              await auth.forgotPassword(_email.text);
              setState(() => _sent = true);
            } else {
              await auth.resetPassword(_code.text, _pass.text);
              if (!context.mounted) return;
              toast(context, 'Password updated. Sign in with your new password.');
              Navigator.pop(context);
            }
          }),
        ),
      ],
    );
  }
}
