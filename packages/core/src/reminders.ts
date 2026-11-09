import { dateFormatter } from './intl';
import { localToUtcIso } from './dates';

/**
 * Local reminders (docs/01 §11). Pure planning: the app turns the result into
 * scheduled notifications. Times in, times out are UTC ISO strings.
 */

export interface ReminderTrip {
  id: string;
  title: string;
  timeZone: string;
}

export interface ReminderBooking {
  id: string;
  tripId: string;
  type: string;
  title: string;
  startsAt: string | null;
}

export interface ReminderItem {
  id: string;
  tripId: string;
  title: string;
  /** Local date of the day ('YYYY-MM-DD') in the trip's time zone. */
  dayDate: string;
  /** Local start time 'HH:MM', or null for untimed items. */
  startTime: string | null;
}

export interface ReminderPoll {
  id: string;
  tripId: string;
  question: string;
  deadline: string | null;
  locked: boolean;
}

export interface Reminder {
  /** Stable key, so re-planning gives the same reminder the same identity. */
  key: string;
  tripId: string;
  at: string;
  title: string;
  body: string;
}

export interface ReminderInput {
  trips: readonly ReminderTrip[];
  bookings: readonly ReminderBooking[];
  items: readonly ReminderItem[];
  polls: readonly ReminderPoll[];
}

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** How long before departure to remind, by booking type. */
const BOOKING_LEAD: Record<string, number> = {
  flight: 3 * HOUR,
  train: 3 * HOUR,
  bus: 3 * HOUR,
};
const DEFAULT_BOOKING_LEAD = 1 * HOUR;
const ITEM_LEAD = 30 * MINUTE;
const POLL_LEAD = 1 * HOUR;

/** Phones limit pending notifications (iOS: 64); keep room for others. */
export const MAX_REMINDERS = 50;

function minus(iso: string, ms: number): string {
  return new Date(Date.parse(iso) - ms).toISOString();
}

function timeLabel(iso: string, timeZone: string): string {
  return dateFormatter('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

/** Reminders after `now`, earliest first, at most `limit`. */
export function planReminders(
  input: ReminderInput,
  now: Date,
  limit: number = MAX_REMINDERS,
): Reminder[] {
  const trips = new Map(input.trips.map((t) => [t.id, t]));
  const out: Reminder[] = [];

  for (const b of input.bookings) {
    const trip = trips.get(b.tripId);
    if (!trip || !b.startsAt || Number.isNaN(Date.parse(b.startsAt))) continue;
    const lead = BOOKING_LEAD[b.type] ?? DEFAULT_BOOKING_LEAD;
    out.push({
      key: `booking:${b.id}`,
      tripId: trip.id,
      at: minus(b.startsAt, lead),
      title: b.title,
      body: `${trip.title} · starts at ${timeLabel(b.startsAt, trip.timeZone)}. Tickets are in the app.`,
    });
  }

  for (const i of input.items) {
    const trip = trips.get(i.tripId);
    if (!trip || !i.startTime) continue;
    let starts: string;
    try {
      starts = localToUtcIso(i.dayDate, i.startTime, trip.timeZone);
    } catch {
      continue;
    }
    out.push({
      key: `item:${i.id}`,
      tripId: trip.id,
      at: minus(starts, ITEM_LEAD),
      title: `Next: ${i.title}`,
      body: `${trip.title} · at ${i.startTime}`,
    });
  }

  for (const p of input.polls) {
    const trip = trips.get(p.tripId);
    if (!trip || p.locked || !p.deadline || Number.isNaN(Date.parse(p.deadline))) continue;
    out.push({
      key: `poll:${p.id}`,
      tripId: trip.id,
      at: minus(p.deadline, POLL_LEAD),
      title: 'Poll closes in 1 hour',
      body: `${trip.title} · ${p.question}`,
    });
  }

  const cutoff = now.getTime();
  return out
    .filter((r) => Date.parse(r.at) > cutoff)
    .sort((a, b) => a.at.localeCompare(b.at) || a.key.localeCompare(b.key))
    .slice(0, limit);
}
