import { schema, type Db } from '@travelog/db';
import migrations from '@travelog/db/drizzle/migrations';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { openDatabaseSync } from 'expo-sqlite';

import { isExpoGo } from '@/lib/runtime';

const KEY_NAME = 'travelog.db.key';
const DB_NAME = 'travelog.db';
/** Expo Go can't encrypt, so it gets its own test database (Plan 19). */
const EXPO_GO_DB_NAME = 'travelog-expo-go.db';

export function databaseFile(expoGo: boolean): { name: string; encrypted: boolean } {
  return expoGo ? { name: EXPO_GO_DB_NAME, encrypted: false } : { name: DB_NAME, encrypted: true };
}

// UUID v7 ids need crypto.getRandomValues, which React Native doesn't always provide.
const g = globalThis as { crypto?: { getRandomValues?: unknown } };
if (!g.crypto?.getRandomValues) {
  g.crypto = { ...(g.crypto ?? {}), getRandomValues: Crypto.getRandomValues };
}

/** The database key lives in the Keychain / Android Keystore, created on first launch. */
async function databaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return existing;
  const bytes = Crypto.getRandomBytes(32);
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_NAME, key, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  return key;
}

/**
 * Opens the encrypted on-device database (or, in Expo Go, an unencrypted test
 * database) and applies pending migrations.
 */
export async function openAppDatabase(): Promise<Db> {
  const file = databaseFile(isExpoGo());
  const sqlite = openDatabaseSync(file.name);
  if (file.encrypted) {
    const key = await databaseKey();
    sqlite.execSync(`PRAGMA key = "x'${key}'";`);
  }
  sqlite.execSync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const db = drizzle(sqlite, { schema });
  await migrate(db, migrations);
  return db as unknown as Db;
}
