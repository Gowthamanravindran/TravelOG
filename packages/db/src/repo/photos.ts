import { daysBetween, localDateIn } from '@travelog/core';
import { and, eq, inArray } from 'drizzle-orm';

import { deleteRow, getRow, insertRow, liveRows, now, tx, updateRow, type Db } from '../db';
import { itineraryItems, photos, planVariants } from '../schema';
import { tripMoney } from './money';
import { getTrip, listMembers, myMember } from './trips';

export type Photo = typeof photos.$inferSelect;

export interface PhotoInput {
  localUri: string;
  width?: number | null;
  height?: number | null;
  /** When it was taken (UTC ISO), if known. */
  takenAt?: string | null;
}

/** Adds photos to a trip's pool, each placed on the trip day it was taken. */
export function addPhotos(db: Db, tripId: string, inputs: readonly PhotoInput[]): Photo[] {
  const trip = getTrip(db, tripId);
  if (!trip) throw new Error('trip not found');
  const me = myMember(db, tripId);
  return tx(db, (db) =>
    inputs.map((p) => {
      const takenAt =
        p.takenAt && !Number.isNaN(Date.parse(p.takenAt)) ? p.takenAt : now().toISOString();
      const day = localDateIn(trip.timeZone, new Date(takenAt));
      const onTrip =
        trip.startDate && trip.endDate ? day >= trip.startDate && day <= trip.endDate : true;
      return insertRow(db, 'photos', {
        tripId,
        addedByMemberId: me?.id ?? null,
        localUri: p.localUri,
        width: p.width ?? null,
        height: p.height ?? null,
        takenAt,
        dayDate: onTrip ? day : null,
      });
    }),
  );
}

export function listPhotos(db: Db, tripId: string): Photo[] {
  return liveRows(db, 'photos', eq(photos.tripId, tripId)).sort((a, b) =>
    a.takenAt.localeCompare(b.takenAt),
  );
}

export function getPhoto(db: Db, id: string): Photo | undefined {
  return getRow(db, 'photos', id);
}

export function setPhotoCaption(db: Db, id: string, caption: string): Photo {
  return updateRow(db, 'photos', id, { caption: caption.trim().slice(0, 140) || null });
}

export function deletePhoto(db: Db, id: string): void {
  deleteRow(db, 'photos', id);
}

export interface TripRecap {
  days: number | null;
  /** Planned stops on each day's main plan. */
  stops: number;
  people: number;
  spentMinor: number;
  currency: string;
  photos: number;
}

/** Numbers for the trip-stats collage card. */
export function tripRecap(db: Db, tripId: string): TripRecap | null {
  const trip = getTrip(db, tripId);
  if (!trip) return null;
  const variants = liveRows(db, 'plan_variants', eq(planVariants.tripId, tripId));
  const mainIds = new Map<string, string>();
  for (const v of [...variants].sort(
    (a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder,
  )) {
    if (!mainIds.has(v.dayDate)) mainIds.set(v.dayDate, v.id);
  }
  const ids = [...mainIds.values()];
  const stops = ids.length
    ? liveRows(
        db,
        'itinerary_items',
        and(eq(itineraryItems.tripId, tripId), inArray(itineraryItems.variantId, ids)),
      ).filter((i) => i.type !== 'note').length
    : 0;
  return {
    days: trip.startDate && trip.endDate ? daysBetween(trip.startDate, trip.endDate) + 1 : null,
    stops,
    people: listMembers(db, tripId).length,
    spentMinor: tripMoney(db, tripId).spentMinor,
    currency: trip.currency,
    photos: listPhotos(db, tripId).length,
  };
}

/** Removes several photos from the trip at once; returns their file paths so the app can delete its copies. */
export function deletePhotos(db: Db, ids: readonly string[]): (string | null)[] {
  return tx(db, (db) =>
    ids.map((id) => {
      const p = getRow(db, 'photos', id);
      if (!p) return null;
      deleteRow(db, 'photos', id);
      return p.localUri;
    }),
  );
}
