import { describe, expect, it } from 'vitest';

import { durationLabel, timeline } from './timeline';

describe('timeline', () => {
  it('counts time until the next check-in, and until now for the latest', () => {
    const t = timeline(
      [
        { id: 'b', at: '2026-11-12T06:30:00Z' },
        { id: 'a', at: '2026-11-12T05:00:00Z' },
        { id: 'c', at: '2026-11-12T08:00:00Z' },
      ],
      new Date('2026-11-12T08:25:00Z'),
    );
    expect(t.map((e) => [e.checkIn.id, e.minutes, e.ongoing])).toEqual([
      ['a', 90, false],
      ['b', 90, false],
      ['c', 25, true],
    ]);
  });

  it('leaves long gaps unknown', () => {
    const t = timeline(
      [
        { id: 'a', at: '2026-11-12T05:00:00Z' },
        { id: 'b', at: '2026-11-12T13:00:00Z' },
      ],
      new Date('2026-11-13T10:00:00Z'),
    );
    expect(t.map((e) => [e.minutes, e.ongoing])).toEqual([
      [null, false],
      [null, false],
    ]);
  });

  it('labels durations', () => {
    expect(durationLabel(40)).toBe('40 min');
    expect(durationLabel(60)).toBe('1 h');
    expect(durationLabel(95)).toBe('1 h 35 min');
  });
});
