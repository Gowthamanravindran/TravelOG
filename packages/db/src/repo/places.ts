import { normalizePlace, rankPlaces, type Place } from '@travelog/core';
import { eq, inArray, like, or } from 'drizzle-orm';

import { newId, tx, type Db } from '../db';
import { placeNames, places } from '../schema';
import { getSetting, setSetting } from './settings';

/**
 * Places on the phone (Plan 29): seeded from the app's basic list, extended with
 * places our server finds. Reference data — not synced, not in the outbox.
 */

const VERSION_KEY = 'places.version';
/** How many stored names to rank for one search. */
const CANDIDATES = 200;

type PlaceRow = typeof places.$inferSelect;

function toPlace(row: PlaceRow, aliases: string[]): Place {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    countryCode: row.countryCode,
    countryName: row.countryName,
    region: row.region,
    continent: row.continent,
    lat: row.lat,
    lng: row.lng,
    timeZone: row.timeZone,
    currency: row.currency,
    population: row.population,
    boost: row.boost,
    aliases,
    source: row.source,
  };
}

function upsert(db: Db, p: Place): void {
  const { aliases, ...row } = p;
  db.insert(places).values(row).onConflictDoUpdate({ target: places.id, set: row }).run();
  db.delete(placeNames).where(eq(placeNames.placeId, p.id)).run();
  const names = new Map<string, { text: string; own: boolean }>([
    [normalizePlace(p.name), { text: p.name, own: true }],
  ]);
  for (const a of aliases) {
    const k = normalizePlace(a);
    if (k && !names.has(k)) names.set(k, { text: a, own: false });
  }
  db.insert(placeNames)
    .values([...names].map(([key, n]) => ({ placeId: p.id, key, text: n.text, own: n.own })))
    .run();
}

/** Loads the basic list once per data version; returns whether it loaded. */
export function seedPlaces(db: Db, rows: readonly Place[], version: string): boolean {
  if (getSetting(db, VERSION_KEY) === version) return false;
  tx(db, (db) => {
    for (const p of rows) upsert(db, p);
    setSetting(db, VERSION_KEY, version);
  });
  return true;
}

/** Saves places (e.g. found by our server) so they can be found offline. */
export function savePlaces(db: Db, rows: readonly Place[]): void {
  if (!rows.length) return;
  tx(db, (db) => {
    for (const p of rows) upsert(db, p);
  });
}

function aliasesOf(db: Db, ids: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!ids.length) return out;
  const names = db.select().from(placeNames).where(inArray(placeNames.placeId, ids)).all();
  for (const n of names) if (!n.own) out.set(n.placeId, [...(out.get(n.placeId) ?? []), n.text]);
  return out;
}

export function getPlace(db: Db, id: string): Place | undefined {
  const row = db.select().from(places).where(eq(places.id, id)).get();
  if (!row) return undefined;
  return toPlace(row, aliasesOf(db, [id]).get(id) ?? []);
}

/** Places matching typed text, best first (ranking: @travelog/core rankPlaces). */
export function searchPlaces(
  db: Db,
  query: string,
  { limit = 8, homeCountry }: { limit?: number; homeCountry?: string | null } = {},
): Place[] {
  const q = normalizePlace(query);
  if (!q) return [];
  const hits = db
    .selectDistinct({ placeId: placeNames.placeId })
    .from(placeNames)
    .where(or(like(placeNames.key, `${q}%`), like(placeNames.key, `% ${q}%`)))
    .limit(CANDIDATES)
    .all();
  const ids = hits.map((h) => h.placeId);
  if (!ids.length) return [];
  const rows = db.select().from(places).where(inArray(places.id, ids)).all();
  const aliases = aliasesOf(db, ids);
  const found = rows.map((r) => toPlace(r, aliases.get(r.id) ?? []));
  return rankPlaces(found, query, { homeCountry }).slice(0, limit);
}

/**
 * A place you typed that isn't in our list (Plan 35, "Use as typed"): saved on the
 * phone as a city with the trip's time zone, so bookings and stops can point at it.
 */
export function saveTypedPlace(
  db: Db,
  name: string,
  {
    timeZone,
    countryCode = null,
    countryName = null,
  }: {
    timeZone: string | null;
    countryCode?: string | null;
    countryName?: string | null;
  },
): Place {
  const clean = name.trim().slice(0, 80);
  if (!clean) throw new RangeError('please type a place');
  const place: Place = {
    id: `user:${newId()}`,
    kind: 'city',
    name: clean,
    countryCode,
    countryName,
    region: null,
    continent: null,
    lat: null,
    lng: null,
    timeZone,
    currency: null,
    population: 0,
    boost: 0,
    aliases: [],
    source: 'ours',
  };
  savePlaces(db, [place]);
  return place;
}
