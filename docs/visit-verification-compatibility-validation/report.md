# Local visit-verification compatibility and recovery revision

> Historical local results below remain unchanged. The verified private scoped backup is recorded in [controlled preflight](./preflight.md). The approved migration was subsequently applied on October 8, 2026; see [live application and validation](./application.md) for current database status and remaining local GPS/configuration work.

October 7, 2026. Target: **Nom — iwamwxsosrhxsdcsuoiu** only. Baseline HEAD: `c13329e86e89b17dfcf78b2815557b37ce04703c`. Comparison is against the restored, already dirty working tree at the start of this revision, not an assumption that HEAD contains earlier uncommitted work.

**Local result: PASS. Recommendation: approve the revised migration for a controlled schema-first rollout after a verified private backup and fresh read-only target/schema preflight.** This recommendation does not authorize execution. No Supabase, Vercel, Google Cloud or Production configuration/data was changed. No remote validation was performed in this revision. No staging, commit, push, deployment, reset, restore or stash occurred.

This supersedes the compatibility/accounting failures described in `docs/overnight-final-validation/migration-review.md`. Those failures were tested against the earlier pending migration; that report is retained as historical evidence.

## Problems fixed and exact migration revision

The existing pending file is still `supabase/migrations/20261006234854_nom_visit_verification.sql`; the original account migration is untouched.

Reviewed migration SHA-256: `2536fad85cb540e4242a0156b7a49d4b88a3cb97f6b7dda28c0a813228ce7d75`. Recheck this before execution; any later SQL edit needs renewed review.

| Problem | Revision |
|---|---|
| Old Production drops canonical `none/location/qr/receipt` meal rows | Keep `meal_logs.verification_method` as an old-client wire field: `unverified/location-demo/qr-demo/receipt-demo`. The ledger and signed proof retain canonical `location/qr/receipt`; new readers decode the wire alias before verifying signatures. |
| Old simulated verified writes fail instead of preserving history | The BEFORE trigger downgrades evidence-free legacy-shaped writes to `verified=false`, status `unverified`, wire method `unverified`, source `legacy`. No proof or quality metadata survives this path. |
| Legacy openings consume newly earned credits and steer collectible selection | Count used credits, existing funded collectibles and duplicate ownership only through openings joined to their owner's verified meal with nonnull ledger ID. Retain all existing opening rows. |
| Old pending box writes can block an otherwise valid offline outbox | An opening tied to an owned, country-matching legacy meal may be saved as archival history. It never consumes a verified credit or creates a new-client eligible unlock. Modern manual meals cannot fund or open a reward. |
| Ledger permits 263-character restaurant IDs while meals/favorites permit 256 | Replace `meal_logs_restaurant_id_check` and `restaurant_favorites_restaurant_id_check` with maximum 263. Google IDs still require the `google:` prefix plus a raw ID of at most 256 characters. Existing non-Google/manual IDs remain supported in account history. |
| A blind rerun could overwrite new verification or hide partial state | Explicitly reject an existing ledger or `nom_private` schema; use plain CREATE for the private schema. Existing CREATE/ALTER statements also reject incompatible remnants. All DDL/normalization remains in one transaction. |

The revision adds **no further tables, columns, indexes, functions, policies or triggers** beyond the previously prepared migration. It modifies that migration's method contract, guards, normalization, two existing ID constraints, and preflight. The full migration still creates:

- `nom_private`; `public.visit_verifications`; private `verification_budgets` and `verification_redemptions`.
- Eight meal columns: `verification_status`, `verification_id`, `verification_distance_meters`, `verification_accuracy_meters`, `receipt_confidence`, `verification_proof`, `verification_signature`, `verification_version`.
- Functions: `consume_nom_verification_budget`, `issue_nom_visit_verification`, `record_nom_verified_meal`, private `guard_meal_verification` and `guard_verified_box`.
- Triggers: BEFORE INSERT/UPDATE meal guard and BEFORE INSERT box guard; the existing account triggers remain.
- Owner SELECT policy on the ledger; RLS on all three new tables; no browser access to private tables or proof claim/subject hashes. Authenticated meal/box grants and owner RLS remain unchanged.
- Explicit indexes: ledger owner; unique partial meal verification ID; verified daily meals. Constraint-backed indexes protect ledger ID, visit ID, QR nonce, receipt/image fingerprints and private budget/redemption keys.
- Four meal verification CHECK constraints; replacement checks for the two restaurant-ID limits. The two original meal method/boolean checks are replaced by the compatibility method/status/evidence contract.

