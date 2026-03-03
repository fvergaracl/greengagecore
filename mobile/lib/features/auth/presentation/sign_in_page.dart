import 'package:flutter/material.dart';

import 'package:greencrowd_mobile/services/auth/auth_controller.dart';

class SignInPage extends StatelessWidget {
  const SignInPage({required this.authController, super.key});

  final AuthController authController;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'GreenCrowd',
                    style: TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Recolecta muestras geolocalizadas y participa en campañas de ciencia ciudadana.',
                    style: TextStyle(fontSize: 16),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),
                  FilledButton.icon(
                    onPressed: authController.isLoading
                        ? null
                        : () async {
                            await authController.signIn();
                          },
                    icon: authController.isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.login),
                    label: Text(
                      authController.isLoading
                          ? 'Iniciando sesión...'
                          : 'Iniciar sesión con Keycloak',
                    ),
                  ),
                  if (authController.errorMessage != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      authController.errorMessage!,
                      style: const TextStyle(color: Colors.red),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
