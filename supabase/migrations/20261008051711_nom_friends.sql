-- LOCAL REVIEW ONLY. Target after approval: Nom / iwamwxsosrhxsdcsuoiu.
-- Additive opt-in social identity. No private profile/Auth metadata is published.
begin;
create schema nom_social_private;
revoke all on schema nom_social_private from public, anon, authenticated;

create table public.nom_social_profiles (
  handle text primary key check (handle ~ '^[a-z][a-z0-9_]{2,23}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default clock_timestamp()
);
create table public.nom_friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_handle text not null references public.nom_social_profiles(handle) on delete cascade,
  receiver_handle text not null references public.nom_social_profiles(handle) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default clock_timestamp(),
  responded_at timestamptz,
  check (sender_handle <> receiver_handle),
  check ((status = 'pending') = (responded_at is null))
);
create unique index nom_requests_one_pending_pair on public.nom_friend_requests
  (least(sender_handle,receiver_handle),greatest(sender_handle,receiver_handle)) where status = 'pending';
create index nom_requests_receiver_status on public.nom_friend_requests(receiver_handle,status,created_at desc);
create index nom_requests_sender_time on public.nom_friend_requests(sender_handle,created_at desc);
create table public.nom_friendships (
  user_a text not null references public.nom_social_profiles(handle) on delete cascade,
  user_b text not null references public.nom_social_profiles(handle) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  primary key(user_a,user_b), check(user_a < user_b)
);
create index nom_friendships_user_b on public.nom_friendships(user_b);
create table public.nom_shared_items (
  id uuid primary key,
  sender_handle text not null references public.nom_social_profiles(handle) on delete cascade,
  receiver_handle text not null references public.nom_social_profiles(handle) on delete cascade,
  content_type text not null check(content_type in ('dish','restaurant','recommendation')),
  content_id text not null,
  dish_id text,
  message text not null default '' check(char_length(message) <= 280),
  created_at timestamptz not null default clock_timestamp(), opened_at timestamptz,
  check(sender_handle <> receiver_handle),
  check((content_type in ('dish','recommendation') and content_id ~ '^[a-z0-9-]{1,100}$' and dish_id is null)
    or (content_type = 'restaurant' and content_id ~ '^google:[A-Za-z0-9_-]{1,250}$' and dish_id is not null and dish_id ~ '^[a-z0-9-]{1,100}$')),
  check(opened_at is null or opened_at >= created_at)
);
create index nom_shares_receiver_time on public.nom_shared_items(receiver_handle,created_at desc,id desc);
create index nom_shares_sender_time on public.nom_shared_items(sender_handle,created_at desc,id desc);
create index nom_shares_unread on public.nom_shared_items(receiver_handle) where opened_at is null;

-- A deleted or anonymous Auth identity has no social authority even with an old JWT.
-- This privileged lookup is private; it only returns the caller's public handle.
create function nom_social_private.current_handle() returns text
language sql stable security definer set search_path = '' as $$
  select p.handle from public.nom_social_profiles p join auth.users u on u.id = p.user_id
  where p.user_id = (select auth.uid()) and not coalesce(u.is_anonymous,false)
$$;
create function nom_social_private.require_handle() returns text
language plpgsql stable security definer set search_path = '' as $$
declare me text := nom_social_private.current_handle();
begin
  if me is null then raise exception 'Create your Nom friend identity first' using errcode = '42501'; end if;
  return me;
end;
$$;
revoke all on all functions in schema nom_social_private from public, anon, authenticated;
grant usage on schema nom_social_private to authenticated;
grant execute on function nom_social_private.current_handle() to authenticated;

alter table public.nom_social_profiles enable row level security;
alter table public.nom_friend_requests enable row level security;
alter table public.nom_friendships enable row level security;
alter table public.nom_shared_items enable row level security;
revoke all on public.nom_social_profiles, public.nom_friend_requests, public.nom_friendships, public.nom_shared_items from public, anon, authenticated;
grant select on public.nom_social_profiles, public.nom_friend_requests, public.nom_friendships, public.nom_shared_items to authenticated;
create policy nom_social_profile_owner on public.nom_social_profiles for select to authenticated
  using(user_id = (select auth.uid()) and handle = (select nom_social_private.current_handle()));
