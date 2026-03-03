import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import 'package:greencrowd_mobile/features/contribution/data/contribution_sync_service.dart';
import 'package:greencrowd_mobile/features/contribution/presentation/contribution_page.dart';
import 'package:greencrowd_mobile/features/map/data/nearby_tasks_repository.dart';
import 'package:greencrowd_mobile/features/map/domain/nearby_task.dart';
import 'package:greencrowd_mobile/services/auth/auth_controller.dart';
import 'package:greencrowd_mobile/services/location/location_service.dart';
import 'package:greencrowd_mobile/services/offline/contribution_queue_service.dart';

class MapPage extends StatefulWidget {
  const MapPage({
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
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  Position? _position;
  List<NearbyTask> _tasks = const [];
  bool _loading = true;
  bool _fromCache = false;
  String? _error;
  int _pendingQueueCount = 0;
  Timer? _locationTimer;

  @override
  void initState() {
    super.initState();
    _refresh();
    // Enviar location update cada 60s para geofencing server-side de áreas.
    _locationTimer = Timer.periodic(
      const Duration(seconds: 60),
      (_) => _sendPeriodicLocationUpdate(),
    );
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }

  Future<void> _sendPeriodicLocationUpdate() async {
    final position = _position;
    if (position == null) return;
    try {
      await widget.nearbyTasksRepository.sendLocationUpdate(position);
    } catch (_) {
      // Silenciar errores del timer — no bloquear UX
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final syncSummary = await widget.contributionSyncService.syncPending(maxItems: 20);
      await widget.contributionQueueService.removeSynced();
      final position = await widget.locationService.getCurrentPosition();
      final result = await widget.nearbyTasksRepository.fetch(position: position);
      final pendingQueueCount = await widget.contributionQueueService.countPending();

      if (!mounted) return;
      setState(() {
        _position = position;
        _tasks = result.tasks;
        _fromCache = result.fromCache;
        _error =
            (result.fromCache || result.tasks.isEmpty) ? result.error?.toString() : null;
        _pendingQueueCount = pendingQueueCount;
        _loading = false;
      });

      if (syncSummary.processed > 0 && mounted) {
        final msg =
            'Sync cola: ${syncSummary.synced} ok, ${syncSummary.temporaryFailures} reintentos, ${syncSummary.permanentFailures} permanentes.';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    } on LocationServiceDisabledException {
      setState(() {
        _loading = false;
        _error = 'Debes activar el GPS para ver tareas cercanas.';
      });
    } on LocationPermissionDeniedException {
      setState(() {
        _loading = false;
        _error = 'Permiso de ubicación denegado.';
      });
    } on LocationPermissionDeniedForeverException {
      setState(() {
        _loading = false;
        _error = 'Permiso de ubicación bloqueado permanentemente. Habilítalo desde ajustes.';
      });
    } catch (err) {
      setState(() {
        _loading = false;
        _error = err.toString();
      });
    }
  }

  Future<void> _openContribution(NearbyTask task) async {
    final position = _position;
    if (position == null) {
      return;
    }

    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ContributionPage(
          task: task,
          currentPosition: position,
          queueService: widget.contributionQueueService,
          syncService: widget.contributionSyncService,
        ),
      ),
    );

    if (changed == true && mounted) {
      await _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _position;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mapa de tareas'),
        actions: [
          _PendingQueueBadge(count: _pendingQueueCount),
          IconButton(
            tooltip: 'Sincronizar cola',
            onPressed: _loading ? null : _refresh,
            icon: const Icon(Icons.sync),
          ),
          IconButton(
            tooltip: 'Cerrar sesión',
            onPressed: widget.authController.isLoading
                ? null
                : () async {
                    await widget.authController.signOut();
                  },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: current == null
          ? _EmptyState(
              loading: _loading,
              error: _error,
              onRetry: _refresh,
            )
          : Column(
              children: [
                if (_fromCache)
                  const MaterialBanner(
                    content: Text(
                      'Mostrando cache local. No se pudo actualizar desde servidor.',
                    ),
                    actions: [SizedBox.shrink()],
                  ),
                Expanded(
                  child: FlutterMap(
                    options: MapOptions(
                      initialCenter: LatLng(current.latitude, current.longitude),
                      initialZoom: 15,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.greencrowd.app',
                      ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: LatLng(current.latitude, current.longitude),
                            width: 40,
                            height: 40,
                            child: const Icon(
                              Icons.my_location,
                              size: 30,
                              color: Colors.blue,
                            ),
                          ),
                          ..._tasks.map(
                            (task) => Marker(
                              point: LatLng(task.poiLatitude, task.poiLongitude),
                              width: 40,
                              height: 40,
                              child: GestureDetector(
                                onTap: () => _openContribution(task),
                                child: Tooltip(
                                  message: task.taskTitle,
                                  child: const Icon(
                                    Icons.location_on,
                                    size: 34,
                                    color: Colors.red,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  height: 240,
                  child: _TaskList(
                    tasks: _tasks,
                    error: _error,
                    onTaskTap: _openContribution,
                  ),
                ),
              ],
            ),
    );
  }
}

class _PendingQueueBadge extends StatelessWidget {
  const _PendingQueueBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final label = count > 99 ? '99+' : '$count';

    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Icon(Icons.cloud_upload_outlined),
          if (count > 0)
            Positioned(
              right: 0,
              top: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.error,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _TaskList extends StatelessWidget {
  const _TaskList({
    required this.tasks,
    required this.onTaskTap,
    this.error,
  });

  final List<NearbyTask> tasks;
  final String? error;
  final ValueChanged<NearbyTask> onTaskTap;

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            error == null
                ? 'No hay tareas cercanas en este momento.'
                : 'No se encontraron tareas. Error: $error',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return ListView.separated(
      itemCount: tasks.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final task = tasks[index];
        return ListTile(
          onTap: () => onTaskTap(task),
          title: Text(task.taskTitle),
          subtitle: Text('${task.poiName} • ${task.campaignName}'),
          trailing: Text('${task.distanceMeters.toStringAsFixed(0)} m'),
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  final bool loading;
  final String? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              error ?? 'No se pudo obtener ubicación.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: onRetry,
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}
