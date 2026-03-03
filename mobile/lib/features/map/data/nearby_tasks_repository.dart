import 'package:geolocator/geolocator.dart';

import 'package:greencrowd_mobile/features/map/domain/nearby_task.dart';
import 'package:greencrowd_mobile/services/api/api_client.dart';
import 'package:greencrowd_mobile/services/offline/local_db_service.dart';

class NearbyTasksResult {
  const NearbyTasksResult({
    required this.tasks,
    required this.fromCache,
    this.error,
  });

  final List<NearbyTask> tasks;
  final bool fromCache;
  final Object? error;
}

class NearbyTasksRepository {
  NearbyTasksRepository(this._apiClient, this._localDbService);

  final ApiClient _apiClient;
  final LocalDbService _localDbService;

  /// Envía la posición al backend para detección de áreas (geofencing server-side).
  /// Llamar periódicamente mientras el mapa está visible.
  Future<void> sendLocationUpdate(Position position) async {
    await _apiClient.sendLocationUpdate(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
    );
  }

  Future<NearbyTasksResult> fetch({
    required Position position,
    double radiusMeters = 500,
  }) async {
    Object? locationUpdateError;

    // Geofencing signal to backend. If this fails, keep going with nearby query.
    try {
      await _apiClient.sendLocationUpdate(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      );
    } catch (err) {
      locationUpdateError = err;
    }

    try {
      final rawTasks = await _apiClient.getNearbyTasks(
        lat: position.latitude,
        lng: position.longitude,
        radiusMeters: radiusMeters,
      );
      await _localDbService.cacheNearbyTasks(rawTasks);

      final tasks = rawTasks.map(NearbyTask.fromJson).toList(growable: false);
      return NearbyTasksResult(
        tasks: tasks,
        fromCache: false,
        error: locationUpdateError,
      );
    } catch (error) {
      final cached = await _localDbService.readNearbyTasks();
      final cachedTasks = cached.map(NearbyTask.fromJson).toList(growable: false);
      return NearbyTasksResult(tasks: cachedTasks, fromCache: true, error: error);
    }
  }
}
