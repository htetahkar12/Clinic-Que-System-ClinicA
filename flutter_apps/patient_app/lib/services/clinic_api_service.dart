import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/clinic_models.dart';
import 'notification_service.dart';

class ClinicApiService {
  static const String _serverUrlPrefKey = 'auracare_server_base_url_v1';
  static const String _patientIdPrefKey = 'auracare_current_patient_id_v3';
  static const String _cachedStatePrefKey = 'auracare_cached_state_v3';

  String baseUrl = 'https://clinic-que-system-clinic-a.vercel.app';
  int currentVersion = 0;

  ClinicSettings settings = ClinicSettings.defaults();
  List<Patient> patients = [];
  List<Doctor> doctors = [];
  List<Booking> bookings = [];
  List<Map<String, dynamic>> transactions = [];
  List<ClinicMessage> messages = [];
  List<Map<String, dynamic>> receptionNotifications = [];

  String? currentPatientId;
  final Set<String> _deliveredMessageIds = {};
  int? _lastNotifiedQueueNum;

  final void Function() onStateChanged;

  Timer? _pollTimer;
  bool isConnected = false;

  ClinicApiService({required this.onStateChanged});

  Patient? get currentPatient {
    if (currentPatientId == null) return null;
    for (final p in patients) {
      if (p.id == currentPatientId) return p;
    }
    return null;
  }

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString(_serverUrlPrefKey);
    if (savedUrl != null && savedUrl.trim().isNotEmpty) {
      baseUrl = savedUrl.trim().replaceAll(RegExp(r'/$'), '');
    }
    currentPatientId = prefs.getString(_patientIdPrefKey);

    final cachedRaw = prefs.getString(_cachedStatePrefKey);
    if (cachedRaw != null) {
      try {
        final decoded = jsonDecode(cachedRaw) as Map<String, dynamic>;
        _applyStateMap(decoded, notifyTriggers: false);
      } catch (_) {}
    }

