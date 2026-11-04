import { minorDigits, type CurrencyCode } from './money';

/**
 * Currency conversion for expenses paid in another currency (docs/13 Phase 3).
 * A rate is "how many `to` for one `from`" in major units, e.g. USD→INR 83.2.
 */

/** Converts minor units of `from` into minor units of `to`, rounding to the nearest unit. */
export function convertMinor(
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number,
): number {
  if (!Number.isSafeInteger(amountMinor)) throw new RangeError('amount must be whole minor units');
  if (!Number.isFinite(rate) || rate <= 0) throw new RangeError('rate must be more than zero');
  if (from.toUpperCase() === to.toUpperCase()) return amountMinor;
  const major = amountMinor / 10 ** minorDigits(from);
  return Math.round(Number((major * rate * 10 ** minorDigits(to)).toFixed(6)));
}

/** Parses a typed rate such as "83.20" or "0,0123"; null if it isn't a positive number. */
export function parseRate(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Shows a rate with enough digits to be useful: 83.2 → "83.2", 0.012345 → "0.01235". */
export function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(2).replace(/\.?0+$/, '');
  return Number(rate.toPrecision(4)).toString();
}

export interface FxQuote {
  rate: number;
  /** Day the rate was published ('YYYY-MM-DD'). */
  date: string;
}

/**
 * Reads a Frankfurter (ECB reference rates) response:
 * { "amount": 1, "base": "USD", "date": "2026-11-03", "rates": { "INR": 83.2 } }
 */
export function quoteFromFrankfurter(json: unknown, from: string, to: string): FxQuote | null {
  if (!json || typeof json !== 'object') return null;
  const body = json as { base?: unknown; date?: unknown; rates?: unknown; amount?: unknown };
  if (body.base !== from || typeof body.date !== 'string') return null;
  const rates = body.rates as Record<string, unknown> | undefined;
  const value = rates?.[to];
  const amount = typeof body.amount === 'number' && body.amount > 0 ? body.amount : 1;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return { rate: value / amount, date: body.date };
}
