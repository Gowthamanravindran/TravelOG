import {
  autoReadiness,
  homeCountryFor,
  needsPermit,
  readiness,
  suggestReadyList,
  type AutoItem,
  type Readiness,
  type Suggestion,
} from '@travelog/core';
import {
  getLocalProfile,
  getPlace,
  getTrip,
  listChecklist,
  tripSetupStatus,
  type ChecklistItem,
  type Db,
} from '@travelog/db';

import { useQuery } from '@/data/provider';

import { tripIcon } from './labels';
import { whereFor } from './where';

/** Plan 61: a trip's Get ready list: items ticked from the trip, and your own. */
export interface TripReadiness {
  auto: AutoItem[];
  manual: ChecklistItem[];
  summary: Readiness;
  /** What to suggest for an empty list. */
  suggestions: Suggestion[];
}

export function tripReadiness(db: Db, tripId: string): TripReadiness | null {
  const trip = getTrip(db, tripId);
  if (!trip) return null;
  const where = whereFor(db, tripId);
  const setup = tripSetupStatus(db, tripId);
  const auto = autoReadiness({
    trip,
    journeys: where?.w.journeys ?? [],
    checks: where?.checks ?? [],
    hasStayBooking: !!where?.inputs.bookings.some((b) => b.type === 'stay'),
    budget: setup.budget,
    plan: setup.plan,
  });
  const manual = listChecklist(db, tripId, 'ready');
  const dest = trip.destinationPlaceId ? getPlace(db, trip.destinationPlaceId) : undefined;
  const home = homeCountryFor(getLocalProfile(db)?.homeCurrency) ?? 'IN';
  const country = dest?.countryCode ?? null;
  return {
    auto,
    manual,
    summary: readiness(
      auto,
      manual.map((m) => ({ id: m.id, title: m.title, dueDate: m.dueDate, doneAt: m.doneAt })),
    ),
    suggestions: suggestReadyList({
      abroad: !!country && country !== home,
      kind: tripIcon(trip.emoji),
      permit: needsPermit(country, dest?.region ?? null, trip.destination ?? ''),
    }),
  };
}

export function useTripReadiness(tripId: string): TripReadiness | null {
  return useQuery((db) => tripReadiness(db, tripId), [tripId]);
}
