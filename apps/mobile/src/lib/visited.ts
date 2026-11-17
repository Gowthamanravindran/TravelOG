import { getSetting, setSetting, type Db } from '@travelog/db';
import { countryByCode, countryCodeOnGlobe } from '@travelog/globe';

/**
 * The countries a person has marked as visited (Plan 74). Kept on this phone as a JSON list of
 * ISO alpha-2 codes, in the order they were added. It is the person's own list: it is not
 * worked out from their trips.
 */
export const VISITED_KEY = 'profile.visitedCountries';

/** The code as it is marked on the globe, or nothing for a place the globe does not draw. */
function onGlobe(code: unknown): string | undefined {
  if (typeof code !== 'string') return undefined;
  const parent = countryCodeOnGlobe(code.trim().toUpperCase());
  return countryByCode(parent) ? parent : undefined;
}

export function parseVisited(value: string | null): string[] {
  let list: unknown;
  try {
    list = JSON.parse(value ?? '');
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    const code = onGlobe(item);
    if (code && !out.includes(code)) out.push(code);
  }
  return out;
}

export function readVisited(db: Db): string[] {
  return parseVisited(getSetting(db, VISITED_KEY));
}

export function addVisited(db: Db, code: string): void {
  const add = onGlobe(code);
  const now = readVisited(db);
  if (!add || now.includes(add)) return;
  setSetting(db, VISITED_KEY, JSON.stringify([...now, add]));
}

export function removeVisited(db: Db, code: string): void {
  const now = readVisited(db);
  const drop = onGlobe(code);
  if (!drop || !now.includes(drop)) return;
  setSetting(db, VISITED_KEY, JSON.stringify(now.filter((c) => c !== drop)));
}
