# Visit-verification migration review — October 7, 2026

> Historical review of the pre-revision SQL. Its compatibility failures were subsequently fixed locally; the current review and recovery plan are in [visit-verification compatibility validation](../visit-verification-compatibility-validation/report.md). The original findings below remain as investigation history, not the current migration recommendation. No remote migration has been applied.

**Recommendation: do not approve this migration unchanged for an uncoordinated rollout.** Local SQL execution, ownership and replay guards pass. A populated legacy account can have its first new earned box blocked; the old client cannot hydrate migrated meals. Resolve or explicitly approve legacy reward treatment and coordinate client/schema release first. No remote schema, row count, advisor or backup configuration was inspected tonight. An empty remote account database would remove the legacy-row case, but would not make mixed client versions compatible.

Target: **Nom — iwamwxsosrhxsdcsuoiu** only. Reviewed file: `supabase/migrations/20261006234854_nom_visit_verification.sql`. It was read and executed solely in disposable local PostgreSQL engines; its bytes were not changed. Comparison baseline: `202610060001_nom_accounts.sql` and current HEAD `c13329e86e89b17dfcf78b2815557b37ce04703c`. Current production deployment identity was not re-inspected; HEAD is the source baseline, not a fresh claim about deployed artifacts.

## Exact object inventory

- One schema: `nom_private` (`IF NOT EXISTS`); revoke all schema privileges from PUBLIC, anon, authenticated.
- Three tables: `public.visit_verifications`, `nom_private.verification_budgets`, `nom_private.verification_redemptions`. RLS enabled on all three.
- One altered table: `public.meal_logs`, adding eight columns and rewriting existing verification flags/method/source.
- Five new functions, two new user triggers, one new SELECT policy.
- Three explicit indexes plus seven constraint-backed indexes = ten new indexes.
- Two existing constraints removed, four replacement CHECK constraints added. No functions, policies, tables or rows are dropped. No CREATE OR REPLACE is used. Existing account tables/RLS policies/grants remain.
- Transactional `BEGIN`/`COMMIT`; **not rerunnable** after success: most CREATE/ALTER statements do not use IF NOT EXISTS. Do not reapply outside migration-history control.

### Tables and all columns

`public.visit_verifications`:

| Column | Definition / role |
|---|---|
| id | UUID primary key, server evidence identity |
| visit_id | Nonnull TEXT UNIQUE; 36-character hex/hyphen check; server applies a stricter canonical UUID validator |
| user_id | Nullable UUID FK to auth.users(id), ON DELETE CASCADE; null until Guest adoption |
| subject_hash, claim_hash | Nonnull TEXT, 64 lowercase hex characters; subject ownership and hashed adoption token |
| proof | Nonnull TEXT, maximum 2,000 characters |
| signature | Nonnull TEXT, 128 lowercase hex characters |
| dish_id | Nonnull TEXT; server checks canonical catalog, SQL does not have a catalog FK |
| restaurant_id | Nonnull TEXT, length 8–263, google: followed by allowed Place-ID characters |
| country_code | Nonnull TEXT, two uppercase letters; server derives from canonical dish |
| method | Nonnull TEXT: location, qr or receipt |
| verified_at | Nonnull TIMESTAMPTZ, default now() |
| distance_meters | INTEGER, 0–280 when provided |
| accuracy_meters | INTEGER, 0–100 when provided |
| receipt_confidence | DOUBLE PRECISION, 0.85–1 when provided |
| qr_nonce | Nullable UUID UNIQUE |
| evidence_hash, image_hash | Nullable TEXT UNIQUE; server SHA-256 fingerprints, SQL has no hash-format check here |
| version | Nonnull INTEGER default 1, CHECK version=1 |

Method CHECK requires distance + accuracy for location, nonce for QR, or confidence + both fingerprints for receipt. It does not prohibit extra metadata from other methods. Only the trusted server may insert; no browser issuance path is granted.

`nom_private.verification_budgets`: subject TEXT NOT NULL, bucket TIMESTAMPTZ NOT NULL, requests INTEGER NOT NULL; primary key(subject,bucket). No separate nonnegative counter CHECK. Its trusted function increments counts and deletes buckets older than two days.

