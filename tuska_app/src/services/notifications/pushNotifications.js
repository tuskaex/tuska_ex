import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';

import { brand } from '../../theme/brand';

/**
 * All notification access goes through here, and `expo-notifications` is
 * imported LAZILY on purpose.
 *
 * Importing it at module scope crashes the app in Expo Go on Android. The
 * library's `index.js` re-exports `DevicePushTokenAutoRegistration.fx`, and
 * that side-effect module calls `addPushTokenListener()` while it is being
 * evaluated. Since SDK 53 removed remote push from Expo Go, that call throws:
 *
 *   expo-notifications: Android Push notifications (remote notifications)
 *   functionality provided by expo-notifications was removed from Expo Go
 *
 * The throw happens during module initialisation, so no try/catch around our
 * own calls can ever catch it — the only defence is to not import the module
 * at all in Expo Go. `require()` behind a guard does exactly that: in Expo Go
 * every function below becomes a no-op, and in a development or production
 * build everything works normally.
 *
 * Consequence, stated plainly: in Expo Go there are no notifications at all,
 * local ones included. The in-app notification list still polls the API, so
 * only the OS tray alert is missing. Use a development build to exercise
 * notifications for real.
 */
const IS_EXPO_GO = isRunningInExpoGo();

let cached = null;
function notifications() {
  if (IS_EXPO_GO) return null;
  if (cached === null) {
    try {
      cached = require('expo-notifications');
      // Foreground notifications must still surface as a banner + sound; the
      // default is to suppress them while the app is open.
      cached.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldShowAlert: true, // legacy key, ignored on new versions
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch (_) {
      cached = false; // remember the failure; don't retry on every call
    }
  }
  return cached || null;
}

export async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  const N = notifications();
  if (!N) return;
  try {
    await N.setNotificationChannelAsync('default', {
      name: brand.name,
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B4DFF',
      sound: 'default',
    });
  } catch (_) {}
}

// Android 13+ and iOS require explicit permission even for local notifications.
export async function ensureNotificationPermission() {
  const N = notifications();
  if (!N) return false;
  try {
    const { status } = await N.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await N.requestPermissionsAsync();
    return req.status === 'granted';
  } catch (_) {
    return false;
  }
}

/**
 * The EAS project id, read from the app config rather than hardcoded.
 *
 * It used to be a string literal in this file — and it was SwissCresta's
 * project id, left behind by the white-label rebrand. A SpeedTrade build
 * would have minted its push tokens against a different company's Expo
 * project. Reading it from the config means it can only ever be whatever
 * `eas init` wrote into app.json for THIS app, and when that is absent (the
 * current state, see EAS_SETUP.md) push registration is simply skipped.
 */
function easProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId
    || Constants?.easConfig?.projectId
    || null
  );
}

// This device's Expo push token, or null. Used for server-side push so
// notifications arrive even when the app is fully killed.
export async function registerForPushToken() {
  const N = notifications();
  if (!N) return null;
  const projectId = easProjectId();
  if (!projectId) return null;
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return null;
    const res = await N.getExpoPushTokenAsync({ projectId });
    return res?.data || null;
  } catch (_) {
    return null;
  }
}

// Fire an immediate local notification (shows in the device tray like any
// other app's notification).
export async function presentLocalNotification({ title, body, data }) {
  const N = notifications();
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: {
        title: title || brand.name,
        body: body || '',
        data: data || {},
        sound: 'default',
      },
      trigger: null, // deliver now
    });
  } catch (_) {}
}

/**
 * Subscribe to notification taps. Returns an unsubscribe function.
 *
 * This exists so `NotificationsBridge` does not have to import
 * `expo-notifications` itself — a static import there would re-introduce the
 * Expo Go crash this module works around.
 */
export function onNotificationTapped(handler) {
  const N = notifications();
  if (!N) return () => {};
  try {
    const sub = N.addNotificationResponseReceivedListener(handler);
    return () => { try { sub.remove(); } catch (_) {} };
  } catch (_) {
    return () => {};
  }
}
