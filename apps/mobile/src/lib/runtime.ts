import Constants, { ExecutionEnvironment } from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';

/**
 * True inside the Expo Go app (Plan 19). Expo Go can run TravelOG for quick
 * testing, but its SQLite has no encryption and our own native sharing module
 * isn't in it, so a few things behave differently there.
 */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * True when the web view the globe draws in is part of the installed app (Plan 66). It is in
 * Expo Go, and in development builds made after Plan 66. Importing `react-native-webview`
 * where it is missing throws, so ask this first and load the globe with `require`.
 */
export function hasGlobe(): boolean {
  return TurboModuleRegistry.get('RNCWebViewModule') != null;
}
