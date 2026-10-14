import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../widgets/common.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});
  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  List<Map<String, dynamic>>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final j = await Api.I.get('/support/tickets');
      if (mounted) setState(() => _items = asList(j));
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _new() async {
    final created = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => const _NewTicket()));
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Support')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        onPressed: _new,
        icon: const Icon(Icons.add_comment_outlined),
        label: const Text('New ticket'),
      ),
      body: _items == null
          ? (_error != null ? ErrorRetry(message: _error!, onRetry: _load) : const Loading())
          : _items!.isEmpty
              ? const EmptyState(icon: Icons.support_agent, title: 'No tickets yet', subtitle: 'Need help? Open a ticket and our team will reply.')
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
                    itemCount: _items!.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final t = _items![i];
                      final status = (t['status'] ?? 'open').toString();
                      return Card(
                        child: ListTile(
                          onTap: () async {
                            await Navigator.push(context, MaterialPageRoute(builder: (_) => _TicketThread(id: t['id'].toString())));
                            _load();
                          },
                          title: Text((t['subject'] ?? '').toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${fmtDateTime(parseTime(t['created_at']))} · ${toI(t['message_count'])} messages',
                              style: const TextStyle(color: AppColors.textMute, fontSize: 12)),
                          trailing: Pill(titleCase(status).toUpperCase(),
                              color: status == 'resolved' || status == 'closed' ? AppColors.profit : status == 'in_progress' ? AppColors.brandLight : AppColors.warning),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _NewTicket extends StatefulWidget {
  const _NewTicket();
  @override
  State<_NewTicket> createState() => _NewTicketState();
}

class _NewTicketState extends State<_NewTicket> {
  final _subject = TextEditingController();
  final _message = TextEditingController();
  String _priority = 'medium';
  bool _busy = false;

  Future<void> _send() async {
    if (_subject.text.trim().isEmpty || _message.text.trim().isEmpty) {
      return toast(context, 'Add a subject and a message', error: true);
    }
    setState(() => _busy = true);
    try {
      await Api.I.post('/support/tickets', body: {'subject': _subject.text.trim(), 'message': _message.text.trim(), 'priority': _priority});
      if (!mounted) return;
      toast(context, 'Ticket created');
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New ticket')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        TextField(controller: _subject, decoration: const InputDecoration(labelText: 'Subject')),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _priority,
          dropdownColor: AppColors.surface2,
          decoration: const InputDecoration(labelText: 'Priority'),
          items: const [
            DropdownMenuItem(value: 'low', child: Text('Low')),
            DropdownMenuItem(value: 'medium', child: Text('Medium')),
            DropdownMenuItem(value: 'high', child: Text('High')),
            DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
          ],
          onChanged: (v) => setState(() => _priority = v ?? 'medium'),
        ),
        const SizedBox(height: 12),
        TextField(controller: _message, minLines: 5, maxLines: 10, decoration: const InputDecoration(labelText: 'Describe your issue', alignLabelWithHint: true)),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _busy ? null : _send,
          child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Send'),
        ),
      ]),
    );
  }
}

class _TicketThread extends StatefulWidget {
  final String id;
  const _TicketThread({required this.id});
  @override
  State<_TicketThread> createState() => _TicketThreadState();
}

class _TicketThreadState extends State<_TicketThread> {
  Map<String, dynamic>? _t;
  String? _error;
  final _reply = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final j = await Api.I.get('/support/tickets/${widget.id}');
      if (mounted) setState(() => _t = Map<String, dynamic>.from(j as Map));
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _send() async {
    final msg = _reply.text.trim();
    if (msg.isEmpty) return;
    setState(() => _busy = true);
    try {
      await Api.I.post('/support/tickets/${widget.id}/reply', body: {'message': msg});
      _reply.clear();
      await _load();
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final t = _t;
    final msgs = t == null ? const <Map<String, dynamic>>[] : asList(t, 'messages');
    // Replying to a resolved ticket reopens it; only closed tickets reject replies.
    final closed = t != null && t['status'] == 'closed';
    return Scaffold(
      appBar: AppBar(title: Text(t?['subject']?.toString() ?? 'Ticket', overflow: TextOverflow.ellipsis)),
      body: t == null
          ? (_error != null ? ErrorRetry(message: _error!, onRetry: _load) : const Loading())
          : Column(children: [
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: msgs.length,
                  itemBuilder: (_, i) {
                    final m = msgs[i];
                    final admin = m['is_admin'] == true;
                    return Align(
                      alignment: admin ? Alignment.centerLeft : Alignment.centerRight,
                      child: Container(
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: admin ? AppColors.surface2 : AppColors.brand.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(admin ? 'Support' : 'You', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.brandLight)),
                          const SizedBox(height: 4),
                          Text((m['message'] ?? '').toString()),
                          const SizedBox(height: 4),
                          Text(fmtDateTime(parseTime(m['created_at'])), style: const TextStyle(color: AppColors.textMute, fontSize: 10.5)),
                        ]),
                      ),
                    );
                  },
                ),
              ),
              if (!closed)
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
                    child: Row(children: [
                      Expanded(child: TextField(controller: _reply, minLines: 1, maxLines: 4, decoration: const InputDecoration(hintText: 'Write a reply…'))),
                      const SizedBox(width: 8),
                      IconButton.filled(
                        onPressed: _busy ? null : _send,
                        style: IconButton.styleFrom(backgroundColor: AppColors.brand),
                        icon: const Icon(Icons.send_rounded),
                      ),
                    ]),
                  ),
                ),
            ]),
    );
  }
}
