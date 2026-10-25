import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'models/clinic_models.dart';
import 'services/clinic_api_service.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ClinicNotificationService().initialize();
  runApp(const ClinicPatientApp());
}

class ClinicPatientApp extends StatefulWidget {
  const ClinicPatientApp({super.key});

  @override
  State<ClinicPatientApp> createState() => _ClinicPatientAppState();
}

class _ClinicPatientAppState extends State<ClinicPatientApp> {
  late final ClinicApiService _api;

  @override
  void initState() {
    super.initState();
    _api = ClinicApiService(onStateChanged: () {
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
      title: 'Clinic Patient Queue',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0B5ED7),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        useMaterial3: true,
      ),
      home: PatientPortalHomeScreen(api: _api),
    );
  }
}

class PatientPortalHomeScreen extends StatefulWidget {
  final ClinicApiService api;
  const PatientPortalHomeScreen({super.key, required this.api});

  @override
  State<PatientPortalHomeScreen> createState() =>
      _PatientPortalHomeScreenState();
}

class _PatientPortalHomeScreenState extends State<PatientPortalHomeScreen> {
  // Login state (0 SMS cost: Name + Phone OR Returning Patient ID)
  bool _isReturningIdTab = false;
  final TextEditingController _nameCtrl = TextEditingController();
  final TextEditingController _phoneCtrl = TextEditingController();
  final TextEditingController _patientCodeCtrl = TextEditingController();
  String? _authError;

  // Booking & Filter state
  String _selectedSpecialty = 'all';
  Doctor? _bookingDoctor;
  String _paymentMethod = 'kpay';
  Uint8List? _receiptBytes;
  String? _receiptFileName;
  bool _isSubmitting = false;

