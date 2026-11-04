import { asc, eq } from 'drizzle-orm';
import { isLocalDate, tripState, type TripState } from '@travelog/core';

import { deleteRow, getRow, insertRow, liveRows, now, tx, updateRow, type Db } from '../db';
import { trips, tripMembers } from '../schema';

export type Trip = typeof trips.$inferSelect;
export type Member = typeof tripMembers.$inferSelect;

export interface TripInput {
  title: string;
  emoji?: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  timeZone: string;
  currency?: string;
}

function validate(input: Partial<TripInput>) {
  if (input.title !== undefined && !input.title.trim())
    throw new RangeError('please give the trip a name');
  for (const d of [input.startDate, input.endDate]) {
    if (d && !isLocalDate(d)) throw new RangeError('dates must be real calendar dates');
  }
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw new RangeError('the trip ends before it starts');
  }
  if (
    !!input.startDate !== !!input.endDate &&
    (input.startDate !== undefined || input.endDate !== undefined)
  ) {
    throw new RangeError('add both a start and an end date, or neither');
  }
}

/** Creates a trip with the current person as its owner. */
export function createTrip(
  db: Db,
  input: TripInput,
  me: { displayName: string; upiId?: string | null },
): Trip {
  validate(input);
  return tx(db, (db) => {
    const trip = insertRow(db, 'trips', {
      title: input.title.trim().slice(0, 80),
      emoji: input.emoji ?? '🧳',
      destination: input.destination?.trim() || null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      timeZone: input.timeZone,
      currency: input.currency ?? 'INR',
    });
    insertRow(db, 'trip_members', {
      tripId: trip.id,
      displayName: me.displayName,
      role: 'owner',
      isMe: true,
      upiId: me.upiId ?? null,
    });
    return trip;
  });
}

export function updateTrip(db: Db, id: string, patch: Partial<TripInput>): Trip {
  const current = getRow(db, 'trips', id);
  if (!current) throw new Error('trip not found');
  validate({
    ...patch,
    startDate: patch.startDate !== undefined ? patch.startDate : current.startDate,
    endDate: patch.endDate !== undefined ? patch.endDate : current.endDate,
  });
  return updateRow(db, 'trips', id, { ...patch, title: patch.title?.trim() });
}

export function endTrip(db: Db, id: string): Trip {
  return updateRow(db, 'trips', id, { endedAt: now().toISOString() });
}

export function archiveTrip(db: Db, id: string): Trip {
  return updateRow(db, 'trips', id, { archivedAt: now().toISOString() });
}

export function deleteTrip(db: Db, id: string): void {
  tx(db, (db) => {
    for (const m of liveRows(db, 'trip_members', eq(tripMembers.tripId, id)))
      deleteRow(db, 'trip_members', m.id);
    deleteRow(db, 'trips', id);
  });
}

export function getTrip(db: Db, id: string): Trip | undefined {
  return getRow(db, 'trips', id);
}

export interface TripWithState extends Trip {
  state: TripState;
  memberCount: number;
}

/** All trips with their lifecycle state, soonest first. */
export function listTrips(db: Db, at: Date = now()): TripWithState[] {
  const rows = db.select().from(trips).orderBy(asc(trips.startDate), asc(trips.createdAt)).all();
  const members = liveRows(db, 'trip_members');
  return rows
    .filter((t) => !t.deletedAt)
    .map((t) => ({
      ...t,
      state: tripState(t, at),
      memberCount: members.filter((m) => m.tripId === t.id).length,
    }));
}

// Members --------------------------------------------------------------------

export function listMembers(db: Db, tripId: string): Member[] {
  return liveRows(db, 'trip_members', eq(tripMembers.tripId, tripId)).sort(
    (a, b) => Number(b.isMe) - Number(a.isMe) || a.createdAt.localeCompare(b.createdAt),
  );
}

export function addMember(
  db: Db,
  tripId: string,
  displayName: string,
  upiId?: string | null,
): Member {
  const name = displayName.trim();
  if (!name) throw new RangeError('please enter a name');
  return insertRow(db, 'trip_members', {
    tripId,
    displayName: name.slice(0, 60),
    role: 'editor',
    upiId: upiId ?? null,
  });
}

export function updateMember(
  db: Db,
  id: string,
  patch: { displayName?: string; upiId?: string | null },
): Member {
  return updateRow(db, 'trip_members', id, patch);
}

export function removeMember(db: Db, id: string): void {
  const m = getRow(db, 'trip_members', id);
  if (m?.isMe) throw new RangeError("you can't remove yourself from your own trip");
  deleteRow(db, 'trip_members', id);
}

export function myMember(db: Db, tripId: string): Member | undefined {
  return listMembers(db, tripId).find((m) => m.isMe);
}
