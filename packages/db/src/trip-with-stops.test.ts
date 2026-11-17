import type { Place } from '@travelog/core';
import { describe, expect, it } from 'vitest';

import {
  createTripWithStops,
  getPlace,
  listMembers,
  listStops,
  listTrips,
  type TripInput,
} from './index';
import { testDb } from './test-db';

const city = (id: string, name: string, lat: number, lng: number): Place => ({
  id,
  kind: 'city',
  name,
  countryCode: 'JP',
  countryName: 'Japan',
  region: null,
  continent: 'Asia',
  lat,
  lng,
  timeZone: null,
  currency: 'JPY',
  population: 0,
  boost: 0,
  aliases: [],
  source: 'geonames',
});
const input: TripInput = {
  title: 'Japan Trip',
  destination: 'Tokyo, Kyoto',
  destinationPlaceId: 'ctry:JP',
  startDate: '2027-03-12',
  endDate: '2027-03-18',
  timeZone: 'Asia/Tokyo',
  currency: 'JPY',
};
const me = { displayName: 'Gowtham' };
const places = [
  city('gn:1850147', 'Tokyo', 35.69, 139.69),
  city('gn:1857910', 'Kyoto', 35.02, 135.75),
];

describe('a trip made on the globe (Plan 67)', () => {
  it('is saved with its stops, their places and its owner in one go', () => {
    const db = testDb();
    const trip = createTripWithStops(
      db,
      input,
      me,
      [
        { placeId: 'gn:1850147', startDate: '2027-03-12', endDate: '2027-03-15' },
        { placeId: 'gn:1857910', startDate: '2027-03-15', endDate: '2027-03-18' },
      ],
      places,
    );
    expect(trip.title).toBe('Japan Trip');
    expect(listStops(db, trip.id).map((s) => [s.kind, s.placeId, s.startDate, s.endDate])).toEqual([
      ['stay', 'gn:1850147', '2027-03-12', '2027-03-15'],
      ['stay', 'gn:1857910', '2027-03-15', '2027-03-18'],
    ]);
    expect(getPlace(db, 'gn:1850147')).toMatchObject({ name: 'Tokyo', lat: 35.69, lng: 139.69 });
    expect(listMembers(db, trip.id).map((m) => [m.displayName, m.role, m.isMe])).toEqual([
      ['Gowtham', 'owner', true],
    ]);
  });

  it('saves nothing at all when one stop is wrong', () => {
    const db = testDb();
    expect(() =>
      createTripWithStops(
        db,
        input,
        me,
        [
          { placeId: 'gn:1850147', startDate: '2027-03-12', endDate: '2027-03-15' },
          { placeId: 'gn:1857910', startDate: '2027-03-15', endDate: '2027-03-14' },
        ],
        places,
      ),
    ).toThrow('the last day is before the first');
    expect(listTrips(db)).toEqual([]);
    expect(getPlace(db, 'gn:1850147')).toBeUndefined();
  });

  it('works with no stops and no new places', () => {
    const db = testDb();
    const trip = createTripWithStops(db, input, me, [], []);
    expect(listStops(db, trip.id)).toEqual([]);
  });
});
