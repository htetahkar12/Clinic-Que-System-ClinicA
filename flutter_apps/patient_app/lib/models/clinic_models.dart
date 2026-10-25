class ClinicSettings {
  final String clinicName;
  final String clinicNameMy;
  final String clinicCodePrefix;
  final String primaryColor;
  final String secondaryColor;
  final String logoUrl;
  final String phone;
  final String addressMy;
  final String kpayPhone;
  final String kpayAccountName;
  final String wavepayPhone;
  final String wavepayAccountName;
  final String ayapayPhone;
  final String ayapayAccountName;
  final String receptionPin;

  ClinicSettings({
    required this.clinicName,
    required this.clinicNameMy,
    required this.clinicCodePrefix,
    required this.primaryColor,
    required this.secondaryColor,
    required this.logoUrl,
    required this.phone,
    required this.addressMy,
    required this.kpayPhone,
    required this.kpayAccountName,
    required this.wavepayPhone,
    required this.wavepayAccountName,
    required this.ayapayPhone,
    required this.ayapayAccountName,
    required this.receptionPin,
  });

  factory ClinicSettings.defaults() {
    return ClinicSettings(
      clinicName: 'Ayeyarwady Specialist Clinic',
      clinicNameMy: 'ဧရာဝတီ အထူးကုဆေးခန်း',
      clinicCodePrefix: 'ASC',
      primaryColor: '#0B5ED7',
      secondaryColor: '#D97706',
      logoUrl: '',
      phone: '09-777-888-999',
      addressMy: 'အမှတ် (၁၂၀)၊ ဗိုလ်ချုပ်လမ်း၊ ရန်ကုန်မြို့။',
      kpayPhone: '09777888999',
      kpayAccountName: 'Ayeyarwady Specialist Clinic',
      wavepayPhone: '09777888999',
      wavepayAccountName: 'Ayeyarwady Specialist Clinic',
      ayapayPhone: '09777888999',
      ayapayAccountName: 'Ayeyarwady Specialist Clinic',
      receptionPin: '1234',
    );
  }

  factory ClinicSettings.fromJson(Map<String, dynamic> json) {
    final def = ClinicSettings.defaults();
    return ClinicSettings(
      clinicName: (json['clinicName'] ?? def.clinicName).toString(),
      clinicNameMy: (json['clinicNameMy'] ?? def.clinicNameMy).toString(),
      clinicCodePrefix:
          (json['clinicCodePrefix'] ?? def.clinicCodePrefix).toString(),
      primaryColor: (json['primaryColor'] ?? def.primaryColor).toString(),
      secondaryColor: (json['secondaryColor'] ?? def.secondaryColor).toString(),
      logoUrl: (json['logoUrl'] ?? def.logoUrl).toString(),
      phone: (json['phone'] ?? def.phone).toString(),
      addressMy: (json['addressMy'] ?? def.addressMy).toString(),
      kpayPhone: (json['kpayPhone'] ?? def.kpayPhone).toString(),
      kpayAccountName:
          (json['kpayAccountName'] ?? def.kpayAccountName).toString(),
      wavepayPhone: (json['wavepayPhone'] ?? def.wavepayPhone).toString(),
      wavepayAccountName:
          (json['wavepayAccountName'] ?? def.wavepayAccountName).toString(),
      ayapayPhone: (json['ayapayPhone'] ?? def.ayapayPhone).toString(),
      ayapayAccountName:
          (json['ayapayAccountName'] ?? def.ayapayAccountName).toString(),
      receptionPin: (json['receptionPin'] ?? def.receptionPin).toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'clinicName': clinicName,
        'clinicNameMy': clinicNameMy,
        'clinicCodePrefix': clinicCodePrefix,
        'primaryColor': primaryColor,
        'secondaryColor': secondaryColor,
        'logoUrl': logoUrl,
        'phone': phone,
        'addressMy': addressMy,
        'kpayPhone': kpayPhone,
        'kpayAccountName': kpayAccountName,
        'wavepayPhone': wavepayPhone,
        'wavepayAccountName': wavepayAccountName,
        'ayapayPhone': ayapayPhone,
        'ayapayAccountName': ayapayAccountName,
        'receptionPin': receptionPin,
      };
}

class Patient {
  final String id;
  final String patientCode;
  final String phone;
  final String name;
  final int creditPoints;
  final String? nrcOrLicense;
  final List<String> previousPhones;
  final String createdAt;

  Patient({
    required this.id,
    required this.patientCode,
    required this.phone,
    required this.name,
    required this.creditPoints,
    this.nrcOrLicense,
    this.previousPhones = const [],
    required this.createdAt,
  });

  factory Patient.fromJson(Map<String, dynamic> json) {
    return Patient(
      id: (json['id'] ?? '').toString(),
      patientCode: (json['patient_code'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      creditPoints: int.tryParse((json['credit_points'] ?? 0).toString()) ?? 0,
      nrcOrLicense: json['nrc_or_license']?.toString(),
      previousPhones: (json['previous_phones'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      createdAt:
          (json['created_at'] ?? DateTime.now().toIso8601String()).toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'patient_code': patientCode,
        'phone': phone,
        'name': name,
        'credit_points': creditPoints,
        if (nrcOrLicense != null) 'nrc_or_license': nrcOrLicense,
        'previous_phones': previousPhones,
        'created_at': createdAt,
      };
}

class Doctor {
  final String id;
  final String doctorCode;
  final String name;
  final String nameMy;
  final String specialty;
  final String specialtyMy;
  final String roomNumber;
  final int consultationFee;
  final String startTime;
  final String endTime;
  final int currentQueueNumber;
  final int avgConsultMinutes;
  final String status; // 'not_arrived' | 'active' | 'delayed' | 'postponed'
  final int delayMinutes;
  final String? statusNote;
  final bool isArchived;

  Doctor({
    required this.id,
    required this.doctorCode,
    required this.name,
    required this.nameMy,
    required this.specialty,
    required this.specialtyMy,
    required this.roomNumber,
    required this.consultationFee,
    required this.startTime,
    required this.endTime,
    required this.currentQueueNumber,
    required this.avgConsultMinutes,
    required this.status,
    required this.delayMinutes,
    this.statusNote,
    this.isArchived = false,
  });

  factory Doctor.fromJson(Map<String, dynamic> json) {
    return Doctor(
      id: (json['id'] ?? '').toString(),
      doctorCode: (json['doctor_code'] ?? 'DOC-101').toString(),
      name: (json['name'] ?? '').toString(),
      nameMy: (json['name_my'] ?? '').toString(),
      specialty: (json['specialty'] ?? '').toString(),
      specialtyMy: (json['specialty_my'] ?? '').toString(),
      roomNumber: (json['room_number'] ?? '101').toString(),
      consultationFee:
          int.tryParse((json['consultation_fee'] ?? 15000).toString()) ?? 15000,
      startTime: (json['start_time'] ?? '09:00 AM').toString(),
      endTime: (json['end_time'] ?? '12:00 PM').toString(),
      currentQueueNumber:
          int.tryParse((json['current_queue_number'] ?? 0).toString()) ?? 0,
      avgConsultMinutes:
          int.tryParse((json['avg_consult_minutes'] ?? 8).toString()) ?? 8,
      status: (json['status'] ?? 'not_arrived').toString(),
      delayMinutes:
          int.tryParse((json['delay_minutes'] ?? 0).toString()) ?? 0,
      statusNote: json['status_note']?.toString(),
      isArchived: json['is_archived'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'doctor_code': doctorCode,
        'name': name,
        'name_my': nameMy,
        'specialty': specialty,
        'specialty_my': specialtyMy,
        'room_number': roomNumber,
        'consultation_fee': consultationFee,
        'start_time': startTime,
        'end_time': endTime,
        'current_queue_number': currentQueueNumber,
        'avg_consult_minutes': avgConsultMinutes,
        'status': status,
        'delay_minutes': delayMinutes,
        if (statusNote != null) 'status_note': statusNote,
        'is_archived': isArchived,
      };
}

class Booking {
  final String id;
  final String patientId;
  final String doctorId;
  final int queueNumber;
  final String ticketCode;
  final String status; // 'waiting' | 'in_consultation' | 'completed' | 'cancelled'
  final String paymentStatus; // 'pending_verification' | 'paid' | 'refunded'
  final String paymentMethod; // 'kpay' | 'wavepay' | 'ayapay' | 'credit_points' | 'cash'
  final int amountPaid;
  final String? receiptUrl;
  final String appointmentDate;
  final bool isPriority;
  final bool cancelRequestedByPatient;
  final String createdAt;

  Booking({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.queueNumber,
    required this.ticketCode,
    required this.status,
    required this.paymentStatus,
    required this.paymentMethod,
    required this.amountPaid,
    this.receiptUrl,
    required this.appointmentDate,
    this.isPriority = false,
    this.cancelRequestedByPatient = false,
    required this.createdAt,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: (json['id'] ?? '').toString(),
      patientId: (json['patient_id'] ?? '').toString(),
      doctorId: (json['doctor_id'] ?? '').toString(),
      queueNumber: int.tryParse((json['queue_number'] ?? 1).toString()) ?? 1,
      ticketCode: (json['ticket_code'] ?? 'Q-001').toString(),
      status: (json['status'] ?? 'waiting').toString(),
      paymentStatus:
          (json['payment_status'] ?? 'pending_verification').toString(),
      paymentMethod: (json['payment_method'] ?? 'kpay').toString(),
      amountPaid:
          int.tryParse((json['amount_paid'] ?? 15000).toString()) ?? 15000,
      receiptUrl: json['receipt_url']?.toString(),
      appointmentDate: (json['appointment_date'] ?? '').toString(),
      isPriority: json['is_priority'] == true,
      cancelRequestedByPatient: json['cancel_requested_by_patient'] == true,
      createdAt:
          (json['created_at'] ?? DateTime.now().toIso8601String()).toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'patient_id': patientId,
        'doctor_id': doctorId,
        'queue_number': queueNumber,
        'ticket_code': ticketCode,
        'status': status,
        'payment_status': paymentStatus,
        'payment_method': paymentMethod,
        'amount_paid': amountPaid,
        if (receiptUrl != null) 'receipt_url': receiptUrl,
        'appointment_date': appointmentDate,
        'is_priority': isPriority,
        'cancel_requested_by_patient': cancelRequestedByPatient,
        'created_at': createdAt,
      };
}

class ClinicMessage {
  final String id;
  final String? doctorId;
  final String? bookingId;
  final String? patientId;
  final String titleMy;
  final String bodyMy;
  final String titleEn;
  final String bodyEn;
  final String kind;
  final String createdAt;

  ClinicMessage({
    required this.id,
    this.doctorId,
    this.bookingId,
    this.patientId,
    required this.titleMy,
    required this.bodyMy,
    required this.titleEn,
    required this.bodyEn,
    required this.kind,
    required this.createdAt,
  });

  factory ClinicMessage.fromJson(Map<String, dynamic> json) {
    return ClinicMessage(
      id: (json['id'] ?? '').toString(),
      doctorId: json['doctor_id']?.toString(),
      bookingId: json['booking_id']?.toString(),
      patientId: json['patient_id']?.toString(),
      titleMy: (json['title_my'] ?? '').toString(),
      bodyMy: (json['body_my'] ?? '').toString(),
      titleEn: (json['title_en'] ?? '').toString(),
      bodyEn: (json['body_en'] ?? '').toString(),
      kind: (json['kind'] ?? 'manual').toString(),
      createdAt:
          (json['created_at'] ?? DateTime.now().toIso8601String()).toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (doctorId != null) 'doctor_id': doctorId,
        if (bookingId != null) 'booking_id': bookingId,
        if (patientId != null) 'patient_id': patientId,
        'title_my': titleMy,
        'body_my': bodyMy,
        'title_en': titleEn,
        'body_en': bodyEn,
        'kind': kind,
        'created_at': createdAt,
      };
}

/// Generates Patient ID in exact format: [ClinicPrefix(2-4 chars)][YYMMDD][TTTT]
String generatePatientCode(
  ClinicSettings settings,
  List<Patient> existingPatients,
) {
  String prefix = settings.clinicCodePrefix
      .replaceAll(RegExp(r'[^A-Za-z0-9]'), '')
      .toUpperCase();
  if (prefix.length < 2 || prefix.length > 4) {
    prefix = 'ASC';
  }
  final now = DateTime.now();
  final yy = (now.year % 100).toString().padLeft(2, '0');
  final mm = now.month.toString().padLeft(2, '0');
  final dd = now.day.toString().padLeft(2, '0');
  final yymmdd = '$yy$mm$dd';

  int maxSeq = 0;
  final dateRule = RegExp('^([A-Z0-9]{2,4})$yymmdd(\\d{4})\$');
  for (final p in existingPatients) {
    final code = p.patientCode.trim().toUpperCase();
    final match = dateRule.firstMatch(code);
    if (match != null) {
      final seq = int.tryParse(match.group(2) ?? '0') ?? 0;
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  final nextCounter = (maxSeq + 1).toString().padLeft(4, '0');
  return '$prefix$yymmdd$nextCounter';
}
