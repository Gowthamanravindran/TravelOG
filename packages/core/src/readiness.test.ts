import { describe, expect, it } from 'vitest';

import { homeCountryFor, needsPermit, suggestReadyList } from './checklist-templates';
import { autoReadiness, readiness } from './readiness';
import { planReminders } from './reminders';

const trip = { startDate: '2026-12-12', endDate: '2026-12-18' };
const leg = (type: string, departDate: string) =>
  ({ type, departDate, arriveDate: departDate }) as never;
const noStay = {
  key: 'n',
  kind: 'noStay',
  startDate: '2026-12-17',
  endDate: '2026-12-18',
  placeId: null,
} as never;

/** Plan 61: Get ready. */
describe('items the app ticks itself', () => {
  const base = {
    trip,
    journeys: [],
    checks: [],
    hasStayBooking: false,
    budget: false,
    plan: false,
  };

  it('getting there and back needs a journey at each end', () => {
    const one = autoReadiness({ ...base, journeys: [leg('flight', '2026-12-12')] });
    expect(one[0]).toMatchObject({ done: false, detail: 'Add the way back' });
    const both = autoReadiness({
      ...base,
      journeys: [leg('flight', '2026-12-12'), leg('train', '2026-12-18')],
    });
    expect(both[0]!.done).toBe(true);
  });

  it('a stay every night needs stays and no gaps', () => {
    expect(autoReadiness(base)[1]!.detail).toBe('Add where you’ll stay');
    const gap = autoReadiness({ ...base, hasStayBooking: true, checks: [noStay] });
    expect(gap[1]).toMatchObject({ done: false, detail: '1 gap in your stays' });
    expect(autoReadiness({ ...base, hasStayBooking: true })[1]!.done).toBe(true);
  });

  it('counts with your own items, next is the soonest due', () => {
    const auto = autoReadiness({ ...base, budget: true });
    const r = readiness(auto, [
      { id: '1', title: 'Insurance', dueDate: '2026-12-10', doneAt: null },
      { id: '2', title: 'Visa', dueDate: '2026-11-28', doneAt: null },
      { id: '3', title: 'Forex', dueDate: null, doneAt: '2026-11-01T00:00:00Z' },
    ]);
    expect(r).toMatchObject({ done: 2, total: 7, next: { title: 'Visa', dueDate: '2026-11-28' } });
  });
});

describe('starting lists', () => {
  it('abroad, beach', () => {
    const titles = suggestReadyList({ abroad: true, kind: 'beach', permit: false }).map(
      (s) => s.title,
    );
    expect(titles).toEqual(expect.arrayContaining(['Visa', 'Travel insurance', 'Sunscreen']));
  });

  it('in India, mountains with a permit', () => {
    const titles = suggestReadyList({ abroad: false, kind: 'mountain', permit: true }).map(
      (s) => s.title,
    );
    expect(titles).toEqual(
      expect.arrayContaining(['ID cards for everyone', 'Inner Line Permit', 'Warm layers']),
    );
    expect(titles).not.toContain('Visa');
  });

  it('knows permit regions and home countries', () => {
    expect(needsPermit('IN', 'Ladakh')).toBe(true);
    expect(needsPermit('IN', 'Himachal Pradesh', 'Spiti Valley')).toBe(true);
    expect(needsPermit('IN', 'Goa')).toBe(false);
    expect(needsPermit('NP', 'Sikkim')).toBe(false);
    expect(homeCountryFor('INR')).toBe('IN');
    expect(homeCountryFor('XYZ')).toBeNull();
  });
});

describe('reminders for items with a due date', () => {
  const trips = [{ id: 't', title: 'Bali', timeZone: 'Asia/Kolkata' }];
  const at = (now: string) =>
    planReminders(
      {
        trips,
        bookings: [],
        items: [],
        polls: [],
        checklist: [{ id: 'v', tripId: 't', title: 'Visa', dueDate: '2026-11-28' }],
      },
      new Date(now),
    );

  it('3 days before at 09:00 trip time, else on the day', () => {
    expect(at('2026-11-01T00:00:00Z')[0]).toMatchObject({
      key: 'check:v',
      at: '2026-11-25T03:30:00.000Z',
      title: 'Get ready: Visa',
    });
    expect(at('2026-11-26T00:00:00Z')[0]!.at).toBe('2026-11-28T03:30:00.000Z');
    expect(at('2026-11-29T00:00:00Z')).toEqual([]);
  });
});