    await syncFromServer(notifyTriggers: false);
    for (final m in messages) {
      _deliveredMessageIds.add(m.id);
    }

    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      syncFromServer(notifyTriggers: true);
    });
  }

  void dispose() {
    _pollTimer?.cancel();
  }

  Future<void> updateServerUrl(String newUrl) async {
    final cleaned = newUrl.trim().replaceAll(RegExp(r'/$'), '');
    if (cleaned.isEmpty) return;
    baseUrl = cleaned;
    currentVersion = 0;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverUrlPrefKey, baseUrl);
    await syncFromServer(notifyTriggers: false);
  }

  Future<void> syncFromServer({bool notifyTriggers = true}) async {
    try {
      final uri = Uri.parse('$baseUrl/api/state?since=$currentVersion');
      final response =
          await http.get(uri).timeout(const Duration(seconds: 5));
      if (response.statusCode != 200) return;

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      isConnected = true;

      if (data['hasState'] == true && data['unchanged'] != true) {
        final stateMap = data['state'] as Map<String, dynamic>?;
        if (stateMap != null) {
          _applyStateMap(stateMap, notifyTriggers: notifyTriggers);
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_cachedStatePrefKey, jsonEncode(stateMap));
        }
      }
      onStateChanged();
    } catch (_) {
      isConnected = false;
      onStateChanged();
    }
  }

  void _applyStateMap(
    Map<String, dynamic> stateMap, {
    required bool notifyTriggers,
  }) {
    final incomingVersion =
        int.tryParse((stateMap['version'] ?? 0).toString()) ?? 0;
    if (incomingVersion > 0 && incomingVersion < currentVersion) return;
    currentVersion = incomingVersion > 0
        ? incomingVersion
        : DateTime.now().millisecondsSinceEpoch;

    if (stateMap['settings'] is Map<String, dynamic>) {
      settings = ClinicSettings.fromJson(
          stateMap['settings'] as Map<String, dynamic>);
    }
    if (stateMap['patients'] is List) {
      patients = (stateMap['patients'] as List)
          .whereType<Map<String, dynamic>>()
          .map(Patient.fromJson)
          .toList();
    }
    if (stateMap['doctors'] is List) {
      doctors = (stateMap['doctors'] as List)
          .whereType<Map<String, dynamic>>()
          .map(Doctor.fromJson)
          .toList();
    }
    if (stateMap['bookings'] is List) {
      bookings = (stateMap['bookings'] as List)
          .whereType<Map<String, dynamic>>()
          .map(Booking.fromJson)
          .toList();
    }
    if (stateMap['transactions'] is List) {
      transactions = (stateMap['transactions'] as List)
          .whereType<Map<String, dynamic>>()
          .toList();
    }
    if (stateMap['messages'] is List) {
      messages = (stateMap['messages'] as List)
          .whereType<Map<String, dynamic>>()
          .map(ClinicMessage.fromJson)
          .toList();
    }
    if (stateMap['receptionNotifications'] is List) {
      receptionNotifications = (stateMap['receptionNotifications'] as List)
          .whereType<Map<String, dynamic>>()
          .toList();
    }

    if (notifyTriggers) {
      _checkAndFireNotifications();
    }
  }

  void _checkAndFireNotifications() {
    final me = currentPatient;
    if (me == null) return;

    final activeBooking = bookings.where((b) {
      return b.patientId == me.id &&
          (b.status == 'waiting' ||
              b.status == 'in_progress' ||
              b.status == 'in_consultation');
    }).firstOrNull;

    // 1. Check new messages from Reception or Automated Queue alerts
    for (final msg in messages) {
      if (_deliveredMessageIds.contains(msg.id)) continue;
      _deliveredMessageIds.add(msg.id);

      final isForMe = msg.patientId == me.id ||
          (msg.patientId == null &&
              activeBooking != null &&
              (msg.doctorId == null ||
                  msg.doctorId == activeBooking.doctorId));
      if (isForMe) {
        ClinicNotificationService().showHighPriorityAlert(
          title: msg.titleMy,
          body: msg.bodyMy,
        );
      }
    }

    // 2. Check live queue distance (1 or 2 turns away, or my turn!)
    if (activeBooking != null) {
      final doc =
          doctors.where((d) => d.id == activeBooking.doctorId).firstOrNull;
      if (doc != null &&
          doc.status != 'not_arrived' &&
          doc.currentQueueNumber > 0 &&
          _lastNotifiedQueueNum != doc.currentQueueNumber) {
        _lastNotifiedQueueNum = doc.currentQueueNumber;
        final ahead = activeBooking.queueNumber - doc.currentQueueNumber;
        if (ahead == 0) {
          ClinicNotificationService().showHighPriorityAlert(
            title: 'သင့်အလှည့် ရောက်ပါပြီ (#${activeBooking.queueNumber})',
            body:
                '${doc.nameMy} (အခန်း ${doc.roomNumber}) သို့ ယခုပင် ဝင်ရောက်ပြသနိုင်ပါပြီ။',
          );
        } else if (ahead > 0 && ahead <= 2) {
          ClinicNotificationService().showHighPriorityAlert(
            title:
                'သင့်အလှည့် ရောက်ခါနီးပါပြီ (ရှေ့တွင် $ahead ဦးသာ လိုပါတော့သည်)',
            body:
                'လက်ရှိခေါ်ဆိုနေသော နံပါတ် #${doc.currentQueueNumber} ဖြစ်ပြီး သင့်နံပါတ်မှာ #${activeBooking.queueNumber} ဖြစ်ပါသည်။',
          );
        }
      }
    }
  }

  Future<void> persistStateToServer() async {
    currentVersion = DateTime.now().millisecondsSinceEpoch;
    final payload = {
      'version': currentVersion,
      'settings': settings.toJson(),
      'patients': patients.map((e) => e.toJson()).toList(),
      'doctors': doctors.map((e) => e.toJson()).toList(),
      'bookings': bookings.map((e) => e.toJson()).toList(),
      'transactions': transactions,
      'messages': messages.map((e) => e.toJson()).toList(),
      'receptionNotifications': receptionNotifications,
    };

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cachedStatePrefKey, jsonEncode(payload));
    onStateChanged();

    try {
      await http
          .post(
            Uri.parse('$baseUrl/api/state'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 6));
    } catch (_) {}
  }

  String _normalizePhone(String input) {
    final digits = input.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('959')) return '09${digits.substring(3)}';
    if (digits.startsWith('09')) return digits;
    if (digits.startsWith('9')) return '0$digits';
    return digits.isEmpty ? '09788899900' : digits;
  }

  /// Zero-SMS-Cost Patient Login & Auto-Generated Patient ID ([ClinicPrefix]YYMMDDTTTT)
  Future<({Patient patient, bool isNewAccount})> loginOrRegisterPatient({
    required bool isReturningIdMode,
    String? phone,
    String? name,
    String? patientCode,
  }) async {
    final cleanedName = (name ?? '').trim();
    final cleanedPhone = phone != null && phone.trim().isNotEmpty
        ? _normalizePhone(phone)
        : '';
    final cleanedCode = (patientCode ?? '').trim().toUpperCase();

    if (isReturningIdMode) {
      if (cleanedCode.isEmpty) {
        throw Exception('PATIENT_ID_REQUIRED');
      }
      final byId = patients
          .where((p) => p.patientCode.toUpperCase() == cleanedCode)
          .firstOrNull;
      if (byId == null) {
        throw Exception('PATIENT_ID_NOT_FOUND');
      }
      final phoneMatches =
          cleanedPhone.isNotEmpty && byId.phone == cleanedPhone;
      final nameMatches = cleanedName.isNotEmpty &&
          byId.name.trim().toLowerCase() == cleanedName.toLowerCase();
      if (!phoneMatches && !nameMatches) {
        throw Exception('PATIENT_VERIFICATION_MISMATCH');
      }
      currentPatientId = byId.id;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_patientIdPrefKey, byId.id);
      onStateChanged();
      return (patient: byId, isNewAccount: false);
    }

    if (cleanedPhone.isEmpty || cleanedName.isEmpty) {
      throw Exception('NAME_AND_PHONE_REQUIRED');
    }

    final existingByPhone =
        patients.where((p) => p.phone == cleanedPhone).firstOrNull;
    if (existingByPhone != null) {
      final updatedPatient = Patient(
        id: existingByPhone.id,
        patientCode: existingByPhone.patientCode.isNotEmpty
            ? existingByPhone.patientCode
            : generatePatientCode(settings, patients),
        phone: existingByPhone.phone,
        name: cleanedName.isNotEmpty ? cleanedName : existingByPhone.name,
        creditPoints: existingByPhone.creditPoints,
        nrcOrLicense: existingByPhone.nrcOrLicense,
        previousPhones: existingByPhone.previousPhones,
        createdAt: existingByPhone.createdAt,
      );
      patients = patients
          .map((p) => p.id == updatedPatient.id ? updatedPatient : p)
          .toList();
      currentPatientId = updatedPatient.id;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_patientIdPrefKey, updatedPatient.id);
      await persistStateToServer();
      return (patient: updatedPatient, isNewAccount: false);
    }

    final newCode = generatePatientCode(settings, patients);
    final newPatient = Patient(
      id: 'pat-${DateTime.now().millisecondsSinceEpoch}',
      patientCode: newCode,
      phone: cleanedPhone,
      name: cleanedName,
      creditPoints: 0,
      createdAt: DateTime.now().toIso8601String(),
    );
    patients = [...patients, newPatient];
    currentPatientId = newPatient.id;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_patientIdPrefKey, newPatient.id);
    await persistStateToServer();
    return (patient: newPatient, isNewAccount: true);
  }

  Future<void> logout() async {
    currentPatientId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_patientIdPrefKey);
    onStateChanged();
  }

  Future<String?> uploadReceiptBytes(
      Uint8List bytes, String fileName) async {
    final base64Str = base64Encode(bytes);
    final dataUrl = 'data:image/jpeg;base64,$base64Str';
    try {
      final res = await http
          .post(
            Uri.parse('$baseUrl/api/upload'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'dataUrl': dataUrl,
              'folder': 'receipts',
              'fileName': fileName,
            }),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        if (json['ok'] == true && json['url'] != null) {
          return json['url'].toString();
        }
      }
    } catch (_) {}
    return dataUrl;
  }

  Future<Booking> createBooking({
    required String doctorId,
    required String paymentMethod,
    String? receiptUrl,
  }) async {
    final me = currentPatient;
    if (me == null) throw Exception('NOT_LOGGED_IN');
    final doctor = doctors.where((d) => d.id == doctorId).firstOrNull;
    if (doctor == null) throw Exception('DOCTOR_NOT_FOUND');

    final fee = doctor.consultationFee;
    if (paymentMethod == 'credit_points' && me.creditPoints < fee) {
      throw Exception('INSUFFICIENT_CREDIT_POINTS');
    }

    final doctorBookings =
        bookings.where((b) => b.doctorId == doctorId).toList();
    int maxQueue = doctor.currentQueueNumber;
    for (final b in doctorBookings) {
      if (b.queueNumber > maxQueue) maxQueue = b.queueNumber;
    }
    final nextQueueNumber = maxQueue + 1;
    final prefix = doctor.doctorCode.isNotEmpty
        ? doctor.doctorCode
        : 'RM${doctor.roomNumber}';
    final ticketCode =
        '$prefix-${nextQueueNumber.toString().padLeft(3, '0')}';

    final now = DateTime.now();
    final todayStr =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

    final newBooking = Booking(
      id: 'bk-${now.millisecondsSinceEpoch}',
      patientId: me.id,
      doctorId: doctorId,
      queueNumber: nextQueueNumber,
      ticketCode: ticketCode,
      status: 'waiting',
      paymentStatus: 'pending',
      paymentMethod: paymentMethod,
      amountPaid: fee,
      receiptUrl: receiptUrl,
      appointmentDate: todayStr,
      createdAt: now.toIso8601String(),
    );

    if (paymentMethod == 'credit_points') {
      patients = patients.map((p) {
        if (p.id != me.id) return p;
        return Patient(
          id: p.id,
          patientCode: p.patientCode,
          phone: p.phone,
          name: p.name,
          creditPoints: p.creditPoints - fee,
          nrcOrLicense: p.nrcOrLicense,
          previousPhones: p.previousPhones,
          createdAt: p.createdAt,
        );
      }).toList();
    }

    bookings = [...bookings, newBooking];
    receptionNotifications = [
      {
        'id': 'rnotif-${now.millisecondsSinceEpoch}',
        'type': 'new_booking',
        'booking_id': newBooking.id,
        'doctor_id': doctorId,
        'patient_name': me.name,
        'patient_phone': me.phone,
        'queue_number': nextQueueNumber,
        'ticket_code': ticketCode,
        'title_my':
            'ဘိုကင်အသစ် ဝင်ရောက်လာပါသည် (#$nextQueueNumber • $ticketCode)',
        'body_my':
            '${me.name} (${me.patientCode}) မှ ${doctor.nameMy} အတွက် ဘိုကင်တင်ထားပါသည်။ Reception မှ အတည်ပြုပေးပါ။',
        'title_en': 'New Booking (#$nextQueueNumber • $ticketCode)',
        'body_en':
            '${me.name} (${me.patientCode}) booked ${doctor.name}. Please confirm at Reception.',
        'is_read': false,
        'created_at': now.toIso8601String(),
      },
      ...receptionNotifications,
    ];

    await persistStateToServer();
    return newBooking;
  }

  /// Patient cancellation rule: Must be at least 2 patients before their turn!
  Future<void> requestPatientBookingCancel(String bookingId) async {
    final booking = bookings.where((b) => b.id == bookingId).firstOrNull;
    if (booking == null) throw Exception('BOOKING_NOT_FOUND');
    final doctor =
        doctors.where((d) => d.id == booking.doctorId).firstOrNull;
    final currentServing = doctor?.currentQueueNumber ?? 0;
    final turnsBefore = booking.queueNumber - currentServing;

    if (currentServing > 0 && turnsBefore < 2) {
      throw Exception('CANCEL_TOO_LATE_LESS_THAN_2_BEFORE_TURN');
    }

    bookings = bookings.map((b) {
      if (b.id != bookingId) return b;
      return Booking(
        id: b.id,
        patientId: b.patientId,
        doctorId: b.doctorId,
        queueNumber: b.queueNumber,
        ticketCode: b.ticketCode,
        status: b.status,
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod,
        amountPaid: b.amountPaid,
        receiptUrl: b.receiptUrl,
        appointmentDate: b.appointmentDate,
        isPriority: b.isPriority,
        cancelRequestedByPatient: true,
        createdAt: b.createdAt,
      );
    }).toList();

    final me = currentPatient;
    final now = DateTime.now();
    receptionNotifications = [
      {
        'id': 'rnotif-cancel-${now.millisecondsSinceEpoch}',
        'type': 'cancel_request',
        'booking_id': booking.id,
        'doctor_id': booking.doctorId,
        'patient_name': me?.name ?? 'လူနာ',
        'patient_phone': me?.phone ?? '',
        'queue_number': booking.queueNumber,
        'ticket_code': booking.ticketCode,
        'title_my':
            'ရက်ချိန်းပယ်ဖျက်ပြီး ပွိုင့်ပြန်ယူရန် တောင်းဆိုချက် (#${booking.queueNumber})',
        'body_my':
            '${me?.name ?? "လူနာ"} မှ အလှည့်မရောက်မီ ($turnsBefore ဦးအလို) တွင် ပယ်ဖျက်ခွင့် တောင်းဆိုထားပါသည်။ Reception မှ အတည်ပြုပေးပါ။',
        'title_en':
            'Cancellation & Point Refund Request (#${booking.queueNumber})',
        'body_en':
            'Requested $turnsBefore turns ahead. Confirm at Reception to credit points.',
        'is_read': false,
        'created_at': now.toIso8601String(),
      },
      ...receptionNotifications,
    ];

    await persistStateToServer();
  }
}
