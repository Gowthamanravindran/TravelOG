import { numberFormatter } from './intl';

/**
 * Money is always stored as an integer number of minor units (paise for INR,
 * cents for USD, yen for JPY) together with its currency code. Never use
 * floating-point rupees for stored amounts.
 */

export type CurrencyCode = string;

/** Minor-unit digits for currencies that differ from the ISO default of 2. */
const MINOR_DIGITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  IDR: 0,
  CLP: 0,
  ISK: 0,
  BHD: 3,
  KWD: 3,
  OMR: 3,
  JOD: 3,
  TND: 3,
};

export function minorDigits(currency: CurrencyCode): number {
  return MINOR_DIGITS[currency.toUpperCase()] ?? 2;
}

function assertMinor(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a whole number of minor units, got ${value}`);
  }
}

/** 199.99 INR -> 19999. Rounds half away from zero to the nearest minor unit. */
export function toMinor(major: number, currency: CurrencyCode): number {
  if (!Number.isFinite(major)) throw new RangeError(`amount must be finite, got ${major}`);
  const factor = 10 ** minorDigits(currency);
  // toFixed avoids binary artefacts such as 1.005 * 100 = 100.49999…
  const scaled = Number((Math.abs(major) * factor).toFixed(6));
  const rounded = Math.round(scaled);
  return major < 0 ? -rounded : rounded;
}

/** 19999 INR -> 199.99 */
export function fromMinor(minor: number, currency: CurrencyCode): number {
  assertMinor(minor, 'amount');
  return minor / 10 ** minorDigits(currency);
}

/** Formats for display, e.g. 123456700 INR -> "₹12,34,567.00" in en-IN. */
export function formatMoney(
  minor: number,
  currency: CurrencyCode,
  options: { locale?: string; showMinor?: boolean } = {},
): string {
  const { locale = 'en-IN', showMinor = true } = options;
  const digits = showMinor ? minorDigits(currency) : 0;
  return numberFormatter(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(fromMinor(minor, currency));
}

/**
 * Splits `total` minor units into `count` shares that add up exactly to `total`.
 * Leftover units go one each to the first shares, so callers should pass members
 * in a stable order (e.g. sorted by user id) to get the same result on every device.
 *
 * splitEqually(1000, 3) -> [334, 333, 333]
 */
export function splitEqually(total: number, count: number): number[] {
  assertMinor(total, 'total');
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new RangeError(`count must be a positive whole number, got ${count}`);
  }
  return splitByShares(
    total,
    Array.from({ length: count }, () => 1),
  );
}

/**
 * Splits `total` in proportion to `shares` (e.g. [2, 1, 1] = one person pays double),
 * using the largest-remainder method so the parts add up exactly to `total`.
 * Ties for leftover units go to the earlier share.
 *
 * splitByShares(1000, [2, 1, 1]) -> [500, 250, 250]
 */
export function splitByShares(total: number, shares: readonly number[]): number[] {
  assertMinor(total, 'total');
  if (shares.length === 0) throw new RangeError('shares must not be empty');
  for (const s of shares) {
    if (!Number.isFinite(s) || s < 0) throw new RangeError(`shares must be non-negative, got ${s}`);
  }
  const weight = shares.reduce((a, b) => a + b, 0);
  if (weight <= 0) throw new RangeError('at least one share must be greater than zero');

  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const exact = shares.map((s) => (abs * s) / weight);
  const parts = exact.map(Math.floor);
  let leftover = abs - parts.reduce((a, b) => a + b, 0);

  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (const { index } of order) {
    if (leftover === 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    leftover -= 1;
  }
  return parts.map((p) => p * sign);
}
