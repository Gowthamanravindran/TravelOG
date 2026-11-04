-- Permission tests for the Phase 0 tables. Run with: supabase test db
-- Both JWT settings are set so the tests work with current and older auth.uid() definitions.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

-- RLS is on everywhere
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.app_config'::regclass), 'app_config has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.waitlist'::regclass), 'waitlist has RLS');

-- Signing up creates a profile with the provider name
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.dev', '{"full_name":"Alice"}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.dev', '{"name":"Bob"}', now(), now());

select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Alice', 'profile created from full_name');
select is((select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'Bob', 'profile created from name');

-- Signed in as Alice
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; -- older auth.uid() versions read this

select is((select count(*) from public.profiles)::int, 1, 'a user sees only their own profile');
select is((select display_name from public.profiles), 'Alice', 'and it is theirs');

update public.profiles set display_name = 'Hacked' where id = '22222222-2222-2222-2222-222222222222';
reset role;
select is((select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'Bob', 'a user cannot edit someone else''s profile');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; -- older auth.uid() versions read this
update public.profiles set home_city = 'Bengaluru' where id = '11111111-1111-1111-1111-111111111111';
reset role;
select is((select home_city from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Bengaluru', 'a user can edit their own profile');

-- Anonymous visitor (website)
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select ok((select count(*) from public.app_config) >= 3, 'anyone can read app_config');
select throws_ok($$ insert into public.app_config (key, value) values ('x', '1') $$, '42501', null, 'nobody can write app_config through the API');
select lives_ok($$ insert into public.waitlist (email, travel_group_size, source) values ('friend@example.com', 4, 'test') $$, 'anyone can join the waitlist');
select is((select count(*) from public.waitlist)::int, 0, 'nobody can read the waitlist through the API');
select throws_ok($$ insert into public.waitlist (email) values ('not-an-email') $$, '23514', null, 'invalid emails are rejected');

select * from finish();
rollback;
