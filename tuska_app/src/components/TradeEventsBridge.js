import { useEffect, useRef } from 'react';

import { useAccount } from '../app/providers/AccountContext';
import webSocketService from '../services/websocket/WebSocketService';
import { presentLocalNotification } from '../services/notifications/pushNotifications';
import { showToast } from './vantage';
import logger from '../utils/logger';

/**
 * Listens to the selected account's live trade stream for the whole app.
 *
 * Mounted once next to `NotificationsBridge`, deliberately at app level rather
 * than inside the Trade screen. The 1s position poll lives in a
 * `useFocusEffect`, so it only runs while that screen is open — a position
 * closing while the user is on Home or Funds went unnoticed until they
 * navigated back. The web terminal subscribes at its layout level for the same
 * reason.
 *
 * What it does with each event:
 *
 *  • `stop_out` — the important one. The risk engine writes a Notification row
 *    for a margin call but NOT for a stop-out, so before this the app could
 *    never tell the trader their position had been force-closed; it just
 *    disappeared from the list. Raised as a tray notification, not a toast,
 *    because it can happen while the app is backgrounded.
 *  • `margin_call` — surfaced immediately instead of waiting up to 10s for the
 *    notification poll to find the row.
 *  • everything else — a refresh signal. The screens own their own data; this
 *    only tells them it is stale, so no state is duplicated here.
 */
export default function TradeEventsBridge() {
  const { selectedAccount, refreshAccounts } = useAccount();
  const accountId = selectedAccount?.id || selectedAccount?._id || null;

  // Keep the callback stable so the subscription is not torn down on every
  // account refresh — only an actual account CHANGE should reconnect.
  const refreshRef = useRef(refreshAccounts);
  refreshRef.current = refreshAccounts;

  useEffect(() => {
    if (!accountId) {
      webSocketService.disconnectTradeStream?.();
      return undefined;
    }

    const unsubscribe = webSocketService.onTradeEvent?.((evt) => {
      const type = String(evt?.type || '');
      try {
        if (type === 'stop_out') {
          presentLocalNotification({
            title: 'Position closed — stop out',
            body: evt.message
              || 'Your margin level fell below the stop-out threshold and open positions were closed.',
            data: { screen: 'positions' },
          });
        } else if (type === 'margin_call') {
          showToast({
            kind: 'warn',
            message: evt.message || 'Margin call — add funds or close positions',
          });
        }
      } catch (e) {
        logger.error('trade event handling failed', e);
      }

      // Any of these change balance / margin / equity, so pull the account
      // rows in. Screens re-render off that.
      if (type) {
        try { refreshRef.current?.(); } catch (_) {}
      }
    });

    webSocketService.connectTradeStream?.(accountId);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      webSocketService.disconnectTradeStream?.();
    };
  }, [accountId]);

  return null;
}
