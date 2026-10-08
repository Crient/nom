-- MANUAL RECOVERY ONLY, NOT AN AUTOMATIC MIGRATION.
-- Nom / iwamwxsosrhxsdcsuoiu only; remote execution requires owner approval.
-- Stop new issuance and make handler readiness fail closed. Keep existing
-- claims, immutable history, ownership, signatures and replay fingerprints.
begin;
do $$ begin
  if to_regclass('public.visit_verifications') is null or to_regprocedure('public.issue_nom_visit_verification(jsonb)') is null then
    raise exception 'Expected verification schema missing; inspect before recovery';
  end if;
end $$;
revoke select on public.visit_verifications from service_role;
revoke execute on function public.issue_nom_visit_verification(jsonb) from service_role;
commit;
