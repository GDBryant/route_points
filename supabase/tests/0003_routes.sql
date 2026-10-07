begin;
select plan(12);

create temp table u (id uuid, rn int);
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'rtuser' || i || '@test.co', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
from generate_series(1, 4) i;
insert into u select id, row_number() over (order by email) from auth.users where email like 'rtuser%@test.co';

create temp table ctx (aid uuid, tok uuid);
grant select on pg_temp.u to authenticated, anon;
grant select on pg_temp.ctx to authenticated, anon;

insert into adventures (owner_id, name)
values ((select id from u where rn = 1), 'pgtap_rt_trip');
insert into ctx select id, share_token from adventures where name = 'pgtap_rt_trip';

insert into adventures (owner_id, name)
values ((select id from u where rn = 1), 'pgtap_rt_trip2');
create temp table ctx2 as
select id aid, share_token tok from adventures where name = 'pgtap_rt_trip2';
grant select on pg_temp.ctx2 to authenticated;

set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 2))::text, true);
select join_adventure((select tok from ctx));
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 3))::text, true);
select join_adventure((select tok from ctx), 'viewer');

select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 2))::text, true);
select lives_ok(
  $$select upsert_route(jsonb_build_object(
      'adventure_id', (select aid from ctx),
      'client_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'name', 'R1', 'mode', 'manual'))$$,
  'editor can upsert_route'
);
select is(
  (select name from routes where client_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'R1',
  'route inserted'
);

select is(
  add_waypoints('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', jsonb_build_array(
    jsonb_build_object('client_id', '11111111-0000-0000-0000-000000000001', 'seq', 1, 'lat', -33.5, 'lng', 18.4, 'recorded_at', now()),
    jsonb_build_object('client_id', '22222222-0000-0000-0000-000000000002', 'seq', 2, 'lat', -33.51, 'lng', 18.41, 'recorded_at', now()),
    jsonb_build_object('client_id', '33333333-0000-0000-0000-000000000003', 'seq', 3, 'lat', -33.52, 'lng', 18.42, 'recorded_at', now()))),
  3,
  'add_waypoints inserts 3'
);
select is(
  add_waypoints('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', jsonb_build_array(
    jsonb_build_object('client_id', '11111111-0000-0000-0000-000000000001', 'seq', 1, 'lat', -33.5, 'lng', 18.4, 'recorded_at', now()))),
  0,
  'replayed waypoints dedupe on client_id'
);

select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 3))::text, true);
select throws_ok(
  $$select add_waypoints('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      jsonb_build_array(jsonb_build_object('client_id', gen_random_uuid(), 'seq', 9, 'lat', 0, 'lng', 0, 'recorded_at', now())))$$,
  'not_editor',
  'viewer cannot add waypoints'
);
select throws_ok(
  $$select upsert_route(jsonb_build_object(
      'adventure_id', (select aid from ctx),
      'client_id', gen_random_uuid(), 'name', 'x', 'mode', 'manual'))$$,
  'not_editor',
  'viewer cannot upsert_route'
);

reset role;
select throws_ok(
  $$insert into routes (adventure_id, client_id, mode, direction, created_by)
    values ((select aid from ctx), gen_random_uuid(), 'manual', 'sideways', (select id from u where rn = 1))$$,
  'new row for relation "routes" violates check constraint "routes_direction_check"',
  'invalid direction violates check'
);

set role anon;
select set_config('request.jwt.claims', '{}', true);
select is(
  (select jsonb_array_length(coords)::int from get_adventure_routes((select tok from ctx))),
  3,
  'get_adventure_routes returns 3 coords'
);
select is(
  (select coords->0->>0 from get_adventure_routes((select tok from ctx))),
  '18.4',
  'coords ordered by seq, lng first'
);

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 2))::text, true);
set role authenticated;
select is(
  (select count(*)::int from routes_with_coords where adventure_id = (select aid from ctx)),
  1,
  'member sees routes_with_coords'
);
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 4))::text, true);
select is(
  (select count(*)::int from routes_with_coords where adventure_id = (select aid from ctx)),
  0,
  'non-member sees no routes_with_coords'
);

reset role;
insert into points (adventure_id, client_id, name, geog, created_by)
values ((select aid from ctx2), 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'P2',
  st_setsrid(st_makepoint(18.4, -33.5), 4326)::geography, (select id from u where rn = 1));
set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 1))::text, true);
insert into points (adventure_id, client_id, name, geog)
values ((select aid from ctx), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'P1',
  st_setsrid(st_makepoint(18.4, -33.5), 4326)::geography);
reset role;
set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 1))::text, true);
select throws_ok(
  $$select upsert_point(jsonb_build_object(
      'adventure_id', (select aid from ctx2),
      'client_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'name', 'X', 'lat', 0, 'lng', 0))$$,
  'client_id_conflict',
  'upsert_point in different adventure raises client_id_conflict'
);

select * from finish();
rollback;
