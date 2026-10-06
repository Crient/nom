-- Read-only post-migration assertions. Run as an authorized database owner:
-- psql -X -v ON_ERROR_STOP=1 -f supabase/tests/accounts_schema.sql
-- Verify the connection targets inspected Nom iwamwxsosrhxsdcsuoiu or an
-- authorized isolated Supabase-compatible test database before execution.
begin read only;
do $$
declare
  t text; owner text; rel oid; owner_column smallint; mutable boolean;
  privilege text; allowed boolean; function_name text; spec record;
begin
  foreach t in array array['profiles','dish_favorites','restaurant_favorites','recent_dish_views','meal_logs','opened_boxes','collectible_favorites'] loop
    rel := to_regclass(format('public.%I',t));
    if rel is null then raise exception 'Missing account table: %',t; end if;
    if not (select relrowsecurity from pg_class where oid=rel) then raise exception 'RLS disabled: %',t; end if;
    owner := case when t='profiles' then 'id' else 'user_id' end;
    select attnum into owner_column from pg_attribute where attrelid=rel and attname=owner and not attisdropped;
    if owner_column is null or not exists (
      select 1 from pg_constraint where conrelid=rel and contype='f'
        and confrelid='auth.users'::regclass and confdeltype='c' and conkey=array[owner_column]
    ) then raise exception 'Missing cascading auth ownership: %',t; end if;
    if not exists (select 1 from pg_constraint where conrelid=rel and contype='p') then raise exception 'Missing primary key: %',t; end if;
    mutable := t not in ('meal_logs','opened_boxes');
    foreach privilege in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege('anon',rel,privilege) then raise exception 'Anonymous account-table privilege: % %',t,privilege; end if;
      allowed := privilege in ('SELECT','INSERT') or (mutable and privilege='UPDATE');
      if has_table_privilege('authenticated',rel,privilege) is distinct from allowed then
        raise exception 'Incorrect authenticated grant: % % (expected %)',t,privilege,allowed;
      end if;
    end loop;
    if not exists (select 1 from pg_policy where polrelid=rel and polcmd='r')
      or not exists (select 1 from pg_policy where polrelid=rel and polcmd='a') then raise exception 'Missing read/insert policy: %',t; end if;
    if mutable and not exists (select 1 from pg_policy where polrelid=rel and polcmd='w') then raise exception 'Missing mutable update policy: %',t; end if;
    if not mutable and exists (select 1 from pg_policy where polrelid=rel and polcmd in ('w','d','*')) then raise exception 'Mutable historical event policy: %',t; end if;
  end loop;
  for spec in select * from (values
    ('profiles',array['id']), ('dish_favorites',array['user_id','dish_id']),
    ('restaurant_favorites',array['user_id','restaurant_id']), ('recent_dish_views',array['user_id','dish_id']),
    ('meal_logs',array['user_id','id']), ('opened_boxes',array['user_id','box_id']),
    ('collectible_favorites',array['user_id','country_id','collectible_id'])
  ) as expected(table_name,columns) loop
    if (select array_agg(a.attname::text order by keys.position)
      from pg_constraint c cross join lateral unnest(c.conkey) with ordinality as keys(attnum,position)
      join pg_attribute a on a.attrelid=c.conrelid and a.attnum=keys.attnum
      where c.conrelid=to_regclass(format('public.%I',spec.table_name)) and c.contype='p') is distinct from spec.columns
      then raise exception 'Incorrect account primary key: %',spec.table_name; end if;
  end loop;
  if not exists (select 1 from pg_constraint where conrelid='public.opened_boxes'::regclass
    and confrelid='public.meal_logs'::regclass and contype='f' and confdeltype='c') then raise exception 'Missing owner/visit event cascade'; end if;
  foreach t in array array['recent_dish_views_owner_time','meal_logs_owner_completed','opened_boxes_owner_visit','opened_boxes_owner_time'] loop
    if to_regclass(format('public.%I',t)) is null then raise exception 'Missing account index: %',t; end if;
  end loop;
  foreach function_name in array array['public.nom_stamp_updated_at()','public.nom_keep_newest_view()','public.record_nom_dish_view(text,timestamp with time zone)'] loop
    if not exists (select 1 from pg_proc p where p.oid=to_regprocedure(function_name) and not p.prosecdef
      and exists (select 1 from unnest(p.proconfig) setting where setting in ('search_path=','search_path=""')))
      then raise exception 'Missing or unsafe account function: %',function_name; end if;
    if has_function_privilege('anon',function_name,'EXECUTE') then raise exception 'Anonymous account function access: %',function_name; end if;
  end loop;
  if not has_function_privilege('authenticated','public.record_nom_dish_view(text,timestamp with time zone)','EXECUTE') then raise exception 'Missing recent-view RPC grant'; end if;
  if has_function_privilege('authenticated','public.nom_stamp_updated_at()','EXECUTE')
    or has_function_privilege('authenticated','public.nom_keep_newest_view()','EXECUTE') then raise exception 'Exposed account trigger function'; end if;
  raise notice 'Account schema, ownership, keys, RLS, grants, indexes and functions passed.';
end $$;
select tablename, rowsecurity from pg_tables where schemaname='public'
  and tablename in ('profiles','dish_favorites','restaurant_favorites','recent_dish_views','meal_logs','opened_boxes','collectible_favorites') order by tablename;
rollback;
