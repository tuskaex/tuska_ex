import * as SecureStore from 'expo-secure-store';

import { WS_URL } from '../../constants';
import logger from '../../utils/logger';

/**
 * Two live streams.
 *
 * `/ws/prices` is public and account-agnostic. `/ws/trades/{account_id}` is
 * the per-account event channel the backend already publishes to — the same
 * one the web terminal listens on — carrying `position_opened`,
 * `position_closed`, `position_updated`, `order_filled`, `order_update`,
 * `margin_call` and `stop_out`.
 *
 * The app previously subscribed to prices only and discovered position changes
 * by polling. That mostly worked, but a STOP-OUT is invisible to a poll: the
 * risk engine writes a Notification row for a margin call and none for a
 * stop-out, so a force-closed position simply vanished from the list and the
 * trader was never told it had happened. This stream is the only place that
 * event exists.
 *
 * The token rides in the query string. That is the documented mobile path —
 * `_ws_token_from_websocket` in the gateway prefers the `pt_access` cookie
 * and falls back to `?token=` precisely because a React Native client cannot
 * attach the cookie.
 */
class WebSocketService {
  constructor() {
    this.priceWs = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 12;
    this.reconnectDelay = 3000;
    this.priceListeners = new Set();
    this.isConnecting = false;

    this.tradeWs = null;
    this.tradeAccountId = null;
    this.tradeListeners = new Set();
    this.tradeReconnectAttempts = 0;
    this.tradeConnecting = false;
    this.tradeReconnectTimer = null;
    // Set while WE close a socket on purpose — its onclose must not schedule
    // a reconnect (previously disconnectPriceStream() triggered an immediate
    // reconnect via its own close event).
    this.intentionalClose = { price: false, trade: false };
  }

  // ── Per-account trade/position event stream ───────────────────────────
  async connectTradeStream(accountId) {
    if (!accountId) return;
    // Switching accounts must drop the old socket — it is subscribed to the
    // previous account's Redis channel and would keep delivering its events.
    if (this.tradeWs && this.tradeAccountId === accountId
        && this.tradeWs.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.tradeConnecting) return;
    this.tradeConnecting = true;
    this.disconnectTradeStream();

    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) { this.tradeConnecting = false; return; }

      this.tradeAccountId = accountId;
      const url = `${WS_URL}/ws/trades/${encodeURIComponent(accountId)}`
        + `?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      this.tradeWs = ws;

      ws.onopen = () => {
        this.tradeReconnectAttempts = 0;
        this.tradeConnecting = false;
      };

      ws.onmessage = (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch (_) { return; }
        // The server sends a keepalive every 30s; it is not an event.
        if (!data || data.type === 'ping') return;
        this.tradeListeners.forEach((cb) => {
          try { cb(data); } catch (e) { logger.error('trade listener failed', e); }
        });
      };

      // Not logger.error: a closed socket is routine (backgrounded app,
      // rotated token) and Expo Go renders an error as a red toast.
      ws.onerror = () => { this.tradeConnecting = false; };

      ws.onclose = () => {
        this.tradeConnecting = false;
        if (this.intentionalClose.trade) {
          this.intentionalClose.trade = false;
          return;
        }
        this.scheduleTradeReconnect();
      };
    } catch (error) {
      this.tradeConnecting = false;
      logger.error('Error connecting to trade stream:', error);
    }
  }

  scheduleTradeReconnect() {
    const acct = this.tradeAccountId;
    if (!acct) return;
    this.tradeReconnectAttempts += 1;
    // Bounded and backed off. Positions are still polled while the trade
    // screen is open, so giving up degrades to the previous behaviour rather
    // than to nothing.
    if (this.tradeReconnectAttempts > this.maxReconnectAttempts) return;
    const delay = Math.min(this.reconnectDelay * this.tradeReconnectAttempts, 15000);
    clearTimeout(this.tradeReconnectTimer);
    this.tradeReconnectTimer = setTimeout(() => {
      this.connectTradeStream(acct);
    }, delay);
  }

  /** Subscribe to trade events. Returns an unsubscribe function. */
  onTradeEvent(callback) {
    this.tradeListeners.add(callback);
    return () => this.tradeListeners.delete(callback);
  }

  disconnectTradeStream() {
    clearTimeout(this.tradeReconnectTimer);
    this.tradeReconnectTimer = null;
    if (this.tradeWs) {
      this.intentionalClose.trade = true;
      try { this.tradeWs.close(); } catch (_) {}
      this.tradeWs = null;
    }
  }

  async connectPriceStream() {
    if (this.priceWs && this.priceWs.readyState === WebSocket.OPEN) {
      logger.log('Price WebSocket already connected');
      return;
    }

    if (this.isConnecting) {
      logger.log('Price WebSocket connection already in progress');
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = `${WS_URL}/ws/prices`;

      this.priceWs = new WebSocket(wsUrl);

      this.priceWs.onopen = () => {
        logger.log('Price WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.priceWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyPriceListeners(data);
        } catch (error) {
          logger.error('Error parsing price message:', error);
        }
      };

      this.priceWs.onerror = () => {
        // Don't surface as logger.error — Expo Go shows that as an in-app red toast.
        // Reconnect logic handles the actual recovery.
        this.isConnecting = false;
      };

      this.priceWs.onclose = () => {
        this.isConnecting = false;
        if (this.intentionalClose.price) {
          this.intentionalClose.price = false;
          return;
        }
        this.handleReconnect();
      };
    } catch (error) {
      logger.error('Error connecting to price stream:', error);
      this.isConnecting = false;
    }
  }

  handleReconnect() {
    this.reconnectAttempts++;
    // Bounded, backed-off retries (prices also have a REST polling fallback,
    // so giving up is safe). reconnectAttempts resets to 0 on a successful
    // open; a fresh connectPriceStream() call from a screen also retries anew.
    if (this.reconnectAttempts > this.maxReconnectAttempts) return;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 15000);

    setTimeout(() => {
      this.connectPriceStream();
    }, delay);
  }

  onPriceUpdate(callback) {
    this.priceListeners.add(callback);
    return () => this.priceListeners.delete(callback);
  }

  notifyPriceListeners(data) {
    this.priceListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('Error in price listener:', error);
      }
    });
  }

  disconnectPriceStream() {
    if (this.priceWs) {
      this.intentionalClose.price = true;
      this.priceWs.close();
      this.priceWs = null;
    }
  }

  disconnectAll() {
    this.disconnectPriceStream();
    this.disconnectTradeStream();
    this.priceListeners.clear();
    this.tradeListeners.clear();
    this.tradeAccountId = null;
  }

  getConnectionStatus() {
    return {
      price: this.priceWs ? this.priceWs.readyState : WebSocket.CLOSED,
      trade: this.tradeWs ? this.tradeWs.readyState : WebSocket.CLOSED,
    };
  }
}

export default new WebSocketService();