The five verification functions remain SECURITY DEFINER with an empty search path and qualified objects. Issuance/budget RPCs have service-role execution only; claim RPC requires authenticated identity, matching claim hash and event bindings. Ledger SELECT for clients is owner- and column-restricted. No client UPDATE/DELETE is added to immutable meals/openings. Service credentials remain a trusted issuance boundary; PostgreSQL does not independently verify Ed25519 signatures. Server/client signature checks and database ownership/replay guards have complementary roles.

## Legacy data and application compatibility

Every existing meal remains the same owner/event/dish/restaurant/country/timestamps/day/feedback record. Only verification flags/method/source are normalized; the new status defaults to unverified and proof columns are null. **No legacy meal becomes verified automatically, earns retroactive credit, or can be silently promoted by claiming newly issued evidence for the same already-saved event ID.** Existing opened boxes and collectible-favorite rows are not deleted.

There is one deliberate spelling exception to the requested `method=none` normalization: physical `meal_logs.verification_method='unverified'` is required for the immutable current Production reader. It means canonical `none` in the new app. Writing physical `none` would reproduce the old history-disappearance defect. Similarly, a `location-demo` wire alias on a new `verified=true` row means an actual owned ledger-backed `location` proof; a legacy simulation without evidence is always rewritten to false/unverified. Eligibility depends on owned evidence and status, never the alias alone.

Application changes are confined to compatibility/persistence:

1. `mealFromRow` decodes wire aliases. Signed metadata is checked against canonical proof fields; malformed/unsigned modern evidence remains ineligible.
2. An explicit evidence-free legacy payload normalizer preserves event IDs and feedback while changing the simulated flag/method/source. Both the repository and cached/offline-operation adoption use it. Extra identity fields are retained for rejection, never silently removed to make a forged operation valid. Operation IDs, clocks/order, account scope and acknowledgements are retained.
3. New signed Guest Experience snapshots use `nom.v3.guest.experience`; other Guest keys remain v2. Copy v2/v1 snapshots without replacing originals. Late distinct v2 Guest logs can be adopted; an existing v3 signed event wins by ID. Older cached tabs cannot overwrite the new signed snapshot with a serializer that strips proofs/claim tokens.
4. New account snapshots/journals use `nom.v3.user.<id>.cache`. Copy only that identity's v2 cache/journal, preserving original bytes, new records and ACK tombstones. Repeated adoption/storage events accept late old-tab journal entries. The durable journal wins over a stale snapshot. Deletion clears both generations for that account, including recovery/ACK records, without touching another account or Guest data.
5. Experience replay explicitly excludes openings associated with ineligible meals from new rewards. Legacy opening history remains archived in SQL and original local snapshots; it is not represented as a funded unlock by the new reducer. Reward threshold remains **three distinct eligible dish/day events**; no new reward policy or UI was introduced.

| Client/schema combination | Result |
|---|---|
| Current Production + current account schema | Unchanged until migration approval |
| Current Production + revised schema | Existing/migrated/manual and new proof-backed meals pass its method/boolean hydration contract. Simulated writes save only legacy history; old box retries are archival. |
| New client + revised schema | Canonical signature-verified hydration, proof claim RPC, legacy adoption and funded-credit accounting pass locally |
| New client + old schema | Unsupported: new fields/RPCs are missing. **Do not release the new app before the schema.** |

Production compatibility was checked using the method/boolean gates frozen from HEAD `c13329e`; this was not a new hosted-browser test. An old offline tab may still display its old local simulation until refresh/adoption. It cannot create authoritative verified database credit. The separate v3 caches preserve new proofs during mixed-version use; old v2 originals remain recoverable. A disabled/full local store can still prevent durable writes, as before; no original is intentionally discarded. Old cached snapshots without signatures cannot be trusted offline, but their history is retained and genuine signed cloud history rehydrates on reconnect.

The historical `scripts/validate-live-accounts.mjs` uses simulated pre-ledger meal fixtures and literal v2 account keys. It is not a valid verified-reward rollout test unchanged; do not run it and interpret simulated fixtures as proof-backed evidence. Use targeted real-issuance/claim checks for the approved rollout. It was not executed or modified here.

## Local test matrix and exact results

All databases were disposable in-memory PGlite PostgreSQL engines with the original account migration applied first. Auth-role/UID fixtures emulate local RLS; they do not reproduce every managed Supabase default grant, event trigger or PostgREST behavior.

