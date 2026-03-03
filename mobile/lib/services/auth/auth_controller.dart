import 'package:flutter/foundation.dart';

import 'package:greencrowd_mobile/services/auth/auth_tokens.dart';
import 'package:greencrowd_mobile/services/auth/keycloak_auth_service.dart';

class AuthController extends ChangeNotifier {
  AuthController(this._authService);

  final KeycloakAuthService _authService;

  AuthTokens? _tokens;
  bool _isLoading = false;
  String? _errorMessage;

  bool get isAuthenticated => _tokens != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> initialize() async {
    _setLoading(true);
    _errorMessage = null;
    _tokens = await _authService.refreshIfNeeded();
    _setLoading(false);
  }

  Future<void> signIn() async {
    if (_isLoading) return;

    _setLoading(true);
    _errorMessage = null;
    try {
      _tokens = await _authService.signInInteractive();
    } catch (err) {
      _errorMessage = 'No se pudo iniciar sesión. $err';
    } finally {
      _setLoading(false);
    }
  }

  Future<void> signOut() async {
    if (_isLoading) return;

    _setLoading(true);
    _errorMessage = null;
    try {
      await _authService.signOut();
      _tokens = null;
    } catch (err) {
      _errorMessage = 'No se pudo cerrar sesión. $err';
    } finally {
      _setLoading(false);
    }
  }

  Future<void> refreshSession() async {
    _tokens = await _authService.refreshIfNeeded();
    notifyListeners();
  }

  Future<String?> getAccessToken() async {
    final refreshed = await _authService.refreshIfNeeded();
    _tokens = refreshed;
    notifyListeners();
    return refreshed?.accessToken;
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
