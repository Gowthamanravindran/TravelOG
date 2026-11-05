-- Plan 29 · places: anyone can read and search; nobody but the service role writes.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

select ok((select relrowsecurity from pg_class where oid = 'public.places'::regclass), 'places has RLS');

insert into public.places (id, kind, name, country_code, country_name, time_zone, currency, population, aliases, source, search) values
  ('gn:1850147', 'city', 'Tokyo', 'JP', 'Japan', 'Asia/Tokyo', 'JPY', 8336599, '{}', 'geonames', 'tokyo'),
  ('gn:1850158', 'city', 'Tokushima', 'JP', 'Japan', 'Asia/Tokyo', 'JPY', 267345, '{}', 'geonames', 'tokushima'),
  ('gn:1277333', 'city', 'Bengaluru', 'IN', 'India', 'Asia/Kolkata', 'INR', 8443675, '{Bangalore}', 'geonames', 'bengaluru | bangalore'),
  ('ctry:JP', 'country', 'Japan', 'JP', 'Japan', 'Asia/Tokyo', 'JPY', 126000000, '{}', 'geonames', 'japan');

set local role anon;

select is((select count(*) from public.places)::int, 4, 'anyone can read places');
select is((select id from public.search_places('tok', 1)), 'gn:1850147', 'the bigger place comes first');
select is((select id from public.search_places('bangal', 5)), 'gn:1277333', 'aliases (old names) are searchable');
select is((select count(*) from public.search_places('x', 5))::int, 0, 'one letter finds nothing');

select throws_ok(
  $$insert into public.places (id, kind, name, source, search) values ('osm:N1', 'city', 'Fake', 'osm', 'fake')$$,
  '42501', null, 'anon cannot add places'
);
update public.places set name = 'Hacked' where id = 'gn:1850147';
select is((select name from public.places where id = 'gn:1850147'), 'Tokyo', 'anon cannot change places');

select * from finish();
rollback;
