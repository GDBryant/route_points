create table routes (
  id uuid primary key default gen_random_uuid(),
  adventure_id uuid not null references adventures on delete cascade,
  client_id uuid not null unique,
  name text not null default '',
  from_point_id uuid references points on delete set null,
  to_point_id uuid references points on delete set null,
  direction text not null default 'both'
    check (direction in ('both','forward','reverse')),
  mode text not null check (mode in ('manual','auto')),
  interval_s int,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid not null references profiles default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index routes_adventure_id_idx on routes (adventure_id);

create trigger routes_updated_at
  before update on routes
  for each row execute function public.set_updated_at();

create table waypoints (
  id bigint generated always as identity primary key,
  route_id uuid not null references routes on delete cascade,
  client_id uuid not null unique,
  seq int not null,
  geog geography(point, 4326) not null,
  lat double precision generated always as (st_y(geog::geometry)) stored,
  lng double precision generated always as (st_x(geog::geometry)) stored,
  accuracy_m real,
  recorded_at timestamptz not null,
  unique (route_id, seq)
);

create index waypoints_route_id_idx on waypoints (route_id);

create or replace function public.upsert_point(p jsonb)
returns points
language plpgsql security definer set search_path = public
as $$
declare
  adv uuid := (p->>'adventure_id')::uuid;
  r points;
begin
  if adv is null or not is_editor(adv) then
    raise exception 'not_editor';
  end if;
  insert into points (adventure_id, client_id, name, kind, seq, geog, accuracy_m, note)
  values (
    adv,
    (p->>'client_id')::uuid,
    p->>'name',
    coalesce(p->>'kind', 'obstacle'),
    (p->>'seq')::int,
    st_setsrid(st_makepoint((p->>'lng')::float, (p->>'lat')::float), 4326)::geography,
    (p->>'accuracy_m')::real,
    coalesce(p->>'note', '')
  )
  on conflict (client_id) do update set
    name = excluded.name,
    kind = excluded.kind,
    seq = excluded.seq,
    geog = excluded.geog,
    accuracy_m = excluded.accuracy_m,
    note = excluded.note
    where points.adventure_id = excluded.adventure_id
  returning * into r;
  if r.id is null then
    raise exception 'client_id_conflict';
  end if;
  return r;
end;
$$;

create or replace function public.upsert_route(r jsonb)
returns routes
language plpgsql security definer set search_path = public
as $$
declare
  adv uuid := (r->>'adventure_id')::uuid;
  row_ routes;
begin
  if adv is null or not is_editor(adv) then
    raise exception 'not_editor';
  end if;
  insert into routes (adventure_id, client_id, name, from_point_id, to_point_id,
    direction, mode, interval_s, started_at, ended_at)
  values (
    adv,
    (r->>'client_id')::uuid,
    coalesce(r->>'name', ''),
    nullif(r->>'from_point_id','')::uuid,
    nullif(r->>'to_point_id','')::uuid,
    coalesce(r->>'direction', 'both'),
    r->>'mode',
    (r->>'interval_s')::int,
    coalesce((r->>'started_at')::timestamptz, now()),
    (r->>'ended_at')::timestamptz
  )
  on conflict (client_id) do update set
    name = excluded.name,
    from_point_id = excluded.from_point_id,
    to_point_id = excluded.to_point_id,
    direction = excluded.direction,
    ended_at = excluded.ended_at
    where routes.adventure_id = excluded.adventure_id
  returning * into row_;
  if row_.id is null then
    raise exception 'client_id_conflict';
  end if;
  return row_;
end;
$$;

create or replace function public.add_waypoints(route_client_id uuid, wps jsonb)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  r routes;
  n int;
begin
  select * into r from routes where client_id = route_client_id;
  if r.id is null or not is_editor(r.adventure_id) then
    raise exception 'not_editor';
  end if;
  insert into waypoints (route_id, client_id, seq, geog, accuracy_m, recorded_at)
  select
    r.id,
    (w->>'client_id')::uuid,
    (w->>'seq')::int,
    st_setsrid(st_makepoint((w->>'lng')::float, (w->>'lat')::float), 4326)::geography,
    (w->>'accuracy_m')::real,
    (w->>'recorded_at')::timestamptz
  from jsonb_array_elements(wps) w
  on conflict (client_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.get_adventure_routes(token uuid)
returns table (id uuid, name text, from_point_id uuid, to_point_id uuid,
  direction text, coords jsonb)
language plpgsql security definer stable set search_path = public
as $$
begin
  return query
    select r.id, r.name, r.from_point_id, r.to_point_id, r.direction,
      coalesce((
        select jsonb_agg(jsonb_build_array(w.lng, w.lat) order by w.seq)
        from waypoints w where w.route_id = r.id
      ), '[]'::jsonb) as coords
    from routes r
    join adventures a on a.id = r.adventure_id
    where a.share_token = token and a.is_active
    order by r.created_at;
end;
$$;

create or replace view public.routes_with_coords
with (security_invoker = true)
as
select
  r.id, r.adventure_id, r.client_id, r.name, r.from_point_id, r.to_point_id,
  r.direction, r.mode, r.interval_s, r.started_at, r.ended_at,
  coalesce((
    select jsonb_agg(jsonb_build_array(w.lng, w.lat) order by w.seq)
    from waypoints w where w.route_id = r.id
  ), '[]'::jsonb) as coords
from routes r;

alter table routes enable row level security;
alter table waypoints enable row level security;

create policy routes_select on routes
  for select to authenticated using (is_member(adventure_id));
create policy routes_insert on routes
  for insert to authenticated with check (is_editor(adventure_id));
create policy routes_update on routes
  for update to authenticated
  using (is_editor(adventure_id)) with check (is_editor(adventure_id));
create policy routes_delete on routes
  for delete to authenticated using (is_editor(adventure_id));

create policy waypoints_select on waypoints
  for select to authenticated
  using (exists (
    select 1 from routes r
    where r.id = waypoints.route_id and is_member(r.adventure_id)
  ));
create policy waypoints_insert on waypoints
  for insert to authenticated
  with check (exists (
    select 1 from routes r
    where r.id = waypoints.route_id and is_editor(r.adventure_id)
  ));
create policy waypoints_update on waypoints
  for update to authenticated
  using (exists (
    select 1 from routes r
    where r.id = waypoints.route_id and is_editor(r.adventure_id)
  ));
create policy waypoints_delete on waypoints
  for delete to authenticated
  using (exists (
    select 1 from routes r
    where r.id = waypoints.route_id and is_editor(r.adventure_id)
  ));

grant select, insert, update, delete on routes to authenticated;
grant select, insert, update, delete on waypoints to authenticated;
grant select on public.routes_with_coords to authenticated;
grant execute on function public.upsert_route(jsonb) to authenticated;
grant execute on function public.add_waypoints(uuid, jsonb) to authenticated;
grant execute on function public.get_adventure_routes(uuid) to anon, authenticated;

alter table routes replica identity full;
alter publication supabase_realtime add table routes;
