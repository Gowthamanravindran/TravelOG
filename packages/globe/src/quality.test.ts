import { describe, expect, it } from 'vitest';

import { qualityPolicyScript } from './globeHtml';

// When the globe drops to its plain look to stay smooth, and when it tries the satellite look
// again (Plan 87). Before, a drop lasted until the app restarted.

type St = { quality: 'high' | 'low'; slow: number; since: number; wait: number; readyAt: number };
type Ev = { kind: 'sample'; fps: number; now: number } | { kind: 'idle'; now: number };
const step = new Function(qualityPolicyScript + '; return qualityStep;')() as (
  s: St,
  e: Ev,
) => { state: St; set: 'high' | 'low' | null };

const start = (): St => ({ quality: 'high', slow: 0, since: 0, wait: 20_000, readyAt: 0 });
function run(s: St, events: Ev[]) {
  const sets: string[] = [];
  for (const e of events) {
    const r = step(s, e);
    s = r.state;
    if (r.set) sets.push(`${r.set}@${e.now}`);
  }
  return { s, sets };
}
const slow = (now: number): Ev => ({ kind: 'sample', fps: 20, now });
const fast = (now: number): Ev => ({ kind: 'sample', fps: 55, now });
const idle = (now: number): Ev => ({ kind: 'idle', now });

describe('dropping to the plain look', () => {
  it('needs three slow readings in a row', () => {
    expect(run(start(), [slow(5000), slow(6000), fast(7000), slow(8000), slow(9000)]).sets).toEqual(
      [],
    );
    expect(run(start(), [slow(5000), slow(6000), slow(7000)]).sets).toEqual(['low@7000']);
  });

  it('ignores the first four seconds, while the globe flies in', () => {
    expect(run(start(), [slow(1000), slow(2000), slow(3000), slow(3900)]).sets).toEqual([]);
  });
});

describe('coming back to the satellite look', () => {
  const dropped = () => run(start(), [slow(5000), slow(6000), slow(7000)]).s;

  it('tries again once the globe has been still for the wait', () => {
    const { sets } = run(dropped(), [idle(10_000), idle(26_000), idle(27_100)]);
    expect(sets).toEqual(['high@27100']);
  });

  it('smooth readings while low do not bring it back by themselves', () => {
    expect(run(dropped(), [fast(8000), fast(9000), fast(10_000)]).sets).toEqual([]);
  });

  it('dropping again doubles the wait, up to a limit', () => {
    let s = dropped();
    const waits: number[] = [];
    let now = 7000;
    for (let i = 0; i < 6; i++) {
      now += s.wait + 100;
      s = run(s, [idle(now)]).s; // back to high
      s = run(s, [slow(now + 5000), slow(now + 6000), slow(now + 7000)]).s; // and down again
      now += 7000;
      waits.push(s.wait);
    }
    expect(waits).toEqual([40_000, 80_000, 160_000, 160_000, 160_000, 160_000]);
  });

  it('staying smooth for a minute after coming back resets the wait', () => {
    let s = dropped();
    s = run(s, [idle(27_100)]).s;
    s = run(s, [fast(50_000), fast(88_000)]).s;
    expect(s.wait).toBe(20_000);
  });
});
