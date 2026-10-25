import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'models/clinic_models.dart';
import 'services/staff_api_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ClinicReceptionDoctorApp());
}

class ClinicReceptionDoctorApp extends StatefulWidget {
  const ClinicReceptionDoctorApp({super.key});

  @override
  State<ClinicReceptionDoctorApp> createState() =>
      _ClinicReceptionDoctorAppState();
}

class _ClinicReceptionDoctorAppState extends State<ClinicReceptionDoctorApp> {
  late final StaffApiService _api;

  @override
  void initState() {
    super.initState();
    _api = StaffApiService(onStateChanged: () {
      if (mounted) setState(() {});
    });
    _api.initialize();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Clinic Reception & Doctor Console',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F172A),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF1F5F9),
        useMaterial3: true,
      ),
      home: StaffWorkspaceScreen(api: _api),
    );
  }
}

enum StaffWorkspaceMode { reception, doctorRoom, tvDisplay }

class StaffWorkspaceScreen extends StatefulWidget {
  final StaffApiService api;
  const StaffWorkspaceScreen({super.key, required this.api});

  @override
  State<StaffWorkspaceScreen> createState() => _StaffWorkspaceScreenState();
}

class _StaffWorkspaceScreenState extends State<StaffWorkspaceScreen> {
  bool _isAuthed = false;
  final TextEditingController _pinCtrl = TextEditingController();
  String? _pinError;

  StaffWorkspaceMode _mode = StaffWorkspaceMode.reception;
  String? _selectedDoctorRoomId;

  void _handleUnlock() {
    if (widget.api.verifyPin(_pinCtrl.text)) {
      setState(() {
        _isAuthed = true;
        _pinError = null;
        _pinCtrl.clear();
      });
    } else {
      setState(() {
        _pinError = 'စကားဝှက် (Password) မှားယွင်းနေပါသည်။ ပြန်လည်ကြိုးစားပါ။';
      });
    }
  }

