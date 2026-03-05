class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.keycloakIssuer,
    required this.keycloakClientId,
    required this.redirectUrl,
    required this.postLogoutRedirectUrl,
    required this.scopes,
  });

  factory AppConfig.fromEnvironment() {
    final apiBaseUrl = const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000',
    );
    final keycloakIssuer = const String.fromEnvironment(
      'KEYCLOAK_ISSUER',
      defaultValue: 'http://10.0.2.2:8080/realms/greencrowd',
    );

    return AppConfig(
      apiBaseUrl: _trimRightSlash(apiBaseUrl),
      keycloakIssuer: _trimRightSlash(keycloakIssuer),
      keycloakClientId: const String.fromEnvironment(
        'KEYCLOAK_CLIENT_ID',
        defaultValue: 'greencrowd-mobile',
      ),
      redirectUrl: const String.fromEnvironment(
        'KEYCLOAK_REDIRECT_URL',
        defaultValue: 'com.greencrowd.app://callback',
      ),
      postLogoutRedirectUrl: const String.fromEnvironment(
        'KEYCLOAK_POST_LOGOUT_REDIRECT_URL',
        defaultValue: 'com.greencrowd.app://callback',
      ),
      scopes: const ['openid', 'profile', 'email', 'offline_access'],
    );
  }

  final String apiBaseUrl;
  final String keycloakIssuer;
  final String keycloakClientId;
  final String redirectUrl;
  final String postLogoutRedirectUrl;
  final List<String> scopes;

  String get discoveryUrl => '$keycloakIssuer/.well-known/openid-configuration';
}

String _trimRightSlash(String value) {
  if (value.endsWith('/')) {
    return value.substring(0, value.length - 1);
  }
  return value;
}
