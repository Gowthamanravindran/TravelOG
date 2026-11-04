import type { Db } from '@travelog/db';
import { schema } from '@travelog/db';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DataProvider } from '@/data/provider';
import { ModeProvider } from '@/ui/theme';

/** A real in-memory SQLite database with the app's migrations. */
export function makeDb(): Db {
  const db = drizzle(new Database(':memory:'), { schema });
  const folder = path.join(path.dirname(require.resolve('@travelog/db/package.json')), 'drizzle');
  migrate(db, { migrationsFolder: folder });
  return db as unknown as Db;
}

export function withData(db: Db, ui: ReactNode, mode: 'home' | 'plan' | 'trip' = 'home') {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DataProvider db={db}>
        <ModeProvider mode={mode}>{ui}</ModeProvider>
      </DataProvider>
    </GestureHandlerRootView>
  );
}
