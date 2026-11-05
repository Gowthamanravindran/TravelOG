import { describe, expect, it } from 'vitest';

import { monthGrid, monthTitle, rangeRole, shiftMonth, tapRange } from './calendar';

describe('calendar', () => {
  it('lays out a month in Monday-first weeks', () => {
    const g = monthGrid({ year: 2026, month: 11 }); // 1 Nov 2026 is a Sunday
    expect(g).toHaveLength(6);
    expect(g[0]!.map((d) => d.date)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
    expect(g[0]![6]).toEqual({ date: '2026-11-01', inMonth: true });
    expect(g.flat().filter((d) => d.inMonth)).toHaveLength(30);
  });

  it('handles leap years and year boundaries', () => {
    expect(
      monthGrid({ year: 2028, month: 2 })
        .flat()
        .filter((d) => d.inMonth),
    ).toHaveLength(29);
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthTitle({ year: 2026, month: 11 })).toBe('November 2026');
  });

  it('picks a range: start, end, restart', () => {
    let r = tapRange({ start: null, end: null }, '2026-11-15');
    expect(r).toEqual({ start: '2026-11-15', end: null });
    r = tapRange(r, '2026-12-15');
    expect(r).toEqual({ start: '2026-11-15', end: '2026-12-15' });
    expect(tapRange(r, '2026-11-20')).toEqual({ start: '2026-11-20', end: null });
    expect(tapRange({ start: '2026-11-15', end: null }, '2026-11-10')).toEqual({
      start: '2026-11-10',
      end: null,
    });
    expect(tapRange({ start: '2026-11-15', end: null }, '2026-11-15')).toEqual({
      start: '2026-11-15',
      end: '2026-11-15',
    });
  });

  it('marks start, end and the days between', () => {
    const r = { start: '2026-11-15', end: '2026-11-17' };
    expect(['14', '15', '16', '17', '18'].map((d) => rangeRole(r, `2026-11-${d}`))).toEqual([
      null,
      'start',
      'between',
      'end',
      null,
    ]);
    expect(rangeRole({ start: '2026-11-15', end: null }, '2026-11-15')).toBe('single');
  });
});
