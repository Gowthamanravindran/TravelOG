import { describe, expect, it } from 'vitest';

import { donutArcs } from './charts';

describe('donutArcs (Plan 47)', () => {
  it('splits the ring by value, leaving a gap after each slice', () => {
    const arcs = donutArcs([
      { key: 'stay', value: 300 },
      { key: 'food', value: 100 },
    ]);
    expect(arcs.map((a) => a.key)).toEqual(['stay', 'food']);
    expect(arcs[0]!.start).toBe(0);
    expect(arcs[0]!.sweep).toBeCloseTo(267);
    expect(arcs[1]!.start).toBeCloseTo(269);
    expect(arcs[1]!.sweep).toBeCloseTo(89);
    expect(arcs.reduce((a, x) => a + x.sweep, 0)).toBeCloseTo(356);
    expect(arcs.map((a) => a.share)).toEqual([0.75, 0.25]);
  });

  it('drops zeros, and one value is a whole ring', () => {
    expect(donutArcs([{ key: 'a', value: 0 }])).toEqual([]);
    expect(
      donutArcs([
        { key: 'a', value: 0 },
        { key: 'b', value: 5 },
      ]),
    ).toEqual([{ key: 'b', value: 5, share: 1, start: 0, sweep: 360 }]);
  });

  it('keeps a tiny slice visible', () => {
    const arcs = donutArcs([
      { key: 'big', value: 100000 },
      { key: 'tiny', value: 1 },
    ]);
    expect(arcs[1]!.sweep).toBeGreaterThanOrEqual(2.9);
    expect(arcs.reduce((a, x) => a + x.sweep, 0)).toBeCloseTo(356);
  });
});
