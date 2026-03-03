import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path/path.dart' as path_lib;

import 'package:greencrowd_mobile/core/config/app_config.dart';
import 'package:greencrowd_mobile/services/auth/keycloak_auth_service.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'ApiException(statusCode: $statusCode, message: $message)';
}

class ApiClient {
  ApiClient(this._config, this._authService)
      : _dio = Dio(
          BaseOptions(
            baseUrl: _config.apiBaseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 15),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _authService.getValidAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  final AppConfig _config;
  final KeycloakAuthService _authService;
  final Dio _dio;

  Future<List<Map<String, dynamic>>> getNearbyTasks({
    required double lat,
    required double lng,
    double radiusMeters = 500,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/tasks/nearby',
        queryParameters: {
          'lat': lat,
          'lng': lng,
          'radius': radiusMeters,
        },
      );

      final payload = response.data;
      if (payload == null) {
        return const [];
      }

      final raw = payload['tasks'];
      if (raw is! List) {
        throw ApiException('Invalid tasks payload');
      }

      return raw
          .whereType<Map>()
          .map((task) => task.map((key, value) => MapEntry('$key', value)))
          .toList(growable: false);
    } on DioException catch (err) {
      throw _mapDioException(err);
    }
  }

  Future<void> sendLocationUpdate({
    required double latitude,
    required double longitude,
    double? accuracy,
  }) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/location/update',
        data: {
          'latitude': latitude,
          'longitude': longitude,
          if (accuracy != null) 'accuracy': accuracy,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        },
      );
    } on DioException catch (err) {
      throw _mapDioException(err);
    }
  }

  Future<Map<String, dynamic>> submitContribution({
    required Map<String, dynamic> payload,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/contributions',
        data: payload,
      );
      return response.data ?? const {};
    } on DioException catch (err) {
      throw _mapDioException(err);
    }
  }

  /// Sube un archivo de imagen a MinIO a través del backend.
  /// Devuelve la MinIO key (e.g. "uploads/<userId>/<uuid>.jpg").
  Future<String> uploadFile(String filePath) async {
    final file = File(filePath);
    final filename = path_lib.basename(filePath);

    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: filename),
      });

      final response = await _dio.post<Map<String, dynamic>>(
        '/api/uploads',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
          // Timeout más largo para subidas de foto
          receiveTimeout: const Duration(seconds: 60),
          sendTimeout: const Duration(seconds: 60),
        ),
      );

      final key = response.data?['key'];
      if (key is! String || key.isEmpty) {
        throw ApiException('Respuesta de upload inválida');
      }
      return key;
    } on DioException catch (err) {
      throw _mapDioException(err);
    }
  }

  ApiException _mapDioException(DioException err) {
    final statusCode = err.response?.statusCode;
    String? message;

    final responseData = err.response?.data;
    if (responseData is Map<String, dynamic>) {
      final rawError = responseData['error'];
      if (rawError is String && rawError.isNotEmpty) {
        message = rawError;
      }
    }

    return ApiException(
      message ?? err.message ?? 'Network error',
      statusCode: statusCode,
    );
  }
}