`nom_private.verification_redemptions`: kind TEXT NOT NULL, fingerprint TEXT NOT NULL, redeemed_at TIMESTAMPTZ NOT NULL default now(); primary key(kind,fingerprint). No enum/hash CHECK beyond the trusted issuance function. These fingerprints deliberately survive account deletion. There is no cleanup schedule for redeemed fingerprints or unclaimed Guest ledger rows in this migration.

`public.meal_logs` adds:

| Column | Definition |
|---|---|
| verification_status | TEXT NOT NULL DEFAULT unverified |
| verification_id | Nullable UUID FK to visit_verifications(id), default NO ACTION on delete |
| verification_distance_meters, verification_accuracy_meters | Nullable INTEGER |
| receipt_confidence | Nullable DOUBLE PRECISION |
| verification_proof, verification_signature | Nullable TEXT |
| verification_version | INTEGER NOT NULL DEFAULT 1 |

Removes `meal_logs_verification_method_check` and `meal_logs_check`. Replaces their contract with `meal_verification_method` (location/qr/receipt/none), `meal_verification_status` (verified/unverified/rejected/pending), `meal_verification_consistency` (verified iff status verified, iff method not none, and requires verification_id), and `meal_verification_version` (1).

The existing owner/event primary key and original required feedback/timestamp fields remain. The unique partial verification-ID index permits each evidence ID to fund only one saved meal globally. The original account restaurant_id length limit remains 256, while the new ledger permits 263: unusually long otherwise-valid Place IDs could verify but fail meal persistence. Typical Place IDs are much shorter; align limits before expanding accepted identifiers.

### Functions, execution grants and triggers

All five new functions are SECURITY DEFINER with `search_path=''` and fully qualified application tables. This is intentional privileged code, not ordinary RLS enforcement. Effective access must be checked on actual Supabase after approval, including default grants and event triggers. [Supabase documents explicit EXECUTE revocation and restricted search paths for privileged functions](https://supabase.com/docs/guides/database/functions).

| Function | Execution/access and behavior |
|---|---|
| public.consume_nom_verification_budget(p_subject TEXT) → BOOLEAN | Revoke ALL from PUBLIC/anon/authenticated; grant EXECUTE only service_role. Validate subject hash; increment subject/hour and global/day counters; allow <=6/hour/subject and <=60/day/global. Denied requests also consume budget. |
| public.issue_nom_visit_verification(p_record JSONB) → JSONB | Revoke ALL from PUBLIC/anon/authenticated; EXECUTE service_role only. Existing visit returns existing evidence. Otherwise atomically inserts ledger + QR/receipt/image redemptions; uniqueness conflict rolls back that insert and returns existing visit or already_used. HTTP handler additionally checks subject/visit bindings. |
| nom_private.guard_meal_verification() → TRIGGER | Revoke ALL from PUBLIC/anon/authenticated. BEFORE INSERT OR UPDATE on meal_logs. Verified requires owned evidence and matching visit, restaurant, dish, country; overwrite status/method/source, signed proof, quality, completed_at and UTC day from server ledger. Unverified clears proof/quality/ID and rewrites method=none/source=manual. Does not grant ordinary users UPDATE on immutable meal rows. |
| public.record_nom_verified_meal(p_meal JSONB,p_claim_token TEXT) → VOID | Revoke ALL from PUBLIC/anon; EXECUTE authenticated. Require auth.uid(), a 43-character claim whose SHA-256 matches ledger, allowed owner and all event bindings. Advisory owner lock + evidence row lock; adopt Guest evidence; insert once. An identical already-saved proof is a no-op; mismatched existing meal fails. Does not accept client reward counters. |
| nom_private.guard_verified_box() → TRIGGER | Revoke ALL from PUBLIC/anon/authenticated. BEFORE INSERT on opened_boxes. Advisory owner lock; require owned verified country meal; compare floor(distinct verified dish/UTC-day count /3) to all existing country openings. Retry same immutable box returns after verifying the meal. Force deterministic next unowned reward; allow duplicate already-owned collectible for legitimate Guest merges; force server opened_at. |

No new function grants direct client DELETE, UPDATE or issuance. The trigger functions are private and invoked by their tables; service-role RPCs are public API entry points restricted by EXECUTE. SQL issuance alone trusts service_role input; cryptographic verification is in server/client code, not performed inside PostgreSQL. The privileged credential must remain server-only.

### Policies and grants

- `verification_owner_read`: SELECT to authenticated, `((select auth.uid())=user_id)`. Null-owner Guest evidence is invisible to authenticated clients until adoption.
- Revoke ALL ledger table privileges from PUBLIC/anon/authenticated, then grant authenticated column-level SELECT of **id,visit_id,user_id,dish_id,restaurant_id,country_code,method,verified_at,distance_meters,accuracy_meters,receipt_confidence,version,proof,signature**. Subject/claim hashes and replay fingerprints are excluded. A client `select('*')` on this ledger is intentionally denied; the app loads evidence from meal_logs.
- Grant ALL on the ledger to service_role.
- Revoke ALL client privileges on both private tables and their schema. No private-table client policies are created: default deny with RLS.
- Existing authenticated owner SELECT/INSERT on meal_logs and opened_boxes stays. No client UPDATE/DELETE. The new guards add reward authorization on top of existing owner RLS.
- Existing profiles/favorites/views retain their owner SELECT/INSERT/UPDATE policies and stamping/newest-view triggers.

Grants and RLS are separate checks; neither is a substitute for the other. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) supports this review. Current policies use SELECT-wrapped auth.uid(), owner indexes and primary-key prefixes. No new view or auth.users trigger is introduced.

