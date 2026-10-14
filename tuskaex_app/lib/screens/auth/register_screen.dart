import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../state/brand_state.dart';
import '../../widgets/common.dart';
import 'auth_scaffold.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _pass = TextEditingController();
  final _confirm = TextEditingController();
  final _ref = TextEditingController();
  final _otp = TextEditingController();
  bool _busy = false;
  bool _otpStep = false;
  bool _agree = false;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    if (!_agree) {
      toast(context, 'Please accept the terms and risk disclosure.', error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      final needsOtp = await context.read<AuthState>().registerStart(
            email: _email.text,
            password: _pass.text,
            firstName: _first.text,
            lastName: _last.text,
            phone: _phone.text,
            referralCode: _ref.text,
          );
      if (!mounted) return;
      if (needsOtp) {
        setState(() => _otpStep = true);
        toast(context, 'Verification code sent to your email.');
      } else {
        Navigator.of(context).popUntil((r) => r.isFirst);
      }
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _verify() async {
    final code = _otp.text.replaceAll(RegExp(r'\D'), '');
    if (code.length != 6) {
      toast(context, 'Enter the 6-digit code.', error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      await context.read<AuthState>().registerVerify(_email.text, code);
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_otpStep) {
      return AuthScaffold(
        showBack: true,
        title: 'Verify your email',
        subtitle: 'We sent a 6-digit code to ${_email.text.trim()}.',
        children: [
          TextField(
            controller: _otp,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, letterSpacing: 10, fontWeight: FontWeight.w700),
            decoration: const InputDecoration(counterText: '', hintText: '••••••'),
          ),
          const SizedBox(height: 18),
          BusyButton(busy: _busy, label: 'Verify and continue', onPressed: _verify),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            TextButton(
              onPressed: () {
                context.read<AuthState>().registerCancel(_email.text);
                setState(() {
                  _otpStep = false;
                  _otp.clear();
                });
              },
              child: const Text('← Use a different email'),
            ),
            TextButton(
              onPressed: _busy
                  ? null
                  : () async {
                      try {
                        await context.read<AuthState>().registerResend(_email.text);
                        if (context.mounted) toast(context, 'Code resent.');
                      } on ApiException catch (e) {
                        if (context.mounted) toast(context, e.message, error: true);
                      }
                    },
              child: const Text('Resend code'),
            ),
          ]),
        ],
      );
    }

    return AuthScaffold(
      showBack: true,
      title: 'Create your account',
      subtitle: 'Start with a free demo, go live when you are ready.',
      children: [
        Form(
          key: _form,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Expanded(
                child: TextFormField(
                  controller: _first,
                  textInputAction: TextInputAction.next,
                  textCapitalization: TextCapitalization.words,
                  validator: (v) => (v ?? '').trim().isEmpty ? 'Required' : null,
                  decoration: const InputDecoration(labelText: 'First name'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _last,
                  textInputAction: TextInputAction.next,
                  textCapitalization: TextCapitalization.words,
                  validator: (v) => (v ?? '').trim().isEmpty ? 'Required' : null,
                  decoration: const InputDecoration(labelText: 'Last name'),
                ),
              ),
            ]),
            const SizedBox(height: 14),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              validator: validateEmail,
              decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline, size: 20)),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Phone (optional)', prefixIcon: Icon(Icons.phone_outlined, size: 20)),
            ),
            const SizedBox(height: 14),
            PasswordField(
              controller: _pass,
              label: 'Create password',
              action: TextInputAction.next,
              autofill: const [AutofillHints.newPassword],
              validator: validateNewPassword,
            ),
            const SizedBox(height: 14),
            PasswordField(
              controller: _confirm,
              label: 'Confirm password',
              autofill: const [AutofillHints.newPassword],
              validator: (v) => v != _pass.text ? 'Passwords do not match' : null,
            ),
            const SizedBox(height: 14),
            // With a broker picked, its code is what signup sends (see
            // AuthState.registerStart), so the IB field would be ignored.
            if (context.watch<BrandState>().broker == null)
              TextFormField(
                controller: _ref,
                decoration: const InputDecoration(labelText: 'Referral code (optional)', prefixIcon: Icon(Icons.card_giftcard, size: 20)),
              )
            else
              Text('You are joining ${context.watch<BrandState>().name}. Not your broker? Change it at the top.',
                  style: const TextStyle(color: AppColors.textDim, fontSize: 12.5)),
          ]),
        ),
        const SizedBox(height: 10),
        CheckboxListTile(
          value: _agree,
          onChanged: (v) => setState(() => _agree = v ?? false),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          title: const Text(
            'I accept the Terms of Service and understand that CFDs are complex instruments with a high risk of losing money.',
            style: TextStyle(fontSize: 12.5, color: AppColors.textDim),
          ),
        ),
        const SizedBox(height: 10),
        BusyButton(busy: _busy, label: 'Create account', onPressed: _submit),
        const SizedBox(height: 18),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('Already have an account?', style: TextStyle(color: AppColors.textDim)),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Sign in', style: TextStyle(fontWeight: FontWeight.w700))),
        ]),
      ],
    );
  }
}
