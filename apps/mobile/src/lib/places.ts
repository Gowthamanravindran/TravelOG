import { placeFromServerRow, placesFromCompact, type Place } from '@travelog/core';
import { savePlaces, searchPlaces, seedPlaces, type Db } from '@travelog/db';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { useEffect, useState } from 'react';

import { useDb } from '@/data/provider';

/**
 * Destination search (Plans 29, 30): the phone holds countries and continents
 * (instant, offline) and every place you've picked or seen; cities and regions
 * come from our server's places table, which fills itself from OpenStreetMap on a
 * miss. Places from the server are saved on the phone so they work offline next time.
 */

const DEBOUNCE_MS = 300;

/** Loads the basic list into the phone's table once per data version. */
export async function ensurePlacesSeeded(db: Db): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const asset = Asset.fromModule(require('../../assets/places/basic.places'));
  await asset.downloadAsync();
  if (!asset.localUri) return false;
  const file = placesFromCompact(JSON.parse(await new File(asset.localUri).text()));
  return seedPlaces(db, file.places, file.version);
}

/** Seeds the phone's places in the background after the database opens (root layout). */
export function usePlacesSeed(): void {
  const db = useDb();
  useEffect(() => {
    // A failed seed only means fewer offline results; search still works.
    ensurePlacesSeeded(db).catch(() => {});
  }, [db]);
}

export interface PlacesServer {
  url: string;
  anonKey: string;
}

/** Our Supabase project, from the app config (public values); null until it's set. */
export function placesServer(): PlacesServer | null {
  const extra = Constants.expoConfig?.extra as
    { supabaseUrl?: string | null; supabaseAnonKey?: string | null } | undefined;
  return extra?.supabaseUrl && extra.supabaseAnonKey
    ? { url: extra.supabaseUrl, anonKey: extra.supabaseAnonKey }
    : null;
}

/** Asks our server; returns no places (never throws) when offline or not set up. */
export async function searchServer(
  query: string,
  signal?: AbortSignal,
): Promise<{ places: Place[]; attribution: string | null }> {
  const server = placesServer();
  if (!server) return { places: [], attribution: null };
  try {
    const res = await fetch(
      `${server.url}/functions/v1/place-search?q=${encodeURIComponent(query)}`,
      {
        headers: { apikey: server.anonKey, Authorization: `Bearer ${server.anonKey}` },
        signal,
      },
    );
    if (!res.ok) return { places: [], attribution: null };
    const body = (await res.json()) as { places?: Record<string, unknown>[]; attribution?: string };
    return {
      places: (body.places ?? []).map(placeFromServerRow).filter((p): p is Place => !!p),
      attribution: body.attribution ?? null,
    };
  } catch {
    return { places: [], attribution: null };
  }
}

/**
 * Results for what's typed: the phone's matches at once, then the server's after a
 * short pause in typing.
 */
export function usePlaceSearch(
  query: string,
  homeCountry?: string | null,
): { places: Place[]; searching: boolean; attribution: string | null } {
  const db = useDb();
  const local = query.trim().length >= 2 ? searchPlaces(db, query, { homeCountry }) : [];
  const [remote, setRemote] = useState<{
    query: string;
    places: Place[];
    attribution: string | null;
  }>({
    query: '',
    places: [],
    attribution: null,
  });
  const [searching, setSearching] = useState(false);
  // Cities and regions live on our server (Plan 30); always ask it when it's set up.
  const needServer = query.trim().length >= 2 && !!placesServer();

  useEffect(() => {
    if (!needServer) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      const found = await searchServer(query, controller.signal);
      if (controller.signal.aborted) return;
      savePlaces(db, found.places);
      setRemote({ query, ...found });
      setSearching(false);
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
      setSearching(false);
    };
  }, [query, needServer, db]);

  const fromServer = remote.query === query ? remote.places : [];
  const seen = new Set(local.map((p) => p.id));
  return {
    places: [...local, ...fromServer.filter((p) => !seen.has(p.id))].slice(0, 8),
    searching,
    attribution: remote.query === query ? remote.attribution : null,
  };
}