## Effect on existing data — not purely additive

The statement `UPDATE public.meal_logs SET verified=false,verification_method='none',verification_source='legacy'` affects **every existing meal**, including previously unverified meals. Added status defaults to unverified; evidence columns stay null. It does not change IDs, feedback, dates, dishes or restaurant references. This intentionally withdraws legacy simulated reward eligibility. Database meal history is preserved, but user-visible rewards/history can change during mixed-version operation.

Existing opened_boxes and collectible_favorites are left in storage. New client reconstruction no longer earns rewards from downgraded meals; it drops openings without corresponding real verified credits and filters locked collectible favorites. Meanwhile the box trigger counts **all** retained openings against **new-only** verified credits.

**FAIL: reproduced legacy reward accounting conflict.** A local owner with one legacy opening, followed by three new distinct verified dishes, has credits=1 and used=1. Its first new legitimate box is rejected with No verified box credit available. This is proven by `server/overnightVerificationReview.test.js`; that diagnostic test passes when the defect is reproduced, not when reward behavior is acceptable. With N historical openings, the new owner may have to earn N further boxes before the first new opening. Choosing whether to preserve legacy collectibles, archive legacy openings or distinguish their accounting requires an explicit migration/product decision, not an overnight SQL edit.

## Compatibility and safest rollout

| Ordering | Result |
|---|---|
| Old/current-HEAD client + current account schema | Existing contract |
| Migration first, old client active | Simulated verified writes fail owned-evidence guard. Old unverified writes **do succeed**, rewritten to none; HEAD normalizer allows only location-demo/qr-demo/receipt-demo/unverified and drops migrated meal rows from hydrated history. All migrated rows therefore disappear from that old client's reconstructed journey; underlying rows remain. |
| New app first, old account schema | New manual payload includes missing verification_status/evidence columns; real claims require absent RPC/ledger. Favorites/profile/views still use established schema, but meal/reward outbox cannot drain correctly. Verification GET returns unavailable. |
| New app + reviewed migrated schema + matching signing key | Controlled location/QR/receipt issuance → SQL claim → hydration PASS; legacy reward conflict still needs resolution if legacy openings exist. |

**A coordinated rollout is required; neither naive migration-first nor app-first is safe for normal account meal usage.** Keep current Production untouched tonight. Safest next sequence:

