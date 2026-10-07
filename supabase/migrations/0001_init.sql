create extension if not exists postgis;

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  colour text not null default '#1e88e5',
  created_at timestamptz default now()
);

create table adventures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles,
  name text not null,
  description text default '',
  share_token uuid not null unique default gen_random_uuid(),
  snap_radius_m int not null default 20 check (snap_radius_m between 5 and 100),
  is_active bool default true,
  created_at timestamptz default now()
);

create table adventure_members (
  adventure_id uuid references adventures on delete cascade,
  user_id uuid references profiles on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  joined_at timestamptz default now(),
  last_opened_at timestamptz default now(),
  primary key (adventure_id, user_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_new_adventure()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.adventure_members (adventure_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_adventure_created
  after insert on adventures
  for each row execute function public.handle_new_adventure();

create or replace function public.enforce_editor_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  n int;
begin
  if new.role in ('owner','editor') then
    select count(*) into n
    from public.adventure_members
    where adventure_id = new.adventure_id
      and role in ('owner','editor')
      and user_id is distinct from new.user_id;
    if n >= 10 then
      raise exception 'editor_limit';
    end if;
  end if;
  return new;
end;
$$;

create trigger adventure_members_editor_limit
  before insert or update on adventure_members
  for each row execute function public.enforce_editor_limit();

create or replace function public.is_member(aid uuid)
returns boolean
language sql security definer volatile set search_path = public
as $$
  select exists (
    select 1 from adventure_members
    where adventure_id = aid and user_id = auth.uid()
  );
$$;

create or replace function public.is_editor(aid uuid)
returns boolean
language sql security definer volatile set search_path = public
as $$
  select exists (
    select 1 from adventure_members
    where adventure_id = aid and user_id = auth.uid()
      and role in ('owner','editor')
  );
$$;

create or replace function public.is_owner(aid uuid)
returns boolean
language sql security definer volatile set search_path = public
as $$
  select exists (
    select 1 from adventure_members
    where adventure_id = aid and user_id = auth.uid()
      and role = 'owner'
  );
$$;

alter table profiles enable row level security;
alter table adventures enable row level security;
alter table adventure_members enable row level security;

create policy profiles_select on profiles
  for select to authenticated using (true);
create policy profiles_update on profiles
  for update to authenticated using (id = auth.uid());

create policy adventures_select on adventures
  for select to authenticated
  using (is_member(id) or owner_id = auth.uid());
create policy adventures_insert on adventures
  for insert to authenticated with check (owner_id = auth.uid());
create policy adventures_update on adventures
  for update to authenticated using (is_owner(id));
create policy adventures_delete on adventures
  for delete to authenticated using (is_owner(id));

create policy members_select on adventure_members
  for select to authenticated using (is_member(adventure_id));
create policy members_insert on adventure_members
  for insert to authenticated
  with check (is_owner(adventure_id));
create policy members_update on adventure_members
  for update to authenticated
  using (is_owner(adventure_id))
  with check (is_owner(adventure_id));
create policy members_delete on adventure_members
  for delete to authenticated
  using (
    (is_owner(adventure_id) or user_id = auth.uid())
    and role <> 'owner'
  );

create or replace function public.get_adventure_by_token(token uuid)
returns table (id uuid, name text, description text, snap_radius_m int)
language plpgsql security definer stable set search_path = public
as $$
begin
  return query
    select a.id, a.name, a.description, a.snap_radius_m
    from adventures a
    where a.share_token = token and a.is_active;
end;
$$;

create or replace function public.join_adventure(token uuid, as_role text default 'editor')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  a_id uuid;
  existing_role text;
  new_role text;
begin
  select a.id into a_id
  from adventures a
  where a.share_token = token and a.is_active;
  if a_id is null then
    raise exception 'invalid_token';
  end if;

  select m.role into existing_role
  from adventure_members m
  where m.adventure_id = a_id and m.user_id = auth.uid();

  if existing_role is not null then
    update adventure_members
    set last_opened_at = now()
    where adventure_id = a_id and user_id = auth.uid();
    return a_id;
  end if;

  new_role := case
    when as_role = 'editor' and (
      select count(*) from adventure_members m
      where m.adventure_id = a_id and m.role in ('owner','editor')
    ) < 10 then 'editor'
    else 'viewer'
  end;

  insert into adventure_members (adventure_id, user_id, role)
  values (a_id, auth.uid(), new_role);
  return a_id;
end;
$$;

create or replace function public.touch_adventure(aid uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update adventure_members
  set last_opened_at = now()
  where adventure_id = aid and user_id = auth.uid();
end;
$$;

grant usage on schema public to authenticated;
grant select, update on profiles to authenticated;
grant select, insert, update, delete on adventures to authenticated;
grant select, insert, update, delete on adventure_members to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_editor(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;
grant execute on function public.get_adventure_by_token(uuid) to anon, authenticated;
grant execute on function public.join_adventure(uuid, text) to authenticated;
grant execute on function public.touch_adventure(uuid) to authenticated;
