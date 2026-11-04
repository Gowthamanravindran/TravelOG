import { formatMoney, minorDigits, toMinor } from '@travelog/core';

export const CURRENCIES = [
  'INR',
  'USD',
  'EUR',
  'JPY',
  'THB',
  'AED',
  'SGD',
  'IDR',
  'VND',
  'LKR',
] as const;

export function money(minor: number, currency: string, showMinor = false): string {
  return formatMoney(minor, currency, { showMinor });
}

/** Parses what someone typed ("1,200.50") into minor units; null if it isn't a number. */
export function parseAmount(text: string, currency: string): number | null {
  const cleaned = text.replace(/[,\s₹$€¥]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return toMinor(n, currency);
}

export function amountText(minor: number | null | undefined, currency: string): string {
  if (minor == null) return '';
  const digits = minorDigits(currency);
  const v = minor / 10 ** digits;
  return Number.isInteger(v) ? String(v) : v.toFixed(digits);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** '2026-11-14' -> '14 Nov' */
export function shortDate(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}`;
}

/** '2026-11-14' -> 'Sat 14' */
export function dayChip(date: string): { weekday: string; day: string } {
  const d = new Date(`${date}T00:00:00Z`);
  return {
    weekday: DAYS[d.getUTCDay()] ?? '',
    day: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
  };
}

export function dateRange(start: string | null, end: string | null): string {
  if (!start || !end) return 'Dates not set';
  return start === end ? shortDate(start) : `${shortDate(start)} – ${shortDate(end)}`;
}

/** UTC ISO -> '14 Nov, 18:30' in the given time zone. */
export function dateTimeIn(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.charAt(0).toUpperCase() + msg.slice(1);
}
