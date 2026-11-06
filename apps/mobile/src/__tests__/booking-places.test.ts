import { emptyDraft, type Place } from '@travelog/core';
import { getPlace, savePlaces } from '@travelog/db';

import { findPlace, resolveDraftPlaces, setAirports } from '@/lib/booking-places';
import { makeDb } from '@/testing/test-utils';

jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));

const place = (p: Partial<Place> & Pick<Place, 'id' | 'name'>): Place => ({
  kind: 'city',
  countryCode: 'IN',
  countryName: 'India',
  region: null,
  continent: null,
  lat: null,
  lng: null,
  timeZone: 'Asia/Kolkata',
  currency: null,
  population: 1000,
  boost: 0,
  aliases: [],
  source: 'geonames',
  ...p,
});

function setup() {
  const db = makeDb();
  savePlaces(db, [
    place({ id: 'gn:blr', name: 'Bengaluru', aliases: ['Bangalore'] }),
    place({ id: 'adm1:goa', name: 'Goa', kind: 'region' }),
    place({ id: 'gn:vasco', name: 'Vasco da Gama' }),
    place({ id: 'gn:candolim', name: 'Candolim' }),
    // Every country is on the phone (seeded), so an address's country is always known.
    place({ id: 'ctry:IN', name: 'India', kind: 'country' }),
    place({ id: 'gn:goa-ph', name: 'Goa', countryCode: 'PH', countryName: 'Philippines' }),
    place({ id: 'gn:tokyo', name: 'Tokyo', countryCode: 'JP', timeZone: 'Asia/Tokyo' }),
    place({
      id: 'ctry:FR',
      name: 'France',
      kind: 'country',
      countryCode: 'FR',
      countryName: 'France',
    }),
    place({
      id: 'ctry:US',
      name: 'United States',
      kind: 'country',
      countryCode: 'US',
      countryName: 'United States',
    }),
    place({
      id: 'gn:paris-us',
      name: 'Paris',
      countryCode: 'US',
      countryName: 'United States',
      population: 25_000,
    }),
    place({
      id: 'gn:paris',
      name: 'Paris',
      countryCode: 'FR',
      countryName: 'France',
      population: 2_100_000,
    }),
    place({ id: 'gn:amsterdam', name: 'Amsterdam', countryCode: 'NL', countryName: 'Netherlands' }),
  ]);
  setAirports(
    new Map([
      ['BLR', { city: 'Bengaluru', country: 'IN', name: 'Kempegowda' }],
      ['GOI', { city: 'Vasco da Gama', country: 'IN', name: 'Dabolim' }],
      ['NRT', { city: 'Narita', country: 'JP', name: 'Narita International' }],
    ]),
  );
  return db;
}

describe('finding a ticket’s places (Plan 35)', () => {
  it('only takes exact names, in the right country, ignoring codes and numbers', async () => {
    const db = setup();
    expect((await findPlace(db, 'KSR Bengaluru (SBC)'))?.id).toBe('gn:blr');
    expect((await findPlace(db, 'Bangalore'))?.id).toBe('gn:blr');
    expect((await findPlace(db, 'Goa 403515', 'IN'))?.id).toBe('adm1:goa');
    expect(await findPlace(db, 'Gokarna')).toBeUndefined();
    expect(await findPlace(db, 'Beng')).toBeUndefined();
  });

  it('prefers the name printed on the ticket, else the airport’s town', async () => {
    const db = setup();
    const d = await resolveDraftPlaces(db, {
      ...emptyDraft(),
      type: 'flight',
      fromText: 'BLR',
      fromCode: 'BLR',
      toText: 'Goa',
      toCode: 'GOI',
    });
    expect(d).toMatchObject({
      fromPlaceId: 'gn:blr',
      toPlaceId: 'adm1:goa',
      fromText: 'Bengaluru',
    });
    expect(d.found).toContain('where');
  });

  it('shows the airport’s town when it isn’t in our list, without guessing a place', async () => {
    const db = setup();
    const d = await resolveDraftPlaces(db, {
      ...emptyDraft(),
      type: 'flight',
      fromText: 'NRT',
      fromCode: 'NRT',
    });
    expect(d).toMatchObject({ fromPlaceId: null, fromText: 'Narita' });
  });

  it('finds a hotel’s town from its address', async () => {
    const db = setup();
    const d = await resolveDraftPlaces(db, {
      ...emptyDraft(),
      type: 'stay',
      address: 'Candolim Beach Road, Candolim, Goa 403515, India',
    });
    expect(d.placeId).toBe('gn:candolim');
    expect(getPlace(db, d.placeId!)?.name).toBe('Candolim');
  });

  it('an address’s country decides which Paris it is (Plan 38)', async () => {
    const db = setup();
    const d = await resolveDraftPlaces(db, {
      ...emptyDraft(),
      type: 'stay',
      address: '35 Rue Yves Toudic, 10th arr., 75010 Paris, France',
    });
    expect(d.placeId).toBe('gn:paris');
    // Without a country in our list, a same-named town abroad is never picked by its country.
    expect((await findPlace(db, 'Paris', 'FR'))?.id).toBe('gn:paris');
    expect((await findPlace(db, 'Paris', 'US'))?.id).toBe('gn:paris-us');
  });

  it('station names find their city ("Amsterdam Centraal" → Amsterdam)', async () => {
    const db = setup();
    const d = await resolveDraftPlaces(db, {
      ...emptyDraft(),
      type: 'train',
      fromText: 'Paris Nord',
      toText: 'Amsterdam Centraal',
    });
    expect([d.fromPlaceId, d.toPlaceId]).toEqual(['gn:paris', 'gn:amsterdam']);
  });
});
