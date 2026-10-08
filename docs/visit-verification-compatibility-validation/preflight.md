# Controlled Nom verification preflight and backup

> Historical preflight below. The owner subsequently approved the pinned migration, which applied successfully on October 8, 2026. See [live application and validation](./application.md) for the current state. Recovery scripts remain unexecuted.

**GO for the exact reviewed migration, subject to explicit owner approval. Nothing has been applied.** This was a read-only remote inspection and private backup/isolated-restore exercise. No live verification writes, recovery-script execution, remote configuration changes, credentials, staging, commits, pushes or deployments occurred.

Snapshot: **2026-10-08 03:41:09.978336 UTC** (October 7, 11:41 p.m. EDT). Final remote snapshot fingerprint matched the saved backup after its creation. Recheck for intervening changes before any approved application; refresh the backup if its schema/data fingerprint changes.

## Exact target and remote state

- Project name **Nom**; ID/ref **iwamwxsosrhxsdcsuoiu**; database host `db.iwamwxsosrhxsdcsuoiu.supabase.co`.
- Project status **ACTIVE_HEALTHY**; hosted PostgreSQL **17.11**. Read-only SQL session is `postgres`, with the required database/public-schema CREATE privileges. Zero lock-waiting sessions were observed during the inspection.
- Migration history contains exactly **202610060001 / nom_accounts**. The verification migration has no history entry.
- `public.visit_verifications` and schema `nom_private` are absent. Consequently both private verification tables are absent.
- All five planned verification functions, both guard triggers and all three explicit verification indexes are absent. Existing public objects are the seven account tables, three original Nom functions and the pre-existing platform `rls_auto_enable()` helper; no other public tables/views/sequences were found.
- `meal_logs`: original **16 columns**, legacy wire method/boolean checks, restaurant-ID maximum **256**, original owner/event PK and Auth cascade FK. None of the eight new verification columns exists.
- `opened_boxes`: original **seven columns**, owner/box PK, box-to-visit binding check, country/collectible checks and cascade FKs to Auth and owned meals. No verification reward guard exists yet.
- All seven tables are owned by `postgres`, RLS enabled, FORCE RLS false. **19 owner policies** and **five original user triggers** remain. Anonymous has no account table grants; authenticated has SELECT/INSERT on immutable meals/openings and SELECT/INSERT/UPDATE on the five mutable account tables. Existing service-role administrative privileges/default ACLs were captured without alteration.

| Table | Exact rows |
|---|---:|
| profiles | 1 |
| recent_dish_views | 7 |
| dish_favorites | 0 |
| restaurant_favorites | 0 |
| meal_logs | 0 |
| opened_boxes | 0 |
| collectible_favorites | 0 |
| visit_verifications | Absent |

**Schema drift:** none detected in rollout-relevant account objects/history/counts compared with the prior review. Independently reconstructing the original account migration confirmed matching columns, defaults/NOT NULL flags, constraints, indexes, policies, triggers and three Nom function definitions. Managed platform objects and default privileges are captured separately; they are not assumed to have originated in Nom's SQL. No byte-exact historical fingerprint of every global managed object was available, so unrelated platform drift since an older session is not certified.

## Health and advisors

Performance Advisor: **no findings**. Security Advisor: **three WARN findings remain open**:

1. Existing `public.rls_auto_enable()` SECURITY DEFINER EXECUTE privilege for anonymous callers. [Remediation reference](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
2. The same helper's EXECUTE privilege for authenticated callers. [Remediation reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
3. Auth leaked-password protection disabled. [Password-protection reference](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The first two match the already-investigated warnings. The helper returns `event_trigger`, is owned by postgres, fixes search_path to pg_catalog, and backs `ensure_rls`; it enables RLS on newly created public tables and logs failures. Its function definition and event-trigger binding were captured. The prior report recorded direct REST invocation rejection; no RPC was invoked in this preflight. The pending migration enables RLS explicitly and does not modify this helper. There are also managed PostgREST schema-cache watchers; their metadata/definitions are captured, but they are not edited or redeployed.

Disabled leaked-password protection is a newly recorded advisory in this preflight, not evidence that its configuration changed during this work. It is an Auth hardening item independent of this migration. No warning was silently fixed; this is not a claim that Security Advisor is clean. No new migration-specific blocker was identified.

## Exact immutable migration and recovery assets

Only `supabase/migrations/20261006234854_nom_visit_verification.sql` is proposed.

| Asset | SHA-256 |
|---|---|
| Reviewed migration | `2536fad85cb540e4242a0156b7a49d4b88a3cb97f6b7dda28c0a813228ce7d75` |
| nom_visit_verification_pause.sql | `534a1bf60f0f1828d813fd8b2be2e5a2b95aebbc9780af1b4f8249dbde2f1ea9` |
| nom_visit_verification_resume.sql | `43c8daa7cb50a1ae46941ec71b25321183c767aea7d169884fbede404a0c860d` |

The migration matches the earlier reviewed fingerprint. Recovery files exist, are readable, match their preserved copies, and retain transactional missing-schema guards. Pause revokes the application's ledger-read/issuance permissions; resume restores them. Neither was executed here, even locally. Their prior isolated compatibility tests remain the execution evidence.

## Verified private scoped backup

Saved outside Git in:

`/Users/leng/Nom-private-backups/verification-preflight-20261008T034109Z`

Directory mode **0700**, all 14 files mode **0600**. No production secret key, database password, OAuth secret, Auth credential/session export or environment file was obtained or added locally. Private account rows remain in the private backup only; no row values were printed or copied into repository documentation.

The backup was taken with a **single REPEATABLE READ, READ ONLY transaction**. It contains all seven account tables' full rows, 44 columns/defaults/NOT NULL flags, 35 constraints, 11 indexes, ownership/RLS/options, 19 policies, table and function grants, five triggers, four public function definitions, auth.uid() definition, relevant schema/default-ACL metadata, role/membership metadata, migration history, managed event-trigger definitions/bindings, and Auth UUID references. This includes every existing object/data set that the pending migration changes or depends on. Created verification objects have no pre-existing state to export.

It is a **scoped account schema/data recovery backup**, not a full-project/PITR or full Auth backup. The migration does not change Auth users, credentials or sessions. Auth identity IDs are retained to verify FKs against existing identities; the isolated restore uses an ID-only Auth harness. That harness must never be used to replace hosted Auth. Broader whole-project disaster recovery is outside this preflight's scope.

Files:

- `snapshot.json`: private consistent remote state plus preflight/advisors.
- `schema-before.sql`, `data-before.sql`, `triggers-before.sql`: generated scoped restoration assets; table data loads before stamping triggers, preserving original timestamps. No DROP/CASCADE rollback is included.
- Original account SQL, exact reviewed verification SQL, and both recovery SQL files.
- `build-backup.py`, `verify-backup.mjs`, `generated-checksums.json`, `restore-verification.json`, `checksums.json`, `README.txt`.

Verification performed **from the persisted durable files**, not merely from memory or command exit status:

1. Read/parse every asset and verify cryptographic manifests.
2. Reconstruct the scoped account schema into an isolated PGlite PostgreSQL engine with role/Auth UUID reference dependencies, load all rows, then create original stamping triggers.
3. Compare exact JSON rows including microsecond timestamps for every table: all **eight rows** match.
4. Compare all columns, validated constraints, indexes, policies, table ownership/RLS, exact table/function grants, original functions, triggers, public-schema ownership/grants and scoped default ACLs: **PASS**.
5. Compare account structures independently with the original account migration: **PASS**.
6. Compute a canonical PostgreSQL JSONB fingerprint of the entire captured schema/data packet excluding only capture time, then re-read the same scope remotely and compare: **MATCH**. No captured-state change occurred while preparing the backup.

Snapshot-file SHA-256: `c57703182c0960425b326762982060fae8c18fa3ddff74a363ea5f6adb05ed56`.

Canonical remote schema/data fingerprint: `d249e93d3e8cc356790cea8e2e4666c719e99dd7dec5c5ceef5cf2e278c638bf`.

Restore checker used PostgreSQL **18.3 / PGlite 0.5.8**, versus hosted PostgreSQL **17.11**. NOT NULL is compared through column flags because PG18 catalogs additional named NOT NULL constraints. UTC was selected locally so equivalent timestamp instants serialize identically. These are checker representation adjustments, not changes to backup values or remote state. This proves scoped recovery in a compatible isolated engine; it is not a full managed-platform restore rehearsal.

Do not replay the scoped CREATE scripts over a live database, restore stale rows wholesale, drop evidence, or execute recovery scripts without approval. Use this backup as verified source material for a reviewed forward correction, preserving newly accepted data and replay fingerprints. Refresh it before application if the captured state changes.

## Final migration re-review

- **Destructive statements:** no DROP TABLE/COLUMN, TRUNCATE or destructive CASCADE. Four original CHECK constraints are intentionally removed/replaced, including both restaurant-ID checks. The DELETE inside the future budget function only removes old private budget buckets when that function is later called; it does not delete anything during migration creation.
- **Data rewrite:** exactly the documented normalization of all existing meals to false/unverified/legacy. Current affected count is zero. IDs, timestamps, feedback and opening history remain untouched. Future old-client inserts are safely downgraded by the trigger. No surprise backfill or retroactive reward exists.
- **RLS/grants:** explicit RLS on three new tables; private schemas/tables inaccessible to clients; ledger SELECT is owner- and column-restricted. Explicit revocations override broad hosted default grants. No added client UPDATE/DELETE on immutable account events. Existing account owner policies remain.
- **Functions/triggers:** three restricted RPCs and two private guard functions, all with fixed empty search paths. Authenticated claim binds identity/claim hash/event fields; service-only issuance/budget paths remain trusted. Existing managed RLS/cache watchers are compatible with the reviewed DDL; hosted behavior will be confirmed after authorized execution.
- **Old-client compatibility:** migration retains the current wire whitelist, new readers decode canonical methods, legacy writes remain readable and unverified. New client release must follow the schema, not precede it.
- **Reward accounting:** only proof-backed meals/openings count; archival legacy openings consume no new credit or ownership. Distinct eligible dish/day threshold remains three; owned openings/replay checks remain idempotent.
- **Isolation/deletion:** owner RLS and claim bindings persist. Auth deletion cascades account rows/owned ledger; private non-identifying replay fingerprints survive. No Auth users or personal account are changed by the migration.
- **Transaction/retry:** DDL and normalization are in one transaction. Failure before COMMIT rolls back. Existing/partial verification state causes explicit refusal; successful reruns are not allowed. Recover via a separately reviewed forward correction, retaining evidence.

The prior 1,269-test compatibility result remains unchanged; this preflight did not repeat the full test/build suite, apply the pending migration in a local engine, or execute recovery scripts. Actual hosted issuance, signed meal persistence and verification-specific RLS/replay validation remain the next phase after approved application.

## Exact next proposed action — NOT EXECUTED

After explicit approval, recheck target/current captured-state fingerprint and verify both the current file and preserved backup copy have the pinned SHA-256. Then invoke **only** the connected Supabase migration action:

```text
Supabase apply_migration
project_id: iwamwxsosrhxsdcsuoiu
name: nom_visit_verification
query: exact bytes of 20261006234854_nom_visit_verification.sql
       SHA-256 2536fad85cb540e4242a0156b7a49d4b88a3cb97f6b7dda28c0a813228ce7d75
```

This action records migration history and executes only that supplied SQL. Do not use a broad `db push`, recreate account tables, execute backup/recovery scripts, or change any environment/deployment configuration. The connector may assign the applied history version; verify its recorded name and executed source afterward rather than editing history to imitate a filename.

**Decision: GO for this exact SQL after approval.** Verified scoped backup and current schema are compatible; existing security hardening findings and post-migration hosted validation remain open. The working tree, index and HEAD are preserved apart from this report and a link in the local compatibility report. Stop here for explicit approval.
