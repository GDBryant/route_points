create or replace function public.known_users()
returns table (user_id uuid, display_name text, colour text)
language sql security definer stable set search_path = public
as $$
  select distinct p.id, p.display_name, p.colour
  from adventure_members me
  join adventure_members o on o.adventure_id = me.adventure_id and o.user_id <> me.user_id
  join profiles p on p.id = o.user_id
  where me.user_id = auth.uid()
  order by p.display_name;
$$;

create or replace function public.add_member(aid uuid, uid uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare new_role text;
begin
  if not is_owner(aid) then raise exception 'not_owner'; end if;
  if exists (select 1 from adventure_members where adventure_id = aid and user_id = uid) then return; end if;
  if not exists (
    select 1 from adventure_members me
    join adventure_members o on o.adventure_id = me.adventure_id
    where me.user_id = auth.uid() and o.user_id = uid
  ) then raise exception 'unknown_user'; end if;
  new_role := case when (select count(*) from adventure_members where adventure_id = aid and role in ('owner','editor')) < 10 then 'editor' else 'viewer' end;
  insert into adventure_members (adventure_id, user_id, role) values (aid, uid, new_role);
end;
$$;

grant execute on function public.known_users() to authenticated;
grant execute on function public.add_member(uuid, uuid) to authenticated;