  void _showChangePinDialog() {
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    String? err;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: const Text(
            'Reception စကားဝှက် (PIN) ပြောင်းရန်',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: currentCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'လက်ရှိ စကားဝှက် (Current PIN)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: newCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'စကားဝှက်အသစ် (အနည်းဆုံး ၄ လုံး)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: confirmCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'စကားဝှက်အသစ် အတည်ပြုရန်',
                  border: OutlineInputBorder(),
                ),
              ),
              if (err != null) ...[
                const SizedBox(height: 8),
                Text(
                  err!,
                  style: const TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('ပိတ်မည်'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (newCtrl.text.trim() != confirmCtrl.text.trim()) {
                  setModalState(() => err = 'စကားဝှက်အသစ် နှစ်ခု မတူညီပါ။');
                  return;
                }
                final ok = await widget.api
                    .updateReceptionPin(currentCtrl.text, newCtrl.text);
                if (!ok) {
                  setModalState(
                      () => err = 'လက်ရှိစကားဝှက် မှားနေပါသည် သို့မဟုတ် တိုနေပါသည်။');
                  return;
                }
                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: Color(0xFF15803D),
                      content: Text('Reception စကားဝှက် ပြောင်းလဲပြီးပါပြီ။'),
                    ),
                  );
                }
              },
              child: const Text('သိမ်းဆည်းမည်'),
            ),
          ],
        ),
      ),
    );
  }

  void _showServerUrlDialog() {
    final ctrl = TextEditingController(text: widget.api.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(
          'ဆေးခန်း Server လိပ်စာ ပြင်ဆင်ရန်',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
        ),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            labelText: 'Server URL',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('ပိတ်မည်'),
          ),
          ElevatedButton(
            onPressed: () async {
              await widget.api.updateServerUrl(ctrl.text);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('သိမ်းဆည်းမည်'),
          ),
        ],
      ),
    );
  }

  /// MODAL: Patient Directory, QR/ID Lookup & NRC/Driver's License Phone Recovery
  void _showPatientDirectoryAndRecoveryModal() {
    final searchCtrl = TextEditingController();
    Patient? selectedPatient;
    final newPhoneCtrl = TextEditingController();
    final nrcCtrl = TextEditingController();
    final nameVerifyCtrl = TextEditingController();
    String? modalFeedback;
    bool isScanningQr = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final q = searchCtrl.text.trim().toUpperCase();
          final filteredPatients = widget.api.patients.where((p) {
            if (q.isEmpty) return true;
            return p.patientCode.toUpperCase().contains(q) ||
                p.name.toUpperCase().contains(q) ||
                p.phone.contains(q);
          }).toList();

          return Dialog(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 760, maxHeight: 680),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Text(
                            'လူနာ ID / QR ရှာဖွေရန် နှင့် မှတ်ပုံတင်စစ်ဆေး၍ ဖုန်းနံပါတ်အသစ်ပြောင်းရန်',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: searchCtrl,
                            onChanged: (_) => setModalState(() {}),
                            decoration: const InputDecoration(
                              hintText:
                                  'လူနာ ID (ASC2610250001)၊ အမည် သို့မဟုတ် ဖုန်းနံပါတ် ရိုက်ရှာပါ...',
                              prefixIcon: Icon(Icons.search),
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (!kIsWeb &&
                            defaultTargetPlatform == TargetPlatform.android)
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF312E81),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 16),
                            ),
                            onPressed: () => setModalState(
                                () => isScanningQr = !isScanningQr),
                            icon: const Icon(Icons.qr_code_scanner),
                            label: Text(
                                isScanningQr ? 'ကင်မရာပိတ်မည်' : 'QR Scan'),
                          ),
                      ],
                    ),
                    if (isScanningQr) ...[
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 180,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: MobileScanner(
                            onDetect: (capture) {
                              for (final barcode in capture.barcodes) {
                                final raw = barcode.rawValue;
                                if (raw != null && raw.isNotEmpty) {
                                  final extracted =
                                      extractPatientQueryFromQrText(raw);
                                  searchCtrl.text = extracted;
                                  setModalState(() => isScanningQr = false);
                                  break;
                                }
                              }
                            },
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Expanded(
                      child: Row(
                        children: [
                          // Left: Patient list
                          Expanded(
                            child: ListView.builder(
                              itemCount: filteredPatients.length,
                              itemBuilder: (_, idx) {
                                final p = filteredPatients[idx];
                                final isSel = selectedPatient?.id == p.id;
                                return Card(
                                  color: isSel
                                      ? const Color(0xFFEEF2FF)
                                      : Colors.white,
                                  child: ListTile(
                                    onTap: () {
                                      setModalState(() {
                                        selectedPatient = p;
                                        newPhoneCtrl.text = p.phone;
                                        nrcCtrl.text = p.nrcOrLicense ?? '';
                                        nameVerifyCtrl.text = p.name;
                                        modalFeedback = null;
                                      });
                                    },
                                    title: Text(
                                      '${p.name} (${p.patientCode})',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w900),
                                    ),
                                    subtitle: Text(
                                      'ဖုန်း: ${p.phone} • ပွိုင့်: ${p.creditPoints} ကျပ်',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Right: NRC / Driver's License Phone Number Recovery Form
                          Expanded(
                            child: selectedPatient == null
                                ? const Center(
                                    child: Text(
                                      'ဘယ်ဘက်စာရင်းမှ လူနာတစ်ဦးကို ရွေးချယ်ပါ',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold),
                                    ),
                                  )
                                : SingleChildScrollView(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF1E1B4B),
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                          child: Text(
                                            'ID: ${selectedPatient!.patientCode} • ပွိုင့်: ${selectedPatient!.creditPoints} ကျပ်',
                                            style: const TextStyle(
                                              color: Color(0xFFFDE047),
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        TextField(
                                          controller: nameVerifyCtrl,
                                          decoration: const InputDecoration(
                                            labelText:
                                                'လူနာအမည် (မှတ်ပုံတင်ပါ အမည်နှင့် တိုက်စစ်ရန်)',
                                            border: OutlineInputBorder(),
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        TextField(
                                          controller: nrcCtrl,
                                          decoration: const InputDecoration(
                                            labelText:
                                                'မှတ်ပုံတင် သို့မဟုတ် ယာဉ်မောင်းလိုင်စင် အမှတ် *',
                                            hintText: 'ဥပမာ - ၁၂/ဗဟန(နိုင်)၁၂၃၄၅၆',
                                            border: OutlineInputBorder(),
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        TextField(
                                          controller: newPhoneCtrl,
                                          decoration: const InputDecoration(
                                            labelText: 'ဖုန်းနံပါတ်အသစ် *',
                                            hintText: '09xxxxxxxxx',
                                            border: OutlineInputBorder(),
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        SizedBox(
                                          width: double.infinity,
                                          child: ElevatedButton.icon(
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  const Color(0xFF15803D),
                                              foregroundColor: Colors.white,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      vertical: 14),
                                            ),
                                            onPressed: () async {
                                              if (nrcCtrl.text.trim().isEmpty) {
                                                setModalState(() => modalFeedback =
                                                    'မှတ်ပုံတင် သို့မဟုတ် ယာဉ်မောင်းလိုင်စင် အမှတ် ရိုက်ထည့်ပေးပါ။');
                                                return;
                                              }
                                              final updated = await widget.api
                                                  .updatePatientPhoneByReception(
                                                patientId: selectedPatient!.id,
                                                newPhone: newPhoneCtrl.text,
                                                nrcOrLicense: nrcCtrl.text,
                                                newName: nameVerifyCtrl.text,
                                              );
                                              setModalState(() {
                                                selectedPatient = updated;
                                                modalFeedback =
                                                    'ဖုန်းနံပါတ်အသစ် (${updated.phone}) သို့ ပြောင်းပြီး ပွိုင့် (${updated.creditPoints} ကျပ်) အားလုံး ပြန်ချိတ်ဆက်ပြီးပါပြီ။';
                                              });
                                            },
                                            icon:
                                                const Icon(Icons.verified_user),
                                            label: const Text(
                                              'ဖုန်းနံပါတ်အသစ် ပြောင်းပြီး ပွိုင့်ပြန်ချိတ်မည်',
                                              style: TextStyle(
                                                  fontWeight: FontWeight.w900),
                                            ),
                                          ),
                                        ),
                                        if (modalFeedback != null) ...[
                                          const SizedBox(height: 8),
                                          Text(
                                            modalFeedback!,
                                            style: const TextStyle(
                                              color: Color(0xFF166534),
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  /// MODAL: Add Doctor OR Select Previously Seated Doctor
  void _showDoctorManagerModal() {
    bool useSavedDoctor = widget.api.doctors.isNotEmpty;
    Doctor? pickedSaved =
        widget.api.doctors.isNotEmpty ? widget.api.doctors.first : null;
    final nameMyCtrl = TextEditingController(text: pickedSaved?.nameMy ?? '');
    final specialtyMyCtrl =
        TextEditingController(text: pickedSaved?.specialtyMy ?? '');
    final codeCtrl =
        TextEditingController(text: pickedSaved?.doctorCode ?? 'DOC-101');
    final roomCtrl =
        TextEditingController(text: pickedSaved?.roomNumber ?? '101');
    final feeCtrl = TextEditingController(
        text: (pickedSaved?.consultationFee ?? 15000).toString());
    final startCtrl =
        TextEditingController(text: pickedSaved?.startTime ?? '09:00 AM');
    final endCtrl =
        TextEditingController(text: pickedSaved?.endTime ?? '12:00 PM');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: const Text(
            'ဆရာဝန်အသစ် ထည့်ရန် / ထိုင်ခဲ့ဖူးသော ဆရာဝန် ပြန်ရွေးရန်',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    ChoiceChip(
                      label: const Text('ထိုင်ခဲ့ဖူးသော ဆရာဝန်များမှ ရွေးရန်'),
                      selected: useSavedDoctor,
                      onSelected: (_) =>
                          setModalState(() => useSavedDoctor = true),
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: const Text('ဆရာဝန်အသစ် ထည့်ရန်'),
                      selected: !useSavedDoctor,
                      onSelected: (_) {
                        setModalState(() {
                          useSavedDoctor = false;
                          pickedSaved = null;
                          nameMyCtrl.clear();
                          specialtyMyCtrl.clear();
                          codeCtrl.text = 'DOC-103';
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (useSavedDoctor && widget.api.doctors.isNotEmpty) ...[
                  DropdownButtonFormField<String>(
                    value: pickedSaved?.id,
                    decoration: const InputDecoration(
                      labelText: 'ထိုင်ခဲ့ဖူးသော ဆရာဝန်နှင့် အထူးကု ရွေးပါ',
                      border: OutlineInputBorder(),
                    ),
                    items: widget.api.doctors.map((d) {
                      return DropdownMenuItem(
                        value: d.id,
                        child: Text(
                            '${d.nameMy} — ${d.specialtyMy} (${d.doctorCode})'),
                      );
                    }).toList(),
                    onChanged: (id) {
                      final found = widget.api.doctors
                          .where((d) => d.id == id)
                          .firstOrNull;
                      if (found != null) {
                        setModalState(() {
                          pickedSaved = found;
                          nameMyCtrl.text = found.nameMy;
                          specialtyMyCtrl.text = found.specialtyMy;
                          codeCtrl.text = found.doctorCode;
                          roomCtrl.text = found.roomNumber;
                          feeCtrl.text = found.consultationFee.toString();
                          startCtrl.text = found.startTime;
                          endCtrl.text = found.endTime;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 10),
                ],
                TextField(
                  controller: nameMyCtrl,
                  decoration: const InputDecoration(
                    labelText: 'ဆရာဝန်အမည် *',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: specialtyMyCtrl,
                  decoration: const InputDecoration(
                    labelText: 'အထူးကုဘာသာရပ် *',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: codeCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Doctor Code',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: roomCtrl,
                        decoration: const InputDecoration(
                          labelText: 'အခန်းနံပါတ်',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: feeCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'စမ်းသပ်ခ (ကျပ်)',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('ပိတ်မည်'),
            ),
            ElevatedButton(
              onPressed: () async {
                await widget.api.addOrActivateDoctor(
                  existingDoctorId: useSavedDoctor ? pickedSaved?.id : null,
                  nameMy: nameMyCtrl.text.trim(),
                  nameEn: nameMyCtrl.text.trim(),
                  specialtyMy: specialtyMyCtrl.text.trim(),
                  specialtyEn: specialtyMyCtrl.text.trim(),
                  doctorCode: codeCtrl.text.trim(),
                  roomNumber: roomCtrl.text.trim(),
                  consultationFee: int.tryParse(feeCtrl.text.trim()) ?? 15000,
                  startTime: startCtrl.text.trim(),
                  endTime: endCtrl.text.trim(),
                );
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text(
                  'သိမ်းမည် (ဆရာဝန်ရောက်မှ #1 စခေါ်ပါမည်)'),
            ),
          ],
        ),
      ),
    );
  }

  /// MODAL: Reception Walk-In Booking
  void _showWalkInBookingModal(Doctor defaultDoc) {
    Doctor selectedDoc = defaultDoc;
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    bool isVip = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: const Text(
            'Reception မှ လူနာ Booking တိုက်ရိုက်တင်ပေးရန်',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: selectedDoc.id,
                decoration: const InputDecoration(
                  labelText: 'ဆရာဝန် ရွေးရန်',
                  border: OutlineInputBorder(),
                ),
                items: widget.api.doctors
                    .where((d) => !d.isArchived)
                    .map((d) => DropdownMenuItem(
                          value: d.id,
                          child: Text('${d.nameMy} (${d.doctorCode})'),
                        ))
                    .toList(),
                onChanged: (id) {
                  final found =
                      widget.api.doctors.where((d) => d.id == id).firstOrNull;
                  if (found != null) setModalState(() => selectedDoc = found);
                },
              ),
              const SizedBox(height: 10),
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'လူနာအမည် *',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: phoneCtrl,
                decoration: const InputDecoration(
                  labelText: 'ဖုန်းနံပါတ် *',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 8),
              CheckboxListTile(
                value: isVip,
                onChanged: (v) => setModalState(() => isVip = v == true),
                title: const Text('ဦးစားပေး လူနာ (Priority / VIP)'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('ပိတ်မည်'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty) return;
                await widget.api.createWalkInBooking(
                  doctorId: selectedDoc.id,
                  patientName: nameCtrl.text,
                  patientPhone: phoneCtrl.text,
                  isPriority: isVip,
                );
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Booking အတည်ပြုမည်'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final api = widget.api;

    // 1. STAFF SECURITY PIN GATE (Blank input, no password hint shown)
    if (!_isAuthed) {
      return Scaffold(
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Card(
              elevation: 8,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Icon(Icons.lock_outline,
                          color: Color(0xFF34D399), size: 36),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      api.settings.clinicNameMy,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Reception နှင့် ဆရာဝန်အခန်း စနစ်သို့ ဝင်ရောက်ရန် စကားဝှက် ရိုက်ထည့်ပါ',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF475569),
                      ),
                    ),
                    const SizedBox(height: 18),
                    TextField(
                      controller: _pinCtrl,
                      obscureText: true,
                      textAlign: TextAlign.center,
                      onSubmitted: (_) => _handleUnlock(),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 6,
                      ),
                      decoration: InputDecoration(
                        hintText: '••••••••',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                    if (_pinError != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        _pinError!,
                        style: const TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F172A),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: _handleUnlock,
                        child: const Text(
                          'စနစ်သို့ ဝင်ရောက်မည်',
                          style: TextStyle(
                              fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: _showServerUrlDialog,
                      icon: const Icon(Icons.dns_outlined, size: 16),
                      label: const Text('Server လိပ်စာ ပြင်ဆင်ရန်'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    // 2. AUTHENTICATED RECEPTION + DOCTOR WORKSPACE (No SuperAdmin!)
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        title: Row(
          children: [
            const Icon(Icons.medical_services, color: Color(0xFF38BDF8)),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '${api.settings.clinicNameMy} — Reception & Doctor System',
                overflow: TextOverflow.ellipsis,
                style:
                    const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
              ),
            ),
          ],
        ),
        actions: [
          // Mode Switcher: Reception vs Doctor Room vs TV Display
          SegmentedButton<StaffWorkspaceMode>(
            style: ButtonStyle(
              backgroundColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return const Color(0xFF2563EB);
                }
                return const Color(0xFF1E293B);
              }),
              foregroundColor: WidgetStateProperty.all(Colors.white),
            ),
            segments: const [
              ButtonSegment(
                value: StaffWorkspaceMode.reception,
                icon: Icon(Icons.desk, size: 16),
                label: Text('Reception ကောင်တာ'),
              ),
              ButtonSegment(
                value: StaffWorkspaceMode.doctorRoom,
                icon: Icon(Icons.medical_information, size: 16),
                label: Text('ဆရာဝန်အခန်း'),
              ),
            ],
            selected: {_mode},
            onSelectionChanged: (s) => setState(() => _mode = s.first),
          ),
          const SizedBox(width: 8),
          IconButton(
            tooltip: 'PIN ပြောင်းရန်',
            onPressed: _showChangePinDialog,
            icon: const Icon(Icons.key),
          ),
          IconButton(
            tooltip: 'ထွက်မည်',
            onPressed: () => setState(() => _isAuthed = false),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: switch (_mode) {
        StaffWorkspaceMode.reception => _buildReceptionView(),
        StaffWorkspaceMode.doctorRoom => _buildDoctorRoomView(),
        StaffWorkspaceMode.tvDisplay => _buildTvDisplayView(),
      },
    );
  }

  // ============================================================================
  // MODE 1: RECEPTION COMMAND CENTER
  // ============================================================================
  Widget _buildReceptionView() {
    final api = widget.api;
    final activeDoctors = api.doctors.where((d) => !d.isArchived).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Top Action Bar
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF312E81),
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
              onPressed: _showPatientDirectoryAndRecoveryModal,
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text(
                'လူနာ ID / QR ရှာရန်နှင့် ဖုန်းနံပါတ်ပြောင်းရန်',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0B5ED7),
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
              onPressed: _showDoctorManagerModal,
              icon: const Icon(Icons.person_add_alt_1),
              label: const Text(
                'ဆရာဝန်ထည့်ရန် / ထိုင်ခဲ့ဖူးသော ဆရာဝန်ရွေးရန်',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
            if (activeDoctors.isNotEmpty)
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF15803D),
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
                onPressed: () =>
                    _showWalkInBookingModal(activeDoctors.first),
                icon: const Icon(Icons.add_box),
                label: const Text(
                  'Reception မှ လူနာ Booking တင်ပေးရန်',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
          ],
        ),
        const SizedBox(height: 16),

        // Prominent Reception Live Notification Banner
        if (api.receptionNotifications.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFD97706), width: 2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.notifications_active,
                            color: Color(0xFFB45309)),
                        const SizedBox(width: 8),
                        Text(
                          'လူနာ ဘိုကင်သစ်နှင့် ပယ်ဖျက်ခွင့် သတိပေးချက်များ (${api.receptionNotifications.length})',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                            color: Color(0xFF78350F),
                          ),
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () => api.clearReceptionNotifications(),
                      child: const Text('အားလုံးရှင်းမည်'),
                    ),
                  ],
                ),
                ...api.receptionNotifications.take(4).map((n) => Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        '• ${n["title_my"] ?? ""} — ${n["body_my"] ?? ""}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    )),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Active Doctors Queue Control Cards
        const Text(
          'ဆရာဝန်အလိုက် တိုက်ရိုက်အလှည့် ထိန်းချုပ်ရန် (Live Queue Control)',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 10),
        ...activeDoctors.map((doc) {
          final isNotArrived =
              doc.status == 'not_arrived' || doc.currentQueueNumber == 0;
          final docBookings = api.bookings
              .where((b) => b.doctorId == doc.id && b.status != 'cancelled')
              .toList();

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFCBD5E1), width: 2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${doc.nameMy} (${doc.doctorCode} • အခန်း ${doc.roomNumber})',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            '${doc.specialtyMy} • ${doc.startTime} - ${doc.endTime}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isNotArrived
                            ? const Color(0xFFFEF3C7)
                            : const Color(0xFFDBEAFE),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        isNotArrived
                            ? 'ဆရာဝန် မရောက်သေးပါ'
                            : 'လက်ရှိ #${doc.currentQueueNumber}',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          color: isNotArrived
                              ? const Color(0xFF92400E)
                              : const Color(0xFF1E3A8A),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    if (isNotArrived)
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF15803D),
                          foregroundColor: Colors.white,
                        ),
                        onPressed: () =>
                            api.markDoctorArrivedAndStartQueue(doc.id),
                        icon: const Icon(Icons.play_arrow),
                        label: const Text(
                          'ဆရာဝန်ရောက်ပြီ (#1 စခေါ်မည်)',
                          style: TextStyle(fontWeight: FontWeight.w900),
                        ),
                      )
                    else
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0B5ED7),
                          foregroundColor: Colors.white,
                        ),
                        onPressed: () => api.advanceDoctorQueue(doc.id),
                        icon: const Icon(Icons.skip_next),
                        label: Text(
                          'နောက်လူနာ ခေါ်မည် (#${doc.currentQueueNumber + 1})',
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                    OutlinedButton.icon(
                      onPressed: () => _showWalkInBookingModal(doc),
                      icon: const Icon(Icons.person_add),
                      label: const Text('ဤဆရာဝန်အတွက် Booking တင်ပေးမည်'),
                    ),
                  ],
                ),
                if (docBookings.isNotEmpty) ...[
                  const Divider(height: 24),
                  const Text(
                    'ဘိုကင်စာရင်း (ပြေစာအတည်ပြုရန် / ပယ်ဖျက်ပြီး ပွိုင့်ပြန်ပေးရန်)',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  ...docBookings.map((b) {
                    final pt = api.patients
                        .where((p) => p.id == b.patientId)
                        .firstOrNull;
                    final turnsBefore =
                        b.queueNumber - doc.currentQueueNumber;
                    final eligibleForPatientCancel =
                        isNotArrived || turnsBefore >= 2;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: b.cancelRequestedByPatient
                            ? const Color(0xFFFFFBEB)
                            : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: b.cancelRequestedByPatient
                              ? const Color(0xFFD97706)
                              : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '#${b.queueNumber}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${pt?.name ?? "လူနာ"} (${pt?.patientCode ?? ""}) • ${b.ticketCode}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w900),
                                ),
                                Text(
                                  'ဖုန်း: ${pt?.phone ?? ""} • ${b.paymentStatus == "paid" ? "အတည်ပြုပြီး" : "ပြေစာစစ်ဆေးရန် လိုသည်"}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Wrap(
                            spacing: 6,
                            children: [
                              if (b.paymentStatus != 'paid')
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF15803D),
                                    foregroundColor: Colors.white,
                                  ),
                                  onPressed: () => api
                                      .verifyReceiptAndConfirmBooking(b.id),
                                  child: const Text('အတည်ပြုမည်'),
                                ),
                              OutlinedButton(
                                onPressed: () => api.cancelBookingAndRefund(
                                  b.id,
                                  grantCreditPoints: eligibleForPatientCancel,
                                ),
                                child: Text(
                                  eligibleForPatientCancel
                                      ? 'ပယ်ဖျက် + ပွိုင့်ပြန်ပေးမည်'
                                      : 'ဆေးခန်းမှပယ်ဖျက် (ပွိုင့်ပေးမည်)',
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ],
            ),
          );
        }),
      ],
    );
  }

  // ============================================================================
  // MODE 2: DOCTOR CONSULTATION ROOM CONSOLE
  // ============================================================================
  Widget _buildDoctorRoomView() {
    final activeDoctors =
        widget.api.doctors.where((d) => !d.isArchived).toList();
    if (activeDoctors.isEmpty) {
      return const Center(child: Text('တာဝန်ကျ ဆရာဝန် မရှိသေးပါ'));
    }
    final selectedDoc = activeDoctors
            .where((d) => d.id == _selectedDoctorRoomId)
            .firstOrNull ??
        activeDoctors.first;
    final isNotArrived = selectedDoc.status == 'not_arrived' ||
        selectedDoc.currentQueueNumber == 0;
    final currentBooking = widget.api.bookings
        .where((b) =>
            b.doctorId == selectedDoc.id &&
            b.queueNumber == selectedDoc.currentQueueNumber &&
            b.status != 'cancelled')
        .firstOrNull;
    final currentPt = widget.api.patients
        .where((p) => p.id == currentBooking?.patientId)
        .firstOrNull;
    final waitingList = widget.api.bookings
        .where((b) =>
            b.doctorId == selectedDoc.id &&
            b.status == 'waiting' &&
            b.queueNumber > selectedDoc.currentQueueNumber)
        .toList();

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 680),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            DropdownButtonFormField<String>(
              value: selectedDoc.id,
              decoration: const InputDecoration(
                labelText: 'ဆရာဝန်အခန်း ရွေးချယ်ရန် (Consultation Room)',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(),
              ),
              items: activeDoctors
                  .map((d) => DropdownMenuItem(
                        value: d.id,
                        child: Text(
                            'အခန်း ${d.roomNumber} — ${d.nameMy} (${d.doctorCode})'),
                      ))
                  .toList(),
              onChanged: (id) => setState(() => _selectedDoctorRoomId = id),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(26),
                border: Border.all(color: const Color(0xFFCBD5E1), width: 2),
                boxShadow: const [
                  BoxShadow(
                      color: Colors.black12,
                      blurRadius: 14,
                      offset: Offset(0, 6))
                ],
              ),
              child: Column(
                children: [
                  Text(
                    'အခန်း ${selectedDoc.roomNumber} • ${selectedDoc.nameMy}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF1E3A8A),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (isNotArrived) ...[
                    const Text(
                      'ဆရာဝန် မရောက်သေးပါ (စောင့်ဆိုင်းဆဲ)',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFB45309),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 64,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF15803D),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        onPressed: () => widget.api
                            .markDoctorArrivedAndStartQueue(selectedDoc.id),
                        icon: const Icon(Icons.play_circle_fill, size: 28),
                        label: const Text(
                          'ဆရာဝန်ရောက်ပြီ — #1 စတင်ခေါ်ဆိုမည်',
                          style: TextStyle(
                              fontSize: 20, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ] else ...[
                    const Text(
                      'လက်ရှိ ကြည့်ရှုနေသော အလှည့်နံပါတ်',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF475569),
                      ),
                    ),
                    Text(
                      '#${selectedDoc.currentQueueNumber}',
                      style: const TextStyle(
                        fontSize: 76,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    if (currentPt != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                              color: const Color(0xFF059669), width: 1.5),
                        ),
                        child: Text(
                          '${currentPt.name} • ID: ${currentPt.patientCode}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF065F46),
                          ),
                        ),
                      ),
                    const SizedBox(height: 14),
                    Text(
                      'အခန်းပြင်ပတွင် စောင့်ဆိုင်းနေသူ (${waitingList.length}) ဦး ကျန်ရှိပါသည်',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      height: 68,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0B5ED7),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        onPressed: () =>
                            widget.api.advanceDoctorQueue(selectedDoc.id),
                        icon: const Icon(Icons.arrow_forward_rounded, size: 30),
                        label: Text(
                          'နောက်လူနာ ခေါ်မည် (#${selectedDoc.currentQueueNumber + 1})',
                          style: const TextStyle(
                              fontSize: 22, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================================
  // MODE 3: WAITING ROOM TV DISPLAY
  // ============================================================================
  Widget _buildTvDisplayView() {
    final activeDoctors =
        widget.api.doctors.where((d) => !d.isArchived).toList();
    return Container(
      color: const Color(0xFF0F172A),
      padding: const EdgeInsets.all(24),
      child: GridView.builder(
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 460,
          mainAxisExtent: 230,
          crossAxisSpacing: 20,
          mainAxisSpacing: 20,
        ),
        itemCount: activeDoctors.length,
        itemBuilder: (_, idx) {
          final d = activeDoctors[idx];
          final isNotArrived =
              d.status == 'not_arrived' || d.currentQueueNumber == 0;
          return Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF334155), width: 2),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'အခန်း ${d.roomNumber} • ${d.doctorCode}',
                  style: const TextStyle(
                    color: Color(0xFF38BDF8),
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                Text(
                  d.nameMy,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 22,
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'လက်ရှိအလှည့်',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      isNotArrived
                          ? 'မရောက်သေးပါ'
                          : '#${d.currentQueueNumber}',
                      style: TextStyle(
                        color: const Color(0xFFFDE047),
                        fontSize: isNotArrived ? 22 : 44,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
