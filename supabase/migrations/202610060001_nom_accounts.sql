-- Apply ONLY to the inspected, empty Nom project iwamwxsosrhxsdcsuoiu.
-- No destructive statements; no dependency on an auth.users trigger.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Explorer' check (length(btrim(display_name)) between 1 and 40),
  avatar_url text check (avatar_url is null or (length(avatar_url) <= 2048 and avatar_url ~ '^https://')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.dish_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id text not null check (dish_id ~ '^[a-z0-9-]{1,100}$'),
  is_active boolean not null default true, updated_at timestamptz not null default now(),
  primary key (user_id, dish_id)
);
create table public.restaurant_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id text not null check (length(restaurant_id) between 1 and 256),
  is_active boolean not null default true, updated_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
create table public.recent_dish_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id text not null check (dish_id ~ '^[a-z0-9-]{1,100}$'), viewed_at timestamptz not null,
  primary key (user_id, dish_id)
);
create table public.meal_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[a-zA-Z0-9-]{1,100}$' and id !~* '^qa-'),
  dish_id text not null check (dish_id ~ '^[a-z0-9-]{1,100}$'),
  restaurant_id text not null check (length(restaurant_id) between 1 and 256),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  started_at timestamptz not null, completed_at timestamptz not null,
  local_day date not null,
  verification_method text not null check (verification_method in ('location-demo','qr-demo','receipt-demo','unverified')),
  verified boolean not null,
  verification_source text not null check (length(verification_source) between 1 and 100 and verification_source not in ('qa-preview','demo-seed')),
  verification_checked_at timestamptz not null,
  feedback_reaction text not null check (feedback_reaction in ('loved','liked','okay','not-for-me')),
  feedback_observations text[] not null default '{}' check (cardinality(feedback_observations) <= 20),
  feedback_note text not null default '' check (length(feedback_note) <= 1000),
  created_at timestamptz not null default now(),
  check (verified = (verification_method <> 'unverified')),
  primary key (user_id, id)
);
create table public.opened_boxes (
  user_id uuid not null references auth.users(id) on delete cascade,
  box_id text not null, visit_id text not null,
  country_id text not null check (country_id in ('cambodia','colombia','united-states','japan','italy','india','china','france')),
  collectible_id text not null check (collectible_id in ('ziggy','kiko','fenn','milo','nox','lumi')),
  duplicate boolean not null, opened_at timestamptz not null,
  check (box_id = 'box-' || visit_id),
  primary key (user_id, box_id),
  foreign key (user_id, visit_id) references public.meal_logs(user_id, id) on delete cascade
);
create table public.collectible_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  country_id text not null check (country_id in ('cambodia','colombia','united-states','japan','italy','india','china','france')),
  collectible_id text not null check (collectible_id in ('ziggy','kiko','fenn','milo','nox','lumi')),
  is_active boolean not null default true, updated_at timestamptz not null default now(),
  primary key (user_id, country_id, collectible_id)
);

create index recent_dish_views_owner_time on public.recent_dish_views(user_id, viewed_at desc);
create index meal_logs_owner_completed on public.meal_logs(user_id, completed_at);
create index opened_boxes_owner_visit on public.opened_boxes(user_id, visit_id);
create index opened_boxes_owner_time on public.opened_boxes(user_id, opened_at);

-- The server, not device clocks, timestamps mutable favorite/profile writes.
create function public.nom_stamp_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  if tg_table_name = 'profiles' and tg_op = 'UPDATE' then new.created_at := old.created_at; end if;
  return new;
end;
$$;
revoke all on function public.nom_stamp_updated_at() from public, anon, authenticated;
create trigger profiles_updated before insert or update on public.profiles for each row execute function public.nom_stamp_updated_at();
create trigger dish_favorites_updated before insert or update on public.dish_favorites for each row execute function public.nom_stamp_updated_at();
create trigger restaurant_favorites_updated before insert or update on public.restaurant_favorites for each row execute function public.nom_stamp_updated_at();
create trigger collectible_favorites_updated before insert or update on public.collectible_favorites for each row execute function public.nom_stamp_updated_at();

-- Atomic greatest timestamp prevents stale offline views overwriting newer ones.
create function public.record_nom_dish_view(p_dish_id text, p_viewed_at timestamptz) returns void
language sql security invoker set search_path = '' as $$
  insert into public.recent_dish_views(user_id, dish_id, viewed_at)
  values ((select auth.uid()), p_dish_id, p_viewed_at)
  on conflict (user_id, dish_id) do update
    set viewed_at = greatest(public.recent_dish_views.viewed_at, excluded.viewed_at);
$$;
revoke all on function public.record_nom_dish_view(text, timestamptz) from public, anon;
grant execute on function public.record_nom_dish_view(text, timestamptz) to authenticated;

-- Also protect direct REST upserts of recent views.
create function public.nom_keep_newest_view() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.viewed_at := greatest(old.viewed_at, new.viewed_at); return new; end;
$$;
revoke all on function public.nom_keep_newest_view() from public, anon, authenticated;
create trigger recent_dish_views_newest before update on public.recent_dish_views for each row execute function public.nom_keep_newest_view();

alter table public.profiles enable row level security;
alter table public.dish_favorites enable row level security;
alter table public.restaurant_favorites enable row level security;
alter table public.recent_dish_views enable row level security;
alter table public.meal_logs enable row level security;
alter table public.opened_boxes enable row level security;
alter table public.collectible_favorites enable row level security;

revoke all on public.profiles, public.dish_favorites, public.restaurant_favorites, public.recent_dish_views, public.meal_logs, public.opened_boxes, public.collectible_favorites from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles, public.dish_favorites, public.restaurant_favorites, public.recent_dish_views, public.collectible_favorites to authenticated;
grant select, insert on public.meal_logs, public.opened_boxes to authenticated;

create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy dish_favorites_select on public.dish_favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy dish_favorites_insert on public.dish_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dish_favorites_update on public.dish_favorites for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy restaurant_favorites_select on public.restaurant_favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy restaurant_favorites_insert on public.restaurant_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy restaurant_favorites_update on public.restaurant_favorites for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy recent_dish_views_select on public.recent_dish_views for select to authenticated using ((select auth.uid()) = user_id);
create policy recent_dish_views_insert on public.recent_dish_views for insert to authenticated with check ((select auth.uid()) = user_id);
create policy recent_dish_views_update on public.recent_dish_views for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy collectible_favorites_select on public.collectible_favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy collectible_favorites_insert on public.collectible_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy collectible_favorites_update on public.collectible_favorites for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy meal_logs_select on public.meal_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy meal_logs_insert on public.meal_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy opened_boxes_select on public.opened_boxes for select to authenticated using ((select auth.uid()) = user_id);
create policy opened_boxes_insert on public.opened_boxes for insert to authenticated with check ((select auth.uid()) = user_id);
commit;
