begin;
select plan(7);

create temp table u (id uuid, rn int);
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'psuser' || i || '@test.co', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
from generate_series(1, 4) i;
insert into u select id, row_number() over (order by email) from auth.users where email like 'psuser%@test.co';

create temp table ctx (aid uuid, tok uuid);
grant select on pg_temp.u to authenticated, anon;
grant select on pg_temp.ctx to authenticated, anon;

insert into adventures (owner_id, name)
values ((select id from u where rn = 1), 'Pos Trip');
insert into ctx select id, share_token from adventures where name = 'Pos Trip';

set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 1))::text, true);
select lives_ok(
  $$select upsert_position(jsonb_build_object(
      'adventure_id', (select aid from ctx),
      'user_id', (select id from u where rn = 1),
      'lat', -33.5, 'lng', 18.4))$$,
  'editor upserts own position'
);
select is(
  (select count(*)::int from positions where adventure_id = (select aid from ctx)),
  1,
  'position stored'
);

select throws_ok(
  $$select upsert_position(jsonb_build_object(
      'adventure_id', (select aid from ctx),
      'user_id', (select id from u where rn = 2),
      'lat', 0, 'lng', 0))$$,
  'not_own_position',
  'cannot upsert another user position'
);

select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 3))::text, true);
select join_adventure((select tok from ctx), 'viewer');
select throws_ok(
  $$select upsert_position(jsonb_build_object(
      'adventure_id', (select aid from ctx),
      'user_id', (select id from u where rn = 3),
      'lat', 0, 'lng', 0))$$,
  'not_editor',
  'viewer cannot upsert position'
);

reset role;
insert into positions (adventure_id, user_id, geog, updated_at)
values ((select aid from ctx), (select id from u where rn = 2),
  st_setsrid(st_makepoint(18.5, -33.6), 4326)::geography,
  now() - interval '11 minutes');

set role anon;
select set_config('request.jwt.claims', '{}', true);
select is(
  (select count(*)::int from get_adventure_positions((select tok from ctx))),
  1,
  'anon token RPC returns fresh rows only'
);

select is(
  (select count(*)::int from get_adventure_positions(gen_random_uuid())),
  0,
  'invalid token returns nothing'
);

reset role;
insert into positions (adventure_id, user_id, geog, updated_at)
values ((select aid from ctx), (select id from u where rn = 4),
  st_setsrid(st_makepoint(18.5, -33.6), 4326)::geography, now());
set role anon;
select is(
  (select count(*)::int from get_adventure_positions((select tok from ctx))),
  2,
  'stale row excluded, fresh row counted'
);

select * from finish();
rollback;
