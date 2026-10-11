begin;
select plan(2);

create temp table u (id uuid);
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'cid@test.co', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into u select id from auth.users where email = 'cid@test.co';

create temp table ctx (aid uuid);
grant select on pg_temp.u to authenticated;
grant select on pg_temp.ctx to authenticated;
insert into adventures (owner_id, name) values ((select id from u), 'pgtap_cid');
insert into ctx select id from adventures where name = 'pgtap_cid';

set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u))::text, true);

select upsert_point(jsonb_build_object(
  'adventure_id', (select aid from ctx),
  'client_id', '22222222-2222-2222-2222-222222222222',
  'name', 'P', 'lat', 0, 'lng', 0));
select is(
  (select id from points where client_id = '22222222-2222-2222-2222-222222222222'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'upsert_point sets id = client_id'
);

select upsert_route(jsonb_build_object(
  'adventure_id', (select aid from ctx),
  'client_id', '33333333-3333-3333-3333-333333333333',
  'name', 'R', 'mode', 'manual'));
select is(
  (select id from routes where client_id = '33333333-3333-3333-3333-333333333333'),
  '33333333-3333-3333-3333-333333333333'::uuid,
  'upsert_route sets id = client_id'
);

select * from finish();
rollback;
