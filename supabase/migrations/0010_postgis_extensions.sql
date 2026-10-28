alter table points add column lat_bak double precision, add column lng_bak double precision;
alter table waypoints add column lat_bak double precision, add column lng_bak double precision;
alter table positions add column lat_bak double precision, add column lng_bak double precision;
update points set lat_bak = lat, lng_bak = lng;
update waypoints set lat_bak = lat, lng_bak = lng;
update positions set lat_bak = lat, lng_bak = lng;

alter table points drop column geog cascade;
alter table waypoints drop column geog cascade;
alter table positions drop column geog cascade;

drop extension postgis;
create extension postgis with schema extensions;

alter table points
  add column geog extensions.geography(point, 4326),
  add column lat double precision generated always as (extensions.st_y(geog::extensions.geometry)) stored,
  add column lng double precision generated always as (extensions.st_x(geog::extensions.geometry)) stored;
alter table waypoints
  add column geog extensions.geography(point, 4326),
  add column lat double precision generated always as (extensions.st_y(geog::extensions.geometry)) stored,
  add column lng double precision generated always as (extensions.st_x(geog::extensions.geometry)) stored;
alter table positions
  add column geog extensions.geography(point, 4326),
  add column lat double precision generated always as (extensions.st_y(geog::extensions.geometry)) stored,
  add column lng double precision generated always as (extensions.st_x(geog::extensions.geometry)) stored;

update points set geog = extensions.st_setsrid(extensions.st_makepoint(lng_bak, lat_bak), 4326)::extensions.geography;
update waypoints set geog = extensions.st_setsrid(extensions.st_makepoint(lng_bak, lat_bak), 4326)::extensions.geography;
update positions set geog = extensions.st_setsrid(extensions.st_makepoint(lng_bak, lat_bak), 4326)::extensions.geography;

alter table points alter column geog set not null, drop column lat_bak, drop column lng_bak;
alter table waypoints alter column geog set not null, drop column lat_bak, drop column lng_bak;
alter table positions alter column geog set not null, drop column lat_bak, drop column lng_bak;
create index points_geog_idx on points using gist (geog);

alter function public.upsert_point(jsonb) set search_path = public, extensions;
alter function public.upsert_position(jsonb) set search_path = public, extensions;
alter function public.add_waypoints(uuid, jsonb) set search_path = public, extensions;
