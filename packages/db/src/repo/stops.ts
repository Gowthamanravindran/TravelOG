import type { WhereBooking, WherePlace, WhereStop, WhereTrip } from '@travelog/core';
import { eq } from 'drizzle-orm';

import { deleteRow, getRow, insertRow, liveRows, updateRow, type Db } from '../db';
import { tripStops, type StopKind } from '../schema';
import { listBookings } from './bookings';
import { getPlace } from './places';
import { getTrip } from './trips';

export type TripStop = typeof tripStops.$inferSelect;

export interface StopInput {
  tripId: string;
  kind: StopKind;
  placeId: string | null;
  toPlaceId?: string | null;
  startDate: string;
  endDate: string;
  label?: string | null;
  address?: string | null;
  notes?: string | null;
}

function validate(input: Partial<StopInput>) {
  if (input.startDate && input.endDate && input.endDate < input.startDate)
    throw new RangeError('the last day is before the first');
  if (input.kind === 'stay' && input.placeId === null) throw new RangeError('pick the city');
}

const tidy = (s: string | null | undefined) => s?.trim() || null;

/** A place you set yourself (Plan 35): staying somewhere, or travelling. */
export function addStop(db: Db, input: StopInput): TripStop {
  validate(input);
  return insertRow(db, 'trip_stops', {
    ...input,
    toPlaceId: input.toPlaceId ?? null,
    label: tidy(input.label)?.slice(0, 80) ?? null,
    address: tidy(input.address)?.slice(0, 200) ?? null,
    notes: tidy(input.notes),
  });
}

export function updateStop(db: Db, id: string, patch: Partial<StopInput>): TripStop {
  validate(patch);
  return updateRow(db, 'trip_stops', id, patch);
}

export function deleteStop(db: Db, id: string): void {
  deleteRow(db, 'trip_stops', id);
}

export function getStop(db: Db, id: string): TripStop | undefined {
  return getRow(db, 'trip_stops', id);
}

export function listStops(db: Db, tripId: string): TripStop[] {
  return liveRows(db, 'trip_stops', eq(tripStops.tripId, tripId)).sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
}

/** Everything `whereabouts` (@travelog/core) needs for one trip. */
export function whereInputs(
  db: Db,
  tripId: string,
): {
  trip: WhereTrip;
  bookings: WhereBooking[];
  stops: WhereStop[];
  places: Map<string, WherePlace>;
} | null {
  const trip = getTrip(db, tripId);
  if (!trip) return null;
  const bookings = listBookings(db, tripId).map((b) => ({
    id: b.id,
    type: b.type,
    title: b.title,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    fromPlaceId: b.fromPlaceId,
    toPlaceId: b.toPlaceId,
    placeId: b.placeId,
  }));
  const stops = listStops(db, tripId).map((s) => ({
    id: s.id,
    kind: s.kind,
    placeId: s.placeId,
    toPlaceId: s.toPlaceId,
    startDate: s.startDate,
    endDate: s.endDate,
    label: s.label,
  }));
  const ids = new Set<string>();
  for (const b of bookings)
    for (const id of [b.fromPlaceId, b.toPlaceId, b.placeId]) if (id) ids.add(id);
  for (const s of stops) for (const id of [s.placeId, s.toPlaceId]) if (id) ids.add(id);
  if (trip.destinationPlaceId) ids.add(trip.destinationPlaceId);
  const places = new Map<string, WherePlace>();
  for (const id of ids) {
    const p = getPlace(db, id);
    if (p) places.set(id, { id, name: p.name, kind: p.kind, timeZone: p.timeZone });
  }
  return {
    trip: {
      startDate: trip.startDate,
      endDate: trip.endDate,
      timeZone: trip.timeZone,
      destinationPlaceId: trip.destinationPlaceId,
    },
    bookings,
    stops,
    places,
  };
}
