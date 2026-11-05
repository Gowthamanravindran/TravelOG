import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True inside the Expo Go app (Plan 19). Expo Go can run TravelOG for quick
 * testing, but its SQLite has no encryption and our own native sharing module
 * isn't in it, so a few things behave differently there.
 */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
