import 'package:flutter/material.dart';

import 'package:greencrowd_mobile/app.dart';
import 'package:greencrowd_mobile/features/contribution/data/contribution_sync_service.dart';
import 'package:greencrowd_mobile/core/config/app_config.dart';
import 'package:greencrowd_mobile/features/map/data/nearby_tasks_repository.dart';
import 'package:greencrowd_mobile/services/api/api_client.dart';
import 'package:greencrowd_mobile/services/auth/auth_controller.dart';
import 'package:greencrowd_mobile/services/auth/keycloak_auth_service.dart';
import 'package:greencrowd_mobile/services/location/location_service.dart';
import 'package:greencrowd_mobile/services/offline/contribution_queue_service.dart';
import 'package:greencrowd_mobile/services/offline/local_db_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

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

  runApp(
    GreenCrowdApp(
      authController: authController,
      nearbyTasksRepository: nearbyTasksRepository,
      locationService: locationService,
      contributionQueueService: contributionQueueService,
      contributionSyncService: contributionSyncService,
    ),
  );
}
