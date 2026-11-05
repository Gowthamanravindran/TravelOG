import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';

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

/**
 * Keeps the splash screen up until the data and the fonts are ready. If the fonts
 * fail to load, the app still opens, in the system font.
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
  const fontsDone = loaded || !!error;
  useEffect(() => {
    if (fontsDone && dataReady) SplashScreen.hideAsync();
  }, [fontsDone, dataReady]);
  return fontsDone ? children : null;
}
