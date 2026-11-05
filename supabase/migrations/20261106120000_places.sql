-- Plan 29 · places for destination autocomplete.
-- Cities, regions, countries and continents from GeoNames (CC-BY 4.0) and places
-- found through an OpenStreetMap-based lookup (ODbL; credit OpenStreetMap), saved
-- so the next search finds them here. Public reference data: anyone may read it;
-- only the service role (the seed script and the place-search function) writes.

create extension if not exists pg_trgm with schema extensions;

create table public.places (
  id text primary key check (id ~ '^(gn|osm|ctry|cont|adm1|ours):'),
  kind text not null check (kind in ('city', 'region', 'country', 'continent')),
  name text not null check (char_length(name) between 1 and 200),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  country_name text,
  region text,
  continent text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  time_zone text,
  currency text check (currency ~ '^[A-Z]{3}$'),
  population bigint not null default 0,
  boost real not null default 0,
  aliases text[] not null default '{}',
  source text not null check (source in ('geonames', 'osm', 'ours')),
  -- Normalized name and aliases ("bengaluru | bangalore"), for search.
  search text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.places is 'Destination autocomplete (docs/plans/29-places.md). Reference data, not user data.';

create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

create index places_search_trgm_idx on public.places using gin (search extensions.gin_trgm_ops);

alter table public.places enable row level security;

create policy "Anyone can read places"
  on public.places for select
  to anon, authenticated
  using (true);
-- No insert, update or delete policies: only the service role writes.

-- Places whose name or an alias starts with the (already normalized) text, or has a
-- word that does; biggest and boosted first. The app ranks the final list.
create or replace function public.search_places(q text, lim integer default 8)
returns setof public.places
language sql
stable
set search_path = ''
as $$
  select p.*
  from public.places p
  where char_length(q) between 2 and 60
    and (p.search like q || '%' or p.search like '% ' || q || '%')
  order by (p.search like q || '%') desc, p.population + p.boost * 100000 desc
  limit least(greatest(lim, 1), 20);
$$;
