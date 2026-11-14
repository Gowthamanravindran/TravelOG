import { describe, expect, it } from 'vitest';

import { bestOrder, distanceKm, estimateTravel, formatKm, formatMinutes, routeTotals } from './geo';

// Real places in North Goa.
const artjuna = { lat: 15.5791, lng: 73.7402 };
const fleaMarket = { lat: 15.5763, lng: 73.7414 };
const aguada = { lat: 15.4925, lng: 73.7733 };
const chapora = { lat: 15.6058, lng: 73.7364 };
const panaji = { lat: 15.4909, lng: 73.8278 };
const mumbai = { lat: 19.076, lng: 72.8777 };

describe('distance and travel time', () => {
  it('measures straight-line distance', () => {
    expect(Math.round(distanceKm(panaji, mumbai))).toBeGreaterThan(395);
    expect(distanceKm(panaji, mumbai)).toBeLessThan(425);
    expect(distanceKm(artjuna, artjuna)).toBe(0);
  });

  it('walks short hops and drives the rest, more slowly in town', () => {
    const walk = estimateTravel(artjuna, fleaMarket);
    expect(walk.mode).toBe('walk');
    expect(walk.minutes).toBeLessThan(10);
    const drive = estimateTravel(artjuna, aguada);
    expect(drive.mode).toBe('drive');
    expect(drive.km).toBeGreaterThan(distanceKm(artjuna, aguada));
    expect(drive.minutes).toBeGreaterThan(20);
    expect(drive.minutes).toBeLessThan(45);
    const long = estimateTravel(panaji, mumbai);
    expect(long.minutes / 60).toBeGreaterThan(10);
    expect(long.minutes / 60).toBeLessThan(16);
  });

  it('formats distances and times for people', () => {
    expect(formatKm(0.43)).toBe('450 m');
    expect(formatKm(4.24)).toBe('4.2 km');
    expect(formatKm(38.4)).toBe('38 km');
    expect(formatMinutes(6)).toBe('6 min');
    expect(formatMinutes(80)).toBe('1 h 20 min');
    expect(formatMinutes(180)).toBe('3 h');
  });
});

describe('best order', () => {
  const stop = (id: string, point: { lat: number; lng: number } | null, fixed = false) => ({
    id,
    point,
    fixed,
  });

  it('puts nearby stops next to each other and keeps timed stops in place', () => {
    const day = [
      stop('cafe', artjuna, true),
      stop('aguada', aguada),
      stop('market', fleaMarket),
      stop('chapora', chapora),
      stop('dinner', chapora, true),
    ];
    const r = bestOrder(day);
    expect(r.better).toBe(true);
    expect(r.order[0]).toBe('cafe');
    expect(r.order[4]).toBe('dinner');
    expect(r.order[1]).toBe('market');
    expect(r.after.minutes).toBeLessThan(r.before.minutes);
    expect(r.after.minutes).toBe(
      routeTotals(r.order.map((id) => day.find((s) => s.id === id)!)).minutes,
    );
  });

  it('leaves stops without a place where they are', () => {
    const r = bestOrder([
      stop('a', aguada),
      stop('note', null),
      stop('b', artjuna),
      stop('c', aguada),
    ]);
    expect(r.order[1]).toBe('note');
  });

  it('says so when the order is already best', () => {
    const r = bestOrder([stop('a', artjuna), stop('b', fleaMarket), stop('c', aguada)]);
    expect(r.better).toBe(false);
    expect(r.order).toEqual(['a', 'b', 'c']);
  });

  it('handles long days without trying every order', () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      lat: 15.4 + ((i * 7) % 12) * 0.02,
      lng: 73.75 + ((i * 5) % 12) * 0.01,
    }));
    const r = bestOrder(points.map((p, i) => stop(String(i), p)));
    expect(r.after.minutes).toBeLessThanOrEqual(r.before.minutes);
    expect(new Set(r.order).size).toBe(12);
  });
});
