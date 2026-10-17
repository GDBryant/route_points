begin;
select plan(8);

create temp table u (id uuid, rn int);
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'purge' || i || '@test.co', '', now(), '{"provider":"email","providers":["email"]}', '{}',
  now() - interval '100 days', now(), now() - interval '100 days'
from generate_series(1, 3) i;
insert into u select id, row_number() over (order by email) from auth.users where email like 'purge%@test.co';

insert into adventures (owner_id, name, created_at) values
  ((select id from u where rn = 1), 'Old Trip', now() - interval '100 days'),
  ((select id from u where rn = 2), 'Fresh Trip', now() - interval '100 days'),
  ((select id from u where rn = 3), 'New Trip', now() - interval '1 day');

update adventure_members set last_opened_at = now() - interval '100 days'
  where adventure_id in (select id from adventures where name in ('Old Trip', 'New Trip'));
update adventure_members set last_opened_at = now() - interval '1 day'
  where adventure_id = (select id from adventures where name = 'Fresh Trip');

insert into points (adventure_id, client_id, name, geog, created_by)
values ((select id from adventures where name = 'Fresh Trip'), gen_random_uuid(), 'P', st_point(18.4, -33.5)::geography, (select id from u where rn = 1));

select results_eq(
  $$select adventures_deleted, users_deleted from purge_inactive()$$,
  $$values (1, 1)$$,
  'one adventure and one user purged'
);
select is((select count(*)::int from adventures where name = 'Old Trip'), 0, 'old inactive adventure removed');
select is((select count(*)::int from adventures where name = 'Fresh Trip'), 1, 'recently opened adventure kept');
select is((select count(*)::int from adventures where name = 'New Trip'), 1, 'young adventure kept');
select is((select count(*)::int from auth.users where id = (select id from u where rn = 1)), 0, 'inactive user removed');
select is((select count(*)::int from auth.users where id = (select id from u where rn = 2)), 1, 'active user kept');
select is((select count(*)::int from auth.users where id = (select id from u where rn = 3)), 1, 'owner of live adventure kept');
select is(
  (select created_by from points where adventure_id = (select id from adventures where name = 'Fresh Trip')),
  null, 'point survives creator deletion with created_by null'
);

select * from finish();
rollback;
