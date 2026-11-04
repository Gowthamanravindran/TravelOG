import { localDateIn } from '@travelog/core';
import { and, eq } from 'drizzle-orm';

import { deleteRow, getRow, insertRow, liveRows, now, type Db } from '../db';
import { checkIns } from '../schema';
import { getTrip, myMember } from './trips';

export type CheckIn = typeof checkIns.$inferSelect;

export interface CheckInInput {
  tripId: string;
  title: string;
  itemId?: string | null;
  note?: string | null;
  position?: { lat: number; lng: number; accuracyM?: number | null } | null;
  at?: string;
}

export function checkIn(db: Db, input: CheckInInput): CheckIn {
  const trip = getTrip(db, input.tripId);
  if (!trip) throw new Error('trip not found');
  if (!input.title.trim()) throw new RangeError('where are you?');
  const at = input.at ?? now().toISOString();
  const pos = input.position;
  if (pos && (Math.abs(pos.lat) > 90 || Math.abs(pos.lng) > 180))
    throw new RangeError('that location looks wrong');
  return insertRow(db, 'check_ins', {
    tripId: trip.id,
    memberId: myMember(db, trip.id)?.id ?? null,
    itemId: input.itemId ?? null,
    title: input.title.trim().slice(0, 100),
    at,
    dayDate: localDateIn(trip.timeZone, new Date(at)),
    lat: pos?.lat ?? null,
    lng: pos?.lng ?? null,
    accuracyM: pos?.accuracyM != null ? Math.round(pos.accuracyM) : null,
    note: input.note?.trim() || null,
  });
}

/** A day's check-ins, earliest first. */
export function listCheckIns(db: Db, tripId: string, dayDate: string): CheckIn[] {
  return liveRows(
    db,
    'check_ins',
    and(eq(checkIns.tripId, tripId), eq(checkIns.dayDate, dayDate)),
  ).sort((a, b) => a.at.localeCompare(b.at));
}

export function getCheckIn(db: Db, id: string): CheckIn | undefined {
  return getRow(db, 'check_ins', id);
}

export function deleteCheckIn(db: Db, id: string): void {
  deleteRow(db, 'check_ins', id);
}
