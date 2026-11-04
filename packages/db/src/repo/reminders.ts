import { planReminders, type Reminder, type ReminderInput } from '@travelog/core';
import { inArray } from 'drizzle-orm';

import { liveRows, now, type Db } from '../db';
import { bookings, itineraryItems, planVariants, polls } from '../schema';
import { listTrips } from './trips';

/** Everything reminders are planned from, for trips that haven't ended. */
export function reminderSources(db: Db, at: Date = now()): ReminderInput {
  const trips = listTrips(db, at).filter((t) => t.state !== 'completed' && t.state !== 'archived');
  const ids = trips.map((t) => t.id);
  if (!ids.length) return { trips: [], bookings: [], items: [], polls: [] };

  // Only the main plan of each day reminds; Plan B/C are alternatives.
  const variants = liveRows(db, 'plan_variants', inArray(planVariants.tripId, ids)).sort(
    (a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder,
  );
  const mainByDay = new Map<string, (typeof variants)[number]>();
  for (const v of variants) {
    const key = `${v.tripId}|${v.dayDate}`;
    if (!mainByDay.has(key)) mainByDay.set(key, v);
  }
  const mains = [...mainByDay.values()];
  const items = mains.length
    ? liveRows(
        db,
        'itinerary_items',
        inArray(
          itineraryItems.variantId,
          mains.map((v) => v.id),
        ),
      )
    : [];
  const dayOf = new Map(mains.map((v) => [v.id, v.dayDate]));

  return {
    trips: trips.map((t) => ({ id: t.id, title: t.title, timeZone: t.timeZone })),
    bookings: liveRows(db, 'bookings', inArray(bookings.tripId, ids)).map((b) => ({
      id: b.id,
      tripId: b.tripId,
      type: b.type,
      title: b.title,
      startsAt: b.startsAt,
    })),
    items: items.map((i) => ({
      id: i.id,
      tripId: i.tripId,
      title: i.title,
      dayDate: dayOf.get(i.variantId) ?? '',
      startTime: i.startTime,
    })),
    polls: liveRows(db, 'polls', inArray(polls.tripId, ids)).map((p) => ({
      id: p.id,
      tripId: p.tripId,
      question: p.question,
      deadline: p.deadline,
      locked: p.lockedOptionId !== null,
    })),
  };
}

/** The next reminders to schedule on this phone. */
export function upcomingReminders(db: Db, at: Date = now()): Reminder[] {
  return planReminders(reminderSources(db, at), at);
}
