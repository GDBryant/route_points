drop function public.get_adventure_routes(uuid);

create or replace function public.get_adventure_routes(token uuid)
returns table (id uuid, name text, from_point_id uuid, to_point_id uuid,
  direction text, started_at timestamptz, ended_at timestamptz, coords jsonb)
language plpgsql security definer stable set search_path = public
as $$
begin
  return query
    select r.id, r.name, r.from_point_id, r.to_point_id, r.direction,
      r.started_at, r.ended_at,
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

grant execute on function public.get_adventure_routes(uuid) to anon, authenticated;
