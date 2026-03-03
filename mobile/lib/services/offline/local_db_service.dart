import 'dart:convert';
import 'dart:io';

import 'package:isar/isar.dart';
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';

class LocalDbService {
  Isar? _isar;
  File? _nearbyTasksCacheFile;

  Future<void> init() async {
    if (_isar != null) {
      return;
    }

    final appDir = await getApplicationSupportDirectory();
    try {
      _isar = await Isar.open(
        const [],
        name: 'greencrowd_local',
        directory: appDir.path,
      );
    } catch (_) {
      // Sprint 2 bootstrap: Isar collections tipadas se agregan en la siguiente iteración.
      _isar = null;
    }
    _nearbyTasksCacheFile = File(path.join(appDir.path, 'nearby_tasks_cache.json'));
  }

  Future<void> cacheNearbyTasks(List<Map<String, dynamic>> tasks) async {
    final file = _nearbyTasksCacheFile;
    if (file == null) {
      return;
    }

    final payload = {
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
      'tasks': tasks,
    };
    await file.writeAsString(jsonEncode(payload), flush: true);
  }

  Future<List<Map<String, dynamic>>> readNearbyTasks() async {
    final file = _nearbyTasksCacheFile;
    if (file == null || !(await file.exists())) {
      return const [];
    }

    try {
      final raw = await file.readAsString();
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final tasks = decoded['tasks'];
      if (tasks is! List) {
        return const [];
      }

      return tasks
          .whereType<Map>()
          .map((task) => task.map((key, value) => MapEntry('$key', value)))
          .toList(growable: false);
    } catch (_) {
      return const [];
    }
  }

  Future<void> close() async {
    await _isar?.close();
    _isar = null;
    _nearbyTasksCacheFile = null;
  }
}
