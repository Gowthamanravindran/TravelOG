import { describe, expect, it } from 'vitest';

import { globePayload } from './payload';

const tokyo = { id: '1850147', name: 'Tokyo', lat: 35.69, lng: 139.69 };
const kyoto = { id: '1857910', name: 'Kyoto', lat: 35.02, lng: 135.75 };

describe('what the app sends the globe', () => {
  it('drops candidates that are already stops and keeps stop order', () => {
    const out = JSON.parse(globePayload({ candidates: [tokyo, kyoto], stops: [kyoto] }));
    expect(out.candidates.map((c: { id: string }) => c.id)).toEqual(['1850147']);
    expect(out.stops.map((s: { id: string }) => s.id)).toEqual(['1857910']);
    expect(out.visited).toEqual([]);
    expect(out.places).toEqual([]);
    expect(out.route).toEqual([]);
  });

  it('is the same text for equal input, so the map is not redrawn', () => {
    expect(globePayload({ stops: [] })).toBe(globePayload({}));
    expect(globePayload({ stops: [tokyo, kyoto] })).toBe(
      globePayload({ stops: [{ ...tokyo }, { ...kyoto }] }),
    );
  });

  it('keeps the order stops were picked in', () => {
    const out = JSON.parse(globePayload({ stops: [kyoto, tokyo] }));
    expect(out.stops.map((s: { name: string }) => s.name)).toEqual(['Kyoto', 'Tokyo']);
  });
});