1. Owner review the reward-accounting conflict and choose a preservation policy. Prepare a separately reviewed correction/transition plan; this file stays unchanged tonight. Determine actual legacy meals/openings/favorites and pending client outbox payloads with approved read-only Nom inspection; do not assume the formerly empty database is still empty.
2. Capture recoverable data and object definitions, migration history and the matching app artifact/signing-key identity. Verify available backup/recovery facilities and test restore into an isolated environment. [Supabase backup options](https://supabase.com/docs/guides/platform/backups) depend on project configuration; none was confirmed tonight.
3. Exercise populated legacy-account transition, both old/new payload contracts, new box credits and rollback in an isolated local/staging database. Preview pointed at Nom is **not** a separate database: applying Nom schema changes for Preview affects Production immediately.
4. Prepare the matching app build and approve a way to exclude old clients/writes during the cutover (maintenance/version gate or a genuinely backward-compatible staged transition). Neither exists as a full rollout control in this tree. Simply deploying rapidly after a migration does not eliminate cached old browsers/outboxes.
5. After specific approval, apply ONLY the reviewed migration/revision to Nom while incompatible writes are excluded. Run focused actual Supabase schema/grant/RLS/claim/replay/cascade checks and advisors, clean up approved disposable fixtures.
6. Release the matching app only after separately approved branch/Preview/Production actions; keep build-time derived public proof key and runtime signing secret aligned. Preview credentials require explicit scope approval, not a casual copy of the Production-only secret.
7. Validate manual and verified meal sync, Guest adoption, legacy history/rewards, box accounting, refresh/cross-device and old-tab handling. Remove the cutover restriction only after those affected checks pass.

## Rollback, recovery and operational risks

- Before COMMIT, SQL failure rolls back the transaction. Successful migration includes an UPDATE whose former flags/source/method cannot be recovered from the new rows alone. Back up those original values by owner/event ID before approved application.
- After COMMIT, redeploying the old client alone is not recovery; its hydration whitelist rejects the new methods and its verified writes fail guards. Prefer rolling forward a reviewed fix. A rollback requires a compensating schema/data migration or a carefully reconciled restore with all post-cutover writes considered.
- Do not blindly DROP ledger/CASCADE: meal_logs references it. Preserve accepted proofs/claims and permanent QR/receipt redemption fingerprints; deleting those allows replay. Reverting constraints without converting new methods can fail. Never reset all data to solve compatibility.
- Legacy meal feedback/history survives in SQL, but old-client hydration loses it, and new-client reward-derived collections may shrink. Manual account-only/merge hydration tests cannot cover actual legacy population until inspected.
- Claim/box advisory locks serialize an owner; evidence row locks and unique indexes prevent duplicate redemption/claims. Local engine tests are not multi-instance load tests or production performance advisors.
- The migration alters meal_logs and updates all rows in one transaction, taking locks and scanning/rebuilding indexes. Size/traffic and lock duration need actual preflight. Budget cleanup scans old buckets without a bucket-only index; bounded current global traffic limits load, but long-term monitoring is still needed. Unclaimed Guest evidence/redemptions have no retention process.
- Deleting an owned account cascades profiles/favorites/views/meals/boxes and adopted ledger evidence; QR/receipt/image fingerprints intentionally remain. Existing local tests prove no FK cascade failure. Private budget subject hashes can survive until the two-day cleanup; raw receipt/location evidence is not stored.
- Proof, Guest cookie, QR and claim keys derive from the Supabase server secret. Rotating that key changes verification public key and claims: old signatures no longer hydrate as verified under the new build; outstanding claims can fail. Introduce an explicit key-version/rotation preservation plan before rotating it. This is separate from rotating the previously screenshot-exposed **Google OAuth client secret**.

## Evidence

Existing local PostgreSQL suite: 11 tests; controlled HTTP/client/SQL/hydration: 3 tests; overnight policy/SQL investigation: 39 tests, including four populated/schema ordering reproductions. Existing `supabase/tests/accounts_rls.sql` executed unchanged on a fresh account-only local DB; its rollback left zero users. That old fixture intentionally uses legacy simulated verified meals/boxes and is not a post-verification reward fixture; use the new ledger-backed suite after this migration. Real Supabase API/schema/default privileges/advisors remain BLOCKED pending the separate approved rollout.

## Exact reviewed SQL fingerprint

SHA-256: `81d5378cff060d6c8a5fd7372d907cf25acb43b399276adc9c5ba6a1b4f25d15`.

## PostgreSQL catalog evidence

The following names/definitions were read from a fresh local PostgreSQL catalog before/after executing both SQL files. NOT NULL constraint catalog entries depend on PostgreSQL version; no claim is made about the remote version.

### Indexes added

- `nom_private.verification_budgets_pkey` — `CREATE UNIQUE INDEX verification_budgets_pkey ON nom_private.verification_budgets USING btree (subject, bucket)`
- `nom_private.verification_redemptions_pkey` — `CREATE UNIQUE INDEX verification_redemptions_pkey ON nom_private.verification_redemptions USING btree (kind, fingerprint)`
- `public.meal_verification_once` — `CREATE UNIQUE INDEX meal_verification_once ON public.meal_logs USING btree (verification_id) WHERE (verification_id IS NOT NULL)`
- `public.meal_verified_daily` — `CREATE INDEX meal_verified_daily ON public.meal_logs USING btree (user_id, dish_id, local_day) WHERE verified`
- `public.visit_verifications_evidence_hash_key` — `CREATE UNIQUE INDEX visit_verifications_evidence_hash_key ON public.visit_verifications USING btree (evidence_hash)`
- `public.visit_verifications_image_hash_key` — `CREATE UNIQUE INDEX visit_verifications_image_hash_key ON public.visit_verifications USING btree (image_hash)`
- `public.visit_verifications_owner` — `CREATE INDEX visit_verifications_owner ON public.visit_verifications USING btree (user_id)`
- `public.visit_verifications_pkey` — `CREATE UNIQUE INDEX visit_verifications_pkey ON public.visit_verifications USING btree (id)`
- `public.visit_verifications_qr_nonce_key` — `CREATE UNIQUE INDEX visit_verifications_qr_nonce_key ON public.visit_verifications USING btree (qr_nonce)`
- `public.visit_verifications_visit_id_key` — `CREATE UNIQUE INDEX visit_verifications_visit_id_key ON public.visit_verifications USING btree (visit_id)`

### Policies added

- `public.verification_owner_read` — `(( SELECT auth.uid() AS uid) = user_id)`

### Functions added

- `nom_private.guard_meal_verification`
- `nom_private.guard_verified_box`
- `public.consume_nom_verification_budget` — `p_subject text`
- `public.issue_nom_visit_verification` — `p_record jsonb`
- `public.record_nom_verified_meal` — `p_meal jsonb, p_claim_token text`

### Triggers added

- `public.guard_meal_verification` — `CREATE TRIGGER guard_meal_verification BEFORE INSERT OR UPDATE ON public.meal_logs FOR EACH ROW EXECUTE FUNCTION nom_private.guard_meal_verification()`
- `public.guard_verified_box` — `CREATE TRIGGER guard_verified_box BEFORE INSERT ON public.opened_boxes FOR EACH ROW EXECUTE FUNCTION nom_private.guard_verified_box()`

### Constraints added (46 local catalog entries including NOT NULL)

| Table | Name | Definition |
|---|---|---|
| nom_private.verification_budgets | verification_budgets_bucket_not_null | `NOT NULL bucket` |
| nom_private.verification_budgets | verification_budgets_pkey | `PRIMARY KEY (subject, bucket)` |
| nom_private.verification_budgets | verification_budgets_requests_not_null | `NOT NULL requests` |
| nom_private.verification_budgets | verification_budgets_subject_not_null | `NOT NULL subject` |
| nom_private.verification_redemptions | verification_redemptions_fingerprint_not_null | `NOT NULL fingerprint` |
| nom_private.verification_redemptions | verification_redemptions_kind_not_null | `NOT NULL kind` |
| nom_private.verification_redemptions | verification_redemptions_pkey | `PRIMARY KEY (kind, fingerprint)` |
| nom_private.verification_redemptions | verification_redemptions_redeemed_at_not_null | `NOT NULL redeemed_at` |
| public.meal_logs | meal_logs_verification_id_fkey | `FOREIGN KEY (verification_id) REFERENCES visit_verifications(id)` |
| public.meal_logs | meal_logs_verification_status_not_null | `NOT NULL verification_status` |
| public.meal_logs | meal_logs_verification_version_not_null | `NOT NULL verification_version` |
| public.meal_logs | meal_verification_consistency | `CHECK (((verified = (verification_status = 'verified'::text)) AND (verified = (verification_method <> 'none'::text)) AND ((NOT verified) OR (verification_id IS NOT NULL))))` |
| public.meal_logs | meal_verification_method | `CHECK ((verification_method = ANY (ARRAY['location'::text, 'qr'::text, 'receipt'::text, 'none'::text])))` |
| public.meal_logs | meal_verification_status | `CHECK ((verification_status = ANY (ARRAY['verified'::text, 'unverified'::text, 'rejected'::text, 'pending'::text])))` |
| public.meal_logs | meal_verification_version | `CHECK ((verification_version = 1))` |
| public.visit_verifications | visit_verifications_accuracy_meters_check | `CHECK (((accuracy_meters >= 0) AND (accuracy_meters <= 100)))` |
| public.visit_verifications | visit_verifications_check | `CHECK ((((method = 'location'::text) AND (distance_meters IS NOT NULL) AND (accuracy_meters IS NOT NULL)) OR ((method = 'qr'::text) AND (qr_nonce IS NOT NULL)) OR ((method = 'receipt'::text) AND (receipt_confidence IS NOT NULL) AND (evidence_hash IS NOT NULL) AND (image_hash IS NOT NULL))))` |
| public.visit_verifications | visit_verifications_claim_hash_check | `CHECK ((claim_hash ~ '^[a-f0-9]{64}$'::text))` |
| public.visit_verifications | visit_verifications_claim_hash_not_null | `NOT NULL claim_hash` |
| public.visit_verifications | visit_verifications_country_code_check | `CHECK ((country_code ~ '^[A-Z]{2}$'::text))` |
| public.visit_verifications | visit_verifications_country_code_not_null | `NOT NULL country_code` |
| public.visit_verifications | visit_verifications_dish_id_not_null | `NOT NULL dish_id` |
| public.visit_verifications | visit_verifications_distance_meters_check | `CHECK (((distance_meters >= 0) AND (distance_meters <= 280)))` |
| public.visit_verifications | visit_verifications_evidence_hash_key | `UNIQUE (evidence_hash)` |
| public.visit_verifications | visit_verifications_id_not_null | `NOT NULL id` |
| public.visit_verifications | visit_verifications_image_hash_key | `UNIQUE (image_hash)` |
| public.visit_verifications | visit_verifications_method_check | `CHECK ((method = ANY (ARRAY['location'::text, 'qr'::text, 'receipt'::text])))` |
| public.visit_verifications | visit_verifications_method_not_null | `NOT NULL method` |
| public.visit_verifications | visit_verifications_pkey | `PRIMARY KEY (id)` |
| public.visit_verifications | visit_verifications_proof_check | `CHECK ((length(proof) <= 2000))` |
| public.visit_verifications | visit_verifications_proof_not_null | `NOT NULL proof` |
| public.visit_verifications | visit_verifications_qr_nonce_key | `UNIQUE (qr_nonce)` |
| public.visit_verifications | visit_verifications_receipt_confidence_check | `CHECK (((receipt_confidence >= (0.85)::double precision) AND (receipt_confidence <= (1)::double precision)))` |
| public.visit_verifications | visit_verifications_restaurant_id_check | `CHECK ((((length(restaurant_id) >= 8) AND (length(restaurant_id) <= 263)) AND (restaurant_id ~ '^google:[A-Za-z0-9_-]+$'::text)))` |
| public.visit_verifications | visit_verifications_restaurant_id_not_null | `NOT NULL restaurant_id` |
| public.visit_verifications | visit_verifications_signature_check | `CHECK ((signature ~ '^[a-f0-9]{128}$'::text))` |
| public.visit_verifications | visit_verifications_signature_not_null | `NOT NULL signature` |
| public.visit_verifications | visit_verifications_subject_hash_check | `CHECK ((subject_hash ~ '^[a-f0-9]{64}$'::text))` |
| public.visit_verifications | visit_verifications_subject_hash_not_null | `NOT NULL subject_hash` |
| public.visit_verifications | visit_verifications_user_id_fkey | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` |
| public.visit_verifications | visit_verifications_verified_at_not_null | `NOT NULL verified_at` |
| public.visit_verifications | visit_verifications_version_check | `CHECK ((version = 1))` |
| public.visit_verifications | visit_verifications_version_not_null | `NOT NULL version` |
| public.visit_verifications | visit_verifications_visit_id_check | `CHECK ((visit_id ~ '^[0-9a-fA-F-]{36}$'::text))` |
| public.visit_verifications | visit_verifications_visit_id_key | `UNIQUE (visit_id)` |
| public.visit_verifications | visit_verifications_visit_id_not_null | `NOT NULL visit_id` |

Removed: `public.meal_logs.meal_logs_check`, `public.meal_logs.meal_logs_verification_method_check`. No existing index, policy, function or trigger removed.
