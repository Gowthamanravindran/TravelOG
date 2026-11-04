import type { Db } from '@travelog/db';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface DataContextValue {
  db: Db;
  /** Increases after every write so screens re-read their data. */
  version: number;
  /** Runs a write and refreshes the screens that read data. */
  mutate: <T>(fn: (db: Db) => T) => T;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ db, children }: { db: Db; children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const mutate = useCallback(
    <T,>(fn: (db: Db) => T): T => {
      const result = fn(db);
      setVersion((v) => v + 1);
      return result;
    },
    [db],
  );
  const value = useMemo(() => ({ db, version, mutate }), [db, version, mutate]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('DataProvider is missing');
  return ctx;
}

/** Reads data from the local database; re-runs after any write. */
export function useQuery<T>(read: (db: Db) => T, deps: readonly unknown[] = []): T {
  const { db, version } = useData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read(db), [db, version, ...deps]);
}

/** Returns a function that performs a write and refreshes screens. */
export function useMutate(): DataContextValue['mutate'] {
  return useData().mutate;
}

/** Changes after every write; use to react to data changes (e.g. re-plan reminders). */
export function useDataVersion(): number {
  return useData().version;
}

/** The database, for background work that isn't a screen read. */
export function useDb(): Db {
  return useData().db;
}
