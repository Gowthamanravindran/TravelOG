import { describe, expect, it } from 'vitest';

import { convertMinor, formatRate, parseRate, quoteFromFrankfurter } from './fx';

describe('fx', () => {
  it('converts between currencies with different minor digits', () => {
    expect(convertMinor(1250, 'USD', 'INR', 83.2)).toBe(104000); // $12.50 → ₹1,040.00
    expect(convertMinor(1500, 'JPY', 'INR', 0.5612)).toBe(84180); // ¥1,500 → ₹841.80
    expect(convertMinor(100000, 'INR', 'JPY', 1.78)).toBe(1780); // ₹1,000 → ¥1,780
    expect(convertMinor(999, 'INR', 'INR', 2)).toBe(999);
    expect(() => convertMinor(100, 'USD', 'INR', 0)).toThrow();
  });

  it('parses and shows rates', () => {
    expect(parseRate(' 83,20 ')).toBe(83.2);
    expect(parseRate('abc')).toBeNull();
    expect(parseRate('-1')).toBeNull();
    expect(formatRate(83.2)).toBe('83.2');
    expect(formatRate(0.0123456)).toBe('0.01235');
    expect(formatRate(1780.5)).toBe('1780.5');
  });

  it('reads a Frankfurter response and rejects anything else', () => {
    const ok = { amount: 1, base: 'USD', date: '2026-11-03', rates: { INR: 83.2 } };
    expect(quoteFromFrankfurter(ok, 'USD', 'INR')).toEqual({ rate: 83.2, date: '2026-11-03' });
    expect(quoteFromFrankfurter(ok, 'EUR', 'INR')).toBeNull();
    expect(quoteFromFrankfurter(ok, 'USD', 'AED')).toBeNull();
    expect(quoteFromFrankfurter({ message: 'not found' }, 'USD', 'INR')).toBeNull();
    expect(quoteFromFrankfurter(null, 'USD', 'INR')).toBeNull();
  });
});
