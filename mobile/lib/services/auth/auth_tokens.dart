import 'dart:convert';

class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.idToken,
    required this.accessTokenExpiresAt,
    this.refreshToken,
  });

  final String accessToken;
  final String idToken;
  final String? refreshToken;
  final DateTime accessTokenExpiresAt;

  bool isExpired({Duration leeway = const Duration(seconds: 60)}) {
    final threshold = DateTime.now().toUtc().add(leeway);
    return accessTokenExpiresAt.toUtc().isBefore(threshold);
  }

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'idToken': idToken,
      'refreshToken': refreshToken,
      'accessTokenExpiresAt': accessTokenExpiresAt.toUtc().toIso8601String(),
    };
  }

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    return AuthTokens(
      accessToken: json['accessToken'] as String,
      idToken: json['idToken'] as String,
      refreshToken: json['refreshToken'] as String?,
      accessTokenExpiresAt: DateTime.parse(
        json['accessTokenExpiresAt'] as String,
      ),
    );
  }

  String serialize() => jsonEncode(toJson());

  static AuthTokens deserialize(String value) {
    final decoded = jsonDecode(value) as Map<String, dynamic>;
    return AuthTokens.fromJson(decoded);
  }
}
