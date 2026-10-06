-- Run against an isolated Supabase-compatible PostgreSQL test database AFTER
-- 202610060001_nom_accounts.sql. psql -v ON_ERROR_STOP=1 -f this-file.sql
-- All fixtures and temporary helpers are rolled back. Never run against any
-- project other than an authorized isolated local DB or inspected Nom target.
begin;

create function pg_temp.assert_true(ok boolean, description text) returns void
language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %', description; end if; end $$;
create function pg_temp.assert_denied(command text) returns void
language plpgsql as $$
begin
  begin execute command;
  exception when insufficient_privilege then return;
  end;
  raise exception 'Expected permission/RLS denial: %', command;
end;
$$;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-0000000000a1','nom-rls-a@example.invalid'),
 ('00000000-0000-4000-8000-0000000000b1','nom-rls-b@example.invalid');

-- Seed another user's complete dataset as the database owner, before testing.
insert into public.profiles(id,display_name) values ('00000000-0000-4000-8000-0000000000b1','Other user');
insert into public.dish_favorites(user_id,dish_id) values ('00000000-0000-4000-8000-0000000000b1','nasi-goreng');
insert into public.restaurant_favorites(user_id,restaurant_id) values ('00000000-0000-4000-8000-0000000000b1','google:test');
insert into public.recent_dish_views(user_id,dish_id,viewed_at) values ('00000000-0000-4000-8000-0000000000b1','nasi-goreng',now());
insert into public.collectible_favorites(user_id,country_id,collectible_id) values ('00000000-0000-4000-8000-0000000000b1','cambodia','ziggy');
insert into public.meal_logs(user_id,id,dish_id,restaurant_id,country_code,started_at,completed_at,local_day,verification_method,verified,verification_source,verification_checked_at,feedback_reaction)
 values ('00000000-0000-4000-8000-0000000000b1','test-b','num-banh-chok','google:test','KH',now(),now(),'2026-10-06','location-demo',true,'development',now(),'loved');
insert into public.opened_boxes(user_id,box_id,visit_id,country_id,collectible_id,duplicate,opened_at)
 values ('00000000-0000-4000-8000-0000000000b1','box-test-b','test-b','cambodia','ziggy',false,now());

set local role anon;
do $$ declare t text; begin
  foreach t in array array['profiles','dish_favorites','restaurant_favorites','recent_dish_views','meal_logs','opened_boxes','collectible_favorites'] loop
    perform pg_temp.assert_denied(format('select * from public.%I',t));
    perform pg_temp.assert_denied(format('delete from public.%I',t));
  end loop;
  perform pg_temp.assert_denied($sql$select public.record_nom_dish_view('nasi-goreng',now())$sql$);
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}',true);
set local role authenticated;

-- Every table must hide B's existing rows from A, not just reject writes.
do $$ declare t text; n bigint; begin
  foreach t in array array['profiles','dish_favorites','restaurant_favorites','recent_dish_views','meal_logs','opened_boxes','collectible_favorites'] loop
    execute format('select count(*) from public.%I',t) into n;
    perform pg_temp.assert_true(n = 0,'other-user rows hidden in ' || t);
  end loop;
end $$;
insert into public.profiles(id,display_name) values ((select auth.uid()),'User A');
update public.profiles set display_name = 'Updated A' where id = (select auth.uid());
select pg_temp.assert_true((select display_name = 'Updated A' from public.profiles),'own profile update');
select pg_temp.assert_denied($sql$insert into public.profiles(id,display_name) values ('00000000-0000-4000-8000-0000000000b1','Forged')$sql$);
do $$ declare n bigint; begin
  update public.profiles set display_name='Forged' where id='00000000-0000-4000-8000-0000000000b1';
  get diagnostics n = row_count; perform pg_temp.assert_true(n=0,'cannot update B profile');
