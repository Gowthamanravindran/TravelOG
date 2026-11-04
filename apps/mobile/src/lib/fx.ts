import { quoteFromFrankfurter, type FxQuote } from '@travelog/core';
import { getSetting, setSetting, type Db } from '@travelog/db';

/**
 * Exchange rates for expenses paid in another currency. ECB reference rates via
 * Frankfurter (free, no key). Saved on the phone so the last rate works offline.
 * Some currencies (e.g. AED, VND, LKR) aren't published by the ECB: the person
 * types the rate instead.
 */

export interface SavedQuote extends FxQuote {
  /** When this phone fetched it (UTC ISO). */
  fetchedAt: string;
  /** True when it's an older saved rate because fetching failed. */
  stale?: boolean;
}

const key = (from: string, to: string) => `fx:${from}:${to}`;
const DAY = 24 * 60 * 60 * 1000;

export function savedQuote(db: Db, from: string, to: string): SavedQuote | null {
  try {
    const raw = getSetting(db, key(from, to));
    return raw ? (JSON.parse(raw) as SavedQuote) : null;
  } catch {
    return null;
  }
}

/** Latest rate: today's saved one, else fetched, else the last saved (marked stale), else null. */
export async function getQuote(
  db: Db,
  from: string,
  to: string,
  fetcher: typeof fetch = fetch,
): Promise<SavedQuote | null> {
  const saved = savedQuote(db, from, to);
  if (saved && Date.now() - Date.parse(saved.fetchedAt) < DAY / 2) return saved;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetcher(
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`,
      { signal: controller.signal },
    );
    const quote = res.ok ? quoteFromFrankfurter(await res.json(), from, to) : null;
    if (quote) {
      const fresh: SavedQuote = { ...quote, fetchedAt: new Date().toISOString() };
      setSetting(db, key(from, to), JSON.stringify(fresh));
      return fresh;
    }
  } catch {
    // Offline or blocked: fall through to the saved rate.
  } finally {
    clearTimeout(timer);
  }
  return saved ? { ...saved, stale: true } : null;
}

/** Remembers a rate the person typed, so it's suggested next time. */
export function rememberRate(db: Db, from: string, to: string, rate: number): void {
  const today = new Date().toISOString().slice(0, 10);
  const q: SavedQuote = { rate, date: today, fetchedAt: new Date(0).toISOString() };
  setSetting(db, key(from, to), JSON.stringify(q));
}
