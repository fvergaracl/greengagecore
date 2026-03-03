enum ContributionSyncStatus {
  pending,
  synced,
  permanentFailure,
}

class ContributionDraft {
  const ContributionDraft({
    required this.localId,
    required this.taskId,
    required this.latitude,
    required this.longitude,
    required this.data,
    required this.createdAt,
    this.accuracyMeters,
    this.attachmentPaths = const [],
    this.attachmentKeys = const [],
    this.attempts = 0,
    this.lastError,
    this.serverContributionId,
    this.status = ContributionSyncStatus.pending,
  });

  final String localId;
  final String taskId;
  final double latitude;
  final double longitude;
  final double? accuracyMeters;
  final Map<String, dynamic> data;
  /// Rutas locales de archivos (antes del upload a MinIO).
  final List<String> attachmentPaths;
  /// MinIO keys obtenidos tras upload exitoso. Si no vacío, los paths ya fueron subidos.
  final List<String> attachmentKeys;
  final DateTime createdAt;
  final int attempts;
  final String? lastError;
  final String? serverContributionId;
  final ContributionSyncStatus status;

  bool get isPending => status == ContributionSyncStatus.pending;

  /// Indica si los attachments locales ya fueron subidos a MinIO.
  bool get attachmentsUploaded =>
      attachmentPaths.isEmpty || attachmentKeys.isNotEmpty;

  ContributionDraft copyWith({
    String? localId,
    String? taskId,
    double? latitude,
    double? longitude,
    double? accuracyMeters,
    Map<String, dynamic>? data,
    List<String>? attachmentPaths,
    List<String>? attachmentKeys,
    DateTime? createdAt,
    int? attempts,
    String? lastError,
    String? serverContributionId,
    ContributionSyncStatus? status,
    bool clearLastError = false,
    bool clearServerContributionId = false,
  }) {
    return ContributionDraft(
      localId: localId ?? this.localId,
      taskId: taskId ?? this.taskId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracyMeters: accuracyMeters ?? this.accuracyMeters,
      data: data ?? this.data,
      attachmentPaths: attachmentPaths ?? this.attachmentPaths,
      attachmentKeys: attachmentKeys ?? this.attachmentKeys,
      createdAt: createdAt ?? this.createdAt,
      attempts: attempts ?? this.attempts,
      lastError: clearLastError ? null : (lastError ?? this.lastError),
      serverContributionId: clearServerContributionId
          ? null
          : (serverContributionId ?? this.serverContributionId),
      status: status ?? this.status,
    );
  }

  Map<String, dynamic> toContributionRequest() {
    return {
      'taskId': taskId,
      'data': data,
      'latitude': latitude,
      'longitude': longitude,
      if (accuracyMeters != null) 'accuracyMeters': accuracyMeters,
      'localId': localId,
      if (attachmentKeys.isNotEmpty) 'attachmentKeys': attachmentKeys,
      'deviceInfo': {
        'platform': 'flutter',
        'source': 'mobile_sprint2',
      },
    };
  }

  Map<String, dynamic> toJson() {
    return {
      'localId': localId,
      'taskId': taskId,
      'latitude': latitude,
      'longitude': longitude,
      'accuracyMeters': accuracyMeters,
      'data': data,
      'attachmentPaths': attachmentPaths,
      'attachmentKeys': attachmentKeys,
      'createdAt': createdAt.toUtc().toIso8601String(),
      'attempts': attempts,
      'lastError': lastError,
      'serverContributionId': serverContributionId,
      'status': status.name,
    };
  }

  factory ContributionDraft.fromJson(Map<String, dynamic> json) {
    return ContributionDraft(
      localId: json['localId'] as String,
      taskId: json['taskId'] as String,
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
      accuracyMeters: json['accuracyMeters'] == null
          ? null
          : _toDouble(json['accuracyMeters']),
      data: Map<String, dynamic>.from(json['data'] as Map),
      attachmentPaths: ((json['attachmentPaths'] as List?) ?? const [])
          .whereType<String>()
          .toList(growable: false),
      attachmentKeys: ((json['attachmentKeys'] as List?) ?? const [])
          .whereType<String>()
          .toList(growable: false),
      createdAt: DateTime.parse(json['createdAt'] as String),
      attempts: (json['attempts'] as num?)?.toInt() ?? 0,
      lastError: json['lastError'] as String?,
      serverContributionId: json['serverContributionId'] as String?,
      status: _parseStatus(json['status'] as String?),
    );
  }
}

ContributionSyncStatus _parseStatus(String? raw) {
  return ContributionSyncStatus.values.firstWhere(
    (status) => status.name == raw,
    orElse: () => ContributionSyncStatus.pending,
  );
}

double _toDouble(dynamic value) {
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is String) return double.parse(value);
  throw FormatException('Cannot parse "$value" as double');
}
