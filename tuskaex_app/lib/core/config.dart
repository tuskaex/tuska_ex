class AppConfig {
  static const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://api.tuskaex.com/api/v1');
  static const wsBase = String.fromEnvironment('WS_BASE', defaultValue: 'wss://api.tuskaex.com');
  /// TradingView Charting Library page built for in-app WebViews (frontend/trader/src/app/chart).
  static const chartUrl = String.fromEnvironment('CHART_URL', defaultValue: 'https://trade.tuskaex.com/chart');
  static const brandName = 'TuskaEx';
  static const supportEmail = 'support@tuskaex.com';
  static const websiteUrl = 'https://tuskaex.com';
}
