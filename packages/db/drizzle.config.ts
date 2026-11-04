import { defineConfig } from 'drizzle-kit';

// driver 'expo' makes drizzle-kit also write drizzle/migrations.js, which the app bundles.
// The same SQL files are applied in Node tests with the better-sqlite3 migrator.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/schema.ts',
  out: './drizzle',
});
