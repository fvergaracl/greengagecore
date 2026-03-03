import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';

import 'package:greencrowd_mobile/features/contribution/domain/contribution_draft.dart';

class ContributionQueueService {
  File? _queueFile;

  Future<void> init() async {
    if (_queueFile != null) return;
    final appDir = await getApplicationSupportDirectory();
    _queueFile = File(path.join(appDir.path, 'contribution_queue.json'));
  }

  Future<List<ContributionDraft>> listAll() async {
    final entries = await _readAllEntries();
    entries.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return entries;
  }

  Future<List<ContributionDraft>> listPending({int? limit}) async {
    final all = await listAll();
    final pending = all.where((draft) => draft.isPending).toList(growable: false);
    if (limit == null || pending.length <= limit) {
      return pending;
    }
    return pending.take(limit).toList(growable: false);
  }

  Future<int> countPending() async {
    final pending = await listPending();
    return pending.length;
  }

  Future<void> enqueue(ContributionDraft draft) async {
    final all = await _readAllEntries();
    final alreadyExists = all.any((entry) => entry.localId == draft.localId);
    if (alreadyExists) {
      return;
    }
    all.add(draft);
    await _writeAllEntries(all);
  }

  Future<void> markSynced({
    required String localId,
    required String serverContributionId,
  }) async {
    final all = await _readAllEntries();
    final updated = all.map((entry) {
      if (entry.localId != localId) return entry;
      return entry.copyWith(
        status: ContributionSyncStatus.synced,
        serverContributionId: serverContributionId,
        clearLastError: true,
      );
    }).toList(growable: false);
    await _writeAllEntries(updated);
  }

  Future<void> markFailed({
    required String localId,
    required String reason,
    bool permanent = false,
  }) async {
    final all = await _readAllEntries();
    final updated = all.map((entry) {
      if (entry.localId != localId) return entry;
      final attempts = entry.attempts + 1;
      final maxAttemptsReached = attempts >= 10;
      final status = (permanent || maxAttemptsReached)
          ? ContributionSyncStatus.permanentFailure
          : ContributionSyncStatus.pending;
      return entry.copyWith(
        attempts: attempts,
        lastError: reason,
        status: status,
      );
    }).toList(growable: false);
    await _writeAllEntries(updated);
  }

  /// Persiste las MinIO keys de un draft para que retries no re-suban los archivos.
  Future<void> updateAttachmentKeys({
    required String localId,
    required List<String> keys,
  }) async {
    final all = await _readAllEntries();
    final updated = all.map((entry) {
      if (entry.localId != localId) return entry;
      return entry.copyWith(attachmentKeys: keys);
    }).toList(growable: false);
    await _writeAllEntries(updated);
  }

  Future<void> removeSynced() async {
    final all = await _readAllEntries();
    final filtered = all
        .where((entry) => entry.status != ContributionSyncStatus.synced)
        .toList(growable: false);
    await _writeAllEntries(filtered);
  }

  Future<List<ContributionDraft>> _readAllEntries() async {
    final file = _queueFile;
    if (file == null) {
      throw StateError('ContributionQueueService.init() must be called first');
    }
    if (!(await file.exists())) {
      return [];
    }
    try {
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) {
        return [];
      }
      final decoded = jsonDecode(raw);
      if (decoded is! List) {
        return [];
      }
      return decoded
          .whereType<Map>()
          .map((item) => item.map((key, value) => MapEntry('$key', value)))
          .map(ContributionDraft.fromJson)
          .toList(growable: false);
    } catch (_) {
      return [];
    }
  }

  Future<void> _writeAllEntries(List<ContributionDraft> entries) async {
    final file = _queueFile;
    if (file == null) {
      throw StateError('ContributionQueueService.init() must be called first');
    }
    final payload = entries.map((entry) => entry.toJson()).toList(growable: false);
    await file.writeAsString(jsonEncode(payload), flush: true);
  }
}