| Flow | Status | Evidence |
|---|---|---|
| Migration from current account DDL with all four legacy methods | PASS | All event IDs/timestamps/feedback retained; false/unverified/legacy; both readers retain meals |
| Old client-shaped meal writes after migration | PASS | Four wire methods downgrade safely; old opening retries archive once |
| New verified/manual meals | PASS | Actual issuance/claim/trigger execution; verified and unverified history retained |
| Legacy Guest adoption, explicit merge and second-device hydration | PASS | Consent required; original bytes retained; one unverified upload; second isolated cache hydrates feedback/history |
| Legacy snapshot/durable offline outbox | PASS | Operation ID/clock preserved through failure/retry/refresh; original raw snapshots/journals retained |
| Mixed old/new tabs, ACKs and identity isolation | PASS | Late old operations adopted; acknowledgements prevent resurrection; signed snapshots preserved; B's cache excluded |
| One proof used twice | PASS | Same claim is a no-op; another event ID or owner cannot reuse proof; unique verification index retained |
| Existing legacy meal cannot gain retroactive verification | PASS | Claim using the already-saved event ID rejected without promoting it |
| Reward distinct-dish/day counting and reward-choice protection | PASS | Existing SQL trigger tests; unsigned/manual meals cannot fund rewards |
| Legacy box + three new eligible meals | PASS | Frozen defective guard rejects the first box; revised guard accepts it; legacy rare-item history cannot steer next reward; repeat inserts stay idempotent |
| Local refresh with legacy opening + signed credits | PASS | One fresh ready box survives; legacy opening consumes no credit/unlock |
| Anonymous denial and A/B RLS | PASS | Actual local role/permission/ownership tests in verificationDatabase plus compatibility suite |
| Account deletion | PASS | Auth-user delete cascades all seven account tables and owned ledger rows; both local cache generations cleared for only that identity |
| Replay fingerprints after deletion | PASS | QR/receipt/image replay remains denied; private fingerprint rows survive |
| Restaurant ID length 256 / 263 / 264 | PASS | First two issue, claim, hydrate and favorite; 264 rejected by shared validator and each SQL persistence boundary |
| Injected failure immediately before COMMIT | PASS | Schema, checks and normalization roll back; original verified flags/feedback restored; subsequent retry succeeds |
| Successful rerun / partial schema | PASS | Explicit refusal; real verified rows preserved; partial operator-owned objects untouched |
| Compensating pause/resume | PASS | Repeated pause denies service readiness/issuance; existing authenticated claims continue; deletion/replay remain safe; repeated resume restores issuance |
| Managed Supabase live checks | BLOCKED | Not authorized in this local-only revision; requires approved migration and disposable live fixtures |
| Real GPS/Google/provider/Preview/Production rollout | BLOCKED | Not performed; local environment and release approvals remain separate |

Final checks:

- `npm test`: **76 files, 1,269 tests passed**, including **22 new compatibility tests** (13 SQL/recovery + 9 cache/outbox). The full run also invokes existing 16- and 40-case Python checks.
- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py'`: **74 tests passed** independently.
- Production-mode build with intentionally enabled QA/design-preview input flags: **PASS**; production guards exclude those features. Source and generated-client credential-boundary checks pass.
- `npm run catalog:check` and build catalog validation: **PASS**, 201 unique canonical dishes, spreadsheet order intact.
- `npm ls --all`: **PASS**, valid package tree; `npm audit --json`: **zero vulnerabilities** in all severity categories. No dependency files changed in this revision.
- `git diff --check`: **PASS**. No secrets/environment values printed; no privileged browser references/embedded keys found.

One existing UI integration test referenced a literal v2 Guest key; its two assertions now use the already-imported `STORAGE_KEYS.experience`. Its journey assertions and UI behavior are unchanged.

## Rerun, rollback and recovery

**First execution:** require the verified account-only schema, no prior migration entry, no ledger/private-schema remnants, compatible original constraint names and a completed private backup. The migration is backward-compatible at the old client wire boundary, but intentionally changes legacy verification semantics. It takes table locks while changing constraints and normalizing history; schedule a quiet cutover, bound lock/statement waits at the runner level, and abort on unexpected schema/data rather than weakening guards.

**Failure before COMMIT:** PostgreSQL transactional DDL/data changes roll back together. In a still-open failed session issue `ROLLBACK`; verify original constraints/methods/row counts and absence of the new ledger/private schema. Fix the cause locally and retry this exact reviewed migration only when no successful history entry exists. The injected-failure test proves normalization and 263-character constraint changes are rolled back as well. This revision uses no nontransactional CONCURRENTLY operations.

**After success:** a raw rerun deliberately fails. Do not remove the preflight, use broad IF NOT EXISTS, repeat the normalization UPDATE, or repair history by reapplying the original file. Use a new separately reviewed forward migration for any actual defect. If a transport failure makes commit status uncertain, first inspect migration history AND object/state assertions; do not infer that a timeout means rollback.

