import { distanceKm, normalizePlace, type LatLng } from '@travelog/core';
import { deleteRow, insertRow, liveRows, tx, updateRow, type Db } from '../db';
import { savedPlaces, type ItemType, type SavedSource } from '../schema';
import { addItem, ensureMainVariant, liveTripItems, type Item, type ItemInput } from './itinerary';

export type SavedPlace = typeof savedPlaces.$inferSelect;

export interface SavedInput {
  title: string;
  type?: ItemType;
  address?: string | null;
  area?: string | null;
  countryCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  poiId?: string | null;
  source?: SavedSource;
  url?: string | null;
  sourceTitle?: string | null;
  thumbUrl?: string | null;
  note?: string | null;
}

/** Two saves closer than this, with the same name, are the same place. */
const SAME_PLACE_KM = 0.05;

const pointOf = (p: { lat: number | null; lng: number | null }): LatLng | null =>
  p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null;

/** All saved places, newest first. */
export function listSaved(db: Db): SavedPlace[] {
  return liveRows(db, 'saved_places').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The saved place matching this one: the same map place, or the same name at the same spot. */
export function findSaved(
  db: Db,
  p: { title: string; poiId?: string | null; lat?: number | null; lng?: number | null },
): SavedPlace | undefined {
  const all = listSaved(db);
  if (p.poiId) {
    const hit = all.find((s) => s.poiId === p.poiId);
    if (hit) return hit;
  }
  const key = normalizePlace(p.title);
  const at = pointOf({ lat: p.lat ?? null, lng: p.lng ?? null });
  return all.find((s) => {
    if (normalizePlace(s.title) !== key) return false;
    const there = pointOf(s);
    return at && there ? distanceKm(at, there) < SAME_PLACE_KM : !at && !there;
  });
}

/** Saves a place; saving the same place again updates it rather than adding a copy. */
export function savePlace(db: Db, input: SavedInput): SavedPlace {
  const title = input.title.trim().slice(0, 120);
  if (!title) throw new RangeError('please give it a name');
  if ((input.lat == null) !== (input.lng == null))
    throw new RangeError('a place needs both latitude and longitude');
  const values = {
    title,
    type: input.type ?? 'place',
    address: input.address?.trim() || null,
    area: input.area?.trim() || null,
    countryCode: input.countryCode?.toUpperCase() || null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    poiId: input.poiId ?? null,
    source: input.source ?? 'typed',
    url: input.url ?? null,
    sourceTitle: input.sourceTitle ?? null,
    thumbUrl: input.thumbUrl ?? null,
    note: input.note?.trim() || null,
  };
  const existing = findSaved(db, values);
  if (!existing) return insertRow(db, 'saved_places', values);
  // A later save only changes the kind or source when it says so.
  if (!input.type) delete (values as Partial<typeof values>).type;
  if (!input.source) delete (values as Partial<typeof values>).source;
  // Keep what's known: a later save without a link or picture doesn't wipe them.
  const keep = Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== null && v !== undefined),
  );
  return updateRow(db, 'saved_places', existing.id, keep);
}

export function deleteSaved(db: Db, id: string): void {
  deleteRow(db, 'saved_places', id);
}

/**
 * Saved places for a trip: within `radiusKm` of its centre, or in its country when the trip
 * has no point yet. Places without a point match by country only.
 */
export function savedNear(
  db: Db,
  near: { centre: LatLng | null; countryCode?: string | null },
  radiusKm = 75,
): SavedPlace[] {
  const cc = near.countryCode?.toUpperCase() ?? null;
  return listSaved(db).filter((s) => {
    const p = pointOf(s);
    if (near.centre && p) return distanceKm(near.centre, p) <= radiusKm;
    return !!cc && s.countryCode === cc && (!near.centre || !p);
  });
}

/** Ids of saved places already on the trip. */
export function savedOnTrip(db: Db, tripId: string): Set<string> {
  return new Set(
    liveTripItems(db, tripId)
      .map((i) => i.savedPlaceId)
      .filter((x): x is string => !!x),
  );
}

/** A saved place as a stop: its name, kind and place. */
export function savedAsItem(s: SavedPlace): ItemInput {
  return {
    type: s.type,
    title: s.title,
    placeName: s.title,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    poiId: s.poiId,
    url: s.url,
    notes: s.note,
    savedPlaceId: s.id,
  };
}

/**
 * Adds saved places to a day of a trip (normally Ideas). Ones already on the trip are skipped.
 * Returns how many were added.
 */
export function addSavedToTrip(
  db: Db,
  ids: readonly string[],
  tripId: string,
  day: string,
  memberId?: string | null,
): number {
  return tx(db, (db) => {
    const on = savedOnTrip(db, tripId);
    const byId = new Map(listSaved(db).map((s) => [s.id, s]));
    const todo = ids.map((id) => byId.get(id)).filter((s): s is SavedPlace => !!s && !on.has(s.id));
    if (!todo.length) return 0;
    const v = ensureMainVariant(db, tripId, day, memberId);
    for (const s of todo) addItem(db, v.id, savedAsItem(s));
    return todo.length;
  });
}

/** Whether a stop is saved: by its saved id, map place or name and spot. */
export function savedForItem(
  db: Db,
  item: Pick<Item, 'savedPlaceId' | 'title' | 'placeName' | 'poiId' | 'lat' | 'lng'>,
): SavedPlace | undefined {
  if (item.savedPlaceId) {
    const s = liveRows(db, 'saved_places').find((x) => x.id === item.savedPlaceId);
    if (s) return s;
  }
  return findSaved(db, { ...item, title: item.placeName ?? item.title });
}
