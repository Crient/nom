-- REVIEW ONLY: target Nom / iwamwxsosrhxsdcsuoiu. Apply requires owner approval.
-- Retain history/feedback; old simulated checks no longer count as verified.
-- Existing verification_method is a legacy wire field for cached clients.
-- Canonical methods live in the ledger/signed proof; clients decode this alias.
begin;
do $$ begin
  if to_regclass('public.visit_verifications') is not null or exists(select 1 from pg_namespace where nspname='nom_private') then
    raise exception 'Verification migration already applied or partial schema exists; inspect migration history and use a reviewed forward fix';
  end if;
end $$;
create schema nom_private;
revoke all on schema nom_private from public, anon, authenticated;

create table public.visit_verifications (
  id uuid primary key,
  visit_id text not null unique check (visit_id ~ '^[0-9a-fA-F-]{36}$'),
  user_id uuid references auth.users(id) on delete cascade,
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  claim_hash text not null check (claim_hash ~ '^[a-f0-9]{64}$'),
  proof text not null check (length(proof)<=2000),signature text not null check (signature ~ '^[a-f0-9]{128}$'),
  dish_id text not null, restaurant_id text not null check (length(restaurant_id) between 8 and 263 and restaurant_id ~ '^google:[A-Za-z0-9_-]+$'),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  method text not null check (method in ('location','qr','receipt')),
  verified_at timestamptz not null default now(),
  distance_meters integer check (distance_meters between 0 and 280),
  accuracy_meters integer check (accuracy_meters between 0 and 100),
  receipt_confidence double precision check (receipt_confidence between 0.85 and 1),
  qr_nonce uuid unique, evidence_hash text unique, image_hash text unique,
  version integer not null default 1 check (version=1),
  check ((method='location' and distance_meters is not null and accuracy_meters is not null)
      or (method='qr' and qr_nonce is not null) or (method='receipt' and receipt_confidence is not null and evidence_hash is not null and image_hash is not null))
);
create index visit_verifications_owner on public.visit_verifications(user_id);
alter table public.visit_verifications enable row level security;
revoke all on public.visit_verifications from public, anon, authenticated;
grant select (id,visit_id,user_id,dish_id,restaurant_id,country_code,method,verified_at,distance_meters,accuracy_meters,receipt_confidence,version,proof,signature) on public.visit_verifications to authenticated;
grant all on public.visit_verifications to service_role;
create policy verification_owner_read on public.visit_verifications for select to authenticated using ((select auth.uid())=user_id);

create table nom_private.verification_budgets (subject text not null, bucket timestamptz not null, requests integer not null, primary key(subject,bucket));
alter table nom_private.verification_budgets enable row level security;
revoke all on nom_private.verification_budgets from public,anon,authenticated;
-- Non-identifying redemption fingerprints survive account deletion so a still
-- valid QR or previously redeemed receipt cannot award another account credit.
create table nom_private.verification_redemptions (
  kind text not null, fingerprint text not null, redeemed_at timestamptz not null default now(),
  primary key(kind,fingerprint)
);
alter table nom_private.verification_redemptions enable row level security;
revoke all on nom_private.verification_redemptions from public,anon,authenticated;

create function public.consume_nom_verification_budget(p_subject text) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; g integer; b timestamptz := date_trunc('hour',now());
begin
  if p_subject !~ '^[a-f0-9]{64}$' then return false; end if;
  delete from nom_private.verification_budgets where bucket < now()-interval '2 days';
  insert into nom_private.verification_budgets values ('global',date_trunc('day',now()),1)
    on conflict(subject,bucket) do update set requests=nom_private.verification_budgets.requests+1 returning requests into g;
  insert into nom_private.verification_budgets values (p_subject,b,1)
    on conflict(subject,bucket) do update set requests=nom_private.verification_budgets.requests+1 returning requests into n;
  return n<=6 and g<=60;
end $$;
revoke all on function public.consume_nom_verification_budget(text) from public,anon,authenticated;
grant execute on function public.consume_nom_verification_budget(text) to service_role;