end $$;
select pg_temp.assert_denied($sql$update public.profiles set id='00000000-0000-4000-8000-0000000000b1' where id=(select auth.uid())$sql$);
insert into public.dish_favorites(user_id,dish_id) values ((select auth.uid()),'nasi-goreng');
insert into public.restaurant_favorites(user_id,restaurant_id) values ((select auth.uid()),'google:test');
insert into public.collectible_favorites(user_id,country_id,collectible_id) values ((select auth.uid()),'cambodia','ziggy');
update public.dish_favorites set is_active=false,updated_at='2000-01-01' where user_id=(select auth.uid());
update public.restaurant_favorites set is_active=false where user_id=(select auth.uid());
update public.collectible_favorites set is_active=false where user_id=(select auth.uid());
select pg_temp.assert_true((select not is_active and updated_at > '2000-01-01' from public.dish_favorites),'server timestamp and own tombstone');
select pg_temp.assert_true((select not is_active from public.restaurant_favorites),'own restaurant tombstone');
select pg_temp.assert_true((select not is_active from public.collectible_favorites),'own collectible tombstone');
select public.record_nom_dish_view('nasi-goreng','2026-10-06T12:00:00Z');
select public.record_nom_dish_view('nasi-goreng','2026-10-01T12:00:00Z');
select pg_temp.assert_true((select viewed_at='2026-10-06T12:00:00Z' from public.recent_dish_views),'RPC newest wins');
update public.recent_dish_views set viewed_at='2000-01-01';
select pg_temp.assert_true((select viewed_at='2026-10-06T12:00:00Z' from public.recent_dish_views),'direct update newest wins');
insert into public.recent_dish_views(user_id,dish_id,viewed_at) values ((select auth.uid()),'nasi-goreng','2000-01-01')
 on conflict (user_id,dish_id) do update set viewed_at=excluded.viewed_at;
select pg_temp.assert_true((select viewed_at='2026-10-06T12:00:00Z' from public.recent_dish_views),'direct upsert newest wins');
do $$ declare n bigint; begin
  update public.recent_dish_views set viewed_at='2000-01-01' where user_id='00000000-0000-4000-8000-0000000000b1';
  get diagnostics n = row_count; perform pg_temp.assert_true(n=0,'cannot update B recent views');
end $$;
select pg_temp.assert_denied($sql$update public.recent_dish_views set user_id='00000000-0000-4000-8000-0000000000b1' where user_id=(select auth.uid())$sql$);

do $$ declare t text; n bigint; begin
  foreach t in array array['dish_favorites','restaurant_favorites','collectible_favorites'] loop
    execute format('update public.%I set is_active=false where user_id=''00000000-0000-4000-8000-0000000000b1''',t);
    get diagnostics n = row_count; perform pg_temp.assert_true(n=0,'cannot update B in ' || t);
    perform pg_temp.assert_denied(format('update public.%I set user_id=''00000000-0000-4000-8000-0000000000b1'' where user_id=(select auth.uid())',t));
  end loop;
end $$;
select pg_temp.assert_denied($sql$insert into public.dish_favorites(user_id,dish_id) values ('00000000-0000-4000-8000-0000000000b1','lort-cha')$sql$);
select pg_temp.assert_denied($sql$insert into public.restaurant_favorites(user_id,restaurant_id) values ('00000000-0000-4000-8000-0000000000b1','google:other')$sql$);
select pg_temp.assert_denied($sql$insert into public.recent_dish_views(user_id,dish_id,viewed_at) values ('00000000-0000-4000-8000-0000000000b1','lort-cha',now())$sql$);
select pg_temp.assert_denied($sql$insert into public.collectible_favorites(user_id,country_id,collectible_id) values ('00000000-0000-4000-8000-0000000000b1','cambodia','lumi')$sql$);

insert into public.meal_logs(user_id,id,dish_id,restaurant_id,country_code,started_at,completed_at,local_day,verification_method,verified,verification_source,verification_checked_at,feedback_reaction)
 values ((select auth.uid()),'test-a','num-banh-chok','google:test','KH',now(),now(),'2026-10-06','location-demo',true,'development',now(),'loved');
