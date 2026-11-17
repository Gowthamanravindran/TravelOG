import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True inside the Expo Go app (Plan 19). Expo Go can run TravelOG for quick
 * testing, but its SQLite has no encryption and our own native sharing module
 * isn't in it, so a few things behave differently there.
 */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

let globe: { ok: boolean; why: string | null } | undefined;

/**
 * Whether the globe can run in this app, and if not, why (Plans 66, 71). The globe draws in a
 * web view, which is native code: it is in Expo Go and in builds made after Plan 66. The check
 * is to load the web view package itself, once. It throws on import where its native part is
 * missing, and nothing else is a reliable sign: looking the native module up by name said "no"
 * on a build that had it (Plan 71).
 */
export function globeStatus(): { ok: boolean; why: string | null } {
  if (!globe) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native-webview');
      globe = { ok: true, why: null };
    } catch (e) {
      globe = { ok: false, why: e instanceof Error ? e.message : String(e) };
    }
  }
  return globe;
}

let problem: string | null = null;

/**
 * The last time the globe failed to start, and why (Plan 77). The globe retries by itself; this
 * is kept so Settings → About can say what went wrong, and it goes to the developer log too.
 */
export function noteGlobeProblem(message: string): void {
  problem = message;
  console.warn(`[globe] ${message}`);
}

export function globeProblem(): string | null {
  return problem;
}

/** True when the globe can run. Where it cannot, the Trips tab is the list and the old form. */
export function hasGlobe(): boolean {
  return globeStatus().ok;
}
