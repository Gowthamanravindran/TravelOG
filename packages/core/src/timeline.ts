/**
 * Day timeline from check-ins (docs/01 §7 #4): time spent at each place is the
 * gap until the next check-in. Long gaps (overnight, forgot to check in) are
 * left unknown rather than guessed.
 */

export interface TimelineCheckIn {
  id: string;
  /** UTC ISO. */
  at: string;
}

export interface TimelineEntry<T extends TimelineCheckIn> {
  checkIn: T;
  /** Minutes until the next check-in (or until now for the latest); null if unknown. */
  minutes: number | null;
  /** True for the latest check-in when it's still going on. */
  ongoing: boolean;
}

/** Gaps longer than this aren't counted as time spent at one place. */
export const MAX_STAY_MIN = 6 * 60;

export function timeline<T extends TimelineCheckIn>(
  checkIns: readonly T[],
  now: Date,
  maxStayMin: number = MAX_STAY_MIN,
): TimelineEntry<T>[] {
  const sorted = [...checkIns].sort((a, b) => a.at.localeCompare(b.at));
  return sorted.map((c, i) => {
    const next = sorted[i + 1];
    const end = next ? Date.parse(next.at) : now.getTime();
    const minutes = Math.round((end - Date.parse(c.at)) / 60_000);
    const known = minutes >= 0 && minutes <= maxStayMin;
    return { checkIn: c, minutes: known ? minutes : null, ongoing: !next && known };
  });
}

/** 95 → "1 h 35 min", 40 → "40 min". */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
