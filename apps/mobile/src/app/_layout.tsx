import type { Db } from '@travelog/db';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';

import { openAppDatabase } from '@/data/open';
import { DataProvider } from '@/data/provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Keep the splash screen up until the database is open and migrated (docs/08: no network at startup).
    openAppDatabase()
      .then(setDb)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => SplashScreen.hideAsync());
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, textAlign: 'center' }}>
          TravelOG couldn&apos;t open its storage on this phone. Please restart the app.{'\n\n'}
          {error}
        </Text>
      </View>
    );
  }
  if (!db) return null;

  return (
    <DataProvider db={db}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="new-trip" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </DataProvider>
  );
}
