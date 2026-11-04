-- Local development data only (not applied to staging or production).
-- Two test users; their profiles are created by the on_auth_user_created trigger.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'riya@example.com', '{"full_name": "Riya (test)"}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'arjun@example.com', '{"full_name": "Arjun (test)"}', now(), now());
