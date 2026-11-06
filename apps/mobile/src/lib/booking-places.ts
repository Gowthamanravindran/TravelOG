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

/** "KSR Bengaluru (SBC)" → ["KSR Bengaluru", "Bengaluru"]; "Goa 403515" → ["Goa"]. */
function variants(text: string): string[] {
  const clean = text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = clean.split(' ').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length && i < 4; i++) {
    const v = words.slice(i).join(' ');
    if (v.length >= 3) out.push(v);
  }
  return out;
}

const matches = (p: Place, text: string, country?: string | null) =>
  KINDS.has(p.kind) &&
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
): Promise<Place | undefined> {
  if (!text) return undefined;
  const tries = variants(text);
  for (const v of tries) {
    const local = searchPlaces(db, v, { limit: 8 }).find((p) => matches(p, v, country));
    if (local) return local;
  }
  for (const v of tries) {
    const found = await fromServer(v);
    const hit = found.find((p) => matches(p, v, country));
    if (hit) {
      savePlaces(db, [hit]);
      return hit;
    }
  }
  return undefined;
}

/** A hotel's or venue's address → its town: the parts are tried in order, most specific first. */
async function placeFromAddress(db: Db, address: string): Promise<Place | undefined> {
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /[A-Za-z]{3}/.test(s));
  for (const part of parts) {
    const p = await findPlace(db, part);
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
