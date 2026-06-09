// Sentry is optional — gracefully no-ops if the native module isn't linked yet.
// After running `npm install` and linking @sentry/react-native, replace the
// DSN placeholder in App.tsx and this stub is automatically bypassed.

interface SentryScope {
  setExtras: (extras: Record<string, unknown>) => void;
}
interface SentryStatic {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown) => void;
  withScope: (cb: (scope: SentryScope) => void) => void;
  setUser: (user: { id: string; username?: string } | null) => void;
}

let Sentry: SentryStatic | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sentry = require('@sentry/react-native') as SentryStatic;
} catch {
  // native module not yet linked — Sentry stays null
}

export function initSentry(dsn: string) {
  if (!Sentry || !dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
    enableNativeCrashHandling: true,
    attachStacktrace: true,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!Sentry) return;
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry!.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function setUser(id: string, phone?: string) {
  Sentry?.setUser({ id, username: phone });
}

export function clearUser() {
  Sentry?.setUser(null);
}
