import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/theme.dart';
import '../state/brand_state.dart';
import 'common.dart';

/// "Broker: X Â· Change" above the sign-in form. Change goes back to the list.
class BrokerChip extends StatelessWidget {
  const BrokerChip({super.key});
  @override
  Widget build(BuildContext context) {
    final brand = context.watch<BrandState>();
    if (!brand.chosen) return const SizedBox.shrink();
    final b = brand.broker;
    return Center(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: brand.unchoose,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.apartment_rounded, size: 16, color: AppColors.textDim),
            const SizedBox(width: 6),
            Text(b == null ? AppConfig.brandName : '${b.name ?? b.code} Â· ${b.code}',
                style: const TextStyle(fontSize: 12.5, color: AppColors.textDim, fontWeight: FontWeight.w600)),
            const SizedBox(width: 8),
            Text('Change', style: TextStyle(fontSize: 12.5, color: AppColors.brandLight, fontWeight: FontWeight.w700)),
          ]),
        ),
      ),
    );
  }
}

/// Step one of signing in: every broker on the platform, searchable by name or
/// broker ID, plus TuskaEx itself for clients who joined directly.
class BrokerList extends StatefulWidget {
  const BrokerList({super.key});
  @override
  State<BrokerList> createState() => _BrokerListState();
}

class _BrokerListState extends State<BrokerList> {
  final _q = TextEditingController();
  List<Broker>? _all;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final l = await BrandState.I.listBrokers();
      if (mounted) setState(() => _all = l);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load brokers.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = _q.text.trim().toLowerCase();
    final list = (_all ?? [])
        .where((b) => q.isEmpty || (b.name ?? '').toLowerCase().contains(q) || b.code.toLowerCase().contains(q))
        .toList();
    final showPlatform = q.isEmpty || AppConfig.brandName.toLowerCase().contains(q);

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      TextField(
        controller: _q,
        onChanged: (_) => setState(() {}),
        textInputAction: TextInputAction.search,
        decoration: const InputDecoration(
          hintText: 'Search broker name or ID',
          prefixIcon: Icon(Icons.search, size: 20),
        ),
      ),
      const SizedBox(height: 12),
      if (showPlatform)
        _BrokerTile(name: AppConfig.brandName, subtitle: 'Joined ${AppConfig.brandName} directly', onTap: () => BrandState.I.set(null)),
      if (_all == null && _error == null)
        const Padding(padding: EdgeInsets.all(24), child: Loading())
      else if (_error != null)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(children: [
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textDim)),
            TextButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Try again')),
          ]),
        )
      else ...[
        for (final b in list)
          _BrokerTile(
            name: b.name ?? b.code,
            subtitle: 'Broker ID ${b.code}',
            logoUrl: b.logoUrl,
            color: BrandState.parseColor(b.color),
            onTap: () => BrandState.I.set(b),
          ),
        if (list.isEmpty && !showPlatform)
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text('No broker matches your search.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textDim)),
          ),
      ],
    ]);
  }
}

class _BrokerTile extends StatelessWidget {
  final String name, subtitle;
  final String? logoUrl;
  final Color? color;
  final VoidCallback onTap;
  const _BrokerTile({required this.name, required this.subtitle, required this.onTap, this.logoUrl, this.color});

  @override
  Widget build(BuildContext context) {
    final tint = color ?? AppColors.platformBrand;
    final Widget mark = logoUrl == null
        ? (color == null && name == AppConfig.brandName
            ? Image.asset('assets/images/logo.png', fit: BoxFit.contain)
            : Center(child: Text(name.characters.first.toUpperCase(), style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: tint))))
        : Image.network(logoUrl!, fit: BoxFit.contain, errorBuilder: (_, _, _) => Icon(Icons.apartment_rounded, color: tint));
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Container(
                width: 44,
                height: 44,
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: tint.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                child: mark,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(color: AppColors.textMute, fontSize: 12)),
                ]),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.textMute),
            ]),
          ),
        ),
      ),
    );
  }
}

