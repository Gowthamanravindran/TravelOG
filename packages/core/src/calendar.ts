import { addDays } from './dates';

/**
 * Calendar maths for the date picker (Plan 18). Dates are local calendar days
 * 'YYYY-MM-DD'; weeks start on Monday (as in India and most of Europe).
 */

export interface CalendarDay {
  date: string;
  /** False for the leading/trailing days of the neighbouring months. */
  inMonth: boolean;
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** '2026-11' style month key for a date. */
export function monthOf(date: string): { year: number; month: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

export function shiftMonth(
  m: { year: number; month: number },
  by: number,
): { year: number; month: number } {
  const index = m.year * 12 + (m.month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthTitle(m: { year: number; month: number }): string {
  return `${MONTHS[m.month - 1]} ${m.year}`;
}

/** Six weeks × seven days covering the month, Monday first. */
export function monthGrid(m: { year: number; month: number }): CalendarDay[][] {
  const first = `${m.year}-${pad(m.month)}-01`;
  // getUTCDay: 0 = Sunday … 6 = Saturday → Monday-based offset.
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  let day = addDays(first, -weekday);
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: day, inMonth: monthOf(day).month === m.month });
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

/**
 * Tapping a day while picking a range: the first tap sets the start; the next
 * tap on or after it sets the end; a tap before the start, or any tap once both
 * are set, starts a new range.
 */
export function tapRange(range: DateRange, tapped: string): DateRange {
  if (!range.start || range.end) return { start: tapped, end: null };
  if (tapped < range.start) return { start: tapped, end: null };
  return { start: range.start, end: tapped };
}

/** Where a day sits relative to a range, for drawing it. */
export function rangeRole(
  range: DateRange,
  date: string,
): 'start' | 'end' | 'single' | 'between' | null {
  const { start, end } = range;
  if (!start) return null;
  if (!end) return date === start ? 'single' : null;
  if (date === start && date === end) return 'single';
  if (date === start) return 'start';
  if (date === end) return 'end';
  return date > start && date < end ? 'between' : null;
}
