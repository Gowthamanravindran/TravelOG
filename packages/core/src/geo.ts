// Plan 57: distance and travel time between stops, estimated on the phone (no network).
// Real road times come later from a routing service (backlog: routing spike); these numbers
// are shown with "≈" and are good for comparing orders, not for navigation.

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_KM = 6371.0088;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line (great-circle) distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type TravelMode = 'walk' | 'drive';

export interface TravelEstimate {
  mode: TravelMode;
  /** Estimated road distance in km. */
  km: number;
  /** Estimated minutes, rounded up. */
  minutes: number;
}

/** Roads wind: road distance is about this much longer than the straight line. */
export const ROAD_FACTOR = 1.35;
/** Up to this road distance we suggest walking. */
export const WALK_MAX_KM = 1.5;
const WALK_KMH = 4.5;
/** Town traffic for the first stretch, then open road; plus a few minutes to get going. */
const TOWN_KM = 10;
const TOWN_KMH = 22;
const OPEN_KMH = 45;
const START_MIN = 3;

/** Estimated travel between two points: walking for short hops, else driving on Indian roads. */
export function estimateTravel(a: LatLng, b: LatLng): TravelEstimate {
  const km = distanceKm(a, b) * ROAD_FACTOR;
  if (km <= WALK_MAX_KM) {
    return { mode: 'walk', km, minutes: Math.max(1, Math.ceil((km / WALK_KMH) * 60)) };
  }
  const town = Math.min(km, TOWN_KM);
  const open = km - town;
  const hours = town / TOWN_KMH + open / OPEN_KMH;
  return { mode: 'drive', km, minutes: Math.ceil(hours * 60 + START_MIN) };
}

/** "450 m" / "4.2 km" / "38 km". */
export function formatKm(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${Math.round(km * 10) / 10} km`;
  return `${Math.round(km)} km`;
}

/** "6 min" / "1 h 20 min" / "3 h". */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** A stop that may be reordered. `fixed` ones (a set time) keep their position, as do ones without a point. */
export interface OrderStop {
  id: string;
  point: LatLng | null;
  fixed: boolean;
}

export interface RouteTotals {
  km: number;
  minutes: number;
  /** Legs between two stops that both have a point. */
  legs: number;
}

/** Totals over consecutive stops that both have a point. */
export function routeTotals(stops: readonly { point: LatLng | null }[]): RouteTotals {
  let km = 0;
  let minutes = 0;
  let legs = 0;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]!.point;
    const b = stops[i]!.point;
    if (!a || !b) continue;
    const t = estimateTravel(a, b);
    km += t.km;
    minutes += t.minutes;
    legs += 1;
  }
  return { km, minutes, legs };
}

export interface BestOrder {
  /** Ids in the suggested order. */
  order: string[];
  before: RouteTotals;
  after: RouteTotals;
  /** True when the suggestion differs from the current order and saves time. */
  better: boolean;
}

const BRUTE_FORCE_MAX = 7;

/**
 * The order of a day's stops with the least estimated travel. Stops with a set time, and stops
 * without a place, stay where they are; the others are rearranged among the remaining positions.
 */
export function bestOrder(stops: readonly OrderStop[]): BestOrder {
  const before = routeTotals(stops);
  const slots: number[] = [];
  const movable: OrderStop[] = [];
  stops.forEach((s, i) => {
    if (s.point && !s.fixed) {
      slots.push(i);
      movable.push(s);
    }
  });
  const place = (perm: readonly OrderStop[]) => {
    const out = stops.slice();
    slots.forEach((slot, k) => (out[slot] = perm[k]!));
    return out;
  };
  const cost = (perm: readonly OrderStop[]) => routeTotals(place(perm)).minutes;

  let best = movable.slice();
  let bestCost = cost(best);
  if (movable.length >= 2 && movable.length <= BRUTE_FORCE_MAX) {
    for (const perm of permutations(movable)) {
      const c = cost(perm);
      if (c < bestCost) {
        best = perm;
        bestCost = c;
      }
    }
  } else if (movable.length > BRUTE_FORCE_MAX) {
    // Segment reversals (2-opt) and moves until nothing improves.
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < best.length - 1; i++) {
        for (let j = i + 1; j < best.length; j++) {
          const flipped = [
            ...best.slice(0, i),
            ...best.slice(i, j + 1).reverse(),
            ...best.slice(j + 1),
          ];
          const c = cost(flipped);
          if (c < bestCost) {
            best = flipped;
            bestCost = c;
            improved = true;
          }
        }
      }
    }
  }
  const ordered = place(best);
  const after = routeTotals(ordered);
  const order = ordered.map((s) => s.id);
  const changed = order.some((id, i) => id !== stops[i]!.id);
  return changed && after.minutes < before.minutes
    ? { order, before, after, better: true }
    : { order: stops.map((s) => s.id), before, after: before, better: false };
}

function* permutations<T>(items: readonly T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield items.slice();
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) yield [items[i]!, ...p];
  }
}
