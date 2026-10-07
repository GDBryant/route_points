begin;
select plan(17);

create temp table u (id uuid, rn int);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'user' || i || '@test.co', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
from generate_series(1, 12) i;

insert into u select id, row_number() over (order by email) from auth.users where email like 'user%@test.co';

create temp table ctx (aid uuid, tok uuid);
grant select on pg_temp.u to authenticated, anon;
grant select on pg_temp.ctx to authenticated, anon;

select is(
  (select count(*)::int from profiles where id in (select id from u)),
  12,
  'profiles auto-created by trigger'
);

set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 1))::text, true);
insert into adventures (owner_id, name) values ((select id from u where rn = 1), 'Dune Trip');
reset role;

insert into ctx select id, share_token from adventures where name = 'Dune Trip';

select is(
  (select role from adventure_members
   where adventure_id = (select aid from ctx) and user_id = (select id from u where rn = 1)),
  'owner',
  'owner auto-added as member'
);

set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 1))::text, true);
select is(
  (select count(*)::int from adventures where id = (select aid from ctx)),
  1,
  'member can select adventure'
);
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 2))::text, true);
select is(
  (select count(*)::int from adventures where id = (select aid from ctx)),
  0,
  'non-member cannot select adventure'
);

select is(
  join_adventure((select tok from ctx)),
  (select aid from ctx),
  'join_adventure returns adventure id'
);

select is(
  (select role from adventure_members
   where adventure_id = (select aid from ctx) and user_id = (select id from u where rn = 2)),
  'editor',
  'join_adventure grants editor'
);

do $$
declare i int;
begin
  for i in 3..10 loop
    perform set_config('request.jwt.claims',
      json_build_object('sub', (select id from u where rn = i))::text, true);
    perform join_adventure((select tok from ctx));
  end loop;
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 11))::text, true);
select lives_ok(
  $$select join_adventure((select tok from ctx))$$,
  'join_adventure does not raise when editors full'
);
select is(
  (select role from adventure_members
   where adventure_id = (select aid from ctx) and user_id = (select id from u where rn = 11)),
  'viewer',
  'join falls back to viewer when editors full'
);

reset role;
select throws_ok(
  $$insert into adventure_members (adventure_id, user_id, role)
    values ((select aid from ctx), (select id from u where rn = 12), 'editor')$$,
  'editor_limit'
);

set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 11))::text, true);
select is_empty(
  $$update adventures set description = 'x'
    where id = (select aid from ctx) returning 1$$,
  'viewer cannot update adventure'
);

set role anon;
select set_config('request.jwt.claims', '{}', true);
select is(
  (select count(*)::int from get_adventure_by_token((select tok from ctx))),
  1,
  'anon get_adventure_by_token returns row'
);
select is(
  (select count(*)::int from get_adventure_by_token(gen_random_uuid())),
  0,
  'invalid token returns no rows'
);

set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 12))::text, true);
select throws_ok(
  $$select join_adventure(gen_random_uuid())$$,
  'invalid_token'
);

set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 11))::text, true);
select is_empty(
  $$update adventure_members set role = 'editor'
    where adventure_id = (select aid from ctx)
      and user_id = (select id from u where rn = 11)
    returning 1$$,
  'viewer cannot update own role to editor'
);

select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 12))::text, true);
select throws_ok(
  $$insert into adventure_members (adventure_id, user_id, role)
    values ((select aid from ctx), (select id from u where rn = 12), 'viewer')$$,
  'new row violates row-level security policy for table "adventure_members"'
);

reset role;
insert into adventures (owner_id, name)
values ((select id from u where rn = 1), 'Dune Trip 2');
create temp table ctx2 as
select id aid, share_token tok from adventures where name = 'Dune Trip 2';
grant select on pg_temp.ctx2 to authenticated;

set role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from u where rn = 1))::text, true);
select is_empty(
  $$delete from adventure_members
    where adventure_id = (select aid from ctx2)
      and user_id = (select id from u where rn = 1)
      and role = 'owner'
    returning 1$$,
  'owner cannot delete own owner row'
);

select lives_ok(
  $$delete from adventures where id = (select aid from ctx)$$,
  'owner can delete adventure'
);

select * from finish();
rollback;
