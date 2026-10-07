create table points (
  id uuid primary key default gen_random_uuid(),
  adventure_id uuid not null references adventures on delete cascade,
  client_id uuid not null unique,
  name text not null,
  kind text not null default 'obstacle'
    check (kind in ('obstacle','camp','entrance','other')),
  seq int,
  geog geography(point, 4326) not null,
  lat double precision generated always as (st_y(geog::geometry)) stored,
  lng double precision generated always as (st_x(geog::geometry)) stored,
  accuracy_m real,
  note text default '',
  created_by uuid not null references profiles default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index points_adventure_id_idx on points (adventure_id);
create index points_geog_idx on points using gist (geog);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger points_updated_at
  before update on points
  for each row execute function public.set_updated_at();

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
  returning * into r;
  return r;
end;
$$;

create or replace function public.get_adventure_points(token uuid)
returns table (id uuid, name text, kind text, seq int, lat float, lng float, note text)
language plpgsql security definer stable set search_path = public
as $$
begin
  return query
    select p.id, p.name, p.kind, p.seq, p.lat, p.lng, p.note
    from points p
    join adventures a on a.id = p.adventure_id
    where a.share_token = token and a.is_active
    order by p.seq nulls last, p.name;
end;
$$;

alter table points enable row level security;

create policy points_select on points
  for select to authenticated using (is_member(adventure_id));
create policy points_insert on points
  for insert to authenticated with check (is_editor(adventure_id));
create policy points_update on points
  for update to authenticated
  using (is_editor(adventure_id)) with check (is_editor(adventure_id));
create policy points_delete on points
  for delete to authenticated using (is_editor(adventure_id));

grant select, insert, update, delete on points to authenticated;
grant execute on function public.upsert_point(jsonb) to authenticated;
grant execute on function public.get_adventure_points(uuid) to anon, authenticated;

alter table points replica identity full;
alter publication supabase_realtime add table points;
