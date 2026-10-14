import 'package:flutter/material.dart';

import '../widgets/fx.dart';

class AppColors {
  static const bg = Color(0xFF05070F);
  static const surface = Color(0xB30C1430); // translucent: glass over the live backdrop
  static const surface2 = Color(0x99172246);
  static const border = Color(0x24FFFFFF);
  static const text = Color(0xFFF1F5F9);
  static const textDim = Color(0xFF94A3B8);
  static const textMute = Color(0xFF64748B);
  // Not const: a white-label broker's colour replaces these at runtime
  // (BrandState.applyColor). Everything else stays the platform palette.
  static const platformBrand = Color(0xFF2563EB);
  static Color brand = platformBrand;
  static Color brandLight = const Color(0xFF60A5FA);
  static const violet = Color(0xFF6366F1);
  static const sheet = Color(0xF20B1226);
  static const cyan = Color(0xFF22D3EE);
  static const buy = Color(0xFF1E66F5);
  static const sell = Color(0xFFDC2626);
  static const profit = Color(0xFF22C55E);
  static const loss = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);

  static Color pnl(double v) => v > 0 ? profit : (v < 0 ? loss : textDim);
}

ThemeData buildTheme() {
  final base = ThemeData(useMaterial3: true, brightness: Brightness.dark);
  return base.copyWith(
    scaffoldBackgroundColor: Colors.transparent,
    pageTransitionsTheme: const PageTransitionsTheme(builders: {
      TargetPlatform.android: GlassPageTransitions(),
      TargetPlatform.iOS: GlassPageTransitions(),
    }),
    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.sheet,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: const BorderSide(color: AppColors.border)),
    ),
    popupMenuTheme: PopupMenuThemeData(color: AppColors.sheet, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
    colorScheme: ColorScheme.dark(
      primary: AppColors.brand,
      secondary: AppColors.cyan,
      surface: AppColors.surface,
      error: AppColors.loss,
      onPrimary: Colors.white,
      onSurface: AppColors.text,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.text),
    ),
    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
    ),
    dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1, space: 1),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface2,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      hintStyle: const TextStyle(color: AppColors.textMute),
      labelStyle: const TextStyle(color: AppColors.textDim),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.brand, width: 1.5)),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.loss)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.text,
        minimumSize: const Size.fromHeight(50),
        side: const BorderSide(color: AppColors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: AppColors.brandLight)),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.surface,
      indicatorColor: AppColors.brand.withValues(alpha: 0.18),
      height: 64,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: s.contains(WidgetState.selected) ? AppColors.brandLight : AppColors.textMute,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(color: s.contains(WidgetState.selected) ? AppColors.brandLight : AppColors.textMute),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: AppColors.text,
      unselectedLabelColor: AppColors.textMute,
      indicatorColor: AppColors.brand,
      dividerColor: AppColors.border,
      labelStyle: TextStyle(fontWeight: FontWeight.w600),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.brand : Colors.transparent),
        foregroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? Colors.white : AppColors.textDim),
        side: const WidgetStatePropertyAll(BorderSide(color: AppColors.border)),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AppColors.surface2,
      contentTextStyle: TextStyle(color: AppColors.text),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.sheet,
      showDragHandle: true,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    ),
  );
}
