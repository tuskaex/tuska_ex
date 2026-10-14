import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../widgets/common.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final j = await Api.I.get('/notifications/', query: {'per_page': 50});
      if (mounted) setState(() => _items = asList(j).map(AppNotification.fromJson).toList());
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _readAll() async {
    try {
      await Api.I.put('/notifications/read-all');
      setState(() {
        for (final n in _items ?? <AppNotification>[]) {
          n.isRead = true;
        }
      });
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
  }

  IconData _icon(String type) => switch (type) {
        'trade' => Icons.candlestick_chart,
        'deposit' || 'wallet' => Icons.south_west,
        'withdrawal' => Icons.north_east,
        'security' => Icons.lock_outline,
        'kyc' => Icons.verified_user_outlined,
        _ => Icons.notifications_none,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [if (_items?.any((n) => !n.isRead) == true) TextButton(onPressed: _readAll, child: const Text('Mark all read'))],
      ),
      body: _items == null
          ? (_error != null ? ErrorRetry(message: _error!, onRetry: _load) : const Loading())
          : _items!.isEmpty
              ? const EmptyState(icon: Icons.notifications_off_outlined, title: "You're all caught up")
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _items!.length,
                    separatorBuilder: (_, _) => const Divider(),
                    itemBuilder: (_, i) {
                      final n = _items![i];
                      return ListTile(
                        onTap: () async {
                          if (n.isRead) return;
                          setState(() => n.isRead = true);
                          try {
                            await Api.I.put('/notifications/${n.id}/read');
                          } catch (_) {}
                        },
                        leading: CircleAvatar(
                          backgroundColor: AppColors.brand.withValues(alpha: 0.14),
                          child: Icon(_icon(n.type), color: AppColors.brandLight, size: 20),
                        ),
                        title: Text(n.title, style: TextStyle(fontWeight: n.isRead ? FontWeight.w500 : FontWeight.w800)),
                        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const SizedBox(height: 2),
                          Text(n.message, style: const TextStyle(color: AppColors.textDim)),
                          const SizedBox(height: 4),
                          Text(fmtDateTime(n.createdAt), style: const TextStyle(color: AppColors.textMute, fontSize: 11.5)),
                        ]),
                        trailing: n.isRead ? null : Icon(Icons.circle, size: 9, color: AppColors.brand),
                      );
                    },
                  ),
                ),
    );
  }
}
