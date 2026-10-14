import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../state/brand_state.dart';
import '../models/models.dart';
import '../widgets/common.dart';

class IbScreen extends StatefulWidget {
  const IbScreen({super.key});
  @override
  State<IbScreen> createState() => _IbScreenState();
}

class _IbScreenState extends State<IbScreen> {
  Map<String, dynamic>? _status, _dash;
  List<Map<String, dynamic>> _refs = [], _comms = [];
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final s = Map<String, dynamic>.from(await Api.I.get('/business/status') as Map);
      Map<String, dynamic>? d;
      var refs = <Map<String, dynamic>>[], comms = <Map<String, dynamic>>[];
      if (s['is_ib'] == true) {
        final r = await Future.wait([
          Api.I.get('/business/ib/dashboard'),
          Api.I.get('/business/ib/referrals', query: {'per_page': 50}),
          Api.I.get('/business/ib/commissions'),
        ]);
        d = Map<String, dynamic>.from(r[0] as Map);
        refs = asList(r[1]);
        comms = asList(r[2]);
      }
      if (!mounted) return;
      setState(() {
        _status = s;
        _dash = d;
        _refs = refs;
        _comms = comms;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _apply() async {
    setState(() => _busy = true);
    try {
      await Api.I.post('/business/apply', body: <String, dynamic>{});
      if (mounted) toast(context, 'Application submitted. We will review it shortly.');
      await _load();
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final s = _status;
    return Scaffold(
      appBar: AppBar(title: const Text('Partner program')),
      body: s == null
          ? (_error != null ? ErrorRetry(message: _error!, onRetry: _load) : const Loading())
          : RefreshIndicator(onRefresh: _load, child: s['is_ib'] == true && _dash != null ? _dashboard(_dash!) : _applyView(s)),
    );
  }

  Widget _applyView(Map<String, dynamic> s) {
    final st = s['application_status']?.toString();
    return ListView(padding: const EdgeInsets.all(20), children: [
      const SizedBox(height: 20),
      Icon(Icons.handshake_outlined, size: 64, color: AppColors.brandLight),
      const SizedBox(height: 16),
      const Text('Become an Introducing Broker', textAlign: TextAlign.center, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8),
      const Text('Invite traders with your referral link and earn commission on every lot they trade — paid straight to your wallet.',
          textAlign: TextAlign.center, style: TextStyle(color: AppColors.textDim)),
      const SizedBox(height: 24),
      for (final b in const [
        (Icons.link, 'Personal referral link and code'),
        (Icons.payments_outlined, 'Commission on every trade your clients make'),
        (Icons.account_tree_outlined, 'Multi-level earnings from sub-partners'),
      ])
        ListTile(leading: Icon(b.$1, color: AppColors.brandLight), title: Text(b.$2)),
      const SizedBox(height: 20),
      if (st == 'pending')
        const Pill('APPLICATION UNDER REVIEW', color: AppColors.warning)
      else if (st == 'rejected') ...[
        const Text('Your previous application was not approved. You can apply again.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.loss)),
        const SizedBox(height: 12),
        FilledButton(onPressed: _busy ? null : _apply, child: const Text('Apply again')),
      ] else
        FilledButton(onPressed: _busy ? null : _apply, child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Apply now')),
    ]);
  }

  Widget _dashboard(Map<String, dynamic> d) {
    final link = (d['referral_link'] ?? '').toString();
    final code = (d['referral_code'] ?? '').toString();
    return ListView(padding: const EdgeInsets.all(16), children: [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)]),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Text('Total earned', style: TextStyle(color: Colors.white70)),
            const Spacer(),
            Pill('LEVEL ${d['level'] ?? 1}', color: Colors.white),
          ]),
          Text(fmtMoney(toD(d['total_earned'])), style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _kv('Referrals', '${toI(d['total_referrals'])}')),
            Expanded(child: _kv('Pending payout', fmtMoney(toD(d['pending_payout'])))),
          ]),
        ]),
      ),
      const SizedBox(height: 16),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Your referral link', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            SelectableText(link, style: TextStyle(color: AppColors.brandLight)),
            const SizedBox(height: 4),
            Text('Code: $code', style: const TextStyle(color: AppColors.textDim)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(42)),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: link));
                    toast(context, 'Link copied');
                  },
                  icon: const Icon(Icons.copy, size: 18),
                  label: const Text('Copy'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(42)),
                  onPressed: () => SharePlus.instance.share(ShareParams(text: 'Trade forex, gold and crypto on ${BrandState.I.name}. Join with my link: $link')),
                  icon: const Icon(Icons.share, size: 18),
                  label: const Text('Share'),
                ),
              ),
            ]),
          ]),
        ),
      ),
      const SizedBox(height: 18),
      Text('Referrals (${_refs.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      if (_refs.isEmpty)
        const Padding(padding: EdgeInsets.all(12), child: Text('No referrals yet — share your link to get started.', style: TextStyle(color: AppColors.textMute)))
      else
        Card(
          child: Column(children: [
            for (final r in _refs)
              ListTile(
                dense: true,
                title: Text(((r['referred_user'] as Map?)?['name'] ?? '').toString().isNotEmpty ? (r['referred_user'] as Map)['name'].toString() : ((r['referred_user'] as Map?)?['email'] ?? '').toString()),
                subtitle: Text('Joined ${fmtDate(parseTime((r['referred_user'] as Map?)?['joined_at']))}', style: const TextStyle(color: AppColors.textMute)),
                trailing: Text(fmtMoney(toD(r['total_deposit'])), style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
          ]),
        ),
      const SizedBox(height: 18),
      const Text('Commissions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      if (_comms.isEmpty)
        const Padding(padding: EdgeInsets.all(12), child: Text('No commissions yet.', style: TextStyle(color: AppColors.textMute)))
      else
        Card(
          child: Column(children: [
            for (final c in _comms)
              ListTile(
                dense: true,
                title: Text('${titleCase(c['commission_type'].toString())} · L${c['mlm_level'] ?? 1}'),
                subtitle: Text('${((c['source_user'] as Map?)?['name'] ?? '')} · ${fmtDate(parseTime(c['created_at']))}', style: const TextStyle(color: AppColors.textMute)),
                trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text(fmtMoney(toD(c['amount'])), style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.profit)),
                  Text(c['status'].toString(), style: TextStyle(fontSize: 11, color: statusColor(c['status'].toString()))),
                ]),
              ),
          ]),
        ),
    ]);
  }

  Widget _kv(String k, String v) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(color: Colors.white60, fontSize: 11.5)),
        Text(v, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
      ]);
}
