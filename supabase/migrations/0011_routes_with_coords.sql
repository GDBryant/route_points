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

grant select on public.routes_with_coords to authenticated;
