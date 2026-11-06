import { normalizePlace, type BookingDraft, type Place } from '@travelog/core';
import { savePlaces, searchPlaces, type Db } from '@travelog/db';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import { searchServer } from './places';

/**
 * Turns the places printed on a ticket into places from our list (Plan 35):
 * "Goa (GOI)" → Goa, India; a hotel's address → its town. Only exact name
 * matches count; anything else is left as typed for the person to check.
 */

export interface Airport {
  city: string;
  country: string;
  name: string;
}

let airports: Promise<Map<string, Airport>> | null = null;

/** IATA code → the town it serves, from the airports list shipped with the app. */
export function loadAirports(): Promise<Map<string, Airport>> {
  airports ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const asset = Asset.fromModule(require('../../assets/places/airports.places'));
    await asset.downloadAsync();
    if (!asset.localUri) return new Map();
    const file = JSON.parse(await new File(asset.localUri).text()) as { rows: string[][] };
    return new Map(
      file.rows.map(([iata, city, country, name]) => [
        iata!,
        { city: city!, country: country!, name: name! },
      ]),
    );
  })().catch(() => new Map());
  return airports;
}

/** For tests. */
export function setAirports(map: Map<string, Airport>): void {
  airports = Promise.resolve(map);
}

const SERVER_WAIT_MS = 4000;
const KINDS = new Set(['city', 'region']);

/**
 * Names to try for printed text: the whole name, then its last words, then its
 * first words. "KSR Bengaluru (SBC)" → Bengaluru; "Goa 403515" → Goa;
 * "Paris Nord" (a station) → Paris; "1094 CC Amsterdam" → Amsterdam.
 */
function variants(text: string): string[] {
  const clean = text
    .replace(/\([^)]*\)?/g, ' ')
    .replace(/\b\w*\d\w*\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = clean.split(' ').filter(Boolean).slice(0, 6);
  const out = new Set<string>();
  for (let i = 0; i < words.length; i++) out.add(words.slice(i).join(' '));
  for (let k = words.length - 1; k >= 1; k--) out.add(words.slice(0, k).join(' '));
  return [...out].filter((v) => v.length >= 3);
}

/** "France" → "FR", from the countries kept on the phone; null when it isn't a country. */
function countryCodeOf(db: Db, text: string): string | null {
  const name = normalizePlace(text);
  if (!name) return null;
  const hit = searchPlaces(db, text, { limit: 8 }).find(
    (p) => p.kind === 'country' && [p.name, ...p.aliases].some((n) => normalizePlace(n) === name),
  );
  return hit?.countryCode ?? null;
}

const matches = (p: Place, text: string, country?: string | null, kinds: Set<string> = KINDS) =>
  kinds.has(p.kind) &&
  (!country || p.countryCode === country) &&
  [p.name, ...p.aliases].some((n) => normalizePlace(n) === normalizePlace(text));

async function fromServer(text: string): Promise<Place[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERVER_WAIT_MS);
  try {
    return (await searchServer(text, controller.signal)).places;
  } finally {
    clearTimeout(timer);
  }
}

/** A city or region whose name is exactly the text (or its last words), else undefined. */
export async function findPlace(
  db: Db,
  text: string | null | undefined,
  country?: string | null,
  kinds: Set<string> = KINDS,
): Promise<Place | undefined> {
  if (!text) return undefined;
  const tries = variants(text);
  for (const v of tries) {
    const local = searchPlaces(db, v, { limit: 8 }).find((p) => matches(p, v, country, kinds));
    if (local) return local;
  }
  for (const v of tries) {
    const found = await fromServer(v);
    const hit = found.find((p) => matches(p, v, country, kinds));
    if (hit) {
      savePlaces(db, [hit]);
      return hit;
    }
  }
  return undefined;
}

/**
 * A hotel's or venue's address → its town. An address ends with its country
 * ("…, 75010 Paris, France"), and the town must be in that country (Plan 38: a
 * Paris hotel matched a Paris in another country before). The other parts are
 * tried from the end, nearest the country first, so the street is tried last.
 */
async function placeFromAddress(db: Db, address: string): Promise<Place | undefined> {
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /\p{L}{3}/u.test(s));
  const country = parts.length > 1 ? countryCodeOf(db, parts[parts.length - 1]!) : null;
  const rest = country ? parts.slice(0, -1) : parts;
  // Towns first (Candolim before the state of Goa), then regions.
  for (const kinds of [new Set(['city']), new Set(['region'])])
    for (const part of [...rest].reverse()) {
      const p = await findPlace(db, part, country, kinds);
      if (p) return p;
    }
  return undefined;
}

/** The draft with place ids added where the names were found; never throws. */
export async function resolveDraftPlaces(db: Db, draft: BookingDraft): Promise<BookingDraft> {
  try {
    const codes = await loadAirports();
    const end = async (text?: string | null, code?: string | null) => {
      const airport = code ? codes.get(code) : undefined;
      const named = text && text !== code ? await findPlace(db, text, airport?.country) : undefined;
      const place =
        named ?? (airport ? await findPlace(db, airport.city, airport.country) : undefined);
      // Show a readable name even when no place matched: the airport's town, not "GOI".
      return {
        place,
        text: place?.name ?? (text === code && airport ? airport.city : text) ?? null,
      };
    };
    const from = await end(draft.fromText, draft.fromCode);
    const to = await end(draft.toText, draft.toCode);
    const city = draft.address ? await placeFromAddress(db, draft.address) : undefined;
    const found = new Set(draft.found);
    if (from.place || to.place || city) found.add('where');
    return {
      ...draft,
      fromText: from.text,
      toText: to.text,
      fromPlaceId: from.place?.id ?? null,
      toPlaceId: to.place?.id ?? null,
      placeId: city?.id ?? null,
      placeText: city?.name ?? draft.placeText ?? null,
      found: [...found],
    };
  } catch {
    return draft;
  }
}
