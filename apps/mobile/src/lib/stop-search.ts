import { normalizePlace, type LatLng } from '@travelog/core';
import { getPlace, getTrip, liveTripItems, type Db } from '@travelog/db';
import { useEffect, useState } from 'react';

import { useDb } from '@/data/provider';

import { placesServer } from './places';

/**
 * Plan 57: places for itinerary stops (cafés, sights, shops). Places already used on the trip
 * show at once and offline; the server's search (OpenStreetMap through Geoapify) follows after
 * a short pause in typing, biased to the trip's destination.
 */

export interface StopPlace {
  /** e.g. 'osm:N123'; null for a place picked from this trip that had none. */
  id: string | null;
  name: string;
  address: string | null;
  kind: 'food' | 'stay' | 'activity' | 'place';
  /** The town or area it's in (Plan 58: grouping in Saved). */
  area?: string | null;
  countryCode?: string | null;
  lat: number;
  lng: number;
}

const DEBOUNCE_MS = 350;

/** Where to look first: the trip's destination, else the first stop on the trip with a place. */
export function tripCentre(db: Db, tripId: string): LatLng | null {
  const trip = getTrip(db, tripId);
  const dest = trip?.destinationPlaceId ? getPlace(db, trip.destinationPlaceId) : undefined;
  if (dest?.lat != null && dest.lng != null) return { lat: dest.lat, lng: dest.lng };
  const placed = liveTripItems(db, tripId).find((i) => i.lat != null && i.lng != null);
  return placed ? { lat: placed.lat!, lng: placed.lng! } : null;
}

/** Places already used on this trip whose name matches. */
export function tripPlaces(db: Db, tripId: string | null, query: string): StopPlace[] {
  const q = normalizePlace(query);
  if (q.length < 2 || !tripId) return [];
  const seen = new Set<string>();
  const out: StopPlace[] = [];
  for (const i of liveTripItems(db, tripId)) {
    if (!i.placeName || i.lat == null || i.lng == null) continue;
    const key = i.poiId ?? `${i.lat},${i.lng}`;
    if (seen.has(key) || !normalizePlace(i.placeName).includes(q)) continue;
    seen.add(key);
    out.push({
      id: i.poiId,
      name: i.placeName,
      address: i.address,
      kind: i.type === 'food' || i.type === 'stay' || i.type === 'activity' ? i.type : 'place',
      lat: i.lat,
      lng: i.lng,
    });
  }
  return out.slice(0, 3);
}

/** Asks our server; no places (never throws) when offline or not set up. */
export async function searchStopsServer(
  query: string,
  near: LatLng | null,
  signal?: AbortSignal,
): Promise<{ places: StopPlace[]; attribution: string | null }> {
  const server = placesServer();
  if (!server) return { places: [], attribution: null };
  try {
    const params = new URLSearchParams({ q: query, scope: 'poi' });
    if (near) params.set('near', `${near.lat.toFixed(4)},${near.lng.toFixed(4)}`);
    const res = await fetch(`${server.url}/functions/v1/place-search?${params}`, {
      headers: { apikey: server.anonKey, Authorization: `Bearer ${server.anonKey}` },
      signal,
    });
    if (!res.ok) return { places: [], attribution: null };
    const body = (await res.json()) as {
      pois?: (StopPlace & { country_code?: string | null })[];
      attribution?: string | null;
    };
    const places = (body.pois ?? [])
      .filter((p) => typeof p.name === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map(({ country_code, ...p }) => ({ ...p, countryCode: country_code ?? null }));
    return { places, attribution: body.attribution ?? null };
  } catch {
    return { places: [], attribution: null };
  }
}

export function useStopSearch(
  tripId: string | null,
  query: string,
  near: LatLng | null,
): { places: StopPlace[]; searching: boolean; attribution: string | null; online: boolean } {
  const db = useDb();
  const online = !!placesServer();
  const local = tripPlaces(db, tripId, query);
  const [remote, setRemote] = useState<{
    query: string;
    places: StopPlace[];
    attribution: string | null;
  }>({ query: '', places: [], attribution: null });
  const [searching, setSearching] = useState(false);
  const ask = online && query.trim().length >= 2;
  const nearKey = near ? `${near.lat},${near.lng}` : '';

  useEffect(() => {
    if (!ask) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      const [lat, lng] = nearKey ? nearKey.split(',').map(Number) : [];
      const found = await searchStopsServer(
        query,
        nearKey ? { lat: lat!, lng: lng! } : null,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setRemote({ query, ...found });
      setSearching(false);
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
      setSearching(false);
    };
  }, [query, ask, nearKey]);

  const fromServer = remote.query === query ? remote.places : [];
  const seen = new Set(local.map((p) => p.id ?? `${p.lat},${p.lng}`));
  return {
    places: [...local, ...fromServer.filter((p) => !seen.has(p.id ?? `${p.lat},${p.lng}`))].slice(
      0,
      8,
    ),
    searching,
    attribution: remote.query === query ? remote.attribution : null,
    online,
  };
}
