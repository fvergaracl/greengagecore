import 'package:flutter/material.dart';

class AppTheme {
  static final lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A8A4A)),
    scaffoldBackgroundColor: const Color(0xFFF3F6F5),
    appBarTheme: const AppBarTheme(centerTitle: false),
  );
}