create policy nom_requests_participant on public.nom_friend_requests for select to authenticated
  using((select nom_social_private.current_handle()) in (sender_handle,receiver_handle));
create policy nom_friendships_participant on public.nom_friendships for select to authenticated
  using((select nom_social_private.current_handle()) in (user_a,user_b));
create policy nom_shares_participant on public.nom_shared_items for select to authenticated
  using((select nom_social_private.current_handle()) in (sender_handle,receiver_handle));

-- Public RPCs intentionally use definer privileges for atomic transitions and
-- a constrained directory response. Every RPC authenticates; no sender UID input.
create function public.register_nom_social_profile(p_handle text,p_display_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); existing text;
begin
  if uid is null or not exists(select 1 from auth.users where id = uid and not coalesce(is_anonymous,false)) then
    raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_handle is null or p_handle !~ '^[a-z][a-z0-9_]{2,23}$' or p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 40 then
    raise exception 'Invalid public identity' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('nom-social-identity:' || uid::text,0));
  select handle into existing from public.nom_social_profiles where user_id = uid;
  if existing is not null and existing <> p_handle then raise exception 'Handle cannot be changed' using errcode = '22023'; end if;
  insert into public.nom_social_profiles(handle,user_id,display_name) values(p_handle,uid,btrim(p_display_name))
    on conflict(user_id) do update set display_name = excluded.display_name;
  return jsonb_build_object('handle',p_handle,'display_name',btrim(p_display_name));
