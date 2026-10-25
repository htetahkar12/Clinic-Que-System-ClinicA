import 'dart:async';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/clinic_models.dart';

class StaffApiService {
  static const String _serverUrlPrefKey = 'auracare_staff_server_url_v1';
  static const String _cachedStatePrefKey = 'auracare_staff_cached_state_v3';

  String baseUrl = 'https://clinic-que-system-clinic-a.vercel.app';
  int currentVersion = 0;

  ClinicSettings settings = ClinicSettings.defaults();
  List<Patient> patients = [];
  List<Doctor> doctors = [];
  List<Booking> bookings = [];
  List<Map<String, dynamic>> transactions = [];
  List<ClinicMessage> messages = [];
  List<Map<String, dynamic>> receptionNotifications = [];

  final Set<String> _seenNotificationIds = {};
  final void Function() onStateChanged;

  Timer? _pollTimer;
  bool isConnected = false;

  StaffApiService({required this.onStateChanged});

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString(_serverUrlPrefKey);
    if (savedUrl != null && savedUrl.trim().isNotEmpty) {
      baseUrl = savedUrl.trim().replaceAll(RegExp(r'/$'), '');
    }

    final cachedRaw = prefs.getString(_cachedStatePrefKey);
    if (cachedRaw != null) {
      try {
        final decoded = jsonDecode(cachedRaw) as Map<String, dynamic>;
        _applyStateMap(decoded, playSound: false);
      } catch (_) {}
    }

