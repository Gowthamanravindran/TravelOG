-- Phase 0 · first migration
-- profiles (created automatically for every new auth user), app_config (public
-- read-only settings such as the minimum supported app version) and waitlist
-- (insert-only sign-ups from the website). RLS is enabled on every table.

-- Keeps updated_at current on any table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  avatar_url text,
  home_city text check (char_length(home_city) <= 80),
  home_currency text not null default 'INR' check (home_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per user, created by trigger on auth.users insert. See docs/10-auth.md §4.';

alter table public.profiles enable row level security;

-- Phase 0: users see and edit only their own profile.
-- Phase 2 adds a policy letting trip co-members read each other's name and avatar.
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile when a user signs up, using the name/photo from Google or Apple when present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- app_config ----------------------------------------------------------------
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_config is 'Public, read-only app settings (min_supported_version, feature switches). Changed only by admins / service role. See docs/12-migrations.md §6.';

alter table public.app_config enable row level security;

create policy "Anyone can read app config"
  on public.app_config for select
  to anon, authenticated
  using (true);

create trigger app_config_set_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

insert into public.app_config (key, value) values
  ('min_supported_version', '"0.1.0"'),
  ('recommended_version', '"0.1.0"'),
  ('features', '{}');

-- waitlist ------------------------------------------------------------------
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  travel_group_size int check (travel_group_size between 1 and 30),
  source text check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);

comment on table public.waitlist is 'Website sign-ups. Insert-only for the public; nobody can read it through the API.';

create unique index waitlist_email_unique on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

create policy "Anyone can join the waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);
-- No select/update/delete policies: entries are readable only with the service role.
