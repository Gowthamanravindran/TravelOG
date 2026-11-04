import { timeToMinutes } from '@travelog/core';

export interface TimedItem {
  id: string;
  startTime: string | null;
  durationMin: number | null;
}

export type ItemStatus = 'done' | 'now' | 'next' | 'later' | 'untimed';

/**
 * Where each of today's stops stands at `nowTime` ('HH:MM' in the trip's time zone).
 * A stop is "now" from its start until start + duration (60 min if unknown);
 * the first stop that hasn't started yet is "next".
 */
export function statusAt<T extends TimedItem>(
  items: readonly T[],
  nowTime: string,
): { item: T; status: ItemStatus }[] {
  const now = timeToMinutes(nowTime);
  let nextFound = false;
  return items.map((item) => {
    if (!item.startTime) return { item, status: 'untimed' as const };
    const start = timeToMinutes(item.startTime);
    const end = start + (item.durationMin ?? 60);
    if (now >= end) return { item, status: 'done' as const };
    if (now >= start) return { item, status: 'now' as const };
    if (!nextFound) {
      nextFound = true;
      return { item, status: 'next' as const };
    }
    return { item, status: 'later' as const };
  });
}

/** Minutes from nowTime until startTime (negative if it already started). */
export function minutesUntil(startTime: string, nowTime: string): number {
  return timeToMinutes(startTime) - timeToMinutes(nowTime);
}
