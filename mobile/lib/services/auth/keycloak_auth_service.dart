import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:greencrowd_mobile/core/config/app_config.dart';
import 'package:greencrowd_mobile/services/auth/auth_tokens.dart';

class KeycloakAuthService {
  KeycloakAuthService(this._config);

  final AppConfig _config;
  final FlutterAppAuth _appAuth = const FlutterAppAuth();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  static const _tokensKey = 'auth_tokens_v1';

  Future<AuthTokens?> loadStoredTokens() async {
    final raw = await _secureStorage.read(key: _tokensKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    try {
      return AuthTokens.deserialize(raw);
    } catch (_) {
      await clearTokens();
      return null;
    }
  }

  Future<void> persistTokens(AuthTokens tokens) async {
    await _secureStorage.write(key: _tokensKey, value: tokens.serialize());
  }

  Future<void> clearTokens() async {
    await _secureStorage.delete(key: _tokensKey);
  }

  Future<AuthTokens?> refreshIfNeeded() async {
    final current = await loadStoredTokens();
    if (current == null) {
      return null;
    }

    if (!current.isExpired()) {
      return current;
    }

    final refreshToken = current.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) {
      await clearTokens();
      return null;
    }

    try {
      final result = await _appAuth.token(
        TokenRequest(
          _config.keycloakClientId,
          _config.redirectUrl,
          discoveryUrl: _config.discoveryUrl,
          refreshToken: refreshToken,
          scopes: _config.scopes,
        ),
      );

      final accessToken = result?.accessToken;
      final idToken = result?.idToken ?? current.idToken;
      final expiresAt = result?.accessTokenExpirationDateTime;
      if (accessToken == null || expiresAt == null) {
        await clearTokens();
        return null;
      }

      final refreshed = AuthTokens(
        accessToken: accessToken,
        idToken: idToken,
        refreshToken: result?.refreshToken ?? refreshToken,
        accessTokenExpiresAt: expiresAt,
      );

      await persistTokens(refreshed);
      return refreshed;
    } catch (_) {
      await clearTokens();
      return null;
    }
  }

  Future<AuthTokens> signInInteractive() async {
    final result = await _appAuth.authorizeAndExchangeCode(
      AuthorizationTokenRequest(
        _config.keycloakClientId,
        _config.redirectUrl,
        discoveryUrl: _config.discoveryUrl,
        scopes: _config.scopes,
        promptValues: const ['login'],
      ),
    );

    final accessToken = result?.accessToken;
    final idToken = result?.idToken;
    final expiresAt = result?.accessTokenExpirationDateTime;
    if (accessToken == null || idToken == null || expiresAt == null) {
      throw StateError('Keycloak did not return valid tokens');
    }

    final tokens = AuthTokens(
      accessToken: accessToken,
      idToken: idToken,
      refreshToken: result?.refreshToken,
      accessTokenExpiresAt: expiresAt,
    );

    await persistTokens(tokens);
    return tokens;
  }

  Future<void> signOut() async {
    final existing = await loadStoredTokens();

    try {
      if (existing != null && existing.idToken.isNotEmpty) {
        await _appAuth.endSession(
          EndSessionRequest(
            idTokenHint: existing.idToken,
            postLogoutRedirectUrl: _config.postLogoutRedirectUrl,
            discoveryUrl: _config.discoveryUrl,
          ),
        );
      }
    } catch (_) {
      // Best effort: clear local tokens even if remote logout fails.
    } finally {
      await clearTokens();
    }
  }

  Future<String?> getValidAccessToken() async {
    final tokens = await refreshIfNeeded();
    return tokens?.accessToken;
  }
}
