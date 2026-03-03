class NearbyTask {
  const NearbyTask({
    required this.taskId,
    required this.taskTitle,
    required this.taskType,
    required this.poiId,
    required this.poiName,
    required this.poiLatitude,
    required this.poiLongitude,
    required this.distanceMeters,
    required this.campaignId,
    required this.campaignName,
  });

  final String taskId;
  final String taskTitle;
  final String taskType;
  final String poiId;
  final String poiName;
  final double poiLatitude;
  final double poiLongitude;
  final double distanceMeters;
  final String campaignId;
  final String campaignName;

  factory NearbyTask.fromJson(Map<String, dynamic> json) {
    return NearbyTask(
      taskId: json['taskId'] as String,
      taskTitle: json['taskTitle'] as String,
      taskType: json['taskType'] as String,
      poiId: json['poiId'] as String,
      poiName: json['poiName'] as String,
      poiLatitude: _toDouble(json['poiLatitude']),
      poiLongitude: _toDouble(json['poiLongitude']),
      distanceMeters: _toDouble(json['distanceMeters']),
      campaignId: json['campaignId'] as String,
      campaignName: json['campaignName'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'taskId': taskId,
      'taskTitle': taskTitle,
      'taskType': taskType,
      'poiId': poiId,
      'poiName': poiName,
      'poiLatitude': poiLatitude,
      'poiLongitude': poiLongitude,
      'distanceMeters': distanceMeters,
      'campaignId': campaignId,
      'campaignName': campaignName,
    };
  }
}

double _toDouble(dynamic value) {
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is String) return double.parse(value);
  throw FormatException('Cannot parse "$value" as double');
}