-- Atomic nonce/receipt redemption and idempotent visit issuance. Server only.
create function public.issue_nom_visit_verification(p_record jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.visit_verifications;
begin
  select * into r from public.visit_verifications where visit_id=p_record->>'visit_id';
  if found then return jsonb_build_object('record',to_jsonb(r)); end if;
  insert into public.visit_verifications select * from jsonb_populate_record(null::public.visit_verifications,p_record) returning * into r;
  if r.qr_nonce is not null then insert into nom_private.verification_redemptions(kind,fingerprint) values ('qr',encode(sha256(convert_to(r.qr_nonce::text,'UTF8')),'hex'));end if;
  if r.evidence_hash is not null then insert into nom_private.verification_redemptions(kind,fingerprint) values ('receipt',r.evidence_hash);end if;
  if r.image_hash is not null then insert into nom_private.verification_redemptions(kind,fingerprint) values ('image',r.image_hash);end if;
  return jsonb_build_object('record',to_jsonb(r));
exception when unique_violation then
  select * into r from public.visit_verifications where visit_id=p_record->>'visit_id';
  if found then return jsonb_build_object('record',to_jsonb(r)); end if;
  return jsonb_build_object('result','already_used');
end $$;
revoke all on function public.issue_nom_visit_verification(jsonb) from public,anon,authenticated;
grant execute on function public.issue_nom_visit_verification(jsonb) to service_role;

alter table public.meal_logs drop constraint meal_logs_verification_method_check;
alter table public.meal_logs drop constraint meal_logs_check;
-- Google Place IDs permit 256 characters plus the seven-character google: prefix.
alter table public.meal_logs drop constraint meal_logs_restaurant_id_check;
alter table public.meal_logs add constraint meal_logs_restaurant_id_check check (length(restaurant_id) between 1 and 263);
alter table public.restaurant_favorites drop constraint restaurant_favorites_restaurant_id_check;
alter table public.restaurant_favorites add constraint restaurant_favorites_restaurant_id_check check (length(restaurant_id) between 1 and 263);
alter table public.meal_logs add column verification_status text not null default 'unverified',
  add column verification_id uuid references public.visit_verifications(id),
  add column verification_distance_meters integer,
  add column verification_accuracy_meters integer,
  add column receipt_confidence double precision,
  add column verification_proof text,
  add column verification_signature text,
  add column verification_version integer not null default 1;
-- 'unverified' is the old-client wire spelling of canonical method 'none'.
update public.meal_logs set verified=false,verification_method='unverified',verification_source='legacy';
alter table public.meal_logs add constraint meal_verification_method check (verification_method in ('location-demo','qr-demo','receipt-demo','unverified')),
  add constraint meal_verification_status check (verification_status in ('verified','unverified','rejected','pending')),
  add constraint meal_verification_consistency check (verified=(verification_status='verified') and (verified=(verification_method<>'unverified')) and (not verified or verification_id is not null)),
  add constraint meal_verification_version check (verification_version=1);
create unique index meal_verification_once on public.meal_logs(verification_id) where verification_id is not null;
create index meal_verified_daily on public.meal_logs(user_id,dish_id,local_day) where verified;

-- Defense against direct REST writes and arbitrary client statuses/metadata.
create function nom_private.guard_meal_verification() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.visit_verifications;
begin
  -- Old cached/outbox writes have no ledger evidence. Preserve their history,
  -- never their simulated reward flag. An attempted canonical/ID-based forgery
  -- still takes the owned-proof guard below and fails closed.
  if new.verification_id is null and new.verification_method in ('location-demo','qr-demo','receipt-demo','unverified') then
    new.verified:=false;new.verification_status:='unverified';new.verification_source:='legacy';
  end if;
  if new.verified then
    select * into p from public.visit_verifications where id=new.verification_id;
    if not found or p.user_id is distinct from new.user_id or p.visit_id<>new.id or p.restaurant_id<>new.restaurant_id
      or p.dish_id<>new.dish_id or p.country_code<>new.country_code then raise exception 'Verified meal requires owned server evidence' using errcode='23514'; end if;
    new.verification_method:=p.method||'-demo'; new.verification_status:='verified';new.verification_source:='nom-server';
    new.verification_checked_at:=p.verified_at; new.completed_at:=p.verified_at;
    new.local_day:=(p.verified_at at time zone 'UTC')::date;
    new.verification_distance_meters:=p.distance_meters;new.verification_accuracy_meters:=p.accuracy_meters;
    new.receipt_confidence:=p.receipt_confidence;new.verification_version:=p.version;
    new.verification_proof:=p.proof;new.verification_signature:=p.signature;
  else
    new.verification_id:=null;new.verification_method:='unverified';new.verification_distance_meters:=null;
    new.verification_accuracy_meters:=null;new.receipt_confidence:=null;
    if new.verification_source is distinct from 'legacy' then new.verification_source:='manual';end if;
    new.verification_proof:=null;new.verification_signature:=null;
  end if;
  return new;
end $$;
revoke all on function nom_private.guard_meal_verification() from public,anon,authenticated;
create trigger guard_meal_verification before insert or update on public.meal_logs for each row execute function nom_private.guard_meal_verification();

-- Possession of a server-issued Guest claim is required to adopt evidence.
-- Fixed identity, constant target, row locks, no caller-supplied rewards.
create function public.record_nom_verified_meal(p_meal jsonb,p_claim_token text) returns void
language plpgsql security definer set search_path='' as $$
declare owner uuid:=(select auth.uid()); p public.visit_verifications; existing public.meal_logs;
begin
  if owner is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_claim_token is null or p_claim_token !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'Invalid verification claim' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
  select * into p from public.visit_verifications where id=(p_meal->>'verification_id')::uuid for update;
  if not found or p.claim_hash<>encode(sha256(convert_to(p_claim_token,'UTF8')),'hex') or (p.user_id is not null and p.user_id<>owner)
    or p.visit_id<>p_meal->>'id' or p.restaurant_id<>p_meal->>'restaurant_id' or p.dish_id<>p_meal->>'dish_id'
    or p.country_code<>p_meal->>'country_code' then raise exception 'Invalid verification evidence' using errcode='42501'; end if;
  select * into existing from public.meal_logs where user_id=owner and id=p.visit_id;
  if found then
    if existing.verification_id is distinct from p.id then raise exception 'Meal already logged' using errcode='23514';end if;
    return;
  end if;
  update public.visit_verifications set user_id=owner where id=p.id;
  insert into public.meal_logs select * from jsonb_populate_record(null::public.meal_logs,
    p_meal || jsonb_build_object('user_id',owner,'verified',true,'verification_status','verified','verification_method',p.method,
      'verification_source','nom-server','verification_checked_at',p.verified_at,'verification_version',1,'created_at',now()));
end $$;
revoke all on function public.record_nom_verified_meal(jsonb,text) from public,anon;
grant execute on function public.record_nom_verified_meal(jsonb,text) to authenticated;

-- Serialize box openings per owner, count only distinct verified dish/UTC days,
-- and bind every opening to a real verified meal in the selected country.
create function nom_private.guard_verified_box() returns trigger
language plpgsql security definer set search_path='' as $$
declare credits integer; used integer; meal_country text; has_proof boolean; meal_source text; next_reward text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
  select country_code,(verified and verification_id is not null),verification_source into meal_country,has_proof,meal_source from public.meal_logs where user_id=new.user_id and id=new.visit_id;
  if meal_country is distinct from (case new.country_id when 'cambodia' then 'KH' when 'colombia' then 'CO' when 'united-states' then 'US'
    when 'japan' then 'JP' when 'italy' then 'IT' when 'india' then 'IN' when 'china' then 'CN' when 'france' then 'FR' end) then
    raise exception 'Box requires a verified country meal' using errcode='23514';end if;
  -- Preserve an old outbox opening as archival history, not a funded reward.
  if not coalesce(has_proof,false) then
    if meal_source='legacy' then return new;end if;
    raise exception 'Box requires a verified country meal' using errcode='23514';
  end if;
  -- Retry of an immutable previously accepted opening consumes no new credit.
  if exists(select 1 from public.opened_boxes where user_id=new.user_id and box_id=new.box_id) then return new;end if;
  select count(distinct (dish_id,local_day))/3 into credits from public.meal_logs where user_id=new.user_id and verified and verification_id is not null and country_code=meal_country;
  select count(*) into used from public.opened_boxes b join public.meal_logs m on m.user_id=b.user_id and m.id=b.visit_id
    where b.user_id=new.user_id and b.country_id=new.country_id and m.verified and m.verification_id is not null;
  if used>=credits then raise exception 'No verified box credit available' using errcode='23514';end if;
  -- Collectibles follow a deterministic server-checked sequence; no rare-item forgery.
  select reward into next_reward from unnest(array['ziggy','kiko','fenn','milo','nox','lumi']) with ordinality as candidates(reward,position)
    where not exists(select 1 from public.opened_boxes b join public.meal_logs m on m.user_id=b.user_id and m.id=b.visit_id
      where b.user_id=new.user_id and b.country_id=new.country_id and b.collectible_id=reward and m.verified and m.verification_id is not null)
    order by position limit 1;
  -- Preserve a legitimate Guest duplicate when the account already owns it.
  new.duplicate:=exists(select 1 from public.opened_boxes b join public.meal_logs m on m.user_id=b.user_id and m.id=b.visit_id
    where b.user_id=new.user_id and b.country_id=new.country_id and b.collectible_id=new.collectible_id and m.verified and m.verification_id is not null);
  if not new.duplicate then new.collectible_id:=coalesce(next_reward,'ziggy'); end if;
  new.duplicate:=exists(select 1 from public.opened_boxes b join public.meal_logs m on m.user_id=b.user_id and m.id=b.visit_id
    where b.user_id=new.user_id and b.country_id=new.country_id and b.collectible_id=new.collectible_id and m.verified and m.verification_id is not null);
  new.opened_at:=now();
  return new;
end $$;
revoke all on function nom_private.guard_verified_box() from public,anon,authenticated;
create trigger guard_verified_box before insert on public.opened_boxes for each row execute function nom_private.guard_verified_box();
commit;
