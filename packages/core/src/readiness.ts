// Plan 61: how ready a trip is. Some items tick themselves from the trip (bookings, stays,
// budget, a first stop); the rest are the person's own checklist items.

import type { Journey, PlanCheck } from './whereabouts';

export type AutoKey = 'transport' | 'stays' | 'budget' | 'plan';

export interface AutoItem {
  key: AutoKey;
  title: string;
  done: boolean;
  /** Why it isn't done, or what ticked it. */
  detail: string;
}

export interface AutoInputs {
  trip: { startDate: string | null; endDate: string | null };
  journeys: readonly Pick<Journey, 'type' | 'departDate' | 'arriveDate'>[];
  checks: readonly PlanCheck[];
  hasStayBooking: boolean;
  budget: boolean;
  plan: boolean;
}

const TRAVEL = new Set(['flight', 'train', 'bus', 'travel']);

/** The items the app ticks from what's already in the trip. */
export function autoReadiness(i: AutoInputs): AutoItem[] {
  const legs = i.journeys.filter((j) => TRAVEL.has(j.type));
  const { startDate: start, endDate: end } = i.trip;
  const there = start
    ? legs.some((j) => (j.arriveDate ?? j.departDate) <= start || j.departDate <= start)
    : legs.length > 0;
  const back = end ? legs.some((j) => j.departDate >= end) : legs.length > 1;
  const transport = there && back;
  const gaps = i.checks.filter((c) => c.kind === 'noStay');
  const stays = i.hasStayBooking && gaps.length === 0;
  return [
    {
      key: 'transport',
      title: 'Getting there and back',
      done: transport,
      detail: transport
        ? 'Booked'
        : there
          ? 'Add the way back'
          : back
            ? 'Add the way there'
            : 'Add flights, trains or buses',
    },
    {
      key: 'stays',
      title: 'A stay every night',
      done: stays,
      detail: stays
        ? 'Booked'
        : !i.hasStayBooking
          ? 'Add where you’ll stay'
          : `${gaps.length} ${gaps.length === 1 ? 'gap' : 'gaps'} in your stays`,
    },
    {
      key: 'budget',
      title: 'Budget set',
      done: i.budget,
      detail: i.budget ? 'Set' : 'Set a budget',
    },
    {
      key: 'plan',
      title: 'First stops planned',
      done: i.plan,
      detail: i.plan ? 'Started' : 'Add a stop to the itinerary',
    },
  ];
}

export interface ManualItem {
  id: string;
  title: string;
  dueDate: string | null;
  doneAt: string | null;
}

export interface Readiness {
  done: number;
  total: number;
  /** What to do next: the soonest-due undone item, else the first undone one. */
  next: { title: string; dueDate: string | null } | null;
}

export function readiness(auto: readonly AutoItem[], manual: readonly ManualItem[]): Readiness {
  const open = [
    ...manual.filter((m) => !m.doneAt).map((m) => ({ title: m.title, dueDate: m.dueDate })),
    ...auto.filter((a) => !a.done).map((a) => ({ title: a.title, dueDate: null })),
  ];
  const dated = open.filter((o) => o.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  return {
    done: auto.filter((a) => a.done).length + manual.filter((m) => m.doneAt).length,
    total: auto.length + manual.length,
    next: dated[0] ?? open[0] ?? null,
  };
}
