import type { Db } from '@travelog/db';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { ErrorScreen } from '@/components/error-screen';
import { openAppDatabase } from '@/data/open';
import { DataProvider } from '@/data/provider';
import { useReminders } from '@/lib/reminders';

SplashScreen.preventAutoHideAsync();

/** Any screen that crashes shows this instead of a blank app. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} />;
}

/** Work that follows the data in the background (reminders). */
function Background() {
  useReminders();
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Keep the splash screen up until the database is open and migrated (docs/08: no network at startup).
    openAppDatabase()
      .then(setDb)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => SplashScreen.hideAsync());
  }, [attempt]);

  if (error) {
    return (
      <ErrorScreen
        error={new Error(`TravelOG couldn't open its storage on this phone. ${error}`)}
        retry={async () => {
          setError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!db) return null;

  return (
    <DataProvider db={db}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <Background />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="new-trip" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </DataProvider>
  );
}
