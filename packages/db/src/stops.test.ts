import { whereabouts } from '@travelog/core';
import { describe, expect, it } from 'vitest';

import { outbox } from './schema';
import {
  addBooking,
  addStop,
  createTrip,
  deleteStop,
  getPlace,
  listStops,
  saveTypedPlace,
  searchPlaces,
  updateStop,
  whereInputs,
} from './index';
import { testDb } from './test-db';

function setup() {
  const db = testDb();
  const trip = createTrip(
    db,
    {
      title: 'Goa',
      timeZone: 'Asia/Kolkata',
      startDate: '2026-07-12',
      endDate: '2026-07-15',
      currency: 'INR',
    },
    { displayName: 'Gowtham' },
  );
  return { db, tripId: trip.id };
}

describe('trip stops (Plan 35)', () => {
  it('adds, edits and deletes a place you set, queuing each change for sync', () => {
    const { db, tripId } = setup();
    const goa = saveTypedPlace(db, "  Aunt's village  ", { timeZone: 'Asia/Kolkata' });
    expect(goa.id).toMatch(/^user:/);
    expect(getPlace(db, goa.id)).toMatchObject({ name: "Aunt's village", kind: 'city' });
    expect(searchPlaces(db, 'aunt').map((p) => p.id)).toEqual([goa.id]);

    const before = db.select().from(outbox).all().length;
    const stop = addStop(db, {
      tripId,
      kind: 'stay',
      placeId: goa.id,
      startDate: '2026-07-13',
      endDate: '2026-07-15',
      label: ' Aunt’s house ',
      address: 'Near the temple, Candolim',
    });
    expect(stop.label).toBe('Aunt’s house');
    updateStop(db, stop.id, { endDate: '2026-07-14' });
    expect(listStops(db, tripId)).toMatchObject([{ endDate: '2026-07-14' }]);
    deleteStop(db, stop.id);
    expect(listStops(db, tripId)).toEqual([]);
    expect(db.select().from(outbox).all().length - before).toBe(3);
  });

  it('refuses a stop that ends before it starts', () => {
    const { db, tripId } = setup();
    expect(() =>
      addStop(db, {
        tripId,
        kind: 'travel',
        placeId: null,
        startDate: '2026-07-14',
        endDate: '2026-07-13',
      }),
    ).toThrow('the last day is before the first');
  });

  it('gathers a trip’s bookings, stops and places for whereabouts', () => {
    const { db, tripId } = setup();
    const blr = saveTypedPlace(db, 'Bengaluru', { timeZone: 'Asia/Kolkata' });
    const goa = saveTypedPlace(db, 'Panaji', { timeZone: 'Asia/Kolkata' });
    addBooking(db, {
      tripId,
      type: 'flight',
      title: 'BLR → GOI',
      startsAt: '2026-07-12T01:15:00.000Z',
      endsAt: '2026-07-12T02:30:00.000Z',
      fromPlaceId: blr.id,
      toPlaceId: goa.id,
    });
    addStop(db, {
      tripId,
      kind: 'stay',
      placeId: goa.id,
      startDate: '2026-07-12',
      endDate: '2026-07-15',
    });
    const inputs = whereInputs(db, tripId)!;
    expect([...inputs.places.keys()].sort()).toEqual([blr.id, goa.id].sort());
    const w = whereabouts(inputs);
    expect(w.nights.map((n) => [n.kind, n.placeId])).toEqual([
      ['set', goa.id],
      ['set', goa.id],
      ['set', goa.id],
    ]);
  });
});