  void _showPatientIdCardDialog(Patient patient, {bool isNew = false}) {
    final qrPayload =
        '${widget.api.baseUrl}/?pid=${Uri.encodeComponent(patient.patientCode)}';

    showDialog(
      context: context,
      barrierDismissible: !isNew,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1E3A8A), Color(0xFF312E81)],
                  ),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isNew
                          ? 'အကောင့်သစ် ဖွင့်ပြီးပါပြီ (SMS ကုန်ကျစရိတ် 0 ကျပ်)'
                          : 'လူနာ ID နှင့် QR ကတ်ပြား',
                      style: const TextStyle(
                        color: Color(0xFFFDE047),
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      patient.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      patient.phone,
                      style: const TextStyle(
                        color: Color(0xFFBFDBFE),
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFD97706), width: 2),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.warning_amber_rounded,
                        color: Color(0xFFB45309), size: 26),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'အရေးကြီးပါသည် — သင့်လူနာ ID နံပါတ်ကို စာရွက်တွင် ချရေးထားပါ သို့မဟုတ် ဤစာမျက်နှာကို Screenshot ရိုက်ထားပါ။ ဖုန်းနံပါတ်ပြောင်းလဲပါက ယခင်ပွိုင့်များ ပြန်ရရန် ဤ ID နှင့် မှတ်ပုံတင်/ယာဉ်မောင်းလိုင်စင်ကို Reception တွင် ပြသရပါမည်။',
                        style: TextStyle(
                          color: Color(0xFF78350F),
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF4338CA), width: 2),
                ),
                child: Column(
                  children: [
                    const Text(
                      'သင့်ကိုယ်ပိုင် လူနာ ID (PATIENT ID)',
                      style: TextStyle(
                        color: Color(0xFF312E81),
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 6),
                    SelectableText(
                      patient.patientCode,
                      style: const TextStyle(
                        color: Color(0xFF0F172A),
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: () {
                        Clipboard.setData(
                            ClipboardData(text: patient.patientCode));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('လူနာ ID ကို ကူးယူပြီးပါပြီ'),
                          ),
                        );
                      },
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text(
                        'လူနာ ID ကူးယူမည်',
                        style: TextStyle(fontWeight: FontWeight.w900),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFCBD5E1), width: 2),
                ),
                child: Column(
                  children: [
                    QrImageView(
                      data: qrPayload,
                      version: QrVersions.auto,
                      size: 180,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'ID: ${patient.patientCode}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                      ),
                    ),
                    const Text(
                      'Reception တွင် ဤ QR ကို Scan ဖတ်၍ အကောင့်ရှာနိုင်ပါသည်',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF475569),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1D4ED8),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: () => Navigator.of(ctx).pop(),
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text(
                    'မှတ်သားပြီးပါပြီ (ဆက်လက်လုပ်ဆောင်မည်)',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showServerUrlModal() {
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
            labelText: 'Server URL (Vercel or Local IP)',
            hintText: 'https://clinic-que-system-clinic-a.vercel.app',
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

  Future<void> _handleLoginSubmit() async {
    setState(() => _authError = null);
    try {
      final result = await widget.api.loginOrRegisterPatient(
        isReturningIdMode: _isReturningIdTab,
        phone: _phoneCtrl.text,
        name: _nameCtrl.text,
        patientCode: _patientCodeCtrl.text,
      );
      if (!mounted) return;
      if (result.isNewAccount || _isReturningIdTab) {
        _showPatientIdCardDialog(result.patient, isNew: result.isNewAccount);
      }
    } catch (e) {
      final code = e.toString();
      if (code.contains('PATIENT_ID_NOT_FOUND')) {
        setState(() => _authError =
            'ဤလူနာ ID နံပါတ်ကို မတွေ့ရှိပါ။ ID နံပါတ် ပြန်စစ်ပေးပါ။');
      } else if (code.contains('PATIENT_VERIFICATION_MISMATCH')) {
        setState(() => _authError =
            'လူနာ ID နှင့် ဖုန်းနံပါတ်/အမည် မကိုက်ညီပါ။ ဖုန်းနံပါတ်ပြောင်းထားပါက Reception တွင် မှတ်ပုံတင်ပြ၍ ဖုန်းနံပါတ်အသစ် ပြောင်းနိုင်ပါသည်။');
      } else {
        setState(() =>
            _authError = 'လူနာအမည်နှင့် ဖုန်းနံပါတ် ပြည့်စုံစွာ ဖြည့်သွင်းပေးပါ။');
      }
    }
  }

  Future<void> _pickReceiptImage() async {
    final picker = ImagePicker();
    final picked =
        await picker.pickImage(source: ImageSource.gallery, imageQuality: 82);
    if (picked != null) {
      final bytes = await picked.readAsBytes();
      setState(() {
        _receiptBytes = bytes;
        _receiptFileName = picked.name;
      });
    }
  }

  Future<void> _submitBooking(Doctor doctor) async {
    setState(() => _isSubmitting = true);
    try {
      String? uploadedUrl;
      if (_paymentMethod != 'credit_points' && _receiptBytes != null) {
        uploadedUrl = await widget.api.uploadReceiptBytes(
          _receiptBytes!,
          _receiptFileName ?? 'receipt.jpg',
        );
      }
      await widget.api.createBooking(
        doctorId: doctor.id,
        paymentMethod: _paymentMethod,
        receiptUrl: uploadedUrl,
      );
      setState(() {
        _bookingDoctor = null;
        _receiptBytes = null;
        _receiptFileName = null;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF15803D),
            content: Text(
              'ဘိုကင်တင်ပြီးပါပြီ။ Reception မှ အတည်ပြုပေးပါမည်။',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.red.shade800,
            content: Text('ဘိုကင်မအောင်မြင်ပါ: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = widget.api;
    final me = api.currentPatient;
    final activeDoctors = api.doctors.where((d) => !d.isArchived).toList();

    final myActiveBooking = me == null
        ? null
        : api.bookings.where((b) {
            return b.patientId == me.id &&
                (b.status == 'waiting' ||
                    b.status == 'in_progress' ||
                    b.status == 'in_consultation');
          }).firstOrNull;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 1,
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: const Color(0xFF0B5ED7),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.local_hospital,
                  color: Colors.white, size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    api.settings.clinicNameMy,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  Row(
                    children: [
                      Icon(
                        Icons.wifi,
                        size: 13,
                        color: api.isConnected
                            ? const Color(0xFF16A34A)
                            : Colors.orange,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        api.isConnected
                            ? 'တိုက်ရိုက် အလှည့်စနစ် ချိတ်ဆက်ထားသည်'
                            : 'အော့ဖ်လိုင်း အသင့်ရှိသည်',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF15803D),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (me != null)
            Container(
              margin: const EdgeInsets.symmetric(vertical: 8),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF047857), width: 1.5),
              ),
              child: Row(
                children: [
                  const Icon(Icons.account_balance_wallet,
                      size: 16, color: Color(0xFF047857)),
                  const SizedBox(width: 4),
                  Text(
                    '${me.creditPoints} ကျပ်',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF064E3B),
                    ),
                  ),
                ],
              ),
            ),
          if (me != null)
            IconButton(
              tooltip: 'အကောင့်မှထွက်ရန်',
              onPressed: () => api.logout(),
              icon: const Icon(Icons.logout, color: Color(0xFF0F172A)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => api.syncFromServer(notifyTriggers: true),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // 1. ZERO-SMS-COST PATIENT LOGIN / ACCOUNT BAR
            if (me == null)
              _buildLoginCard()
            else
              _buildLoggedInPatientBanner(me),

            const SizedBox(height: 16),

            // 2. ACTIVE LIVE QUEUE TRACKER (IF PATIENT HAS ACTIVE BOOKING)
            if (me != null && myActiveBooking != null) ...[
              _buildActiveQueueTracker(me, myActiveBooking),
              const SizedBox(height: 20),
            ],

            // 3. BOOKING MODAL SECTION (IF SELECTED DOCTOR)
            if (_bookingDoctor != null && me != null) ...[
              _buildBookingFormCard(_bookingDoctor!, me),
              const SizedBox(height: 20),
            ],

            // 4. LIVE DOCTOR DIRECTORY
            const Text(
              'ယနေ့ တာဝန်ကျ အထူးကုဆရာဝန်ကြီးများနှင့် တိုက်ရိုက်အလှည့်စာရင်း',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 12),
            ...activeDoctors.map((doc) => _buildDoctorCard(doc, me)),
          ],
        ),
      ),
    );
  }

  Widget _buildLoginCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFCBD5E1), width: 2),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 3))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'လူနာအကောင့် ဝင်ရန် / အကောင့်သစ်ဖွင့်ရန် (SMS ကုန်ကျစရိတ် လုံးဝမရှိပါ)',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'အမည်နှင့် ဖုန်းနံပါတ် တွဲမှတ်ပေးပြီး ကိုယ်ပိုင် လူနာ ID (ဥပမာ ASC2610250001) နှင့် QR ကတ်ကို အလိုအလျောက် ထုတ်ပေးပါသည်။',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Color(0xFF475569),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: !_isReturningIdTab
                        ? const Color(0xFF1D4ED8)
                        : const Color(0xFFF1F5F9),
                    foregroundColor: !_isReturningIdTab
                        ? Colors.white
                        : const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => setState(() {
                    _isReturningIdTab = false;
                    _authError = null;
                  }),
                  child: const Text(
                    'အမည် + ဖုန်းဖြင့် ဝင်မည်',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isReturningIdTab
                        ? const Color(0xFF312E81)
                        : const Color(0xFFF1F5F9),
                    foregroundColor: _isReturningIdTab
                        ? Colors.white
                        : const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => setState(() {
                    _isReturningIdTab = true;
                    _authError = null;
                  }),
                  child: const Text(
                    'လူနာ ID ဖြင့် ဝင်မည်',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (_isReturningIdTab) ...[
            TextField(
              controller: _patientCodeCtrl,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                labelText: 'လူနာ ID နံပါတ် (ဥပမာ ASC2610250001) *',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
          TextField(
            controller: _nameCtrl,
            decoration: InputDecoration(
              labelText: 'လူနာအမည် (ဥပမာ - ဦးအောင်မင်း) *',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              labelText: 'ဖုန်းနံပါတ် (09xxxxxxxxx) *',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
          if (_authError != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.red.shade700),
              ),
              child: Text(
                _authError!,
                style: TextStyle(
                  color: Colors.red.shade900,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0B5ED7),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _handleLoginSubmit,
              icon: const Icon(Icons.verified_user),
              label: Text(
                _isReturningIdTab
                    ? 'လူနာ ID ဖြင့် အကောင့်ဟောင်း ပြန်ဝင်မည်'
                    : 'အကောင့်ဝင်မည် / လူနာ ID ရယူမည်',
                style:
                    const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoggedInPatientBanner(Patient me) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFCBD5E1), width: 2),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1B4B),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'ID: ${me.patientCode}',
                    style: const TextStyle(
                      color: Color(0xFFFDE047),
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${me.name} • ${me.phone}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEEF2FF),
              foregroundColor: const Color(0xFF312E81),
              side: const BorderSide(color: Color(0xFF4338CA), width: 1.5),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: () => _showPatientIdCardDialog(me, isNew: false),
            icon: const Icon(Icons.qr_code_2, size: 20),
            label: const Text(
              'ID / QR ကတ်',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveQueueTracker(Patient me, Booking booking) {
    final doc = widget.api.doctors
        .where((d) => d.id == booking.doctorId)
        .firstOrNull;
    final currentServing = doc?.currentQueueNumber ?? 0;
    final isNotArrived =
        doc == null || doc.status == 'not_arrived' || currentServing == 0;
    final patientsAhead = isNotArrived
        ? (booking.queueNumber - 1).clamp(0, 999)
        : (booking.queueNumber - currentServing).clamp(0, 999);
    final canCancel = isNotArrived || (booking.queueNumber - currentServing) >= 2;
    final qrPayload =
        '${widget.api.baseUrl}/ticket/${booking.id}?code=${booking.ticketCode}&pid=${me.patientCode}';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                doc?.nameMy ?? 'အထူးကုဆရာဝန်',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: booking.paymentStatus == 'paid'
                      ? const Color(0xFF16A34A)
                      : const Color(0xFFD97706),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  booking.paymentStatus == 'paid'
                      ? 'Reception အတည်ပြုပြီး'
                      : 'ပြေစာ စစ်ဆေးဆဲ',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        'လက်ရှိခေါ်နေသောနံပါတ်',
                        style: TextStyle(
                          color: Color(0xFFBFDBFE),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        isNotArrived ? 'မရောက်သေးပါ' : '#$currentServing',
                        style: TextStyle(
                          color: Colors.amber.shade300,
                          fontSize: isNotArrived ? 17 : 32,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        'သင့်အလှည့်နံပါတ်',
                        style: TextStyle(
                          color: Color(0xFF475569),
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '#${booking.queueNumber}',
                        style: const TextStyle(
                          color: Color(0xFF0B5ED7),
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'ရှေ့တွင် စောင့်ဆိုင်းနေသူ ($patientsAhead) ဦး • လက်မှတ်ကုဒ် ${booking.ticketCode}',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                QrImageView(data: qrPayload, size: 78),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'လူနာ ID: ${me.patientCode}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                        ),
                      ),
                      Text(
                        'လက်မှတ်: ${booking.ticketCode}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: Color(0xFF334155),
                        ),
                      ),
                      const SizedBox(height: 6),
                      if (booking.cancelRequestedByPatient)
                        const Text(
                          'ပယ်ဖျက်ပြီး ပွိုင့်ပြန်ယူရန် Reception အတည်ပြုချက် စောင့်နေပါသည်...',
                          style: TextStyle(
                            color: Color(0xFFB45309),
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                          ),
                        )
                      else if (canCancel)
                        OutlinedButton(
                          onPressed: () async {
                            await widget.api
                                .requestPatientBookingCancel(booking.id);
                          },
                          child: const Text(
                            'ရက်ချိန်းပယ်ဖျက်ပြီး ပွိုင့်ပြန်ယူမည်',
                            style: TextStyle(
                                fontSize: 11, fontWeight: FontWeight.w900),
                          ),
                        )
                      else
                        const Text(
                          'အလှည့်ရောက်ခါနီးနေပြီဖြစ်၍ ပယ်ဖျက်၍ မရနိုင်တော့ပါ (အနည်းဆုံး ၂ ဦးအလိုမှသာ ရပါသည်)',
                          style: TextStyle(
                            color: Colors.redAccent,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookingFormCard(Doctor doc, Patient me) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF0B5ED7), width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'ဘိုကင်တင်ရန် — ${doc.nameMy} (${doc.consultationFee} ကျပ်)',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => setState(() => _bookingDoctor = null),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('KBZPay'),
                selected: _paymentMethod == 'kpay',
                onSelected: (_) => setState(() => _paymentMethod = 'kpay'),
              ),
              ChoiceChip(
                label: const Text('WavePay'),
                selected: _paymentMethod == 'wavepay',
                onSelected: (_) => setState(() => _paymentMethod = 'wavepay'),
              ),
              ChoiceChip(
                label: const Text('AYA Pay'),
                selected: _paymentMethod == 'ayapay',
                onSelected: (_) => setState(() => _paymentMethod = 'ayapay'),
              ),
              ChoiceChip(
                label: Text('Credit ပွိုင့် (${me.creditPoints})'),
                selected: _paymentMethod == 'credit_points',
                onSelected: (_) =>
                    setState(() => _paymentMethod = 'credit_points'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_paymentMethod != 'credit_points') ...[
            Text(
              'ငွေလွှဲရန်ဖုန်း: ${widget.api.settings.kpayPhone} (${widget.api.settings.kpayAccountName})',
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _pickReceiptImage,
              icon: const Icon(Icons.upload_file),
              label: Text(
                _receiptFileName != null
                    ? 'ပြေစာရွေးပြီး: $_receiptFileName'
                    : 'ငွေလွှဲပြေစာ Screenshot ရွေးရန်',
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0B5ED7),
                foregroundColor: Colors.white,
              ),
              onPressed:
                  _isSubmitting ? null : () => _submitBooking(doc),
              child: Text(
                _isSubmitting
                    ? 'ဘိုကင်တင်နေပါသည်...'
                    : 'ဘိုကင်အတည်ပြုမည် (Queue ယူမည်)',
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDoctorCard(Doctor doc, Patient? me) {
    final isNotArrived =
        doc.status == 'not_arrived' || doc.currentQueueNumber == 0;
    final waitingCount = widget.api.bookings
        .where((b) =>
            b.doctorId == doc.id &&
            b.status == 'waiting' &&
            b.queueNumber > doc.currentQueueNumber)
        .length;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E3A8A),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'အခန်း ${doc.roomNumber} • ${doc.doctorCode}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isNotArrived
                      ? const Color(0xFFFEF3C7)
                      : const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isNotArrived
                      ? 'ဆရာဝန် မရောက်သေးပါ'
                      : 'ထိုင်နေပါပြီ (#${doc.currentQueueNumber})',
                  style: TextStyle(
                    color: isNotArrived
                        ? const Color(0xFF92400E)
                        : const Color(0xFF166534),
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            doc.nameMy,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
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
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'စမ်းသပ်ခ: ${doc.consultationFee} ကျပ်',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    'စောင့်ဆိုင်းနေသူ: $waitingCount ဦး',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0B5ED7),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: () {
                  if (me == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content:
                            Text('ကျေးဇူးပြု၍ အပေါ်တွင် အရင်အကောင့်ဝင်ပေးပါ'),
                      ),
                    );
                    return;
                  }
                  setState(() => _bookingDoctor = doc);
                },
                icon: const Icon(Icons.calendar_month, size: 18),
                label: const Text(
                  'ဘိုကင်တင်မည်',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
