import type { Place } from '@travelog/core';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createTrip,
  getPlace,
  getTrip,
  savePlaces,
  searchPlaces,
  seedPlaces,
  updateTrip,
} from './index';
import type { Db } from './db';
import { testDb } from './test-db';

const place = (p: Partial<Place> & Pick<Place, 'id' | 'name' | 'kind'>): Place => ({
  countryCode: null,
  countryName: null,
  region: null,
  continent: null,
  lat: null,
  lng: null,
  timeZone: null,
  currency: null,
  population: 0,
  boost: 0,
  aliases: [],
  source: 'geonames',
  ...p,
});

const TOKYO = place({
  id: 'gn:1850147',
  name: 'Tokyo',
  kind: 'city',
  countryCode: 'JP',
  countryName: 'Japan',
  timeZone: 'Asia/Tokyo',
  currency: 'JPY',
  population: 8_336_599,
  lat: 35.69,
  lng: 139.69,
});
const TOKUSHIMA = place({
  id: 'gn:1850158',
  name: 'Tokushima',
  kind: 'city',
  countryCode: 'JP',
  countryName: 'Japan',
  population: 267_345,
});
const BENGALURU = place({
  id: 'gn:1277333',
  name: 'Bengaluru',
  kind: 'city',
  countryCode: 'IN',
  countryName: 'India',
  population: 8_443_675,
  aliases: ['Bangalore'],
});
const JAPAN = place({
  id: 'ctry:JP',
  name: 'Japan',
  kind: 'country',
  countryCode: 'JP',
  countryName: 'Japan',
  continent: 'Asia',
  currency: 'JPY',
});

let db: Db;
beforeEach(() => {
  db = testDb();
});

describe('places on the phone', () => {
  it('seeds once per data version', () => {
    expect(seedPlaces(db, [TOKYO, TOKUSHIMA, JAPAN], '2026-11')).toBe(true);
    expect(seedPlaces(db, [TOKYO], '2026-11')).toBe(false);
    expect(searchPlaces(db, 'tok').map((p) => p.id)).toEqual(['gn:1850147', 'gn:1850158']);
    expect(seedPlaces(db, [TOKYO, TOKUSHIMA, JAPAN, BENGALURU], '2026-12')).toBe(true);
    expect(searchPlaces(db, 'beng')).toHaveLength(1);
  });

  it('finds places by alias and keeps every field', () => {
    seedPlaces(db, [BENGALURU, TOKYO], 'v1');
    expect(searchPlaces(db, 'Bangalore').map((p) => p.id)).toEqual(['gn:1277333']);
    expect(getPlace(db, 'gn:1850147')).toEqual(TOKYO);
  });

  it('saves places found online so they work offline next time', () => {
    seedPlaces(db, [TOKYO], 'v1');
    const hampi = place({
      id: 'osm:N123',
      name: 'Hampi',
      kind: 'city',
      countryCode: 'IN',
      countryName: 'India',
      source: 'osm',
    });
    expect(searchPlaces(db, 'hampi')).toEqual([]);
    savePlaces(db, [hampi]);
    savePlaces(db, [hampi]);
    expect(searchPlaces(db, 'ham')).toEqual([hampi]);
  });

  it('a trip remembers its destination place', () => {
    seedPlaces(db, [TOKYO], 'v1');
    const trip = createTrip(
      db,
      {
        title: 'Tokyo',
        destination: 'Tokyo, Japan',
        destinationPlaceId: 'gn:1850147',
        timeZone: 'Asia/Tokyo',
        currency: 'JPY',
      },
      { displayName: 'You' },
    );
    expect(getTrip(db, trip.id)?.destinationPlaceId).toBe('gn:1850147');
    updateTrip(db, trip.id, { destination: 'Hampi', destinationPlaceId: null });
    expect(getTrip(db, trip.id)?.destinationPlaceId).toBeNull();
  });
});
