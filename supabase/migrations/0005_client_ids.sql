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
  insert into points (id, adventure_id, client_id, name, kind, seq, geog, accuracy_m, note)
  values (
    (p->>'client_id')::uuid,
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
  insert into routes (id, adventure_id, client_id, name, from_point_id, to_point_id,
    direction, mode, interval_s, started_at, ended_at)
  values (
    (r->>'client_id')::uuid,
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