### Exact backup preparation for the later approved operation

This is an operator procedure, **not executed here**. PostgreSQL/Supabase CLI backup tools are not installed in this shell. Use a version-compatible `pg_dump`/`pg_restore` and a verified private libpq service named `nom` connected only to project `iwamwxsosrhxsdcsuoiu`. The password belongs in a mode-0600 private password file, never in command arguments, repo files or logs. Verify the service host/username identifies the exact Nom project before running; do not substitute another project.

Store exports outside this repository with access restricted to the operator. These files contain personal data and Auth material. Do not paste, commit or attach them.

```sh
set -e
umask 077
mkdir -p "$HOME/Nom-private-backups"
nom_backup_dir=$(mktemp -d "$HOME/Nom-private-backups/verification-XXXXXXXX")
pg_dump --dbname='service=nom' --schema-only --format=custom \
  --schema=public --schema=auth --file="$nom_backup_dir/schema-before.dump"
pg_dump --dbname='service=nom' --data-only --format=custom \
  --schema=public --schema=auth --file="$nom_backup_dir/data-before.dump"
psql --dbname='service=nom' -X --set=ON_ERROR_STOP=1 --csv \
  --command="select user_id,id,dish_id,restaurant_id,country_code,started_at,completed_at,local_day,verified,verification_method,verification_source,verification_checked_at,feedback_reaction,feedback_observations,feedback_note,created_at from public.meal_logs order by user_id,id" \
  > "$nom_backup_dir/meals-before.csv"
pg_restore --list "$nom_backup_dir/schema-before.dump" > "$nom_backup_dir/schema-before.toc"
pg_restore --list "$nom_backup_dir/data-before.dump" > "$nom_backup_dir/data-before.toc"
shasum -a 256 "$nom_backup_dir/schema-before.dump" "$nom_backup_dir/data-before.dump" \
  "$nom_backup_dir/meals-before.csv" > "$nom_backup_dir/SHA256SUMS"
```

The schema export must include original CHECK/FK/PK/index definitions, trigger functions/triggers, ownership, grants and policies; do not use `--no-acl`. The data export includes all seven account tables and Auth identity/session state. The meal CSV explicitly captures original verification flags/method/source/checked time as well as event bindings and feedback. Preserve a private copy/checksum of the exact reviewed migration, the applied migration-history snapshot, seven table row counts and current grants/RLS assertions. Capture any live data accumulated since the prior empty-meal inspection. Test restore/inspection in an isolated compatible database; archive existence alone is not sufficient. If exporting Auth fails due to managed permissions, stop and obtain a verified managed backup covering identity references before application. Do not silently omit it.

There should be no `nom_private` or ledger before this first migration. If present, stop the first-execution procedure and investigate; include those objects in an incident backup rather than overwriting them.

### If COMMIT succeeds but validation fails

