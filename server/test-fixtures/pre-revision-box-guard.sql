-- Frozen pre-revision function, used ONLY by disposable local regression tests.
-- Never apply this defective accounting to Nom or any remote database.
create or replace function nom_private.guard_verified_box() returns trigger
language plpgsql security definer set search_path='' as $$
declare credits integer; used integer; meal_country text; has_proof boolean; next_reward text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
  select country_code,verified into meal_country,has_proof from public.meal_logs where user_id=new.user_id and id=new.visit_id;
  if not coalesce(has_proof,false) or meal_country is distinct from (case new.country_id when 'cambodia' then 'KH' when 'colombia' then 'CO' when 'united-states' then 'US'
    when 'japan' then 'JP' when 'italy' then 'IT' when 'india' then 'IN' when 'china' then 'CN' when 'france' then 'FR' end) then
    raise exception 'Box requires a verified country meal' using errcode='23514';end if;
  if exists(select 1 from public.opened_boxes where user_id=new.user_id and box_id=new.box_id) then return new;end if;
  select count(distinct (dish_id,local_day))/3 into credits from public.meal_logs where user_id=new.user_id and verified and country_code=meal_country;
  select count(*) into used from public.opened_boxes where user_id=new.user_id and country_id=new.country_id;
  if used>=credits then raise exception 'No verified box credit available' using errcode='23514';end if;
  select reward into next_reward from unnest(array['ziggy','kiko','fenn','milo','nox','lumi']) with ordinality as candidates(reward,position)
    where not exists(select 1 from public.opened_boxes where user_id=new.user_id and country_id=new.country_id and collectible_id=reward)
    order by position limit 1;
  new.duplicate:=exists(select 1 from public.opened_boxes where user_id=new.user_id and country_id=new.country_id and collectible_id=new.collectible_id);
  if not new.duplicate then new.collectible_id:=coalesce(next_reward,'ziggy'); end if;
  new.duplicate:=exists(select 1 from public.opened_boxes where user_id=new.user_id and country_id=new.country_id and collectible_id=new.collectible_id);
  new.opened_at:=now();
  return new;
end $$;
