import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

enum SocketStatus { connecting, connected, disconnected }

/// Auto-reconnecting JSON WebSocket with exponential backoff. The server pings
/// every 30s; a 75s silence watchdog forces a reconnect on a dead socket.
class ReconnectingSocket {
  final Uri Function() urlBuilder;
  final void Function(dynamic json) onMessage;
  final void Function(SocketStatus)? onStatus;
  final void Function()? onConnected;
  final Duration maxBackoff;

  WebSocketChannel? _ch;
  StreamSubscription? _sub;
  Timer? _retry, _watchdog;
  int _attempt = 0;
  bool _closed = true;
  SocketStatus status = SocketStatus.disconnected;

  ReconnectingSocket({
    required this.urlBuilder,
    required this.onMessage,
    this.onStatus,
    this.onConnected,
    this.maxBackoff = const Duration(seconds: 30),
  });

  void connect() {
    if (!_closed) return;
    _closed = false;
    _open();
  }

  void _set(SocketStatus s) {
    status = s;
    onStatus?.call(s);
  }

  int _gen = 0;

  Future<void> _open() async {
    if (_closed) return;
    // Generation guard: a close()/reconnect while we await `ready` must not let
    // this stale attempt continue and leak a second live subscription.
    final gen = ++_gen;
    _set(SocketStatus.connecting);
    try {
      final ch = WebSocketChannel.connect(urlBuilder());
      _ch = ch;
      await ch.ready;
      if (_closed || gen != _gen) {
        ch.sink.close();
        return;
      }
      _attempt = 0;
      _set(SocketStatus.connected);
      _kick();
      onConnected?.call();
      _sub = ch.stream.listen(
        (raw) {
          _kick();
          dynamic j;
          try {
            j = jsonDecode(raw is String ? raw : utf8.decode(raw as List<int>));
          } catch (_) {
            return;
          }
          if (j is Map && j['type'] == 'ping') {
            send({'type': 'pong'});
            return;
          }
          onMessage(j);
        },
        onDone: _scheduleRetry,
        onError: (_) => _scheduleRetry(),
        cancelOnError: true,
      );
    } catch (_) {
      if (gen == _gen) _scheduleRetry();
    }
  }

  void _kick() {
    _watchdog?.cancel();
    _watchdog = Timer(const Duration(seconds: 75), () {
      _ch?.sink.close();
      _scheduleRetry();
    });
  }

  void _scheduleRetry() {
    _sub?.cancel();
    _sub = null;
    _watchdog?.cancel();
    _ch = null;
    if (_closed) return;
    _set(SocketStatus.disconnected);
    _retry?.cancel();
    final secs = (1 << _attempt.clamp(0, 5));
    _attempt++;
    final d = Duration(seconds: secs) > maxBackoff ? maxBackoff : Duration(seconds: secs);
    _retry = Timer(d, _open);
  }

  void send(Map<String, dynamic> msg) {
    try {
      _ch?.sink.add(jsonEncode(msg));
    } catch (_) {}
  }

  void reconnectNow() {
    _gen++;
    _attempt = 0;
    _retry?.cancel();
    _watchdog?.cancel();
    _sub?.cancel();
    _ch?.sink.close();
    _ch = null;
    if (!_closed) _open();
  }

  void close() {
    _gen++;
    _closed = true;
    _retry?.cancel();
    _watchdog?.cancel();
    _sub?.cancel();
    _ch?.sink.close();
    _ch = null;
    _set(SocketStatus.disconnected);
  }
}