end;
$$;
create function public.search_nom_users(p_query text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me text := nom_social_private.require_handle(); q text := lower(btrim(p_query)); pattern text;
begin
  if q is null or char_length(q) not between 2 and 40 then return '[]'::jsonb; end if;
  pattern := replace(replace(replace(q,E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_') || '%';
  return coalesce((select jsonb_agg(jsonb_build_object('handle',handle,'display_name',display_name) order by handle)
    from (select handle,display_name from public.nom_social_profiles where handle <> me
      and (handle like pattern escape E'\\' or lower(display_name) like pattern escape E'\\') order by handle limit 20) results),'[]'::jsonb);
end;
$$;
create index nom_social_name_prefix on public.nom_social_profiles(lower(display_name) text_pattern_ops);
create index nom_social_handle_prefix on public.nom_social_profiles(handle text_pattern_ops);

create function public.send_nom_friend_request(p_receiver text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me text := nom_social_private.require_handle(); found_id uuid; found_sender text;
begin
  if p_receiver is null or p_receiver = me or not exists(select 1 from public.nom_social_profiles where handle = p_receiver) then
    raise exception 'Invalid friend' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('nom-social-pair:' || least(me,p_receiver) || ':' || greatest(me,p_receiver),0));
  if exists(select 1 from public.nom_friendships where user_a = least(me,p_receiver) and user_b = greatest(me,p_receiver)) then
    raise exception 'Already friends' using errcode = '22023'; end if;
  select id,sender_handle into found_id,found_sender from public.nom_friend_requests
    where status = 'pending' and least(sender_handle,receiver_handle) = least(me,p_receiver)
      and greatest(sender_handle,receiver_handle) = greatest(me,p_receiver);
  if found_id is not null then
    if found_sender <> me then raise exception 'Respond to the incoming request' using errcode = '22023'; end if;
    return found_id; -- Retry, without an additional request.
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nom-social-user:' || me,0));
  if (select count(*) from public.nom_friend_requests where sender_handle = me and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Request limit reached' using errcode = '54000'; end if;
  if exists(select 1 from public.nom_friend_requests where status = 'declined' and sender_handle = me and receiver_handle = p_receiver and responded_at > now() - interval '1 day') then
    raise exception 'Please wait before requesting again' using errcode = '54000'; end if;
  insert into public.nom_friend_requests(sender_handle,receiver_handle) values(me,p_receiver) returning id into found_id;
  return found_id;
end;
$$;
create function public.respond_nom_friend_request(p_request_id uuid,p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me text := nom_social_private.require_handle(); req public.nom_friend_requests;
begin
  select * into req from public.nom_friend_requests where id = p_request_id and receiver_handle = me;
  if not found or p_accept is null then raise exception 'Request unavailable' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('nom-social-pair:' || least(req.sender_handle,req.receiver_handle) || ':' || greatest(req.sender_handle,req.receiver_handle),0));
  select * into req from public.nom_friend_requests where id = p_request_id and receiver_handle = me for update;
  if not found then raise exception 'Request unavailable' using errcode = '42501'; end if;
  if req.status <> 'pending' then
    if req.status = 'declined' and not p_accept then return; end if;
    if req.status = 'accepted' and p_accept and exists(select 1 from public.nom_friendships where user_a = least(req.sender_handle,me) and user_b = greatest(req.sender_handle,me)) then return; end if;
    raise exception 'Request already resolved' using errcode = '22023'; end if;
  update public.nom_friend_requests set status = case when p_accept then 'accepted' else 'declined' end, responded_at = clock_timestamp() where id = req.id;
  if p_accept then insert into public.nom_friendships(user_a,user_b) values(least(req.sender_handle,me),greatest(req.sender_handle,me)) on conflict do nothing; end if;
end;
$$;
create function public.cancel_nom_friend_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me text := nom_social_private.require_handle(); req public.nom_friend_requests;
begin
  select * into req from public.nom_friend_requests where id = p_request_id and sender_handle = me;
  if not found then raise exception 'Request unavailable' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('nom-social-pair:' || least(req.sender_handle,req.receiver_handle) || ':' || greatest(req.sender_handle,req.receiver_handle),0));
  update public.nom_friend_requests set status = 'cancelled',responded_at = clock_timestamp() where id = req.id and sender_handle = me and status = 'pending';
end;
$$;
create function public.remove_nom_friend(p_handle text) returns void
language plpgsql security definer set search_path = '' as $$
declare me text := nom_social_private.require_handle();
begin
  if p_handle is null or p_handle = me then raise exception 'Invalid friend' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('nom-social-pair:' || least(me,p_handle) || ':' || greatest(me,p_handle),0));
  delete from public.nom_friendships where user_a = least(me,p_handle) and user_b = greatest(me,p_handle);
  -- Received items remain available after unfriending; further sends are blocked.
end;
$$;
create function public.send_nom_shared_item(p_id uuid,p_receiver text,p_content_type text,p_content_id text,p_dish_id text,p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me text := nom_social_private.require_handle(); old_item public.nom_shared_items;
begin
  if p_id is null or p_receiver is null or p_receiver = me or p_content_type is null or p_content_id is null or p_message is null or char_length(p_message) > 280 then
    raise exception 'Invalid shared item' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('nom-social-pair:' || least(me,p_receiver) || ':' || greatest(me,p_receiver),0));
  perform 1 from public.nom_friendships where user_a = least(me,p_receiver) and user_b = greatest(me,p_receiver) for key share;
  if not found then raise exception 'Choose an accepted friend' using errcode = '42501'; end if;
  select * into old_item from public.nom_shared_items where id = p_id;
  if found then
    if old_item.sender_handle <> me or old_item.receiver_handle <> p_receiver or old_item.content_type <> p_content_type
      or old_item.content_id <> p_content_id or old_item.dish_id is distinct from p_dish_id or old_item.message <> p_message then
      raise exception 'Shared item conflict' using errcode = '22023'; end if;
    return p_id;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nom-social-user:' || me,0));
  if (select count(*) from public.nom_shared_items where sender_handle = me and created_at > now() - interval '1 day') >= 100 then
    raise exception 'Share limit reached' using errcode = '54000'; end if;
  insert into public.nom_shared_items(id,sender_handle,receiver_handle,content_type,content_id,dish_id,message)
    values(p_id,me,p_receiver,p_content_type,p_content_id,p_dish_id,p_message);
  return p_id;
end;
$$;
create function public.open_nom_shared_item(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me text := nom_social_private.require_handle();
begin
  update public.nom_shared_items set opened_at = coalesce(opened_at,clock_timestamp()) where id = p_id and receiver_handle = me;
  if not found then raise exception 'Shared item unavailable' using errcode = '42501'; end if;
end;
$$;
create function public.get_nom_social() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me text := nom_social_private.current_handle();
begin
  if (select auth.uid()) is null or not exists(select 1 from auth.users where id = (select auth.uid()) and not coalesce(is_anonymous,false)) then
    raise exception 'Sign in required' using errcode = '42501'; end if;
  if me is null then return jsonb_build_object('profile',null,'friends','[]'::jsonb,'incoming','[]'::jsonb,'outgoing','[]'::jsonb,'inbox','[]'::jsonb,'unread',0); end if;
  return jsonb_build_object(
    'profile',(select jsonb_build_object('handle',handle,'display_name',display_name) from public.nom_social_profiles where handle = me),
    'friends',coalesce((select jsonb_agg(jsonb_build_object('handle',p.handle,'display_name',p.display_name) order by p.display_name,p.handle)
      from public.nom_friendships f join public.nom_social_profiles p on p.handle = case when f.user_a = me then f.user_b else f.user_a end where me in (f.user_a,f.user_b)),'[]'::jsonb),
    'incoming',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'handle',p.handle,'display_name',p.display_name,'created_at',r.created_at) order by r.created_at desc)
      from public.nom_friend_requests r join public.nom_social_profiles p on p.handle = r.sender_handle where r.receiver_handle = me and r.status = 'pending'),'[]'::jsonb),
    'outgoing',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'handle',p.handle,'display_name',p.display_name,'created_at',r.created_at) order by r.created_at desc)
      from public.nom_friend_requests r join public.nom_social_profiles p on p.handle = r.receiver_handle where r.sender_handle = me and r.status = 'pending'),'[]'::jsonb),
    'unread',(select count(*) from public.nom_shared_items where receiver_handle = me and opened_at is null));
