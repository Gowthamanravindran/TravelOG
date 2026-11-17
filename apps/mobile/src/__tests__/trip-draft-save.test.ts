import { stopRows, type Place } from '@travelog/core';
import { savePlaces } from '@travelog/db';
import type { City } from '@travelog/globe';

import { draftCountries, draftStops, draftToSave } from '@/lib/trip-draft-save';
import { makeDb } from '@/testing/test-utils';

const tokyo: City = { id: '1850147', name: 'Tokyo', countryCode: 'JP', lat: 35.69, lng: 139.69 };
const seoul: City = { id: '1835848', name: 'Seoul', countryCode: 'KR', lat: 37.57, lng: 126.98 };
const saintDenis: City = {
  id: '935264',
  name: 'Saint-Denis',
  countryCode: 'RE',
  lat: -20.88,
  lng: 55.45,
};
const nowhere: City = { id: '1', name: 'Atlantis', countryCode: 'ZZ', lat: 0, lng: 0 };

const country = (
  code: string,
  name: string,
  continent: string,
  currency: string,
  timeZone: string,
): Place => ({
  id: `ctry:${code}`,
  kind: 'country',
  name,
  countryCode: code,
  countryName: name,
  region: null,
  continent,
  lat: 0,
  lng: 0,
  timeZone,
  currency,
  population: 1,
  boost: 0,
  aliases: [],
  source: 'geonames',
});

function db() {
  const d = makeDb();
  savePlaces(d, [
    country('JP', 'Japan', 'Asia', 'JPY', 'Asia/Tokyo'),
    country('KR', 'South Korea', 'Asia', 'KRW', 'Asia/Seoul'),
    country('FR', 'France', 'Europe', 'EUR', 'Europe/Paris'),
  ]);
  return d;
}
const draft = (cities: City[], days: Record<string, number> = {}) => ({
  name: null,
  startDate: '2027-03-12',
  endDate: '2027-03-18',
  cities,
  days,
});

describe('turning a globe draft into a trip (Plan 67)', () => {
  it('names it, links it and gives each city its saved dates', () => {
    const d = db();
    const days = { '1850147': 3, '1835848': 4 };
    const out = draftToSave(d, draft([tokyo, seoul], days), { homeCurrency: 'INR' });
    expect(out.input).toMatchObject({
      title: 'Exploring Asia',
      destination: 'Tokyo, Seoul',
      destinationPlaceId: 'cont:AS',
      startDate: '2027-03-12',
      endDate: '2027-03-18',
      currency: 'JPY',
      timeZone: 'Asia/Tokyo',
      emoji: 'trips',
    });
    expect(out.stops).toEqual(
      stopRows(draftStops(draft([tokyo, seoul], days)), '2027-03-12', '2027-03-18'),
    );
    expect(out.places.map((p) => [p.id, p.kind, p.countryName, p.continent, p.lat, p.lng])).toEqual(
      [
        ['gn:1850147', 'city', 'Japan', 'Asia', 35.69, 139.69],
        ['gn:1835848', 'city', 'South Korea', 'Asia', 37.57, 126.98],
      ],
    );
  });

  it('keeps a name the person typed, and counts a missing day count as one day', () => {
    const out = draftToSave(db(), { ...draft([tokyo]), name: 'Cherry blossoms' }, {});
    expect(out.input.title).toBe('Cherry blossoms');
    expect(draftStops(draft([tokyo, seoul], { '1835848': 6 })).map((s) => s.days)).toEqual([1, 6]);
  });

  it('does not save a place the phone already has', () => {
    const d = db();
    savePlaces(d, [
      { ...country('JP', 'Tokyo', 'Asia', 'JPY', 'Asia/Tokyo'), id: 'gn:1850147', kind: 'city' },
    ]);
    const out = draftToSave(d, draft([tokyo, seoul]), {});
    expect(out.places.map((p) => p.id)).toEqual(['gn:1835848']);
  });

  it('a territory drawn under its parent country counts as that country', () => {
    const d = db();
    expect(draftCountries(d, [saintDenis])).toEqual([
      { code: 'FR', name: 'France', continent: 'Europe' },
    ]);
    const out = draftToSave(d, draft([saintDenis]), { homeCurrency: 'INR' });
    expect(out.input).toMatchObject({ title: 'Saint-Denis trip', currency: 'EUR' });
    expect(out.places[0]).toMatchObject({ countryCode: 'FR', countryName: 'France' });
  });

  it('a country the phone knows nothing about still saves, in the home currency', () => {
    const out = draftToSave(db(), draft([nowhere]), { homeCurrency: 'INR' });
    expect(out.input).toMatchObject({ title: 'Atlantis trip', currency: 'INR' });
    expect(out.input.timeZone).toBeTruthy();
    expect(out.places[0]).toMatchObject({ countryName: null, continent: null, currency: null });
    expect(draftToSave(db(), draft([nowhere]), {}).input.currency).toBe('INR');
  });
});
