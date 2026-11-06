import { tripState, type TripForState } from '@travelog/core';

/**
 * Where opening a trip lands (Plan 36): Trip mode while it's on, Memories once
 * it's over, else Plan mode. Screens go straight there, so no empty page slides
 * in first.
 */
export function tripHref(
  trip: TripForState & { id: string },
  now: Date = new Date(),
): `/trip/${string}` {
  const state = tripState(trip, now);
  if (state === 'live') return `/trip/${trip.id}/live`;
  if (state === 'completed' || state === 'archived') return `/trip/${trip.id}/plan/memories`;
  return `/trip/${trip.id}/plan`;
}
