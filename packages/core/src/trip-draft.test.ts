import { describe, expect, it } from 'vitest';

import {
  autoTripName,
  splitStatus,
  stopDays,
  stopRows,
  tripDestination,
  tripLengthDays,
  type DraftCountry,
  type DraftStop,
} from './trip-draft';
import { whereabouts, type WherePlace } from './whereabouts';

const tokyo: DraftStop = { placeId: 'gn:1850147', name: 'Tokyo', countryCode: 'JP', days: 3 };
const kyoto: DraftStop = { placeId: 'gn:1857910', name: 'Kyoto', countryCode: 'JP', days: 2 };
const seoul: DraftStop = { placeId: 'gn:1835848', name: 'Seoul', countryCode: 'KR', days: 4 };
const paris: DraftStop = { placeId: 'gn:2988507', name: 'Paris', countryCode: 'FR', days: 4 };
const JP: DraftCountry = { code: 'JP', name: 'Japan', continent: 'Asia' };
const KR: DraftCountry = { code: 'KR', name: 'South Korea', continent: 'Asia' };
const FR: DraftCountry = { code: 'FR', name: 'France', continent: 'Europe' };

describe('trip length', () => {
  it('counts both ends', () => {
    expect(tripLengthDays('2027-03-12', '2027-03-18')).toBe(7);
    expect(tripLengthDays('2027-03-12', '2027-03-12')).toBe(1);
    expect(tripLengthDays('2026-12-28', '2027-01-03')).toBe(7);
  });

  it('is zero until both dates are set, or when they are the wrong way round', () => {
    expect(tripLengthDays('', '2027-03-18')).toBe(0);
    expect(tripLengthDays('2027-03-12', '')).toBe(0);
    expect(tripLengthDays('2027-03-18', '2027-03-12')).toBe(0);
  });
});

describe('splitting the days between stops', () => {
  it('reports under, exact and over', () => {
    expect(splitStatus([tokyo, seoul], 7)).toEqual({ placed: 7, left: 0, state: 'exact' });
    expect(splitStatus([tokyo], 7)).toEqual({ placed: 3, left: 4, state: 'under' });
    expect(splitStatus([{ ...tokyo, days: 5 }, seoul], 7)).toEqual({
      placed: 9,
      left: -2,
      state: 'over',
    });
  });

  it('gives each stop its own days, in order', () => {
    expect(stopDays([tokyo, seoul], '2027-03-12')).toEqual([
      { first: '2027-03-12', last: '2027-03-14' },
      { first: '2027-03-15', last: '2027-03-18' },
    ]);
  });

  it('carries stop days across a month and a year end', () => {
    expect(stopDays([tokyo, seoul], '2026-12-28')).toEqual([
      { first: '2026-12-28', last: '2026-12-30' },
      { first: '2026-12-31', last: '2027-01-03' },
    ]);
  });
});

describe('what is saved for each stop', () => {
  it('runs from its first day to the next stop’s first day; the last ends with the trip', () => {
    expect(stopRows([tokyo, seoul], '2027-03-12', '2027-03-18')).toEqual([
      { placeId: 'gn:1850147', startDate: '2027-03-12', endDate: '2027-03-15' },
      { placeId: 'gn:1835848', startDate: '2027-03-15', endDate: '2027-03-18' },
    ]);
  });

  it('a one-day last stop starts and ends on the trip’s last day', () => {
    const rows = stopRows(
      [
        { ...tokyo, days: 6 },
        { ...seoul, days: 1 },
      ],
      '2027-03-12',
      '2027-03-18',
    );
    expect(rows[1]).toEqual({
      placeId: 'gn:1835848',
      startDate: '2027-03-18',
      endDate: '2027-03-18',
    });
  });

  it('reads back on the trip screens as the right city each night', () => {
    const rows = stopRows([tokyo, seoul], '2027-03-12', '2027-03-18');
    const place = (id: string, name: string): [string, WherePlace] => [
      id,
      { id, name, kind: 'city', timeZone: null },
    ];
    const w = whereabouts({
      trip: {
        startDate: '2027-03-12',
        endDate: '2027-03-18',
        timeZone: 'Asia/Tokyo',
        destinationPlaceId: null,
      },
      bookings: [],
      stops: rows.map((r, i) => ({
        id: `s${i}`,
        kind: 'stay' as const,
        toPlaceId: null,
        label: null,
        ...r,
      })),
      places: new Map([place('gn:1850147', 'Tokyo'), place('gn:1835848', 'Seoul')]),
    });
    expect(w.nights.map((n) => [n.date, n.kind, n.placeId])).toEqual([
      ['2027-03-12', 'set', 'gn:1850147'],
      ['2027-03-13', 'set', 'gn:1850147'],
      ['2027-03-14', 'set', 'gn:1850147'],
      ['2027-03-15', 'set', 'gn:1835848'],
      ['2027-03-16', 'set', 'gn:1835848'],
      ['2027-03-17', 'set', 'gn:1835848'],
    ]);
    expect(w.days.at(-1)).toMatchObject({ date: '2027-03-18', placeId: 'gn:1835848' });
  });
});

describe('the automatic trip name', () => {
  it('one city: "{City} trip"', () => {
    expect(autoTripName([tokyo], [JP], '2027-03-12')).toBe('Tokyo trip');
  });

  it('several cities in one country: "{Country} Trip"', () => {
    expect(autoTripName([tokyo, kyoto], [JP], '2027-03-12')).toBe('Japan Trip');
  });

  it('several countries on one continent: "Exploring {Continent}"', () => {
    expect(autoTripName([tokyo, seoul], [JP, KR], '2027-03-12')).toBe('Exploring Asia');
  });

  it('otherwise the month of the first day: "{Month} Trip"', () => {
    expect(autoTripName([tokyo, paris], [JP, FR], '2027-03-12')).toBe('March Trip');
    expect(autoTripName([tokyo, seoul], [JP, { ...KR, continent: null }], '2026-12-28')).toBe(
      'December Trip',
    );
  });

  it('with nothing picked yet, or no date, still gives a name', () => {
    expect(autoTripName([], [], '2027-03-12')).toBe('March Trip');
    expect(autoTripName([], [], '')).toBe('New trip');
  });
});

describe('the trip’s destination', () => {
  it('one city: the city and its country, linked to the city', () => {
    expect(tripDestination([tokyo], [JP])).toEqual({
      destination: 'Tokyo, Japan',
      destinationPlaceId: 'gn:1850147',
    });
  });

  it('one country: the cities, linked to the country', () => {
    expect(tripDestination([tokyo, kyoto], [JP])).toEqual({
      destination: 'Tokyo, Kyoto',
      destinationPlaceId: 'ctry:JP',
    });
  });

  it('one continent: the cities, linked to the continent', () => {
    expect(tripDestination([tokyo, seoul], [JP, KR])).toEqual({
      destination: 'Tokyo, Seoul',
      destinationPlaceId: 'cont:AS',
    });
  });

  it('several continents: the cities, linked to nothing', () => {
    expect(tripDestination([tokyo, paris], [JP, FR])).toEqual({
      destination: 'Tokyo, Paris',
      destinationPlaceId: null,
    });
  });
});
