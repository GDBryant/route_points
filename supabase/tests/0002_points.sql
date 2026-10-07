begin;
select plan(9);

create temp table u (id uuid, rn int);
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'ptuser' || i || '@test.co', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
from generate_series(1, 4) i;
insert into u select id, row_number() over (order by email) from auth.users where email like 'ptuser%@test.co';

create temp table ctx (aid uuid, tok uuid);
grant select on pg_temp.u to authenticated, anon;
grant select on pg_temp.ctx to authenticated, anon;

insert into adventures (owner_id, name)
values ((select id from u where rn = 1), 'Pt Trip');
insert into ctx select id, share_token from adventures where name = 'Pt Trip';

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
  $$select upsert_point(jsonb_build_object(
      'adventure_id', (select aid from ctx),
      'client_id', '11111111-1111-1111-1111-111111111111',
      'name', 'Obstacle 1', 'kind', 'obstacle', 'seq', 1,
      'lat', -33.5, 'lng', 18.4, 'accuracy_m', 8))$$,
  'editor can upsert_point'
);
select is(
  (select name from points where client_id = '11111111-1111-1111-1111-111111111111'),
  'Obstacle 1',
  'point inserted with name'
);

select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 3))::text, true);
select throws_ok(
  $$select upsert_point(jsonb_build_object(
      'adventure_id', (select aid from ctx),
      'client_id', gen_random_uuid(),
      'name', 'X', 'lat', 0, 'lng', 0))$$,
  'not_editor'
);
select is_empty(
  $$delete from points
    where client_id = '11111111-1111-1111-1111-111111111111' returning 1$$,
  'viewer cannot delete point'
);

select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 4))::text, true);
select is(
  (select count(*)::int from points
   where client_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'non-member cannot select points'
);

select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 2))::text, true);
select upsert_point(jsonb_build_object(
  'adventure_id', (select aid from ctx),
  'client_id', '11111111-1111-1111-1111-111111111111',
  'name', 'Obstacle One', 'kind', 'obstacle',
  'lat', -33.5, 'lng', 18.4));
select is(
  (select count(*)::int from points
   where client_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'upsert on client_id is idempotent'
);
select is(
  (select name from points where client_id = '11111111-1111-1111-1111-111111111111'),
  'Obstacle One',
  'upsert updates name'
);

set role anon;
select set_config('request.jwt.claims', '{}', true);
select is(
  (select count(*)::int from get_adventure_points((select tok from ctx))),
  1,
  'anon get_adventure_points returns rows'
);
select is(
  (select count(*)::int from get_adventure_points(gen_random_uuid())),
  0,
  'invalid token returns no rows'
);

select * from finish();
rollback;
