alter table points alter column created_by drop not null;
alter table points drop constraint points_created_by_fkey;
alter table points add constraint points_created_by_fkey
  foreign key (created_by) references profiles on delete set null;

alter table routes alter column created_by drop not null;
alter table routes drop constraint routes_created_by_fkey;
alter table routes add constraint routes_created_by_fkey
  foreign key (created_by) references profiles on delete set null;

create or replace function public.purge_inactive(days int default 60)
returns table (adventures_deleted int, users_deleted int)
language plpgsql security definer set search_path = public
as $$
declare
  cutoff timestamptz := now() - make_interval(days => days);
  a int;
  u int;
begin
  with dead as (
    delete from adventures adv
    where adv.created_at < cutoff
      and not exists (
        select 1 from adventure_members m
        where m.adventure_id = adv.id and m.last_opened_at >= cutoff)
    returning 1)
  select count(*) into a from dead;

  with dead as (
    delete from auth.users au
    where au.created_at < cutoff
      and coalesce(au.last_sign_in_at, au.created_at) < cutoff
      and not exists (select 1 from adventures adv where adv.owner_id = au.id)
      and not exists (
        select 1 from adventure_members m
        where m.user_id = au.id and m.last_opened_at >= cutoff)
    returning 1)
  select count(*) into u from dead;

  return query select a, u;
end;
$$;

revoke all on function public.purge_inactive(int) from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('purge-inactive', '0 3 * * *', $$select public.purge_inactive()$$);
