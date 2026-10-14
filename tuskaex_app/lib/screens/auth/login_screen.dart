import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../state/brand_state.dart';
import '../../widgets/broker_picker.dart';
import '../../widgets/common.dart';
import 'auth_scaffold.dart';
import 'forgot_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  bool _busy = false;

  Future<void> _login({String? totp}) async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    String? retryWith;
    try {
      await context.read<AuthState>().login(_email.text, _pass.text, totp: totp);
    } on ApiException catch (e) {
      if (mounted) {
        if (e.needs2fa) {
          retryWith = await _ask2fa();
        } else {
          toast(context, e.message, error: true);
        }
      }
    } catch (_) {
      if (mounted) toast(context, 'Sign-in failed. Please try again.', error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (retryWith != null && retryWith.isNotEmpty && mounted) return _login(totp: retryWith);
  }

  Future<String?> _ask2fa() {
    final c = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Two-factor authentication'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Enter the 6-digit code from your authenticator app, or a backup code.', style: TextStyle(color: AppColors.textDim)),
          const SizedBox(height: 16),
          TextField(controller: c, autofocus: true, keyboardType: TextInputType.text, decoration: const InputDecoration(hintText: '123456')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(100, 44)),
            onPressed: () => Navigator.pop(ctx, c.text.trim()),
            child: const Text('Verify'),
          ),
        ],
      ),
    );
  }

  Future<void> _demo() async {
    setState(() => _busy = true);
    try {
      await context.read<AuthState>().demoLogin();
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    } catch (_) {
      if (mounted) toast(context, 'Could not start the demo. Please try again.', error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final brand = context.watch<BrandState>();
    if (!brand.chosen) {
      return const AuthScaffold(
        title: 'Choose your broker',
        subtitle: 'Select the broker you opened your account with, then sign in with your email and password.',
        children: [BrokerList()],
      );
    }
    return AuthScaffold(
      title: 'Welcome back',
      subtitle: 'Sign in to your ${brand.name} account.',
      children: [
        Form(
          key: _form,
          child: AutofillGroup(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.email],
                validator: validateEmail,
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline, size: 20)),
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _pass,
                validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
              ),
            ]),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotScreen())),
            child: const Text('Forgot password?'),
          ),
        ),
        const SizedBox(height: 6),
        BusyButton(busy: _busy, label: 'Sign in', onPressed: _login),
        const SizedBox(height: 18),
        const Row(children: [
          Expanded(child: Divider()),
          Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('OR', style: TextStyle(color: AppColors.textMute, fontSize: 12))),
          Expanded(child: Divider()),
        ]),
        const SizedBox(height: 18),
        OutlinedButton.icon(
          onPressed: _busy ? null : _demo,
          icon: const Icon(Icons.play_circle_outline, size: 20),
          label: const Text('Try demo account'),
        ),
        const SizedBox(height: 26),
        if (context.watch<AuthState>().registrationsOpen)
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text("Don't have an account?", style: TextStyle(color: AppColors.textDim)),
          TextButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
            child: const Text('Create one', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ]),
      ],
    );
  }
}
