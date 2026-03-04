import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'package:greencrowd_mobile/services/api/api_client.dart';

/// Handles FCM token registration, foreground/background message display.
class NotificationService {
  NotificationService(this._apiClient);

  final ApiClient _apiClient;
  final _fcm = FirebaseMessaging.instance;
  final _localNotif = FlutterLocalNotificationsPlugin();

  /// Canal de notificaciones por defecto (Android 8+)
  static const _androidChannel = AndroidNotificationChannel(
    'greencrowd_default',
    'GreenCrowd',
    description: 'GreenCrowd task and reward notifications',
    importance: Importance.high,
  );

  Future<void> init() async {
    // Inicializar Firebase si aún no se hizo
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }

    // Permisos (iOS / macOS)
    if (Platform.isIOS) {
      await _fcm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    }

    // Configurar canal Android
    await _localNotif
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);

    // Inicializar flutter_local_notifications
    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(
        requestAlertPermission: false, // ya pedimos arriba
        requestBadgePermission: false,
        requestSoundPermission: false,
      ),
    );
    await _localNotif.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Mensajes en foreground → mostrar notificación local
    FirebaseMessaging.onMessage.listen(_showLocalNotification);

    // Obtener token y registrar en backend
    await _registerFcmToken();

    // Si el token se renueva, re-registrar
    _fcm.onTokenRefresh.listen(_sendTokenToBackend);
  }

  Future<void> _registerFcmToken() async {
    final token = await _fcm.getToken();
    if (token != null) {
      await _sendTokenToBackend(token);
    }
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      final platform = Platform.isIOS ? 'apns' : 'fcm';
      await _apiClient.registerPushToken(token: token, platform: platform);
    } catch (_) {
      // No fatal si el backend está caído al arrancar
    }
  }

  void _showLocalNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotif.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id,
          _androidChannel.name,
          channelDescription: _androidChannel.description,
          icon: '@mipmap/ic_launcher',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: message.data['taskId'] as String?,
    );
  }

  void _onNotificationTap(NotificationResponse response) {
    // Navegar a la task correspondiente si hay payload
    // La navegación se resuelve en app.dart via un GlobalKey<NavigatorState>
    final taskId = response.payload;
    if (taskId != null) {
      _pendingTaskId = taskId;
    }
  }

  /// Task pendiente de abrir cuando la app ya está en primer plano.
  String? _pendingTaskId;
  String? consumePendingTaskId() {
    final id = _pendingTaskId;
    _pendingTaskId = null;
    return id;
  }
}