end;
$$;
-- Cursor paging keeps all received references accessible, without an unbounded payload.
create function public.list_nom_shared_items(p_before timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me text := nom_social_private.require_handle();
begin
  if (p_before is null) <> (p_before_id is null) then raise exception 'Invalid cursor' using errcode = '22023'; end if;
  return coalesce((select jsonb_agg(to_jsonb(items) order by created_at desc,id desc) from
    (select s.id,s.sender_handle,p.display_name as sender_name,s.content_type,s.content_id,s.dish_id,s.message,s.created_at,s.opened_at
      from public.nom_shared_items s join public.nom_social_profiles p on p.handle = s.sender_handle
      where s.receiver_handle = me and (p_before is null or (s.created_at,s.id) < (p_before,p_before_id)) order by s.created_at desc,s.id desc limit 50) items),'[]'::jsonb);
end;
$$;

-- Explicitly close PostgreSQL's default PUBLIC execution grants for every RPC.
revoke all on function public.register_nom_social_profile(text,text),public.search_nom_users(text),public.send_nom_friend_request(text),
  public.respond_nom_friend_request(uuid,boolean),public.cancel_nom_friend_request(uuid),public.remove_nom_friend(text),
  public.send_nom_shared_item(uuid,text,text,text,text,text),public.open_nom_shared_item(uuid),public.get_nom_social(),public.list_nom_shared_items(timestamptz,uuid)
  from public,anon,authenticated;
grant execute on function public.register_nom_social_profile(text,text),public.search_nom_users(text),public.send_nom_friend_request(text),
  public.respond_nom_friend_request(uuid,boolean),public.cancel_nom_friend_request(uuid),public.remove_nom_friend(text),
  public.send_nom_shared_item(uuid,text,text,text,text,text),public.open_nom_shared_item(uuid),public.get_nom_social(),public.list_nom_shared_items(timestamptz,uuid)
  to authenticated;
commit;
