import { and, eq, isNull, type SQL } from 'drizzle-orm';
import type { BaseSQLiteDatabase, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { v7 as uuidv7 } from 'uuid';

import * as schema from './schema';
import { outbox, syncedTables, type SyncedTableName } from './schema';

/** Any synchronous Drizzle SQLite database: expo-sqlite on the phone, better-sqlite3 in tests. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = BaseSQLiteDatabase<'sync', any, typeof schema>;

let clock: () => Date = () => new Date();

/** Tests can freeze time. */
export function setClock(fn: () => Date): void {
  clock = fn;
}

export function now(): Date {
  return clock();
}

export function nowIso(): string {
  return clock().toISOString();
}

export function newId(): string {
  return uuidv7();
}

type TableOf<N extends SyncedTableName> = (typeof syncedTables)[N];
type Row<N extends SyncedTableName> = TableOf<N>['$inferSelect'];
type NewRow<N extends SyncedTableName> = Omit<
  TableOf<N>['$inferInsert'],
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'serverSeq'
> & { id?: string };

function recordOutbox(
  db: Db,
  tableName: SyncedTableName,
  rowId: string,
  op: 'upsert' | 'delete',
  payload: unknown,
) {
  db.insert(outbox)
    .values({
      id: newId(),
      tableName,
      rowId,
      op,
      payload: JSON.stringify(payload),
      clientTs: nowIso(),
    })
    .run();
}

function table(name: SyncedTableName): SQLiteTable & { id: any; deletedAt: any } {
  return syncedTables[name] as never;
}

/** Inserts a synced row and queues it for upload. */
export function insertRow<N extends SyncedTableName>(db: Db, name: N, values: NewRow<N>): Row<N> {
  const stamp = nowIso();
  const row = { ...values, id: values.id ?? newId(), createdAt: stamp, updatedAt: stamp } as Row<N>;
  db.insert(table(name))
    .values(row as never)
    .run();
  recordOutbox(db, name, row.id, 'upsert', row);
  return row;
}

/** Updates a synced row (only if not deleted) and queues the full row for upload. */
export function updateRow<N extends SyncedTableName>(
  db: Db,
  name: N,
  id: string,
  patch: Partial<NewRow<N>>,
): Row<N> {
  const t = table(name);
  db.update(t)
    .set({ ...patch, updatedAt: nowIso() } as never)
    .where(and(eq(t.id, id), isNull(t.deletedAt)))
    .run();
  const row = getRow(db, name, id);
  if (!row) throw new Error(`${name} ${id} not found`);
  recordOutbox(db, name, id, 'upsert', row);
  return row;
}

/** Soft-deletes a synced row so the delete can sync. */
export function deleteRow(db: Db, name: SyncedTableName, id: string): void {
  const t = table(name);
  const stamp = nowIso();
  db.update(t)
    .set({ deletedAt: stamp, updatedAt: stamp } as never)
    .where(and(eq(t.id, id), isNull(t.deletedAt)))
    .run();
  recordOutbox(db, name, id, 'delete', { id, deletedAt: stamp });
}

export function getRow<N extends SyncedTableName>(db: Db, name: N, id: string): Row<N> | undefined {
  const t = table(name);
  return db
    .select()
    .from(t)
    .where(and(eq(t.id, id), isNull(t.deletedAt)))
    .get() as Row<N> | undefined;
}

/** Rows that aren't deleted, matching `where`. */
export function liveRows<N extends SyncedTableName>(db: Db, name: N, where?: SQL): Row<N>[] {
  const t = table(name);
  return db
    .select()
    .from(t)
    .where(where ? and(isNull(t.deletedAt), where) : isNull(t.deletedAt))
    .all() as Row<N>[];
}

/** Runs `fn` in one transaction (all or nothing). */
export function tx<T>(db: Db, fn: (db: Db) => T): T {
  return db.transaction((t) => fn(t as unknown as Db));
}
