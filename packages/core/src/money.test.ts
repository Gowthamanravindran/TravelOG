import { describe, expect, it } from 'vitest';
import { formatMoney, fromMinor, splitByShares, splitEqually, toMinor } from './money';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('toMinor / fromMinor', () => {
  it('converts rupees to paise and back', () => {
    expect(toMinor(199.99, 'INR')).toBe(19999);
    expect(fromMinor(19999, 'INR')).toBe(199.99);
  });

  it('avoids floating-point artefacts', () => {
    expect(toMinor(1.005, 'INR')).toBe(101);
    expect(toMinor(0.1 + 0.2, 'INR')).toBe(30);
  });

  it('respects zero-decimal currencies', () => {
    expect(toMinor(1500, 'JPY')).toBe(1500);
    expect(fromMinor(1500, 'JPY')).toBe(1500);
  });

  it('handles negatives (refunds)', () => {
    expect(toMinor(-12.345, 'INR')).toBe(-1235);
  });

  it('rejects non-integer minor units', () => {
    expect(() => fromMinor(10.5, 'INR')).toThrow(RangeError);
  });
});

describe('formatMoney', () => {
  it('uses Indian digit grouping by default', () => {
    expect(formatMoney(123456700, 'INR')).toBe('₹12,34,567.00');
    expect(formatMoney(123456700, 'INR', { showMinor: false })).toBe('₹12,34,567');
  });
});

describe('splitEqually', () => {
  it('always adds up to the total', () => {
    for (const total of [0, 1, 999, 1000, 1001, 284_000, 6_200_00]) {
      for (const n of [1, 2, 3, 4, 7]) {
        const parts = splitEqually(total, n);
        expect(parts).toHaveLength(n);
        expect(sum(parts)).toBe(total);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives leftover paise to the first members', () => {
    expect(splitEqually(1000, 3)).toEqual([334, 333, 333]);
  });

  it('splits refunds the same way', () => {
    expect(splitEqually(-1000, 3)).toEqual([-334, -333, -333]);
  });

  it('rejects bad input', () => {
    expect(() => splitEqually(100, 0)).toThrow(RangeError);
    expect(() => splitEqually(10.5, 2)).toThrow(RangeError);
  });
});

describe('splitByShares', () => {
  it('splits in proportion', () => {
    expect(splitByShares(1000, [2, 1, 1])).toEqual([500, 250, 250]);
  });

  it('adds up exactly with awkward ratios', () => {
    const parts = splitByShares(100, [1, 1, 1, 1, 1, 1, 1]);
    expect(sum(parts)).toBe(100);
  });

  it('allows zero shares for people who are not paying', () => {
    expect(splitByShares(900, [1, 0, 2])).toEqual([300, 0, 600]);
  });

  it('rejects all-zero or negative shares', () => {
    expect(() => splitByShares(100, [0, 0])).toThrow(RangeError);
    expect(() => splitByShares(100, [1, -1])).toThrow(RangeError);
    expect(() => splitByShares(100, [])).toThrow(RangeError);
  });
});
