import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * The five faces the app uses (Plan 26), keyed by the family names in
 * `@travelog/ui` `fonts`. Imported one by one so only these files are bundled.
 */
export const FONT_ASSETS = {
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
};

/** After this long the app opens in the system font if the fonts haven't loaded. */
export const FONT_TIMEOUT_MS = 3000;

/**
 * Keeps the splash screen up until the data and the fonts are ready. If the fonts
 * fail to load, or take longer than FONT_TIMEOUT_MS, the app still opens in the system font.
 */
export function FontGate({
  fonts: [loaded, error],
  dataReady,
  children,
}: {
  fonts: [boolean, Error | null];
  dataReady: boolean;
  children: ReactNode;
}) {
  // A stalled font load (e.g. a flaky dev-server connection) must not keep the splash up.
  const [gaveUp, setGaveUp] = useState(false);
  const fontsDone = loaded || !!error || gaveUp;
  useEffect(() => {
    if (fontsDone) return;
    const timer = setTimeout(() => setGaveUp(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [fontsDone]);
  useEffect(() => {
    // The gate remounts between the error and main trees, so this can run twice.
    if (fontsDone && dataReady) Promise.resolve(SplashScreen.hideAsync()).catch(() => {});
  }, [fontsDone, dataReady]);
  return fontsDone ? children : null;
}