1. Preserve a private **post-commit** schema/data snapshot, now including `public`, `auth`, and `nom_private`. Capture all ledger rows/owners/claim hashes/proofs/signatures, meal verification IDs/status/quality/version, opening bindings, budgets and QR/receipt/image redemption fingerprints. Keep the currently used signing credential securely available; it is not part of a SQL dump. Do not rotate it during recovery or export its value into logs.
2. With explicit owner approval, run the prepared compensating SQL below through the target-checked connection. It revokes service-role ledger SELECT (making the current verification handler's readiness fail closed) and issuance RPC EXECUTE. It preserves normal history/manual sync, authenticated adoption of already-issued evidence, immutable event IDs, ownership and rewards/replay guards.

```sh
psql --dbname='service=nom' -X --set=ON_ERROR_STOP=1 \
  --file=supabase/recovery/nom_visit_verification_pause.sql
```

3. Verify capability is false, a new issuance fails, existing signed claims can finish, account history still hydrates, and fingerprint counts/uniqueness are unchanged. This stops **the application's** issuance path; it does not revoke every administrator/service DML privilege or interrupt unrelated account deletion.
4. Correct the observed failure in application decoding/adoption or in a new timestamped forward migration. For a trigger/function defect, `CREATE OR REPLACE` only the affected existing function body in a transaction; retain its signature, SECURITY DEFINER/search-path protections, EXECUTE grants and trigger bindings, then test the corrected path. For a constraint defect, narrowly adjust only that constraint after validating affected rows. Never rerun legacy normalization. The actual correction must follow the observed failure and be separately reviewed/approved; there is no speculative destructive rollback here.
5. After targeted validation and approval, resume through:

```sh
psql --dbname='service=nom' -X --set=ON_ERROR_STOP=1 \
  --file=supabase/recovery/nom_visit_verification_resume.sql
```

Both recovery files are outside `supabase/migrations`, are repeatable, and refuse a missing verification schema. They are manual recovery tools, not automatic rollout steps. No deployment or permission change has been performed by writing them.

**Never drop** `visit_verifications`, the private redemption/budget tables, meal evidence columns, uniqueness indexes or ownership/reward triggers to restore the old UX. Never use destructive `DROP ... CASCADE`, truncate evidence, delete replay fingerprints, restore a stale whole-database backup over new accepted visits, or turn legacy verification back on. Keeping the compatibility layer permits a separately approved app rollback without dismantling the database. Recover specific lost fields by immutable owner/event IDs from private backups after review, preserving current evidence/FKs; the backup is a forensic/recovery source, not permission to overwrite current state.

## Exact files changed by this revision

Compared with the preserved start-of-turn working tree:

Existing files modified (13):

1. `supabase/migrations/20261006234854_nom_visit_verification.sql`
2. `shared/visitVerification.js`
3. `src/data/cloudState.js`
4. `src/data/cloudRepository.js`
5. `src/data/persistedState.js`
6. `src/data/localPersistence.js`
7. `src/data/identityStorage.js`
8. `src/data/accountOutbox.js`
9. `src/data/syncEngine.js`
10. `server/verificationDatabase.test.js`
11. `server/overnightVerificationReview.test.js`
12. `src/pages/ExperienceFlow.test.jsx`
13. `docs/overnight-final-validation/migration-review.md` — historical-review pointer only

New files (6):

1. `server/verificationCompatibility.test.js`
2. `src/data/verificationCompatibility.test.js`
3. `server/test-fixtures/pre-revision-box-guard.sql` — frozen defective function for local before/after tests ONLY; outside migration directories
4. `supabase/recovery/nom_visit_verification_pause.sql`
5. `supabase/recovery/nom_visit_verification_resume.sql`
6. `docs/visit-verification-compatibility-validation/report.md`

No prior file was removed. Hash comparison with the private start-of-turn manifest confirms all other pre-existing files are unchanged, including Home, Welcome, Restaurant Details/I Ate Here, Verify Visit UI, styles/desktop presentation, recommendations, Surprise Me, Mystery Box/audio, Auth UX, QR/receipt product code, catalog and Maps/Vercel configuration. HEAD and index hashes remain unchanged. The earlier uncommitted work remains present; this is not a whole-tree cleanup or a new checkpoint commit.

## Safest cutover order and remaining rollout risk

1. Review this local revision. Obtain explicit permission for **only** the revised migration. No earlier approval applies automatically to this revised SQL.
2. Fresh read-only verification of Nom/project ref, migration history, current account DDL/constraint names/row counts/grants; complete the secure, verified backup above. Check for intervening project/schema changes and stop on discrepancies.
3. Apply the single reviewed migration transaction to Nom through the migration runner so history records it. The compatibility bridge permits current Production to remain active; do not ship the new client first.
4. Perform separately authorized disposable live checks: schema/default grants/event-trigger effects, PostgREST old/manual writes/hydration, A/B RLS, signed issuance/claim, replay/credits with legacy history, account cascade deletion, advisors. Clean fixtures after validation; fingerprints intentionally survive deletion. Pause issuance via the compensating script if validation exposes a material defect.
5. Configure/review local-only Nom Supabase URL/publishable key and **server-only** existing Nom secret, with appropriate approval for obtaining that credential. Existing Places server key is required; no Maps referrer/config changes are part of this task. Restart the local server so it loads env and derives the browser's public verification key. The current false localhost capability will remain false until credentials and the schema are available.
6. Test actual browser location with fresh samples at a real Google restaurant: server fetches trusted venue coordinates, checks accuracy/distance/freshness, issues signed evidence, Continue becomes enabled, claim persists the verified meal, and three distinct eligible dish/day events fund a box. Neither this SQL nor the local tests proves physical presence against deliberate GPS spoofing; browser location remains the existing evidence model.
7. Only after live backend/local-device validation, separately approve feature-branch commit/Preview release and focused Preview QA. Do not casually copy the Production-only server credential to Preview; the verification server and build need the same approved signing context so derived public keys match. Production release remains a separate explicit approval.

Unresolved risks are operational: actual hosted grants/event triggers/advisors, verified backup availability, real provider/device validation, stable signing-key/public-key configuration, and the existing unclaimed-evidence/fingerprint retention policy. Legacy history is intentionally ineligible, not retroactively rewarded. No present local regression blocks approving the revised migration for that controlled rollout, but **live/Production readiness is not claimed**. Stop here; nothing remote is authorized by this report.
