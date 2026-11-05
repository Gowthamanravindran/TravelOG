// Plan 29 · place-search: destination autocomplete for the app.
// 1. Search our `places` table (GeoNames seed plus places found earlier).
// 2. Too few matches and a lookup key is set: ask Geoapify (OpenStreetMap data, ODbL)
//    once, save the results to `places`, so the next search finds them here.
// Secrets: PLACES_API_KEY (Geoapify). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
// provided by Supabase. The key never reaches the app.
import { fromGeoapify, normalizeForSearch, type PlaceRow } from '../_shared/places-osm.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PLACES_API_KEY = Deno.env.get('PLACES_API_KEY');
const ENOUGH = 3;
const LIMIT = 8;

const db = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

// A small per-instance limit (30 searches a minute per address) so one client can't
// run up lookups; Supabase also limits function calls overall.
const hits = new Map<string, { count: number; until: number }>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.until < now) {
    hits.set(ip, { count: 1, until: now + 60_000 });
    return true;
  }
  h.count += 1;
  return h.count <= 30;
}

async function searchOurs(q: string): Promise<Record<string, unknown>[]> {
  const res = await db('rpc/search_places', {
    method: 'POST',
    body: JSON.stringify({ q, lim: LIMIT }),
  });
  return res.ok ? await res.json() : [];
}

async function lookup(q: string): Promise<PlaceRow[]> {
  if (!PLACES_API_KEY) return [];
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
  url.searchParams.set('text', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('lang', 'en');
  url.searchParams.set('apiKey', PLACES_API_KEY);
  const res = await fetch(url);
  if (!res.ok) return [];
  const body = await res.json();
  const rows = (body.results ?? [])
    .map(fromGeoapify)
    .filter((r: PlaceRow | null): r is PlaceRow => !!r);
  return [...new Map(rows.map((r: PlaceRow) => [r.id, r])).values()];
}

/** Fills currency and continent from our country rows, then saves the new places. */
async function save(rows: PlaceRow[]): Promise<Record<string, unknown>[]> {
  if (!rows.length) return [];
  const codes = [...new Set(rows.map((r) => r.country_code).filter(Boolean))];
  const countries = codes.length
    ? await (
        await db(
          `places?select=country_code,currency,continent&id=in.(${codes.map((c) => `ctry:${c}`).join(',')})`,
        )
      ).json()
    : [];
  const byCode = new Map(countries.map((c: Record<string, string>) => [c.country_code, c]));
  const full = rows.map((r) => {
    const c = byCode.get(r.country_code ?? '') as Record<string, string> | undefined;
    return { ...r, currency: c?.currency ?? null, continent: c?.continent ?? null, aliases: [] };
  });
  const res = await db('places?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(full),
  });
  return res.ok ? await res.json() : full;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const q = normalizeForSearch(new URL(req.url).searchParams.get('q') ?? '');
  if (q.length < 2 || q.length > 60) return json({ places: [], attribution: null });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!allowed(ip)) return json({ error: 'Too many searches, try again in a minute.' }, 429);

  const ours = await searchOurs(q);
  if (ours.length >= ENOUGH) return json({ places: ours, attribution: null });

  const found = await save(await lookup(q));
  const seen = new Set(ours.map((p) => p.id));
  const places = [...ours, ...found.filter((p) => !seen.has(p.id))].slice(0, LIMIT);
  return json({ places, attribution: found.length ? 'openstreetmap' : null });
});
