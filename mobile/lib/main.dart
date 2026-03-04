import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import 'package:greencrowd_mobile/app.dart';
import 'package:greencrowd_mobile/features/contribution/data/contribution_sync_service.dart';
import 'package:greencrowd_mobile/core/config/app_config.dart';
import 'package:greencrowd_mobile/features/map/data/nearby_tasks_repository.dart';
import 'package:greencrowd_mobile/services/api/api_client.dart';
import 'package:greencrowd_mobile/services/auth/auth_controller.dart';
import 'package:greencrowd_mobile/services/auth/keycloak_auth_service.dart';
import 'package:greencrowd_mobile/services/location/location_service.dart';
import 'package:greencrowd_mobile/services/notifications/notification_service.dart';
import 'package:greencrowd_mobile/services/offline/contribution_queue_service.dart';
import 'package:greencrowd_mobile/services/offline/local_db_service.dart';

/// Handler de mensajes en background (top-level, fuera de la clase).
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // firebase_messaging requiere que el handler sea top-level.
  // No hace falta mostrar notificación: FCM ya la muestra en background.
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Registrar handler de mensajes en background antes de runApp
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  final config = AppConfig.fromEnvironment();
  final localDb = LocalDbService();
  await localDb.init();

  final authService = KeycloakAuthService(config);
  final authController = AuthController(authService);
  await authController.initialize();

  final apiClient = ApiClient(config, authService);
  final contributionQueueService = ContributionQueueService();
  await contributionQueueService.init();
  final contributionSyncService = ContributionSyncService(
    apiClient,
    contributionQueueService,
  );
  final nearbyTasksRepository = NearbyTasksRepository(apiClient, localDb);
  final locationService = LocationService();
  final notificationService = NotificationService(apiClient);
  await notificationService.init();

  runApp(
    GreenCrowdApp(
      authController: authController,
      nearbyTasksRepository: nearbyTasksRepository,
      locationService: locationService,
      contributionQueueService: contributionQueueService,
      contributionSyncService: contributionSyncService,
      notificationService: notificationService,
    ),
  );
}
