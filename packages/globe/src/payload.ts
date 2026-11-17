// What the app sends the map page. Kept apart from the component so it can be tested without a web view.
import type { Place } from './GlobeMap';

export type GlobePayloadInput = {
  /** ISO 3166-1 alpha-3 codes of highlighted countries. */
  visited?: readonly string[];
  places?: readonly Place[];
  route?: readonly { lat: number; lng: number }[];
  /** Hollow, tappable dots: cities that could be added. */
  candidates?: readonly Place[];
  /** Picked cities in visit order: numbered pins joined by the route line. */
  stops?: readonly Place[];
};

const pin = (p: Place) => ({
  id: p.id,
  name: p.name,
  lat: p.lat,
  lng: p.lng,
  ...(p.countryCode ? { countryCode: p.countryCode } : {}),
});

/**
 * The page's data as text. Equal input gives equal text, so a parent that re-creates arrays on
 * every render does not make the map redraw. A candidate that is already a stop is left out.
 */
export function globePayload(input: GlobePayloadInput): string {
  const stops = (input.stops ?? []).map(pin);
  const taken = new Set(stops.map((s) => s.id));
  return JSON.stringify({
    visited: [...(input.visited ?? [])],
    places: (input.places ?? []).map(pin),
    route: (input.route ?? []).map((r) => ({ lat: r.lat, lng: r.lng })),
    candidates: (input.candidates ?? []).filter((c) => !taken.has(c.id)).map(pin),
    stops,
  });
}
