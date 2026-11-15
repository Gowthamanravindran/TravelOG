import {
  addSavedToTrip,
  deleteCheckIn,
  getCheckIn,
  getPlace,
  getTrip,
  listChecklist,
  listItems,
  listTripCheckIns,
  listVariants,
  liveTripItems,
  myMember,
  savedNear,
  savedOnTrip,
  setChecklistDone,
  type CheckIn,
  type Db,
} from '@travelog/db';

import { IDEAS_DAY } from '@/components/itinerary-view';

import { checkInNow } from './check-in';
import { tripCentre } from './stop-search';

/**
 * Plan 62: Must-do, one list from what the trip already has: its Ideas, stops starred ★,
 * Saved places near it, and things typed here. Ticking one is a check-in.
 */
export type MustDoSource = 'idea' | 'star' | 'saved' | 'added';

export interface MustDo {
  key: string;
  title: string;
  source: MustDoSource;
  detail: string | null;
  itemId: string | null;
  savedId: string | null;
  rowId: string | null;
  point: { lat: number; lng: number } | null;
  done: CheckIn | null;
}

export function mustDoList(db: Db, tripId: string): MustDo[] {
  const trip = getTrip(db, tripId);
  if (!trip) return [];
  const byItem = new Map<string, CheckIn>();
  for (const c of listTripCheckIns(db, tripId)) if (c.itemId) byItem.set(c.itemId, c);
  const point = (p: { lat: number | null; lng: number | null }) =>
    p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null;

  const ideasMain = listVariants(db, tripId, IDEAS_DAY).find((v) => v.isMain);
  const ideas = ideasMain ? listItems(db, ideasMain.id) : [];
  const ideaIds = new Set(ideas.map((i) => i.id));
  const starred = liveTripItems(db, tripId).filter((i) => i.mustDo && !ideaIds.has(i.id));
  const fromItems: MustDo[] = [
    ...ideas.map((i) => ({ i, source: 'idea' as const })),
    ...starred.map((i) => ({ i, source: 'star' as const })),
  ].map(({ i, source }) => ({
    key: `item:${i.id}`,
    title: i.title,
    source,
    detail: i.placeName && i.placeName !== i.title ? i.placeName : i.address,
    itemId: i.id,
    savedId: i.savedPlaceId,
    rowId: null,
    point: point(i),
    done: byItem.get(i.id) ?? null,
  }));

  const dest = trip.destinationPlaceId ? getPlace(db, trip.destinationPlaceId) : undefined;
  const on = savedOnTrip(db, tripId);
  const saved: MustDo[] = savedNear(db, {
    centre: tripCentre(db, tripId),
    countryCode: dest?.countryCode,
  })
    .filter((s) => !on.has(s.id))
    .map((s) => ({
      key: `saved:${s.id}`,
      title: s.title,
      source: 'saved',
      detail: s.area ?? s.address,
      itemId: null,
      savedId: s.id,
      rowId: null,
      point: point(s),
      done: null,
    }));

  const added: MustDo[] = listChecklist(db, tripId, 'mustdo').map((r) => ({
    key: `row:${r.id}`,
    title: r.title,
    source: 'added',
    detail: null,
    itemId: null,
    savedId: null,
    rowId: r.id,
    point: null,
    done: r.checkInId ? (getCheckIn(db, r.checkInId) ?? null) : null,
  }));

  return [...fromItems, ...saved, ...added];
}

/** Ticks a Must-do: a check-in now (a Saved place joins the trip's Ideas first). */
export async function tickMustDo(
  db: Db,
  mutate: <T>(fn: (db: Db) => T) => T,
  tripId: string,
  m: MustDo,
): Promise<CheckIn> {
  let itemId = m.itemId;
  if (!itemId && m.savedId) {
    itemId = mutate((db) => {
      addSavedToTrip(db, [m.savedId!], tripId, IDEAS_DAY, myMember(db, tripId)?.id);
      return liveTripItems(db, tripId).find((i) => i.savedPlaceId === m.savedId)?.id ?? null;
    });
  }
  const c = await checkInNow(db, mutate, { tripId, title: m.title, itemId });
  if (m.rowId) mutate((db) => setChecklistDone(db, m.rowId!, true, c.id));
  return c;
}

/** Unticks: removes the check-in it made. */
export function untickMustDo(db: Db, m: MustDo): void {
  if (m.done) deleteCheckIn(db, m.done.id);
  if (m.rowId) setChecklistDone(db, m.rowId, false);
}
