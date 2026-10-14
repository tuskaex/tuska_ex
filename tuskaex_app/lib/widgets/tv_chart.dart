import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/theme.dart';

/// The real TradingView Charting Library (the same chart as the web terminal),
/// hosted at [AppConfig.chartUrl] and embedded in a WebView. The page reads
/// token / account / symbol / interval from the query string and accepts a
/// `{type:'setSymbol'}` postMessage to switch symbol without reloading.
class TvChart extends StatefulWidget {
  final String symbol;
  final String interval; // 1|5|15|30|60|240|1D
  final String? accountId;
  final String? token;
  final VoidCallback? onFailed;
  const TvChart({super.key, required this.symbol, required this.interval, this.accountId, this.token, this.onFailed});

  @override
  State<TvChart> createState() => _TvChartState();
}

/// The Charting Library renders inside a same-origin iframe, and Android never
/// routes sub-frame navigations through onNavigationRequest — so tapping the
/// TradingView logo/links loaded tradingview.com (with its sign-up popup)
/// inside the chart. This patches every iframe (now and future) to swallow
/// off-origin link clicks and window.open.
const _lockLinksJs = r'''
(function(){
  function lock(w){
    try{
      if(!w || w.__txLocked) return; w.__txLocked = true;
      w.open = function(){ return null; };
      w.document.addEventListener('click', function(e){
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        if(a && a.href && a.href.indexOf(location.origin) !== 0){ e.preventDefault(); e.stopPropagation(); }
      }, true);
    }catch(e){}
  }
  function scan(){
    lock(window);
    var f = document.querySelectorAll('iframe');
    for(var i=0;i<f.length;i++){ try{ lock(f[i].contentWindow); }catch(e){} }
  }
  scan();
  if(!window.__txScan){ window.__txScan = setInterval(scan, 1000); }
})();
''';

class _TvChartState extends State<TvChart> {
  late final WebViewController _c;
  bool _loading = true;
  bool _error = false;
  late String _loadedSymbol = widget.symbol;

  Uri _url() => Uri.parse(AppConfig.chartUrl).replace(queryParameters: {
        'symbol': widget.symbol,
        'interval': widget.interval,
        'theme': 'dark',
        if (widget.accountId != null) 'account': widget.accountId!,
        // The WebView has no session cookie; the chart page authenticates
        // its position/SL-TP calls with this bearer token.
        if ((widget.token ?? '').isNotEmpty) 'token': widget.token!,
      });

  static bool _hintSet = false;
  Completer<void>? _pageDone;

  /// The web app treats a visitor as signed in only when (a) localStorage has
  /// its `tx_session` hint and (b) /auth/me succeeds with the `tx_access`
  /// cookie; otherwise it bounces to /auth/login. Seed both for the WebView.
  ///
  /// Only the ACCESS token is shared. The refresh token rotates on use — if the
  /// web page refreshed with it, the app's stored copy would be revoked and the
  /// app itself would be signed out. So the app refreshes first instead.
  Future<void> _seedSession() async {
    await Api.I.ensureFresh();
    final origin = Uri.parse(AppConfig.chartUrl);
    final access = Api.I.session.access ?? '';
    if (access.isNotEmpty) {
      await WebViewCookieManager().setCookie(WebViewCookie(name: 'tx_access', value: access, domain: origin.host, path: '/'));
    }
    // WebView localStorage survives app restarts, so the hint only ever needs
    // writing once per install — skip the extra page load after that.
    final prefs = await SharedPreferences.getInstance();
    _hintSet = _hintSet || (prefs.getBool('tv_hint_set_v1') ?? false);
    if (!_hintSet) {
      // localStorage is per-origin, so it can only be written from a page on
      // that origin: load a tiny static file there first, then set the hint.
      _pageDone = Completer<void>();
      await _c.loadRequest(origin.replace(path: '/robots.txt', queryParameters: {}));
      await _pageDone!.future.timeout(const Duration(seconds: 10), onTimeout: () {});
      await _c.runJavaScript("try{localStorage.setItem('tx_session','1')}catch(e){}");
      _hintSet = true;
      await prefs.setBool('tv_hint_set_v1', true);
    }
  }

  Future<void> _load() async {
    try {
      await _seedSession();
    } catch (_) {}
    if (mounted) await _c.loadRequest(_url());
  }

  @override
  void initState() {
    super.initState();
    _c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0B0E11))
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) {
          if (mounted) setState(() => _loading = true);
        },
        onPageFinished: (url) {
          if (Uri.parse(url).path == '/robots.txt') {
            if (_pageDone?.isCompleted == false) _pageDone!.complete();
            return;
          }
          _c.runJavaScript(_lockLinksJs);
          if (mounted) setState(() => _loading = false);
        },
        onWebResourceError: (e) {
          // Only a failed main document means the chart can't show.
          if (e.isForMainFrame == true && mounted) {
            setState(() {
              _error = true;
              _loading = false;
            });
            widget.onFailed?.call();
          }
        },
        // Only the chart page itself may load. A redirect to the site's login
        // (or anywhere else) means the session didn't take: show the error
        // state instead of a web login form inside the app.
        onNavigationRequest: (r) {
          final u = Uri.parse(r.url);
          if (u.path.startsWith('/chart') || u.path == '/robots.txt') return NavigationDecision.navigate;
          // Bounced to the site's login: the session didn't take, so fall back.
          if (u.host == Uri.parse(AppConfig.chartUrl).host && u.path.startsWith('/auth') && mounted) {
            setState(() {
              _error = true;
              _loading = false;
            });
            widget.onFailed?.call();
          }
          // Anything else (TradingView logo → tradingview.com sign-up, etc.)
          // is simply blocked; the chart stays put.
          return NavigationDecision.prevent;
        },
      ));
    _load();
  }

  @override
  void didUpdateWidget(covariant TvChart old) {
    super.didUpdateWidget(old);
    if (old.interval != widget.interval || old.accountId != widget.accountId) {
      _reload();
    } else if (widget.symbol != _loadedSymbol) {
      _loadedSymbol = widget.symbol;
      _c.runJavaScript('window.postMessage(${jsonEncode({'type': 'setSymbol', 'symbol': widget.symbol})}, window.location.origin);');
    }
  }

  void _reload() {
    _loadedSymbol = widget.symbol;
    setState(() {
      _error = false;
      _loading = true;
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      Positioned.fill(child: WebViewWidget(controller: _c)),
      if (_loading && !_error)
        const Positioned.fill(
          child: ColoredBox(
            color: Color(0xFF0B0E11),
            child: Center(child: SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.4))),
          ),
        ),
      if (_error)
        Positioned.fill(
          child: ColoredBox(
            color: const Color(0xFF0B0E11),
            child: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.cloud_off_rounded, color: AppColors.textMute, size: 36),
                const SizedBox(height: 10),
                const Text('Chart could not load', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                OutlinedButton.icon(onPressed: _reload, icon: const Icon(Icons.refresh), label: const Text('Retry')),
              ]),
            ),
          ),
        ),
    ]);
  }
}
