import { requireOptionalNativeModule } from 'expo';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Plan 60: TravelOG in other apps' share sheet. A shared link or text opens Save from a link.
 * The native part (expo-share-intent) is only in development builds from Plan 60; in Expo Go
 * and older builds this renders nothing and Save from a link is opened by hand.
 */

type UseShareIntent = typeof import('expo-share-intent').useShareIntent;

/** The package's hook when its native module is in this build, else null. */
export function loadShareIntent(): UseShareIntent | null {
  if (!requireOptionalNativeModule('ExpoShareIntentModule')) return null;
  // Loaded only when the native module exists (Plan 48: never import a missing package).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('expo-share-intent') as typeof import('expo-share-intent')).useShareIntent;
}

/** What to save from a share: the shared text, with the link added when it came separately. */
export function sharedText(intent: { text?: string | null; webUrl?: string | null }): string {
  const text = intent.text?.trim() ?? '';
  const url = intent.webUrl?.trim() ?? '';
  if (url && !text.includes(url)) return [url, text].filter(Boolean).join('\n');
  return text;
}

/**
 * The handler for this build. The hook is chosen once, at load, and called by a `use…` name:
 * the React Compiler only treats `use…` calls as hooks, and memoizing a hook call breaks hook
 * order (the release build crashed with "Cannot read property 'inst' of null").
 */
export function makeShareIntentHandler(useIntent: UseShareIntent | null): () => null {
  if (!useIntent) return () => null;
  return function ShareIntentHandler() {
    'use no memo';
    const router = useRouter();
    const { hasShareIntent, shareIntent, resetShareIntent } = useIntent({
      resetOnBackground: true,
    });
    useEffect(() => {
      if (!hasShareIntent) return;
      const text = sharedText(shareIntent);
      if (text) router.push(`/save-link?text=${encodeURIComponent(text)}`);
      resetShareIntent();
    }, [hasShareIntent, shareIntent, resetShareIntent, router]);
    return null;
  };
}

/** Mounted once in the root layout. */
export const ShareIntentHandler = makeShareIntentHandler(loadShareIntent());
