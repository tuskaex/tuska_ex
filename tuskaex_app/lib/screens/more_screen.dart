import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/config.dart';
import '../core/theme.dart';
import '../state/auth_state.dart';
import '../state/brand_state.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';
import 'accounts_screen.dart';
import 'copy_trading_screen.dart';
import 'ib_screen.dart';
import 'kyc_screen.dart';
import 'portfolio_screen.dart';
import 'security_screen.dart';
import 'notifications_screen.dart';
import 'positions_screen.dart' show confirm;
import 'profile_screen.dart';
import 'support_screen.dart';
import 'wallet_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final u = auth.user;
    final brand = context.watch<BrandState>();
    void push(Widget w) => Navigator.push(context, MaterialPageRoute(builder: (_) => w));

    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          if (u != null)
            GlassCard(
              glow: AppColors.violet,
              onTap: () => push(const ProfileScreen()),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Orb(
                      size: 56,
                      colors: const [Color(0xFF818CF8), Color(0xFF4338CA)],
                      child: Text(
                        u.initials,
                        style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(u.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          const SizedBox(height: 2),
                          Text(u.email, style: const TextStyle(color: AppColors.textDim, fontSize: 12.5)),
                          const SizedBox(height: 6),
                          Pill(u.kycApproved ? 'VERIFIED' : 'NOT VERIFIED', color: u.kycApproved ? AppColors.profit : AppColors.warning),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.textMute),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 18),
          _section('Funds', [
            if (brand.allows('deposits')) _item(Icons.add_card, 'Deposit', () => push(const WalletScreen(initialTab: 0))),
            if (brand.allows('withdrawals')) _item(Icons.north_east, 'Withdraw', () => push(const WalletScreen(initialTab: 1))),
            if (brand.allows('transfers')) _item(Icons.swap_horiz, 'Transfer', () => push(const WalletScreen(initialTab: 2))),
            _item(Icons.receipt_outlined, 'Transaction history', () => push(const WalletScreen(initialTab: 3))),
          ]),
          _section('Trading', [
            _item(Icons.account_balance_wallet_outlined, 'Trading accounts', () => push(const AccountsScreen())),
            _item(Icons.add_circle_outline, 'Open new account', () => push(const OpenAccountScreen())),
            _item(Icons.pie_chart_outline, 'Portfolio & performance', () => push(const PortfolioScreen())),
            if (brand.allows('copy_trading')) _item(Icons.groups_outlined, 'Copy trading & PAMM', () => push(const CopyTradingScreen())),
            if (brand.allows('ib_program')) _item(Icons.handshake_outlined, 'Partner program (IB)', () => push(const IbScreen())),
          ]),
          _section('Account', [
            _item(Icons.verified_user_outlined, 'Identity verification', () => push(const KycScreen())),
            _item(Icons.person_outline, 'Personal details', () => push(const ProfileScreen())),
            _item(Icons.shield_outlined, 'Security & 2FA', () => push(const SecurityScreen())),
            _item(Icons.notifications_none, 'Notifications', () => push(const NotificationsScreen())),
          ]),
          _section('Help', [
            _item(Icons.support_agent, 'Support tickets', () => push(const SupportScreen())),
            _item(Icons.mail_outline, 'Email ${brand.supportEmail}', () => launchUrl(Uri.parse('mailto:${brand.supportEmail}'))),
            if (brand.supportWhatsapp != null)
              _item(
                Icons.chat_outlined,
                'WhatsApp ${brand.supportWhatsapp}',
                () => launchUrl(
                  Uri.parse('https://wa.me/${brand.supportWhatsapp!.replaceAll(RegExp(r'\D'), '')}'),
                  mode: LaunchMode.externalApplication,
                ),
              ),
            if (brand.isPlatform)
              _item(
                Icons.public,
                'Visit our website',
                () => launchUrl(Uri.parse(AppConfig.websiteUrl), mode: LaunchMode.externalApplication),
              ),
          ]),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.loss,
              side: const BorderSide(color: AppColors.loss),
            ),
            onPressed: () async {
              final ok = await confirm(
                context,
                'Sign out?',
                'You will need to sign in again to trade.',
                ok: 'Sign out',
                okColor: AppColors.sell,
              );
              if (ok && context.mounted) context.read<AuthState>().logout();
            },
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
          const SizedBox(height: 18),
          const Text(
            'Risk warning: CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. '
            'Consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMute, fontSize: 11),
          ),
          const SizedBox(height: 8),
          const Center(
            child: Text('SpeedTrader v1.0.0', style: TextStyle(color: AppColors.textMute, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> items) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            title.toUpperCase(),
            style: const TextStyle(color: AppColors.textMute, fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: 1),
          ),
        ),
        Card(
          child: Column(
            children: [
              for (var i = 0; i < items.length; i++) ...[if (i > 0) const Divider(indent: 56), items[i]],
            ],
          ),
        ),
      ],
    ),
  );

  Widget _item(IconData icon, String label, VoidCallback onTap) => ListTile(
    onTap: onTap,
    leading: Orb(size: 36, colors: const [Color(0xFF93C5FD), Color(0xFF3730A3)], child: Icon(icon)),
    title: Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
    trailing: const Icon(Icons.chevron_right, color: AppColors.textMute),
  );
}

