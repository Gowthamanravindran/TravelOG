import { distanceKm } from '@travelog/core';
import { describe, expect, it } from 'vitest';

import { cityById, cityPlaceId, countryCodeOnGlobe, searchCities, topCities } from './cities';

describe('city search', () => {
  it('finds cities by prefix, largest first, accents folded', () => {
    expect(searchCities('sao')[0]?.name).toBe('São Paulo');
    expect(searchCities('york').some((c) => c.name === 'New York City')).toBe(true);
    expect(searchCities('t')).toEqual([]); // under 2 letters
  });

  it('respects the limit', () => {
    expect(searchCities('san', 5)).toHaveLength(5);
  });
});

describe('top cities of a country', () => {
  it('are the largest in the country, spaced apart', () => {
    const jp = topCities('JP');
    expect(jp[0]?.name).toBe('Tokyo');
    expect(jp).toHaveLength(8);
    expect(jp.every((c) => c.countryCode === 'JP')).toBe(true);
    for (const a of jp)
      for (const b of jp) if (a !== b) expect(distanceKm(a, b)).toBeGreaterThanOrEqual(40);
  });

  it('copes with one-city and unknown countries', () => {
    expect(topCities('SG')).toHaveLength(1);
    expect(topCities('ZZ')).toEqual([]);
  });

  it('includes territories drawn under their parent country', () => {
    expect(countryCodeOnGlobe('RE')).toBe('FR');
    expect(topCities('FR', 200, 0).some((c) => c.countryCode === 'RE')).toBe(true);
  });
});

describe('city ids', () => {
  it('match the app place ids', () => {
    const tokyo = searchCities('tokyo')[0]!;
    expect(cityPlaceId(tokyo)).toBe('gn:1850147');
    expect(cityById('1850147')?.name).toBe('Tokyo');
    expect(cityById('nope')).toBeUndefined();
  });
});
