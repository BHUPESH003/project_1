// Push notification service — wired up once Firebase is configured natively.
//
// Setup required before this file works end-to-end:
//   1. yarn add @react-native-firebase/app @react-native-firebase/messaging
//   2. Follow https://rnfirebase.io/ native setup for Android & iOS
//   3. Place google-services.json in android/app/
//   4. Uncomment the firebase imports below and remove the stub guard
//
// Call registerFCMToken() after successful login.
// Call setupForegroundHandler() once in App.tsx inside the auth-success branch.

import { apiClient } from '@/api/client';
import { showToast } from '@/stores/toastStore';

// ── Stub guard (remove once Firebase is installed) ────────────────────────────
let messaging: {
  getToken: () => Promise<string>;
  onMessage: (handler: (msg: RemoteMessage) => void) => () => void;
  setBackgroundMessageHandler: (handler: (msg: RemoteMessage) => Promise<void>) => void;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  messaging = require('@react-native-firebase/messaging').default();
} catch {
  // Firebase not installed yet — stub is a no-op
}
// ─────────────────────────────────────────────────────────────────────────────

export interface RemoteMessage {
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
}

export async function registerFCMToken(): Promise<void> {
  if (!messaging) return;
  try {
    const token = await messaging.getToken();
    await apiClient.patch('/users/me', { fcmToken: token });
  } catch {
    // Non-critical — token registration can be retried on next launch
  }
}

export function setupForegroundHandler(
  onNavigate?: (screen: string, params: Record<string, string>) => void,
): () => void {
  if (!messaging) return () => {};
  return messaging.onMessage((msg) => {
    const title = msg.notification?.title ?? 'Update';
    const body  = msg.notification?.body ?? '';
    showToast({ type: 'info', message: `${title}: ${body}` });

    // Navigate on tap via data payload
    const screen = msg.data?.screen;
    const id     = msg.data?.id;
    if (screen && id && onNavigate) {
      onNavigate(screen, { id });
    }
  });
}

export function setupBackgroundHandler(): void {
  if (!messaging) return;
  messaging.setBackgroundMessageHandler(async (_msg) => {
    // System notification is shown automatically; nothing extra to do here.
  });
}
