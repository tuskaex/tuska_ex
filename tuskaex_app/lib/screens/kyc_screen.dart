import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../state/auth_state.dart';
import '../widgets/common.dart';

const _docTypes = {
  'passport': 'Passport',
  'national_id': 'National ID card',
  'driving_license': 'Driving licence',
  'id_front': 'ID card (front)',
  'id_back': 'ID card (back)',
  'proof_of_address': 'Proof of address',
  'bank_statement': 'Bank statement',
  'selfie': 'Selfie with ID',
  'other': 'Other document',
};

class KycScreen extends StatefulWidget {
  const KycScreen({super.key});
  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> {
  Map<String, dynamic>? _profile;
  String? _error;
  String _type1 = 'passport';
  String _type2 = 'proof_of_address';
  XFile? _file1, _file2;
  final _address = TextEditingController();
  final _city = TextEditingController();
  final _postal = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final j = await Api.I.get('/profile');
      final p = Map<String, dynamic>.from(j as Map);
      if (!mounted) return;
      setState(() {
        _profile = p;
        // The backend folds city/postcode into address on submit; only pre-fill line 1.
        _address.text = (p['address'] ?? '').toString().split('\n').first;
        _city.text = (p['city'] ?? '').toString();
        _postal.text = (p['postal_code'] ?? '').toString();
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<XFile?> _pick() async {
    final src = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (c) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(leading: const Icon(Icons.photo_camera_outlined), title: const Text('Take a photo'), onTap: () => Navigator.pop(c, ImageSource.camera)),
          ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Choose from gallery'), onTap: () => Navigator.pop(c, ImageSource.gallery)),
        ]),
      ),
    );
    if (src == null) return null;
    return ImagePicker().pickImage(source: src, imageQuality: 85, maxWidth: 2400);
  }

  Future<void> _submit() async {
    if (_file1 == null) return toast(context, 'Attach your identity document', error: true);
    setState(() => _busy = true);
    try {
      await Api.I.upload(
        '/profile/kyc/submit',
        {
          'document_type': _type1,
          if (_file2 != null) 'document_type_2': _type2,
          'residential_address': _address.text.trim(),
          'city': _city.text.trim(),
          'postal_code': _postal.text.trim(),
          'country_of_residence': (_profile?['country'] ?? '').toString(),
        },
        {'file': _file1!.path, if (_file2 != null) 'file_2': _file2!.path},
      );
      if (!mounted) return;
      toast(context, 'Documents submitted. We will review them shortly.');
      setState(() {
        _file1 = null;
        _file2 = null;
      });
      await _load();
      if (mounted) context.read<AuthState>().refreshUser().catchError((_) {});
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final p = _profile;
    return Scaffold(
      appBar: AppBar(title: const Text('Identity verification')),
      body: p == null
          ? (_error != null ? ErrorRetry(message: _error!, onRetry: _load) : const Loading())
          : ListView(padding: const EdgeInsets.all(16), children: [
              _StatusCard(status: (p['kyc_status'] ?? 'pending').toString()),
              const SizedBox(height: 18),
              if ((p['kyc_documents'] as List?)?.isNotEmpty == true) ...[
                const Text('Submitted documents', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                for (final d in (p['kyc_documents'] as List).whereType<Map>())
                  Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: const Icon(Icons.description_outlined),
                      title: Text(_docTypes[d['document_type']] ?? titleCase(d['document_type'].toString())),
                      subtitle: Text(
                        [fmtDate(parseTime(d['created_at'])), if ((d['rejection_reason'] ?? '').toString().isNotEmpty) 'Reason: ${d['rejection_reason']}'].join(' · '),
                        style: const TextStyle(color: AppColors.textMute, fontSize: 12),
                      ),
                      trailing: Pill(d['status'].toString().toUpperCase(), color: statusColor(d['status'].toString())),
                    ),
                  ),
                const SizedBox(height: 14),
              ],
              if (!['approved', 'verified'].contains(p['kyc_status'])) ...[
                const Text('Upload documents', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 4),
                const Text('A clear photo of a government-issued ID, plus a recent proof of address (utility bill or bank statement, under 3 months old).',
                    style: TextStyle(color: AppColors.textDim, fontSize: 12.5)),
                const SizedBox(height: 14),
                _docPicker('Identity document', _type1, (v) => setState(() => _type1 = v), _file1, () async {
                  final f = await _pick();
                  if (f != null) setState(() => _file1 = f);
                }),
                const SizedBox(height: 12),
                _docPicker('Second document (optional)', _type2, (v) => setState(() => _type2 = v), _file2, () async {
                  final f = await _pick();
                  if (f != null) setState(() => _file2 = f);
                }),
                const SizedBox(height: 14),
                TextField(controller: _address, decoration: const InputDecoration(labelText: 'Residential address')),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: TextField(controller: _city, decoration: const InputDecoration(labelText: 'City'))),
                  const SizedBox(width: 10),
                  Expanded(child: TextField(controller: _postal, decoration: const InputDecoration(labelText: 'Postal code'))),
                ]),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Submit for review'),
                ),
              ],
            ]),
    );
  }

  Widget _docPicker(String title, String type, ValueChanged<String> onType, XFile? file, VoidCallback onPick) => Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: type,
              dropdownColor: AppColors.surface2,
              decoration: const InputDecoration(labelText: 'Document type'),
              items: [for (final e in _docTypes.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
              onChanged: (v) => v == null ? null : onType(v),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: onPick,
              icon: Icon(file == null ? Icons.add_a_photo_outlined : Icons.check_circle, color: file == null ? null : AppColors.profit),
              label: Text(file == null ? 'Attach photo' : file.name, overflow: TextOverflow.ellipsis),
            ),
          ]),
        ),
      );
}

class _StatusCard extends StatelessWidget {
  final String status;
  const _StatusCard({required this.status});
  @override
  Widget build(BuildContext context) {
    final (icon, color, title, sub) = switch (status) {
      'approved' || 'verified' => (Icons.verified, AppColors.profit, 'Verified', 'Your identity is verified. All features are unlocked.'),
      'submitted' || 'under_review' => (Icons.hourglass_top, AppColors.warning, 'Under review', 'We are reviewing your documents. This usually takes less than 24 hours.'),
      'rejected' || 'failed' => (Icons.cancel_outlined, AppColors.loss, 'Rejected', 'Some documents were rejected. Please upload them again.'),
      _ => (Icons.shield_outlined, AppColors.brandLight, 'Not verified', 'Verify your identity to withdraw funds and open live accounts.'),
    };
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16), border: Border.all(color: color.withValues(alpha: 0.4))),
      child: Row(children: [
        Icon(icon, color: color, size: 34),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 2),
            Text(sub, style: const TextStyle(fontSize: 13)),
          ]),
        ),
      ]),
    );
  }
}
