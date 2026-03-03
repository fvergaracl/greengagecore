# GreenCrowd Mobile (Sprint 2)

Bootstrap inicial de la app Flutter para:

- autenticación con Keycloak PKCE (`flutter_appauth`)
- mapa de tareas cercanas (`flutter_map`)
- ubicación foreground (`geolocator`)
- base offline local (`isar` + cache JSON local de tasks)

## 1) Pre-requisitos

- Flutter SDK instalado (recomendado >= 3.22)
- Android Studio/Xcode según plataforma

Verificación:

```bash
flutter --version
flutter doctor
```

## 2) Inicializar plataforma (si faltan carpetas android/ios)

Desde la carpeta `mobile/`:

```bash
flutter create \
  --platforms=android,ios \
  --org com.greencrowd \
  --project-name greencrowd_mobile \
  .
```

## 3) Instalar dependencias

```bash
cd mobile
flutter pub get
```

## 4) Ejecutar con configuración local

Para Android emulator (acceso host por `10.0.2.2`):

```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000 \
  --dart-define=KEYCLOAK_ISSUER=http://10.0.2.2:8080/realms/greencrowd \
  --dart-define=KEYCLOAK_CLIENT_ID=greencrowd-mobile \
  --dart-define=KEYCLOAK_REDIRECT_URL=com.greencrowd.app://callback \
  --dart-define=KEYCLOAK_POST_LOGOUT_REDIRECT_URL=com.greencrowd.app://callback
```

Para dispositivo físico usar la IP LAN del host en `API_BASE_URL` y `KEYCLOAK_ISSUER`.

## 5) Permisos de plataforma

Después de `flutter create`, revisa:

- Android `android/app/src/main/AndroidManifest.xml`
  - `ACCESS_FINE_LOCATION`
  - `ACCESS_COARSE_LOCATION`
  - `CAMERA`
- iOS `ios/Runner/Info.plist`
  - `NSLocationWhenInUseUsageDescription`
  - `NSCameraUsageDescription`

## 6) Flujo implementado en Sprint 2 (arranque)

1. Pantalla `SignInPage` inicia login OIDC PKCE con Keycloak.
2. Tokens se guardan en `flutter_secure_storage`.
3. `MapPage` solicita ubicación foreground.
4. Se envía `POST /api/location/update` para geofencing server-side.
5. Se consulta `GET /api/tasks/nearby?lat=...&lng=...&radius=...`.
6. El mapa muestra ubicación actual + tasks POI cercanas.
7. Al tocar una task se crea una muestra en cola offline (con notas y foto local opcional).
8. Se intenta sincronizar contra `POST /api/contributions`.
9. Si falla red, queda en cola pendiente y reintenta en el próximo refresh.

## 7) Pendientes Sprint 2 (siguientes pasos)

- cache offline con colecciones Isar tipadas (con `build_runner`)
- upload diferido de evidencia al backend/MinIO (hoy solo se guarda ruta local)
- limpieza/rotación de cola (TTL y purge de synced)
- push notifications (FCM/APNs)
