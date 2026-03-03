import 'package:flutter/material.dart';

import 'package:greencrowd_mobile/core/theme/app_theme.dart';
import 'package:greencrowd_mobile/features/auth/presentation/sign_in_page.dart';
import 'package:greencrowd_mobile/features/contribution/data/contribution_sync_service.dart';
import 'package:greencrowd_mobile/features/map/data/nearby_tasks_repository.dart';
import 'package:greencrowd_mobile/features/map/presentation/map_page.dart';
import 'package:greencrowd_mobile/services/auth/auth_controller.dart';
import 'package:greencrowd_mobile/services/location/location_service.dart';
import 'package:greencrowd_mobile/services/offline/contribution_queue_service.dart';

class GreenCrowdApp extends StatelessWidget {
  const GreenCrowdApp({
    required this.authController,
    required this.nearbyTasksRepository,
    required this.locationService,
    required this.contributionQueueService,
    required this.contributionSyncService,
    super.key,
  });

  final AuthController authController;
  final NearbyTasksRepository nearbyTasksRepository;
  final LocationService locationService;
  final ContributionQueueService contributionQueueService;
  final ContributionSyncService contributionSyncService;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: authController,
      builder: (context, _) {
        return MaterialApp(
          title: 'GreenCrowd',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          home: authController.isAuthenticated
              ? MapPage(
                  authController: authController,
                  nearbyTasksRepository: nearbyTasksRepository,
                  locationService: locationService,
                  contributionQueueService: contributionQueueService,
                  contributionSyncService: contributionSyncService,
                )
              : SignInPage(authController: authController),
        );
      },
    );
  }
}
