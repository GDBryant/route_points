create table positions (
  adventure_id uuid not null references adventures on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  geog geography(point, 4326) not null,
  lat double precision generated always as (st_y(geog::geometry)) stored,
  lng double precision generated always as (st_x(geog::geometry)) stored,
  heading real,
  speed real,
  accuracy_m real,
  updated_at timestamptz not null default now(),
  primary key (adventure_id, user_id)
);

create or replace function public.upsert_position(p jsonb)
returns positions
language plpgsql security definer set search_path = public
as $$
declare
  adv uuid := (p->>'adventure_id')::uuid;
  uid uuid := (p->>'user_id')::uuid;
  r positions;
begin
  if uid is null or uid <> auth.uid() then
    raise exception 'not_own_position';
  end if;
  if adv is null or not is_editor(adv) then
    raise exception 'not_editor';
  end if;
  insert into positions (adventure_id, user_id, geog, heading, speed, accuracy_m, updated_at)
  values (
    adv, uid,
    st_setsrid(st_makepoint((p->>'lng')::float, (p->>'lat')::float), 4326)::geography,
    (p->>'heading')::real,
    (p->>'speed')::real,
    (p->>'accuracy_m')::real,
    coalesce((p->>'updated_at')::timestamptz, now())
  )
  on conflict (adventure_id, user_id) do update set
    geog = excluded.geog,
    heading = excluded.heading,
    speed = excluded.speed,
    accuracy_m = excluded.accuracy_m,
    updated_at = excluded.updated_at
  returning * into r;
  return r;
end;
$$;

create or replace function public.get_adventure_positions(token uuid)
returns table (user_id uuid, lat double precision, lng double precision,
  heading real, speed real, updated_at timestamptz)
language plpgsql security definer stable set search_path = public
as $$
begin
  return query
    select p.user_id, p.lat, p.lng, p.heading, p.speed, p.updated_at
    from positions p
    join adventures a on a.id = p.adventure_id
    where a.share_token = token and a.is_active
      and p.updated_at > now() - interval '10 minutes';
end;
$$;

alter table positions enable row level security;

create policy positions_select on positions
  for select to authenticated using (is_member(adventure_id));
create policy positions_insert on positions
  for insert to authenticated
  with check (is_editor(adventure_id) and user_id = auth.uid());
create policy positions_update on positions
  for update to authenticated
  using (is_editor(adventure_id) and user_id = auth.uid())
  with check (is_editor(adventure_id) and user_id = auth.uid());

grant select, insert, update on positions to authenticated;
grant execute on function public.upsert_position(jsonb) to authenticated;
grant execute on function public.get_adventure_positions(uuid) to anon, authenticated;
