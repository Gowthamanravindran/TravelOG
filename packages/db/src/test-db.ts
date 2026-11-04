// Test helper: an in-memory SQLite database with the real migrations applied.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';

import type { Db } from './db';
import * as schema from './schema';

export function testDb(): Db {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  return db as unknown as Db;
}