    await syncFromServer(playSound: false);
    for (final n in receptionNotifications) {
      final id = n['id']?.toString();
      if (id != null) _seenNotificationIds.add(id);
    }

    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      syncFromServer(playSound: true);
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
    await syncFromServer(playSound: false);
  }

  Future<void> syncFromServer({bool playSound = true}) async {
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
          _applyStateMap(stateMap, playSound: playSound);
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
    required bool playSound,
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

      if (playSound) {
        for (final n in receptionNotifications) {
          final id = n['id']?.toString();
          if (id != null && !_seenNotificationIds.contains(id)) {
            _seenNotificationIds.add(id);
            SystemSound.play(SystemSoundType.alert);
          }
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

  bool verifyPin(String pin) {
    return pin.trim() == settings.receptionPin;
  }

  Future<bool> updateReceptionPin(String currentPin, String newPin) async {
    if (currentPin.trim() != settings.receptionPin) return false;
    if (newPin.trim().length < 4) return false;
    final json = settings.toJson();
    json['receptionPin'] = newPin.trim();
    settings = ClinicSettings.fromJson(json);
    await persistStateToServer();
    return true;
  }

  /// Mark doctor arrived -> Starts queue at #1!
  Future<int> markDoctorArrivedAndStartQueue(String doctorId) async {
    int startedNum = 1;
    doctors = doctors.map((d) {
      if (d.id != doctorId) return d;
      startedNum = d.currentQueueNumber > 0 ? d.currentQueueNumber : 1;
      return Doctor(
        id: d.id,
        doctorCode: d.doctorCode,
        name: d.name,
        nameMy: d.nameMy,
        specialty: d.specialty,
        specialtyMy: d.specialtyMy,
        roomNumber: d.roomNumber,
        consultationFee: d.consultationFee,
        startTime: d.startTime,
        endTime: d.endTime,
        currentQueueNumber: startedNum,
        avgConsultMinutes: d.avgConsultMinutes,
        status: 'available',
        delayMinutes: 0,
        statusNote: 'ဆရာဝန်ရောက်ရှိပြီး စတင်ကြည့်ရှုနေပါပြီ',
        isArchived: d.isArchived,
      );
    }).toList();

    final doc = doctors.where((d) => d.id == doctorId).firstOrNull;
    if (doc != null) {
      final now = DateTime.now().toIso8601String();
      messages = [
        ClinicMessage(
          id: 'msg-arrived-${DateTime.now().millisecondsSinceEpoch}',
          doctorId: doctorId,
          titleMy: '${doc.nameMy} ဆေးခန်းသို့ ရောက်ရှိပါပြီ (နံပါတ် #$startedNum စတင်ခေါ်ဆိုနေပါပြီ)',
          bodyMy: 'အခန်း (${doc.roomNumber}) တွင် လူနာအလှည့်နံပါတ် #$startedNum မှ စတင်ကြည့်ရှုနေပါပြီ။',
          titleEn: '${doc.name} has arrived (#$startedNum started)',
          bodyEn: 'Consultation started at #1 in Room ${doc.roomNumber}.',
          kind: 'automated',
          createdAt: now,
        ),
        ...messages,
      ];
    }

    await persistStateToServer();
    return startedNum;
  }

  /// Advance Doctor Queue (+1) and push automated notifications to patients 2 turns away
  Future<int> advanceDoctorQueue(String doctorId) async {
    int nextNum = 1;
    doctors = doctors.map((d) {
      if (d.id != doctorId) return d;
      nextNum = d.currentQueueNumber + 1;
      return Doctor(
        id: d.id,
        doctorCode: d.doctorCode,
        name: d.name,
        nameMy: d.nameMy,
        specialty: d.specialty,
        specialtyMy: d.specialtyMy,
        roomNumber: d.roomNumber,
        consultationFee: d.consultationFee,
        startTime: d.startTime,
        endTime: d.endTime,
        currentQueueNumber: nextNum,
        avgConsultMinutes: d.avgConsultMinutes,
        status: 'available',
        delayMinutes: d.delayMinutes,
        statusNote: d.statusNote,
        isArchived: d.isArchived,
      );
    }).toList();

    bookings = bookings.map((b) {
      if (b.doctorId != doctorId) return b;
      if (b.queueNumber < nextNum && b.status != 'cancelled') {
        return Booking(
          id: b.id,
          patientId: b.patientId,
          doctorId: b.doctorId,
          queueNumber: b.queueNumber,
          ticketCode: b.ticketCode,
          status: 'completed',
          paymentStatus: b.paymentStatus,
          paymentMethod: b.paymentMethod,
          amountPaid: b.amountPaid,
          receiptUrl: b.receiptUrl,
          appointmentDate: b.appointmentDate,
          isPriority: b.isPriority,
          cancelRequestedByPatient: b.cancelRequestedByPatient,
          createdAt: b.createdAt,
        );
      }
      if (b.queueNumber == nextNum && b.status != 'cancelled') {
        return Booking(
          id: b.id,
          patientId: b.patientId,
          doctorId: b.doctorId,
          queueNumber: b.queueNumber,
          ticketCode: b.ticketCode,
          status: 'in_progress',
          paymentStatus: b.paymentStatus,
          paymentMethod: b.paymentMethod,
          amountPaid: b.amountPaid,
          receiptUrl: b.receiptUrl,
          appointmentDate: b.appointmentDate,
          isPriority: b.isPriority,
          cancelRequestedByPatient: b.cancelRequestedByPatient,
          createdAt: b.createdAt,
        );
      }
      return b;
    }).toList();

    final doc = doctors.where((d) => d.id == doctorId).firstOrNull;
    if (doc != null) {
      final targetQueue = nextNum + 2;
      final upcoming = bookings
          .where((b) =>
              b.doctorId == doctorId &&
              b.queueNumber == targetQueue &&
              b.status == 'waiting')
          .firstOrNull;
      if (upcoming != null) {
        messages = [
          ClinicMessage(
            id: 'msg-auto-${DateTime.now().millisecondsSinceEpoch}',
            doctorId: doctorId,
            bookingId: upcoming.id,
            patientId: upcoming.patientId,
            titleMy:
                'သင့်အလှည့် ရောက်ခါနီးပါပြီ (#${upcoming.queueNumber})',
            bodyMy:
                '${doc.nameMy} သည် လက်ရှိ နံပါတ် #$nextNum ကို ကြည့်ရှုနေပါသည်။ ရှေ့တွင် (၂) ဦးသာ လိုပါတော့သည်၊ ဆေးခန်းသို့ ကြွရောက်ပေးပါရန်။',
            titleEn: 'Your turn (#${upcoming.queueNumber}) is 2 turns away!',
            bodyEn: 'Currently serving #$nextNum. Please head to the clinic.',
            kind: 'automated',
            createdAt: DateTime.now().toIso8601String(),
          ),
          ...messages,
        ];
      }
    }

    await persistStateToServer();
    return nextNum;
  }

  Future<void> setCustomQueueNumber(String doctorId, int queueNumber) async {
    doctors = doctors.map((d) {
      if (d.id != doctorId) return d;
      return Doctor(
        id: d.id,
        doctorCode: d.doctorCode,
        name: d.name,
        nameMy: d.nameMy,
        specialty: d.specialty,
        specialtyMy: d.specialtyMy,
        roomNumber: d.roomNumber,
        consultationFee: d.consultationFee,
        startTime: d.startTime,
        endTime: d.endTime,
        currentQueueNumber: queueNumber,
        avgConsultMinutes: d.avgConsultMinutes,
        status: queueNumber > 0 ? 'active' : 'not_arrived',
        delayMinutes: d.delayMinutes,
        statusNote: d.statusNote,
        isArchived: d.isArchived,
      );
    }).toList();
    await persistStateToServer();
  }

  /// Reception confirms payment receipt
  Future<void> verifyReceiptAndConfirmBooking(String bookingId) async {
    final booking = bookings.where((b) => b.id == bookingId).firstOrNull;
    if (booking == null) return;

    bookings = bookings.map((b) {
      if (b.id != bookingId) return b;
      return Booking(
        id: b.id,
        patientId: b.patientId,
        doctorId: b.doctorId,
        queueNumber: b.queueNumber,
        ticketCode: b.ticketCode,
        status: b.status,
        paymentStatus: 'paid',
        paymentMethod: b.paymentMethod,
        amountPaid: b.amountPaid,
        receiptUrl: b.receiptUrl,
        appointmentDate: b.appointmentDate,
        isPriority: b.isPriority,
        cancelRequestedByPatient: b.cancelRequestedByPatient,
        createdAt: b.createdAt,
      );
    }).toList();

    messages = [
      ClinicMessage(
        id: 'msg-paid-${DateTime.now().millisecondsSinceEpoch}',
        doctorId: booking.doctorId,
        bookingId: booking.id,
        patientId: booking.patientId,
        titleMy:
            'ဘိုကင်နှင့် ငွေပေးချေမှု အတည်ပြုပြီးပါပြီ (#${booking.queueNumber} • ${booking.ticketCode})',
        bodyMy:
            'Reception မှ သင့်ဘိုကင်ကို စစ်ဆေးအတည်ပြုပြီးပါပြီ။ အလှည့်နီးကပ်လာပါက အသံမြည် သတိပေးပါမည်။',
        titleEn: 'Booking Confirmed (#${booking.queueNumber})',
        bodyEn: 'Reception verified your booking.',
        kind: 'automated',
        createdAt: DateTime.now().toIso8601String(),
      ),
      ...messages,
    ];

    await persistStateToServer();
  }

  /// Reception confirms booking cancellation & optionally refunds 100% Credit Points
  Future<void> cancelBookingAndRefund(
    String bookingId, {
    required bool grantCreditPoints,
  }) async {
    final booking = bookings.where((b) => b.id == bookingId).firstOrNull;
    if (booking == null) return;

    bookings = bookings.map((b) {
      if (b.id != bookingId) return b;
      return Booking(
        id: b.id,
        patientId: b.patientId,
        doctorId: b.doctorId,
        queueNumber: b.queueNumber,
        ticketCode: b.ticketCode,
        status: 'cancelled',
        paymentStatus: grantCreditPoints ? 'refunded' : b.paymentStatus,
        paymentMethod: b.paymentMethod,
        amountPaid: b.amountPaid,
        receiptUrl: b.receiptUrl,
        appointmentDate: b.appointmentDate,
        isPriority: b.isPriority,
        cancelRequestedByPatient: false,
        createdAt: b.createdAt,
      );
    }).toList();

    if (grantCreditPoints) {
      patients = patients.map((p) {
        if (p.id != booking.patientId) return p;
        return Patient(
          id: p.id,
          patientCode: p.patientCode,
          phone: p.phone,
          name: p.name,
          creditPoints: p.creditPoints + booking.amountPaid,
          nrcOrLicense: p.nrcOrLicense,
          previousPhones: p.previousPhones,
          createdAt: p.createdAt,
        );
      }).toList();

      messages = [
        ClinicMessage(
          id: 'msg-refund-${DateTime.now().millisecondsSinceEpoch}',
          doctorId: booking.doctorId,
          bookingId: booking.id,
          patientId: booking.patientId,
          titleMy:
              'ရက်ချိန်းပယ်ဖျက်မှု အတည်ပြုပြီး (${booking.amountPaid} ကျပ် ပွိုင့်ပြန်ထည့်ပေးပြီး)',
          bodyMy:
              'Reception မှ အတည်ပြုပေးလိုက်သဖြင့် သင့်အကောင့်ထဲသို့ ${booking.amountPaid} Credit Points ပြန်လည်ထည့်သွင်းပေးပြီး ဖြစ်ပါသည်။',
          titleEn: 'Refunded ${booking.amountPaid} MMK Credit Points',
          bodyEn: 'Reception approved your cancellation and credited points.',
          kind: 'automated',
          createdAt: DateTime.now().toIso8601String(),
        ),
        ...messages,
      ];
    }

    await persistStateToServer();
  }

  /// Reception creates Walk-In Booking
  Future<Booking> createWalkInBooking({
    required String doctorId,
    required String patientName,
    required String patientPhone,
    required bool isPriority,
  }) async {
    final doc = doctors.where((d) => d.id == doctorId).firstOrNull;
    if (doc == null) throw Exception('DOCTOR_NOT_FOUND');

    final digits = patientPhone.replaceAll(RegExp(r'\D'), '');
    final normalizedPhone = digits.isEmpty ? '09788899900' : digits;

    Patient? targetPatient =
        patients.where((p) => p.phone == normalizedPhone).firstOrNull;
    if (targetPatient == null) {
      final newCode = generatePatientCode(settings, patients);
      targetPatient = Patient(
        id: 'pat-${DateTime.now().millisecondsSinceEpoch}',
        patientCode: newCode,
        phone: normalizedPhone,
        name: patientName.trim(),
        creditPoints: 0,
        createdAt: DateTime.now().toIso8601String(),
      );
      patients = [...patients, targetPatient];
    }

    final doctorBookings =
        bookings.where((b) => b.doctorId == doctorId).toList();
    int maxQueue = doc.currentQueueNumber;
    for (final b in doctorBookings) {
      if (b.queueNumber > maxQueue) maxQueue = b.queueNumber;
    }
    final nextQueue = maxQueue + 1;
    final ticketCode =
        '${doc.doctorCode}-${nextQueue.toString().padLeft(3, '0')}${isPriority ? "-VIP" : ""}';
    final now = DateTime.now();
    final todayStr =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

    final newBooking = Booking(
      id: 'bk-walkin-${now.millisecondsSinceEpoch}',
      patientId: targetPatient.id,
      doctorId: doctorId,
      queueNumber: nextQueue,
      ticketCode: ticketCode,
      status: 'waiting',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      amountPaid: doc.consultationFee,
      appointmentDate: todayStr,
      isPriority: isPriority,
      createdAt: now.toIso8601String(),
    );

    bookings = [...bookings, newBooking];
    await persistStateToServer();
    return newBooking;
  }

  /// Reception updates Patient Phone Number after verifying NRC / Driver's License
  Future<Patient> updatePatientPhoneByReception({
    required String patientId,
    required String newPhone,
    required String nrcOrLicense,
    String? newName,
  }) async {
    final target = patients.where((p) => p.id == patientId).firstOrNull;
    if (target == null) throw Exception('PATIENT_NOT_FOUND');
    if (nrcOrLicense.trim().isEmpty) {
      throw Exception('NRC_OR_LICENSE_REQUIRED');
    }

    final digits = newPhone.replaceAll(RegExp(r'\D'), '');
    final normalizedPhone = digits.startsWith('09') ? digits : '09$digits';
    final prevPhones = <String>{
      ...target.previousPhones,
      if (target.phone != normalizedPhone) target.phone,
    }.toList();

    final updated = Patient(
      id: target.id,
      patientCode: target.patientCode,
      phone: normalizedPhone,
      name: (newName != null && newName.trim().isNotEmpty)
          ? newName.trim()
          : target.name,
      creditPoints: target.creditPoints,
      nrcOrLicense: nrcOrLicense.trim(),
      previousPhones: prevPhones,
      createdAt: target.createdAt,
    );

    patients =
        patients.map((p) => p.id == updated.id ? updated : p).toList();
    await persistStateToServer();
    return updated;
  }

  /// Add new doctor or activate saved doctor (starts as 'not_arrived', queue 0)
  Future<void> addOrActivateDoctor({
    String? existingDoctorId,
    required String nameMy,
    required String nameEn,
    required String specialtyMy,
    required String specialtyEn,
    required String doctorCode,
    required String roomNumber,
    required int consultationFee,
    required String startTime,
    required String endTime,
  }) async {
    if (existingDoctorId != null && existingDoctorId.isNotEmpty) {
      doctors = doctors.map((d) {
        if (d.id != existingDoctorId) return d;
        return Doctor(
          id: d.id,
          doctorCode: doctorCode,
          name: nameEn.isNotEmpty ? nameEn : nameMy,
          nameMy: nameMy,
          specialty: specialtyEn.isNotEmpty ? specialtyEn : specialtyMy,
          specialtyMy: specialtyMy,
          roomNumber: roomNumber,
          consultationFee: consultationFee,
          startTime: startTime,
          endTime: endTime,
          currentQueueNumber: 0,
          avgConsultMinutes: d.avgConsultMinutes,
          status: 'not_arrived',
          delayMinutes: 0,
          isArchived: false,
        );
      }).toList();
    } else {
      final newDoc = Doctor(
        id: 'doc-${DateTime.now().millisecondsSinceEpoch}',
        doctorCode: doctorCode,
        name: nameEn.isNotEmpty ? nameEn : nameMy,
        nameMy: nameMy,
        specialty: specialtyEn.isNotEmpty ? specialtyEn : specialtyMy,
        specialtyMy: specialtyMy,
        roomNumber: roomNumber,
        consultationFee: consultationFee,
        startTime: startTime,
        endTime: endTime,
        currentQueueNumber: 0,
        avgConsultMinutes: 10,
        status: 'not_arrived',
        delayMinutes: 0,
        isArchived: false,
      );
      doctors = [...doctors, newDoc];
    }
    await persistStateToServer();
  }

  Future<void> sendDirectPatientAlert({
    required String doctorId,
    String? patientId,
    required String titleMy,
    required String bodyMy,
  }) async {
    messages = [
      ClinicMessage(
        id: 'msg-manual-${DateTime.now().millisecondsSinceEpoch}',
        doctorId: doctorId,
        patientId: patientId,
        titleMy: titleMy,
        bodyMy: bodyMy,
        titleEn: titleMy,
        bodyEn: bodyMy,
        kind: 'manual',
        createdAt: DateTime.now().toIso8601String(),
      ),
      ...messages,
    ];
    await persistStateToServer();
  }

  Future<void> clearReceptionNotifications() async {
    receptionNotifications = [];
    await persistStateToServer();
  }
}
