import 'package:greencrowd_mobile/features/contribution/domain/contribution_draft.dart';
import 'package:greencrowd_mobile/services/api/api_client.dart';
import 'package:greencrowd_mobile/services/offline/contribution_queue_service.dart';

class ContributionSyncSummary {
  const ContributionSyncSummary({
    required this.processed,
    required this.synced,
    required this.temporaryFailures,
    required this.permanentFailures,
  });

  final int processed;
  final int synced;
  final int temporaryFailures;
  final int permanentFailures;
}

class ContributionSyncService {
  ContributionSyncService(this._apiClient, this._queueService);

  final ApiClient _apiClient;
  final ContributionQueueService _queueService;

  Future<ContributionSyncSummary> syncPending({int maxItems = 20}) async {
    final pendingDrafts = await _queueService.listPending(limit: maxItems);

    var synced = 0;
    var temporaryFailures = 0;
    var permanentFailures = 0;

    for (var draft in pendingDrafts) {
      try {
        // 1. Subir attachments a MinIO si aún no se han subido.
        //    Si attachmentKeys ya está poblado, el upload fue exitoso en un intento previo.
        if (draft.attachmentPaths.isNotEmpty && draft.attachmentKeys.isEmpty) {
          final keys = <String>[];
          for (final filePath in draft.attachmentPaths) {
            final key = await _apiClient.uploadFile(filePath);
            keys.add(key);
          }
          // Persistir keys en el draft para que retries no re-suban los archivos.
          await _queueService.updateAttachmentKeys(
            localId: draft.localId,
            keys: keys,
          );
          draft = draft.copyWith(attachmentKeys: keys);
        }

        // 2. Enviar la contribución al backend con los MinIO keys.
        final response = await _apiClient.submitContribution(
          payload: draft.toContributionRequest(),
        );
        final serverId = response['id'] as String? ?? draft.localId;
        await _queueService.markSynced(
          localId: draft.localId,
          serverContributionId: serverId,
        );
        synced += 1;
      } catch (err) {
        final permanent = _isPermanentFailure(err);
        await _queueService.markFailed(
          localId: draft.localId,
          reason: err.toString(),
          permanent: permanent,
        );
        if (permanent) {
          permanentFailures += 1;
        } else {
          temporaryFailures += 1;
        }
      }
    }

    return ContributionSyncSummary(
      processed: pendingDrafts.length,
      synced: synced,
      temporaryFailures: temporaryFailures,
      permanentFailures: permanentFailures,
    );
  }

  bool _isPermanentFailure(Object err) {
    if (err is! ApiException) {
      return false;
    }
    final statusCode = err.statusCode;
    if (statusCode == null) {
      return false;
    }
    // 4xx permanentes: no tiene sentido reintentar
    return statusCode == 400 ||
        statusCode == 404 ||
        statusCode == 409 ||
        statusCode == 422;
  }
}
