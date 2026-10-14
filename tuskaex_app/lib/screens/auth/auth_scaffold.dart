import 'package:flutter/material.dart';

import '../../core/theme.dart';

import '../../widgets/broker_picker.dart';
import '../../widgets/fx.dart';

/// Dark gradient backdrop with the brand mark, shared by all auth screens.
class AuthScaffold extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> children;
  final bool showBack;
  const AuthScaffold({super.key, required this.title, this.subtitle, required this.children, this.showBack = false});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: showBack ? AppBar(backgroundColor: Colors.transparent) : null,
      extendBodyBehindAppBar: true,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Center(child: FloatingLogo3D(height: showBack ? 64 : 84)),
                const SizedBox(height: 8),
                const BrokerChip(),
                const SizedBox(height: 16),
                GlassCard(
                  blur: true,
                  radius: 28,
                  glow: AppColors.brand,
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Text(title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                    if (subtitle != null) ...[
                      const SizedBox(height: 6),
                      Text(subtitle!, style: const TextStyle(color: AppColors.textDim, fontSize: 14)),
                    ],
                    const SizedBox(height: 22),
                    ...children,
                  ]),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class PasswordField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String? Function(String?)? validator;
  final TextInputAction action;
  final List<String> autofill;
  const PasswordField({
    super.key,
    required this.controller,
    this.label = 'Password',
    this.validator,
    this.action = TextInputAction.done,
    this.autofill = const [AutofillHints.password],
  });
  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _hide = true;
  @override
  Widget build(BuildContext context) => TextFormField(
        controller: widget.controller,
        obscureText: _hide,
        validator: widget.validator,
        textInputAction: widget.action,
        autofillHints: widget.autofill,
        decoration: InputDecoration(
          labelText: widget.label,
          prefixIcon: const Icon(Icons.lock_outline, size: 20),
          suffixIcon: IconButton(
            icon: Icon(_hide ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
            onPressed: () => setState(() => _hide = !_hide),
          ),
        ),
      );
}

String? validateEmail(String? v) {
  if (v == null || !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())) return 'Enter a valid email address';
  return null;
}

/// Mirrors the backend policy: 8+ chars and 3 of lower/upper/digit/symbol.
String? validateNewPassword(String? v) {
  final s = v ?? '';
  if (s.length < 8) return 'At least 8 characters';
  var classes = 0;
  if (RegExp(r'[a-z]').hasMatch(s)) classes++;
  if (RegExp(r'[A-Z]').hasMatch(s)) classes++;
  if (RegExp(r'\d').hasMatch(s)) classes++;
  if (RegExp(r'[^A-Za-z0-9]').hasMatch(s)) classes++;
  if (classes < 3) return 'Use 3 of: lowercase, uppercase, number, symbol';
  return null;
}

class BusyButton extends StatelessWidget {
  final bool busy;
  final String label;
  final VoidCallback? onPressed;
  const BusyButton({super.key, required this.busy, required this.label, this.onPressed});
  @override
  Widget build(BuildContext context) => Button3D(
        onPressed: busy ? null : onPressed,
        child: busy
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
            : Text(label),
      );
}
