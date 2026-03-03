import 'dart:io';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';

import 'package:greencrowd_mobile/features/contribution/data/contribution_sync_service.dart';
import 'package:greencrowd_mobile/features/contribution/domain/contribution_draft.dart';
import 'package:greencrowd_mobile/features/map/domain/nearby_task.dart';
import 'package:greencrowd_mobile/services/offline/contribution_queue_service.dart';

class ContributionPage extends StatefulWidget {
  const ContributionPage({
    required this.task,
    required this.currentPosition,
    required this.queueService,
    required this.syncService,
    super.key,
  });

  final NearbyTask task;
  final Position currentPosition;
  final ContributionQueueService queueService;
  final ContributionSyncService syncService;

  @override
  State<ContributionPage> createState() => _ContributionPageState();
}

class _ContributionPageState extends State<ContributionPage> {
  final TextEditingController _notesController = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  final List<String> _attachmentPaths = [];
  bool _saving = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto() async {
    try {
      final photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 80,
      );

      if (photo == null) {
        return;
      }

      if (!mounted) return;
      setState(() {
        _attachmentPaths.add(photo.path);
      });
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo abrir cámara: $err')),
      );
    }
  }

  Future<bool> _checkGpsAccuracy() async {
    final accuracy = widget.currentPosition.accuracy;

    // Bloquear si GPS demasiado impreciso (>150m)
    if (accuracy > 150) {
      if (!mounted) return false;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'GPS demasiado impreciso (±${accuracy.toStringAsFixed(0)}m). '
            'Espera mejor señal antes de registrar.',
          ),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return false;
    }

    // Advertir si accuracy entre 80m y 150m
    if (accuracy > 80) {
      if (!mounted) return false;
      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Precisión GPS baja'),
          content: Text(
            'La precisión actual es ±${accuracy.toStringAsFixed(0)}m. '
            'El servidor puede rechazar la muestra si supera 100m. '
            '¿Deseas continuar de todos modos?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Continuar'),
            ),
          ],
        ),
      );
      return proceed == true;
    }

    return true;
  }

  Future<void> _saveDraft() async {
    if (_saving) return;

    // Validar accuracy GPS antes de guardar
    final canProceed = await _checkGpsAccuracy();
    if (!canProceed) return;

    setState(() => _saving = true);

    try {
      final localId = const Uuid().v4();
      final draft = ContributionDraft(
        localId: localId,
        taskId: widget.task.taskId,
        latitude: widget.currentPosition.latitude,
        longitude: widget.currentPosition.longitude,
        accuracyMeters: widget.currentPosition.accuracy,
        data: {
          'notes': _notesController.text.trim(),
          'taskType': widget.task.taskType,
          'attachmentCount': _attachmentPaths.length,
          'recordedAt': DateTime.now().toUtc().toIso8601String(),
        },
        attachmentPaths: List<String>.unmodifiable(_attachmentPaths),
        createdAt: DateTime.now().toUtc(),
      );

      await widget.queueService.enqueue(draft);
      final summary = await widget.syncService.syncPending(maxItems: 5);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Muestra guardada. Sync: ${summary.synced} ok, '
            '${summary.temporaryFailures} reintento, ${summary.permanentFailures} fallos.',
          ),
        ),
      );

      Navigator.of(context).pop(true);
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo guardar la muestra: $err')),
      );
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registrar muestra')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.task.taskTitle,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text('${widget.task.poiName} • ${widget.task.campaignName}'),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Notas de observación',
                hintText: 'Describe lo que observaste en terreno',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _saving ? null : _capturePhoto,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Tomar foto'),
                ),
                const SizedBox(width: 12),
                Text('Adjuntos: ${_attachmentPaths.length}'),
              ],
            ),
            if (_attachmentPaths.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 72,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _attachmentPaths.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final path = _attachmentPaths[index];
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(
                            File(path),
                            width: 72,
                            height: 72,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          right: -6,
                          top: -6,
                          child: IconButton(
                            iconSize: 18,
                            onPressed: _saving
                                ? null
                                : () {
                                    setState(() => _attachmentPaths.removeAt(index));
                                  },
                            icon: const Icon(Icons.cancel),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],
            const SizedBox(height: 16),
            Text(
              'Posición actual: '
              '${widget.currentPosition.latitude.toStringAsFixed(6)}, '
              '${widget.currentPosition.longitude.toStringAsFixed(6)} '
              '(±${widget.currentPosition.accuracy.toStringAsFixed(1)}m)',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const Spacer(),
            FilledButton.icon(
              onPressed: _saving ? null : _saveDraft,
              icon: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(_saving ? 'Guardando...' : 'Guardar y sincronizar'),
            ),
          ],
        ),
      ),
    );
  }
}
