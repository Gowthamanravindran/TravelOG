import { afterEach, describe, expect, it } from 'vitest';

import { dayBookings } from './day-bookings';
import { localDateIn, localTimeIn, localToUtcIso } from './dates';
import { formatMoney } from './money';
import { planChecks, whereabouts, type WhereBooking, type WherePlace } from './whereabouts';

/**
 * Plan 45: time-zone formatters are slow to build on a phone, so each one is
 * built once and reused. A trip's itinerary builds one per zone, not one per call.
 */

const places = new Map<string, WherePlace>([
  ['maa', { id: 'maa', name: 'Chennai', kind: 'city', timeZone: 'Asia/Kolkata' }],
  ['par', { id: 'par', name: 'Paris', kind: 'city', timeZone: 'Europe/Paris' }],
  ['ams', { id: 'ams', name: 'Amsterdam', kind: 'city', timeZone: 'Europe/Amsterdam' }],
  ['tos', { id: 'tos', name: 'Tromsø', kind: 'city', timeZone: 'Europe/Oslo' }],
]);
const j = (id: string, from: string, to: string, s: string, e: string): WhereBooking => ({
  id,
  type: 'flight',
  title: id,
  startsAt: s,
  endsAt: e,
  fromPlaceId: from,
  toPlaceId: to,
  placeId: null,
});
const stay = (id: string, at: string, s: string, e: string): WhereBooking => ({
  id,
  type: 'stay',
  title: id,
  startsAt: s,
  endsAt: e,
  fromPlaceId: null,
  toPlaceId: null,
  placeId: at,
});
const bookings = [
  j('f1', 'maa', 'par', '2026-12-20T02:30:00Z', '2026-12-20T16:55:00Z'),
  stay('h1', 'par', '2026-12-20T14:00:00Z', '2026-12-24T10:30:00Z'),
  j('t1', 'par', 'ams', '2026-12-24T11:22:00Z', '2026-12-24T14:50:00Z'),
  stay('h2', 'ams', '2026-12-24T14:00:00Z', '2026-12-26T10:00:00Z'),
  j('f2', 'ams', 'tos', '2026-12-26T12:00:00Z', '2026-12-26T18:00:00Z'),
  stay('h3', 'tos', '2026-12-26T15:00:00Z', '2027-01-02T10:00:00Z'),
  j('f3', 'tos', 'maa', '2027-01-02T17:00:00Z', '2027-01-03T10:00:00Z'),
];
const inputs = {
  trip: {
    startDate: '2026-12-20',
    endDate: '2027-01-03',
    timeZone: 'Asia/Kolkata',
    destinationPlaceId: null,
  },
  bookings,
  stops: [],
  places,
};

/** Counts how many formatters of one kind get built. */
function countBuilds(kind: 'DateTimeFormat' | 'NumberFormat') {
  const Real = Intl[kind] as unknown as new (...a: unknown[]) => object;
  const counter = { n: 0, restore: () => void (Intl[kind] = Real as never) };
  Intl[kind] = class extends Real {
    constructor(...a: unknown[]) {
      super(...a);
      counter.n++;
    }
  } as never;
  restores.push(counter.restore);
  return counter;
}
const restores: (() => void)[] = [];

describe('formatters are reused (Plan 45)', () => {
  afterEach(() => restores.splice(0).forEach((r) => r()));

  it('builds at most one date formatter per time zone for a whole itinerary', () => {
    const built = countBuilds('DateTimeFormat');
    const w = whereabouts(inputs);
    planChecks(inputs, w);
    for (const n of w.nights) dayBookings(inputs, n.date);
    localDateIn('Asia/Kolkata');
    // Two kinds (date, time) for each of the 5 zones, at most.
    expect(built.n).toBeLessThanOrEqual(10);
  });

  it('reuses money formatters', () => {
    const built = countBuilds('NumberFormat');
    for (let i = 0; i < 20; i++) formatMoney(1000 * i, 'INR');
    expect(built.n).toBeLessThanOrEqual(1);
  });

  it('gives the same answers as before', () => {
    const at = new Date('2026-12-20T23:30:00Z');
    expect(localDateIn('Asia/Kolkata', at)).toBe('2026-12-21');
    expect(localTimeIn('Europe/Paris', at)).toBe('00:30');
    expect(localToUtcIso('2026-12-24', '12:22', 'Europe/Paris')).toBe('2026-12-24T11:22:00.000Z');
    expect(formatMoney(123456700, 'INR')).toBe('₹12,34,567.00');
  });
});
