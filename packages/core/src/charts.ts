/**
 * Donut chart maths (Plan 47): where each slice starts and how far it sweeps,
 * in degrees clockwise from the top. Zero and negative values are left out;
 * a tiny value still gets a sliver you can see.
 */
export interface Arc<K> {
  key: K;
  value: number;
  /** Share of the total, 0–1. */
  share: number;
  start: number;
  sweep: number;
}

export function donutArcs<K>(
  slices: readonly { key: K; value: number }[],
  { gap = 2, minSweep = 3 }: { gap?: number; minSweep?: number } = {},
): Arc<K>[] {
  const shown = slices.filter((s) => s.value > 0);
  const total = shown.reduce((a, s) => a + s.value, 0);
  if (!total) return [];
  // One slice is a whole ring, with no gap.
  if (shown.length === 1) return [{ ...shown[0]!, share: 1, start: 0, sweep: 360 }];
  const room = 360 - gap * shown.length;
  const raw = shown.map((s) => Math.max(minSweep, (s.value / total) * room));
  // Lifting slivers to minSweep takes room from the rest, in proportion.
  const scale = room / raw.reduce((a, b) => a + b, 0);
  let at = 0;
  return shown.map((s, i) => {
    const sweep = raw[i]! * scale;
    const arc = { key: s.key, value: s.value, share: s.value / total, start: at, sweep };
    at += sweep + gap;
    return arc;
  });
}
