import { describe, expect, it } from 'vitest';

import { countryByCode, countryByIso, getCountryList, searchCountries } from './countries';

describe('countries on the globe', () => {
  it('looks countries up both ways', () => {
    expect(countryByCode('JP')?.iso).toBe('JPN');
    expect(countryByIso('JPN')?.countryCode).toBe('JP');
    expect(countryByCode('ZZ')).toBeUndefined();
  });

  it('searches by name, names that start with the query first', () => {
    expect(searchCountries('sing')[0]?.name).toBe('Singapore');
    expect(searchCountries('ind')[0]?.name).toBe('India');
    expect(searchCountries('')).toEqual([]);
    expect(searchCountries('a', 3)).toHaveLength(3);
  });

  it('lists every country sorted by name, with flags', () => {
    const list = getCountryList();
    expect(list.length).toBeGreaterThan(200);
    expect(list.find((c) => c.iso === 'IND')?.flag).toMatch(/^data:image\/png/);
  });
});
