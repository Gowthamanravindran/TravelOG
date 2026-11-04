import { describe, expect, it } from 'vitest';
import {
  addDays,
  datesBetween,
  isLocalDate,
  localDateIn,
  localTimeIn,
  timeToMinutes,
} from './dates';
import { daysUntilStart, tripDayNumber, tripState } from './trips';

// 2026-11-04 20:00 UTC = 2026-11-05 01:30 in India
const at = new Date('2026-11-04T20:00:00Z');

describe('dates', () => {
  it('reads the calendar in the trip time zone', () => {
    expect(localDateIn('Asia/Kolkata', at)).toBe('2026-11-05');
    expect(localDateIn('UTC', at)).toBe('2026-11-04');
    expect(localTimeIn('Asia/Kolkata', at)).toBe('01:30');
  });

  it('validates and walks dates', () => {
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(datesBetween('2026-11-14', '2026-11-16')).toEqual([
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
    ]);
    expect(() => datesBetween('2026-11-16', '2026-11-14')).toThrow();
    expect(timeToMinutes('16:30')).toBe(990);
    expect(() => timeToMinutes('25:00')).toThrow();
  });
});

describe('tripState', () => {
  const trip = { startDate: '2026-11-05', endDate: '2026-11-09', timeZone: 'Asia/Kolkata' };

  it('uses the trip time zone, not the phone', () => {
    expect(tripState(trip, at)).toBe('live');
    expect(tripState({ ...trip, timeZone: 'UTC' }, at)).toBe('upcoming');
  });

  it('covers the whole lifecycle', () => {
    expect(tripState({ ...trip, startDate: null, endDate: null }, at)).toBe('planning');
    expect(tripState(trip, new Date('2026-10-01T00:00:00Z'))).toBe('upcoming');
    expect(tripState(trip, new Date('2026-11-20T00:00:00Z'))).toBe('completed');
    expect(tripState({ ...trip, endedAt: '2026-11-06T00:00:00Z' }, at)).toBe('completed');
    expect(tripState({ ...trip, archivedAt: '2026-12-01T00:00:00Z' }, at)).toBe('archived');
  });

  it('reports day numbers and countdown', () => {
    expect(tripDayNumber(trip, at)).toEqual({ day: 1, of: 5 });
    expect(daysUntilStart(trip, new Date('2026-11-01T06:00:00Z'))).toBe(4);
  });
});

describe('localToUtcIso', () => {
  it('converts trip-local times to UTC', async () => {
    const { localToUtcIso, timeZoneOffsetMinutes } = await import('./dates');
    expect(localToUtcIso('2026-11-14', '18:30', 'Asia/Kolkata')).toBe('2026-11-14T13:00:00.000Z');
    expect(localToUtcIso('2027-04-02', '09:00', 'Asia/Tokyo')).toBe('2027-04-02T00:00:00.000Z');
    expect(localToUtcIso('2026-07-01', '12:00', 'Europe/London')).toBe('2026-07-01T11:00:00.000Z');
    expect(timeZoneOffsetMinutes('Asia/Kolkata', new Date())).toBe(330);
  });
});
