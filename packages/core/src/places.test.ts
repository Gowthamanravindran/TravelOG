import { describe, expect, it } from 'vitest';

import {
  currencyLabel,
  normalizePlace,
  placeFromServerRow,
  placeLabel,
  placesFromCompact,
  placeText,
  rankPlaces,
  timeZoneLabel,
  type Place,
} from './places';

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
  continent: 'Asia',
  timeZone: 'Asia/Tokyo',
  currency: 'JPY',
  population: 8_336_599,
});
const TOKUSHIMA = place({
  id: 'gn:1850158',
  name: 'Tokushima',
  kind: 'city',
  countryCode: 'JP',
  countryName: 'Japan',
  population: 267_345,
});
const JAPAN = place({
  id: 'ctry:JP',
  name: 'Japan',
  kind: 'country',
  countryCode: 'JP',
  countryName: 'Japan',
  continent: 'Asia',
  currency: 'JPY',
  population: 126_000_000,
});
const ASIA = place({ id: 'cont:AS', name: 'Asia', kind: 'continent', population: 4_500_000_000 });
const GOA_IN = place({
  id: 'gn:1271157',
  name: 'Goa',
  kind: 'region',
  countryCode: 'IN',
  countryName: 'India',
  population: 1_457_723,
});
const GOA_PH = place({
  id: 'gn:1712961',
  name: 'Goa',
  kind: 'city',
  countryCode: 'PH',
  countryName: 'Philippines',
  population: 60_000,
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
const SAO = place({
  id: 'gn:3448439',
  name: 'São Paulo',
  kind: 'city',
  countryCode: 'BR',
  countryName: 'Brazil',
  population: 10_021_295,
});

const names = (ps: Place[]) => ps.map((p) => p.id);

describe('places', () => {
  it('normalizes case, accents and spacing', () => {
    expect(normalizePlace('  São   Paulo ')).toBe('sao paulo');
    expect(normalizePlace('Kodagu (Coorg)')).toBe('kodagu coorg');
  });

  it('ranks a prefix match by size: "Tok" gives Tokyo before Tokushima', () => {
    expect(names(rankPlaces([TOKUSHIMA, TOKYO], 'Tok'))).toEqual(['gn:1850147', 'gn:1850158']);
  });

  it('puts the home country first: "goa" gives Goa, India first', () => {
    expect(names(rankPlaces([GOA_PH, GOA_IN], 'goa', { homeCountry: 'IN' }))[0]).toBe('gn:1271157');
  });

  it('matches aliases and old names (Bangalore → Bengaluru) and accents', () => {
    expect(names(rankPlaces([BENGALURU, TOKYO], 'bangal'))).toEqual(['gn:1277333']);
    expect(names(rankPlaces([SAO], 'sao pa'))).toEqual(['gn:3448439']);
  });

  it('finds countries and continents, and drops non-matches', () => {
    expect(names(rankPlaces([TOKYO, JAPAN, ASIA], 'japan'))).toEqual(['ctry:JP']);
    expect(names(rankPlaces([TOKYO, JAPAN, ASIA], 'asi'))).toEqual(['cont:AS']);
    expect(rankPlaces([TOKYO], 'x')).toEqual([]);
  });

  it('labels places as "Tokyo · Japan"', () => {
    expect(placeLabel(TOKYO)).toEqual({ title: 'Tokyo', subtitle: 'Japan' });
    expect(placeLabel(JAPAN)).toEqual({ title: 'Japan', subtitle: 'Asia' });
    expect(placeLabel(ASIA)).toEqual({ title: 'Asia', subtitle: 'Continent' });
    expect(placeText(TOKYO)).toBe('Tokyo, Japan');
    expect(placeText(JAPAN)).toBe('Japan');
  });

  it('describes time zones and currencies in plain words', () => {
    const jan = new Date('2026-01-15T00:00:00Z');
    expect(timeZoneLabel('Asia/Tokyo', 'Japan', jan)).toBe('Japan time (GMT+9)');
    expect(timeZoneLabel('Asia/Kolkata', 'India', jan)).toBe('India time (GMT+5:30)');
    expect(timeZoneLabel('Europe/London', null, jan)).toBe('London time (GMT)');
    expect(currencyLabel('JPY')).toBe('Japanese Yen (JPY)');
    expect(currencyLabel('ZZZ')).toBe('ZZZ');
  });
});

describe('places data formats', () => {
  it('reads the compact seed file', () => {
    const file = {
      version: '2026-11-06',
      columns: [
        'id',
        'kind',
        'name',
        'countryCode',
        'countryName',
        'region',
        'continent',
        'lat',
        'lng',
        'timeZone',
        'currency',
        'population',
        'boost',
        'aliases',
        'source',
      ],
      rows: [
        [
          'gn:1277333',
          'city',
          'Bengaluru',
          'IN',
          'India',
          'Karnataka',
          'Asia',
          12.97,
          77.59,
          'Asia/Kolkata',
          'INR',
          8443675,
          0,
          'Bangalore|Bangalor',
          'geonames',
        ],
      ],
    };
    const { version, places } = placesFromCompact(file);
    expect(version).toBe('2026-11-06');
    expect(places[0]).toMatchObject({
      id: 'gn:1277333',
      aliases: ['Bangalore', 'Bangalor'],
      timeZone: 'Asia/Kolkata',
    });
  });

  it('reads a row from our server', () => {
    expect(
      placeFromServerRow({
        id: 'osm:N245678',
        kind: 'city',
        name: 'Hampi',
        country_code: 'IN',
        country_name: 'India',
        region: 'Karnataka',
        continent: 'Asia',
        lat: 15.335,
        lng: 76.46,
        time_zone: 'Asia/Kolkata',
        currency: 'INR',
        population: 0,
        boost: 0,
        aliases: [],
        source: 'osm',
        search: 'hampi',
      }),
    ).toEqual(
      expect.objectContaining({
        id: 'osm:N245678',
        countryCode: 'IN',
        timeZone: 'Asia/Kolkata',
        currency: 'INR',
        source: 'osm',
      }),
    );
    expect(placeFromServerRow({ id: 'x', kind: 'street' })).toBeNull();
  });
});
