import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/format.dart';
import '../core/theme.dart';
import '../state/brand_state.dart';
import '../state/trading_state.dart';
import 'fx.dart';

class AppLogo extends StatelessWidget {
  final double height;
  final bool withName;
  const AppLogo({super.key, this.height = 36, this.withName = true});
  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      BrandLogo(height: height),
      if (withName) ...[
        const SizedBox(width: 8),
        Text(context.select<BrandState, String>((b) => b.name), style: TextStyle(fontSize: height * 0.55, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
      ],
    ]);
  }
}

void toast(BuildContext context, String msg, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Row(children: [
        Icon(error ? Icons.error_outline : Icons.check_circle_outline, color: error ? AppColors.loss : AppColors.profit, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(msg)),
      ]),
      duration: Duration(seconds: error ? 4 : 2),
    ));
}

class Loading extends StatelessWidget {
  const Loading({super.key});
  @override
  Widget build(BuildContext context) => const Center(child: CircularProgressIndicator(strokeWidth: 2.5));
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;
  const EmptyState({super.key, required this.icon, required this.title, this.subtitle, this.action});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Orb(size: 76, colors: const [Color(0xFF93C5FD), Color(0xFF4338CA)], child: Icon(icon)),
          const SizedBox(height: 16),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(subtitle!, style: const TextStyle(color: AppColors.textDim), textAlign: TextAlign.center),
          ],
          if (action != null) ...[const SizedBox(height: 18), action!],
        ]),
      ),
    );
  }
}

class ErrorRetry extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const ErrorRetry({super.key, required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => EmptyState(
        icon: Icons.cloud_off_outlined,
        title: 'Something went wrong',
        subtitle: message,
        action: OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Retry')),
      );
}

class PnlText extends StatelessWidget {
  final double value;
  final double size;
  final String currency;
  const PnlText(this.value, {super.key, this.size = 14, this.currency = 'USD'});
  @override
  Widget build(BuildContext context) => Text(
        fmtMoney(value, currency: currency, sign: true),
        style: TextStyle(color: AppColors.pnl(value), fontSize: size, fontWeight: FontWeight.w700, fontFeatures: const [FontFeature.tabularFigures()]),
      );
}

class Pill extends StatelessWidget {
  final String text;
  final Color? tint;
  Color get color => tint ?? AppColors.brandLight;
  const Pill(this.text, {super.key, Color? color}) : tint = color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(6)),
        child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
      );
}

Color statusColor(String s) {
  switch (s.toLowerCase()) {
    case 'approved':
    case 'auto_approved':
    case 'completed':
    case 'paid':
    case 'verified':
    case 'filled':
      return AppColors.profit;
    case 'rejected':
    case 'failed':
    case 'cancelled':
      return AppColors.loss;
    default:
      return AppColors.warning;
  }
}

/// Balance / equity / margin strip for the active account.
class AccountSummaryBar extends StatelessWidget {
  final bool compact;
  const AccountSummaryBar({super.key, this.compact = false});
  @override
  Widget build(BuildContext context) {
    final t = context.watch<TradingState>();
    final a = t.active;
    if (a == null) return const SizedBox.shrink();
    final ml = t.marginLevel;
    final items = [
      ('Balance', fmtMoney(t.balance), AppColors.text),
      if (t.credit != 0) ('Credit', fmtMoney(t.credit), AppColors.text),
      ('Equity', fmtMoney(t.equity), AppColors.text),
      ('Floating', fmtMoney(t.floating, sign: true), AppColors.pnl(t.floating)),
      ('Margin', fmtMoney(t.marginUsed), AppColors.text),
      ('Free margin', fmtMoney(t.freeMargin), AppColors.text),
      ('Margin level', ml == null ? '—' : '${ml.toStringAsFixed(1)}%',
          ml == null ? AppColors.textDim : (ml < 50 ? AppColors.loss : ml < 80 ? AppColors.warning : AppColors.profit)),
    ];
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: LinearGradient(colors: [const Color(0xFF1E3A8A).withValues(alpha: 0.55), const Color(0xFF4C1D95).withValues(alpha: 0.35)]),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
        boxShadow: [BoxShadow(color: const Color(0xFF3B82F6).withValues(alpha: 0.18), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          for (final it in items)
            Padding(
              padding: const EdgeInsets.only(right: 20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(it.$1, style: const TextStyle(color: AppColors.textMute, fontSize: 10.5)),
                const SizedBox(height: 2),
                Text(it.$2, style: TextStyle(color: it.$3, fontSize: compact ? 12.5 : 13.5, fontWeight: FontWeight.w700, fontFeatures: const [FontFeature.tabularFigures()])),
              ]),
            ),
        ]),
      ),
    );
  }
}

/// Tappable chip in the app bar to switch the active trading account.
class AccountChip extends StatelessWidget {
  const AccountChip({super.key});
  @override
  Widget build(BuildContext context) {
    final t = context.watch<TradingState>();
    final a = t.active;
    if (a == null) return const SizedBox.shrink();
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => showAccountPicker(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(color: AppColors.surface2, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Pill(a.isDemo ? 'DEMO' : 'LIVE', color: a.isDemo ? AppColors.warning : AppColors.profit),
          const SizedBox(width: 8),
          Text(a.accountNumber, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
          const Icon(Icons.expand_more, size: 18, color: AppColors.textDim),
        ]),
      ),
    );
  }
}

Future<void> showAccountPicker(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    builder: (ctx) {
      final t = ctx.watch<TradingState>();
      final list = t.tradableAccounts;
      return SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Text('Switch account', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          ),
          if (list.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Text('No trading accounts yet.')),
          for (final a in list)
            ListTile(
              onTap: () {
                t.selectAccount(a.id);
                Navigator.pop(ctx);
              },
              leading: Pill(a.isDemo ? 'DEMO' : 'LIVE', color: a.isDemo ? AppColors.warning : AppColors.profit),
              title: Text(a.accountNumber, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${a.groupName} · 1:${a.leverage}', style: const TextStyle(color: AppColors.textDim)),
              trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(fmtMoney(a.balance), style: const TextStyle(fontWeight: FontWeight.w700)),
                if (a.id == t.active?.id) Icon(Icons.check_circle, color: AppColors.brand, size: 16),
              ]),
            ),
          const SizedBox(height: 8),
        ]),
      );
    },
  );
}
