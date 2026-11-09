import { dateFormatter } from './intl';

/**
 * Calendar helpers. Trip dates are local calendar dates ('YYYY-MM-DD') in the
 * trip's IANA time zone; instants are stored as UTC ISO strings.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** The calendar date at `at` in `timeZone`, e.g. localDateIn('Asia/Kolkata', now) -> '2026-11-04'. */
export function localDateIn(timeZone: string, at: Date = new Date()): string {
  const parts = dateFormatter('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The wall-clock time 'HH:MM' at `at` in `timeZone`. */
export function localTimeIn(timeZone: string, at: Date = new Date()): string {
  const parts = dateFormatter('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('hour')}:${get('minute')}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of dates from start to end. Capped to protect against bad input. */
export function datesBetween(start: string, end: string, max = 90): string[] {
  if (!isLocalDate(start) || !isLocalDate(end)) throw new RangeError('dates must be YYYY-MM-DD');
  if (end < start) throw new RangeError('end date is before start date');
  const out: string[] = [];
  for (let d = start; d <= end && out.length < max; d = addDays(d, 1)) out.push(d);
  return out;
}

export function daysBetween(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** 'HH:MM' -> minutes after midnight. */
export function timeToMinutes(time: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) throw new RangeError(`time must be HH:MM, got ${time}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new RangeError(`time must be HH:MM, got ${time}`);
  return h * 60 + min;
}

/** Offset of `timeZone` from UTC at instant `at`, in minutes (e.g. +330 for India). */
export function timeZoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = dateFormatter('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** A wall-clock date and time in `timeZone` -> UTC ISO string. */
export function localToUtcIso(date: string, time: string, timeZone: string): string {
  if (!isLocalDate(date)) throw new RangeError('date must be YYYY-MM-DD');
  const minutes = timeToMinutes(time);
  const naive = Date.parse(`${date}T00:00:00Z`) + minutes * 60000;
  let guess = naive - timeZoneOffsetMinutes(timeZone, new Date(naive)) * 60000;
  // Second pass handles days when the offset changes (daylight saving).
  guess = naive - timeZoneOffsetMinutes(timeZone, new Date(guess)) * 60000;
  return new Date(guess).toISOString();
}
