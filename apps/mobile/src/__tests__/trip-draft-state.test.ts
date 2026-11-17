import type { City } from '@travelog/globe';

import { canGoNext, draftReducer, emptyDraft, type DraftState } from '@/lib/trip-draft-state';

const tokyo: City = { id: '1850147', name: 'Tokyo', countryCode: 'JP', lat: 35.69, lng: 139.69 };
const kyoto: City = { id: '1857910', name: 'Kyoto', countryCode: 'JP', lat: 35.02, lng: 135.75 };
const seoul: City = { id: '1835848', name: 'Seoul', countryCode: 'KR', lat: 37.57, lng: 126.98 };
const saintDenis: City = {
  id: '935264',
  name: 'Saint-Denis',
  countryCode: 'RE',
  lat: -20.88,
  lng: 55.45,
};

const run = (...actions: Parameters<typeof draftReducer>[1][]) =>
  actions.reduce(draftReducer, emptyDraft);
const withDates: DraftState = {
  ...emptyDraft,
  countries: ['JP', 'KR'],
  startDate: '2027-03-12',
  endDate: '2027-03-18',
};

describe('picking countries', () => {
  it('toggles a country, keeping pick order', () => {
    const s = run(
      { type: 'toggleCountry', code: 'JP' },
      { type: 'toggleCountry', code: 'KR' },
      { type: 'toggleCountry', code: 'JP' },
    );
    expect(s.countries).toEqual(['KR']);
  });

  it('removing a country removes its cities and their day counts', () => {
    const s = run(
      { type: 'addCity', city: tokyo },
      { type: 'addCity', city: seoul },
      { type: 'setDays', cityId: tokyo.id, days: 3 },
      { type: 'toggleCountry', code: 'JP' },
    );
    expect(s.countries).toEqual(['KR']);
    expect(s.cities.map((c) => c.name)).toEqual(['Seoul']);
    expect(s.days).toEqual({});
  });
});

describe('picking cities', () => {
  it('adding a city adds its country', () => {
    const s = run({ type: 'addCity', city: tokyo });
    expect(s.countries).toEqual(['JP']);
    expect(s.cities).toEqual([tokyo]);
  });

  it('a territory drawn under a parent country adds the parent', () => {
    expect(run({ type: 'addCity', city: saintDenis }).countries).toEqual(['FR']);
  });

  it('the same city twice is one stop, even as a different object with the same id', () => {
    const fromServer: City = { ...tokyo, name: 'Tōkyō', lat: 35.6895, lng: 139.6917 };
    const s = run({ type: 'addCity', city: tokyo }, { type: 'addCity', city: fromServer });
    expect(s.cities).toEqual([tokyo]);
  });

  it('toggling adds, then removes, and keeps tap order as visit order', () => {
    const s = run(
      { type: 'toggleCity', city: kyoto },
      { type: 'toggleCity', city: tokyo },
      { type: 'toggleCity', city: seoul },
      { type: 'toggleCity', city: tokyo },
    );
    expect(s.cities.map((c) => c.name)).toEqual(['Kyoto', 'Seoul']);
    // Removing a city keeps its country picked.
    expect(s.countries).toEqual(['JP', 'KR']);
  });
});

describe('dates, days and the name', () => {
  it('sets dates', () => {
    const s = run({ type: 'setDates', start: '2027-03-12', end: '' });
    expect([s.startDate, s.endDate]).toEqual(['2027-03-12', '']);
  });

  it('never lets a stop have less than one day', () => {
    const s = run({ type: 'addCity', city: tokyo }, { type: 'setDays', cityId: tokyo.id, days: 0 });
    expect(s.days[tokyo.id]).toBe(1);
  });

  it('a typed name sticks; clearing it goes back to the automatic one', () => {
    expect(run({ type: 'setName', name: 'Cherry blossoms' }).name).toBe('Cherry blossoms');
    expect(
      run({ type: 'setName', name: 'Cherry blossoms' }, { type: 'setName', name: '' }).name,
    ).toBeNull();
  });
});

describe('starting again', () => {
  it('reset forgets everything', () => {
    expect(run({ type: 'addCity', city: tokyo }, { type: 'next' }, { type: 'reset' })).toEqual(
      emptyDraft,
    );
  });
});

describe('moving between steps', () => {
  it('goes countries → dates → cities → days and back', () => {
    let s = draftReducer(withDates, { type: 'next' });
    expect(s.step).toBe('dates');
    s = draftReducer(s, { type: 'next' });
    expect(s.step).toBe('cities');
    s = draftReducer(draftReducer(s, { type: 'addCity', city: tokyo }), { type: 'next' });
    expect(s.step).toBe('days');
    s = draftReducer(s, { type: 'back' });
    expect(s.step).toBe('cities');
    s = draftReducer(draftReducer(s, { type: 'back' }), { type: 'back' });
    expect(s.step).toBe('countries');
    expect(draftReducer(s, { type: 'back' }).step).toBe('countries');
  });

  it('does not move on until the step is done', () => {
    expect(canGoNext(emptyDraft)).toBe(false);
    expect(draftReducer(emptyDraft, { type: 'next' }).step).toBe('countries');
    const dates = { ...withDates, step: 'dates' as const, endDate: '' };
    expect(canGoNext(dates)).toBe(false);
    expect(draftReducer(dates, { type: 'next' }).step).toBe('dates');
    const cities = { ...withDates, step: 'cities' as const };
    expect(canGoNext(cities)).toBe(false);
  });

  it('a country with no city is left out when moving on to the days', () => {
    const s = draftReducer(
      draftReducer({ ...withDates, step: 'cities' }, { type: 'addCity', city: tokyo }),
      { type: 'next' },
    );
    expect(s.step).toBe('days');
    expect(s.countries).toEqual(['JP']);
    expect(s.dropped).toEqual(['KR']);
  });

  it('going back from the days brings the left-out countries back', () => {
    const days = draftReducer(
      draftReducer({ ...withDates, step: 'cities' }, { type: 'addCity', city: tokyo }),
      { type: 'next' },
    );
    const back = draftReducer(days, { type: 'back' });
    expect(back.countries).toEqual(['JP', 'KR']);
    expect(back.dropped).toEqual([]);
  });

  it('the trip can only be made when the days match exactly', () => {
    const base = draftReducer(
      draftReducer({ ...withDates, step: 'cities' }, { type: 'addCity', city: tokyo }),
      { type: 'addCity', city: seoul },
    );
    const at = (tokyoDays: number, seoulDays: number) =>
      [
        { type: 'next' as const },
        { type: 'setDays' as const, cityId: tokyo.id, days: tokyoDays },
        { type: 'setDays' as const, cityId: seoul.id, days: seoulDays },
      ].reduce(draftReducer, base);
    expect(canGoNext(at(3, 2))).toBe(false); // 5 of 7
    expect(canGoNext(at(5, 4))).toBe(false); // 9 of 7
    expect(canGoNext(at(3, 4))).toBe(true); // 7 of 7
  });
});
