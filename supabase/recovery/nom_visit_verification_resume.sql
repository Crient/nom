-- MANUAL RECOVERY ONLY. Use after a separately reviewed forward correction and
-- validation, with owner approval. Do not drop/recreate evidence or rotate keys.
begin;
do $$ begin
  if to_regclass('public.visit_verifications') is null or to_regprocedure('public.issue_nom_visit_verification(jsonb)') is null then
    raise exception 'Expected verification schema missing; inspect before recovery';
  end if;
end $$;
grant select on public.visit_verifications to service_role;
grant execute on function public.issue_nom_visit_verification(jsonb) to service_role;
commit;
