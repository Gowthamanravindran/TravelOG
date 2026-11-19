import type { Place } from '@travelog/core';
import { addBooking, addStop, createTripWithStops } from '@travelog/db';

import { tripReadiness } from '@/lib/readiness';
import { makeDb } from '@/testing/test-utils';

// "A stay every night" on Get ready (Plan 88): a trip made on the globe has a stop for each
// city on every night, but that says where you will be, not where you will sleep.

const goa: Place = {
  id: 'goa',
  kind: 'city',
  name: 'Panaji',
  countryCode: 'IN',
  countryName: 'India',
  region: 'Goa',
  continent: 'Asia',
  lat: 15.5,
  lng: 73.8,
  timeZone: 'Asia/Kolkata',
  currency: 'INR',
  population: 1,
  boost: 0,
  aliases: [],
  source: 'geonames',
};

function globeTrip() {
  const db = makeDb();
  const trip = createTripWithStops(
    db,
    {
      title: 'Goa trip',
      emoji: 'beach',
      timeZone: 'Asia/Kolkata',
      currency: 'INR',
      startDate: '2026-12-01',
      endDate: '2026-12-21', // 20 nights
      destinationPlaceId: 'goa',
    },
    { displayName: 'Gowtham' },
    [{ placeId: 'goa', startDate: '2026-12-01', endDate: '2026-12-21' }],
    [goa],
  );
  return { db, tripId: trip.id };
}
const stays = (db: ReturnType<typeof makeDb>, tripId: string) =>
  tripReadiness(db, tripId)!.auto.find((a) => a.key === 'stays')!;

describe('A stay every night', () => {
  it('a 4-night hotel on a 20-night trip made on the globe is not done', () => {
    const { db, tripId } = globeTrip();
    expect(stays(db, tripId)).toMatchObject({ done: false, detail: 'Add where you’ll stay' });
    addBooking(db, {
      tripId,
      type: 'stay',
      title: 'Sea Breeze',
      placeId: 'goa',
      startsAt: '2026-12-01T08:30:00.000Z', // 14:00 in Goa
      endsAt: '2026-12-05T05:30:00.000Z', // 11:00, 4 nights later
    });
    expect(stays(db, tripId)).toMatchObject({ done: false, detail: '16 nights without a stay' });
  });

  it('done once every night has a booked stay or one you named', () => {
    const { db, tripId } = globeTrip();
    addBooking(db, {
      tripId,
      type: 'stay',
      title: 'Sea Breeze',
      placeId: 'goa',
      startsAt: '2026-12-01T08:30:00.000Z',
      endsAt: '2026-12-05T05:30:00.000Z',
    });
    addStop(db, {
      tripId,
      kind: 'stay',
      placeId: 'goa',
      startDate: '2026-12-05',
      endDate: '2026-12-21',
      label: 'Aunt’s house',
    });
    expect(stays(db, tripId)).toMatchObject({ done: true, detail: 'Booked' });
  });
});