insert into public.opened_boxes(user_id,box_id,visit_id,country_id,collectible_id,duplicate,opened_at)
 values ((select auth.uid()),'box-test-a','test-a','cambodia','ziggy',false,now());
select pg_temp.assert_true((select count(*)=1 from public.meal_logs),'own meals readable');
select pg_temp.assert_true((select count(*)=1 from public.opened_boxes),'own openings readable');
insert into public.meal_logs select * from public.meal_logs where true on conflict (user_id,id) do nothing;
insert into public.opened_boxes select * from public.opened_boxes where true on conflict (user_id,box_id) do nothing;
select pg_temp.assert_true((select count(*)=1 from public.meal_logs),'meal replay is idempotent');
select pg_temp.assert_true((select count(*)=1 from public.opened_boxes),'opening replay is idempotent');
select pg_temp.assert_true((select local_day='2026-10-06' from public.meal_logs),'recorded local day retained');
select pg_temp.assert_true((select collectible_id='ziggy' and not duplicate from public.opened_boxes),'original opening retained');
select pg_temp.assert_denied($sql$insert into public.meal_logs(user_id,id,dish_id,restaurant_id,country_code,started_at,completed_at,local_day,verification_method,verified,verification_source,verification_checked_at,feedback_reaction) values ('00000000-0000-4000-8000-0000000000b1','forged','num-banh-chok','google:test','KH',now(),now(),'2026-10-06','location-demo',true,'development',now(),'loved')$sql$);
select pg_temp.assert_denied($sql$insert into public.opened_boxes(user_id,box_id,visit_id,country_id,collectible_id,duplicate,opened_at) values ('00000000-0000-4000-8000-0000000000b1','box-test-b','test-b','cambodia','ziggy',false,now())$sql$);
select pg_temp.assert_denied($sql$update public.meal_logs set feedback_note='rewritten'$sql$);
select pg_temp.assert_denied($sql$delete from public.meal_logs$sql$);
select pg_temp.assert_denied($sql$update public.opened_boxes set collectible_id='lumi'$sql$);
select pg_temp.assert_denied($sql$delete from public.opened_boxes$sql$);
select pg_temp.assert_denied($sql$delete from public.profiles$sql$);
select pg_temp.assert_denied($sql$delete from public.dish_favorites$sql$);
select pg_temp.assert_denied($sql$delete from public.restaurant_favorites$sql$);
select pg_temp.assert_denied($sql$delete from public.recent_dish_views$sql$);
select pg_temp.assert_denied($sql$delete from public.collectible_favorites$sql$);
-- An authenticated database role without a valid subject is not an owner.
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
do $$ declare t text; n bigint; begin
  foreach t in array array['profiles','dish_favorites','restaurant_favorites','recent_dish_views','meal_logs','opened_boxes','collectible_favorites'] loop
    execute format('select count(*) from public.%I',t) into n;
    perform pg_temp.assert_true(n=0,'missing subject cannot read ' || t);
  end loop;
end $$;
select pg_temp.assert_denied($sql$insert into public.profiles(id,display_name) values ('00000000-0000-4000-8000-0000000000a1','No subject')$sql$);
reset role;
delete from auth.users where id='00000000-0000-4000-8000-0000000000a1';
do $$ declare t text; owner text; n bigint; begin
  foreach t in array array['profiles','dish_favorites','restaurant_favorites','recent_dish_views','meal_logs','opened_boxes','collectible_favorites'] loop
    owner := case when t='profiles' then 'id' else 'user_id' end;
    execute format('select count(*) from public.%I where %I=''00000000-0000-4000-8000-0000000000a1''',t,owner) into n;
    perform pg_temp.assert_true(n=0,'auth deletion cascades to ' || t);
    execute format('select count(*) from public.%I where %I=''00000000-0000-4000-8000-0000000000b1''',t,owner) into n;
    perform pg_temp.assert_true(n=1,'deleting A preserves B in ' || t);
  end loop;
end $$;
rollback;
