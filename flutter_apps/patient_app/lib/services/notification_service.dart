import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class ClinicNotificationService {
  static final ClinicNotificationService _instance =
      ClinicNotificationService._internal();
  factory ClinicNotificationService() => _instance;
  ClinicNotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);

    await _plugin.initialize(initSettings);

    final androidImplementation =
        _plugin.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    if (androidImplementation != null) {
      await androidImplementation.requestNotificationsPermission();
      const channel = AndroidNotificationChannel(
        'clinic_live_alerts_v2',
        'ဆေးခန်း အလှည့်နှင့် သတိပေးချက်များ (Clinic Live Alerts)',
        description:
            'Reception မှ သတိပေးချက်များနှင့် သင့်လူနာအလှည့် နီးကပ်လာချိန် အသံမြည် သတိပေးချက်',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      );
      await androidImplementation.createNotificationChannel(channel);
    }

    _initialized = true;
  }

  Future<void> showHighPriorityAlert({
    required String title,
    required String body,
    int? id,
  }) async {
    if (!_initialized) {
      await initialize();
    }

    // Play native system alert sound + haptic vibration immediately
    await SystemSound.play(SystemSoundType.alert);
    await HapticFeedback.heavyImpact();

    const androidDetails = AndroidNotificationDetails(
      'clinic_live_alerts_v2',
      'ဆေးခန်း အလှည့်နှင့် သတိပေးချက်များ (Clinic Live Alerts)',
      channelDescription:
          'Reception မှ သတိပေးချက်များနှင့် သင့်လူနာအလှည့် နီးကပ်လာချိန် အသံမြည် သတိပေးချက်',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      fullScreenIntent: true,
      visibility: NotificationVisibility.public,
      category: AndroidNotificationCategory.alarm,
    );

    const notificationDetails = NotificationDetails(android: androidDetails);
    await _plugin.show(
      id ?? DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      notificationDetails,
    );
  }
}
