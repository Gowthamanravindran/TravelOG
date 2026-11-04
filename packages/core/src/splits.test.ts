import { describe, expect, it } from 'vitest';
import { computeSplits } from './splits';

const total = (r: { shareMinor: number }[]) => r.reduce((a, b) => a + b.shareMinor, 0);
const four = ['a', 'b', 'c', 'd'].map((memberId) => ({ memberId }));

describe('computeSplits', () => {
  it('splits equally with leftover paise to the first people', () => {
    const r = computeSplits('equal', 1000, four.slice(0, 3));
    expect(r.map((x) => x.shareMinor)).toEqual([334, 333, 333]);
  });

  it('splits by shares', () => {
    const r = computeSplits('shares', 620000, [
      { memberId: 'a', weight: 2 },
      { memberId: 'b', weight: 1 },
      { memberId: 'c', weight: 1 },
    ]);
    expect(r.map((x) => x.shareMinor)).toEqual([310000, 155000, 155000]);
  });

  it('splits by percent and requires 100 %', () => {
    const r = computeSplits('percent', 10001, [
      { memberId: 'a', weight: 5000 },
      { memberId: 'b', weight: 2500 },
      { memberId: 'c', weight: 2500 },
    ]);
    expect(total(r)).toBe(10001);
    expect(() =>
      computeSplits('percent', 100, [
        { memberId: 'a', weight: 5000 },
        { memberId: 'b', weight: 4000 },
      ]),
    ).toThrow(/100 %/);
  });

  it('accepts exact amounts only when they add up', () => {
    const r = computeSplits('exact', 1000, [
      { memberId: 'a', weight: 700 },
      { memberId: 'b', weight: 300 },
    ]);
    expect(r.map((x) => x.shareMinor)).toEqual([700, 300]);
    expect(() =>
      computeSplits('exact', 1000, [
        { memberId: 'a', weight: 700 },
        { memberId: 'b', weight: 200 },
      ]),
    ).toThrow(/add up/);
  });

  it('rejects empty or duplicate people and missing weights', () => {
    expect(() => computeSplits('equal', 100, [])).toThrow();
    expect(() => computeSplits('equal', 100, [{ memberId: 'a' }, { memberId: 'a' }])).toThrow();
    expect(() => computeSplits('shares', 100, [{ memberId: 'a' }])).toThrow();
  });

  it('always adds up for many random equal and share splits', () => {
    for (let i = 0; i < 200; i++) {
      const amount = Math.floor(Math.random() * 1_000_000);
      const n = 1 + Math.floor(Math.random() * 8);
      const people = Array.from({ length: n }, (_, k) => ({
        memberId: `m${k}`,
        weight: 1 + (k % 3),
      }));
      expect(total(computeSplits('equal', amount, people))).toBe(amount);
      expect(total(computeSplits('shares', amount, people))).toBe(amount);
    }
  });
});
