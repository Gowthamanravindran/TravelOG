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
  const parts = new Intl.DateTimeFormat('en-CA', {
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
  const parts = new Intl.DateTimeFormat('en-GB', {
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
