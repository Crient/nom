# Controlled live Nom visit-verification application

> Subsequent local phase: local configuration/client-secret checks passed and the owner confirmed a real far-away GPS rejection. Legitimate near-restaurant success remains untested. See [local real-GPS validation](../local-real-gps-validation/report.md). The database-phase results below remain historical and unchanged.

**Result: PASS for the database rollout and focused live backend validation.** Real browser GPS and the local server-to-Supabase HTTP path remain **BLOCKED pending approval of local configuration**, and were not exercised here.

Applied October 8, 2026 UTC (October 8 EDT), to **Nom — iwamwxsosrhxsdcsuoiu** only. Final project status: **ACTIVE_HEALTHY**, hosted PostgreSQL **17.11**.

## Exact migration and history

File: `supabase/migrations/20261006234854_nom_visit_verification.sql`

Approved, recomputed before execution, and rechecked afterward:

```text
SHA-256 2536fad85cb540e4242a0156b7a49d4b88a3cb97f6b7dda28c0a813228ce7d75
```

The current file was read and hashed from the same bytes, pinned in memory, and supplied unchanged to one connected Supabase `apply_migration` call. Before that call, the project/ref, absence of verification objects, unapplied history, and current scoped schema/data fingerprint were reconfirmed. The fingerprint still matched the verified private preflight backup: `d249e93d3e8cc356790cea8e2e4666c719e99dd7dec5c5ceef5cf2e278c638bf`.

Application returned **success: true**. No retry or recovery was necessary. Only the approved migration was applied.

| Recorded version | Name |
|---|---|
| 202610060001 | nom_accounts |
| 20261008040436 | nom_visit_verification |

The connector assigned the actual application timestamp/version; it differs from the source filename's prepared timestamp. History was not edited. The file/hash above identifies the exact approved source.

## Validation results

Live SQL tests ran with the actual `anon`, `authenticated`, and `service_role` database roles. Auth identity was supplied through transaction-local JWT claim settings read by hosted `auth.uid()`. This exercises actual hosted RLS, privileges, constraints, triggers and RPCs; it is not an HTTP/JWT transport, browser login, GPS, Google Places, or production signing-key integration test.

Three tagged disposable Auth rows used invalid example-domain addresses, no password/session, and no email delivery. No personal identity was used for writes or deletion. Evidence used real Ed25519 signing code with the existing synthetic test signer, not a production credential. The database trusts restricted service issuance; production signature validation remains part of the next application phase.

| Check | Result | Evidence / scope |
|---|---|---|
| Schema | PASS | Private schema, both private tables, public ledger, all eight added meal columns, validated constraints/FKs, indexes, enabled guards and all three RPCs exist. |
| RLS / grants | PASS | All ten account/verification tables have RLS. Anonymous ledger SELECT and all three RPCs denied. Authenticated issuance/budget and direct ledger INSERT/UPDATE/DELETE denied. |
| Allowed evidence reads | PASS | A saw only its four initially owned evidence rows; B could not see A evidence. Guest evidence was invisible until adoption. Claim/subject hash column reads and private replay-table reads denied. |
| Identity / isolation | PASS | B could not claim A evidence or A-adopted Guest evidence. Missing identity, wrong claim token and mismatched restaurant denied. Guest evidence adopted by A became owner-readable. |
| Meal evidence integrity | PASS | Canonical verified writes without evidence, fabricated IDs and another owner's evidence rejected. Server evidence overrode forged method, signature, proof, distance, completion date and day. One proof could not bind another event. |
| Legacy / manual history | PASS | All four current Production wire methods accepted as safe unverified history. Earlier feedback survived. Manual and simulated writes had no proof and no eligible progress. |
| Reward eligibility | PASS | One/two eligible events could not open a funded box; three distinct dish/day events could. Server selected ziggy despite requested lumi/duplicate. Manual history could not fund a reward. |
| Legacy opening compatibility | PASS | Archival opening remained writable and did not consume fresh verified credit or steer the first funded collectible. It remains archival, not a newly earned reward. |
| Duplicate event / box behavior | PASS | Repeated issuance and meal claim produced one evidence/meal. Repeated box opening with conflict-ignore remained one opening. More same-dish/day meals did not add credit. |
| Deletion cascade | PASS | C had rows in all seven account tables plus QR/receipt evidence. Deleting only tagged C removed every linked account row and owned evidence. |
| Replay after committed deletion | PASS | In a subsequent transaction, fresh evidence reusing C's QR nonce, receipt fingerprint or image fingerprint returned already_used. Rejected issuance left no evidence row. Durable replay records survived. |
| Existing account preservation | PASS | All eight original account rows compared exactly against persisted preflight backup, including timestamps and values. Final Auth count returned to one. |
| Current Production hydration contract | PASS | Live legacy/new wire fields met the frozen Production method/boolean contract; all old methods kept history. Existing data was unchanged. No browser deployment or browser hydration test was performed. |
| Cleanup | PASS | All three disposable Auth identities, account rows and eight issued evidence rows removed by tagged identity deletion/cascade. No test budgets remained. Three non-identifying replay fingerprints intentionally retained. |
| Real local GPS / complete application path | BLOCKED | Database is ready; local server credential configuration and actual browser samples require the next approved phase. No personal GPS verification ran. |

The initial live integrity transaction returned **42 successful check labels**. Separate committed transactions verified deletion, persistent replay rejection, immutable/private evidence access, all four legacy wire writes, and cleanup. The SQL harness was first checked in an isolated PGlite engine using the exact account and approved verification SQL to eliminate harness syntax errors before live execution. No full local test/build suite was repeated: no application or migration source changed; the previous 1,269-test compatibility validation remains historical evidence.

Concurrency controls were inspected in the installed functions: owner advisory transaction locks serialize claim/reward accounting, the claim locks its evidence row, the proof index is unique, and replay fingerprints have a unique primary key. Live retries were sequential; this is not a concurrent load test.

## Schema assertions

- `nom_private.verification_budgets`: RLS, primary key subject/bucket.
- `nom_private.verification_redemptions`: RLS, primary key kind/fingerprint, deliberately no account-cascade FK.
- `public.visit_verifications`: owner read policy with column-limited SELECT; Auth FK ON DELETE CASCADE; unique visit_id, qr_nonce, evidence_hash and image_hash; method/location/accuracy/confidence/proof/signature/version checks validated.
- Added meal fields: verification_status, verification_id, verification_distance_meters, verification_accuracy_meters, receipt_confidence, verification_proof, verification_signature, verification_version.
- Validated meal constraints: meal_verification_method, meal_verification_status, meal_verification_consistency, meal_verification_version; ledger FK retained.
- Explicit indexes: visit_verifications_owner, meal_verification_once (unique nonnull proof), meal_verified_daily. Existing account indexes/FKs remain.
- Enabled guards: guard_meal_verification BEFORE INSERT/UPDATE, guard_verified_box BEFORE INSERT. Original five account triggers remain.
- RPCs: consume_nom_verification_budget and issue_nom_visit_verification are service-only; record_nom_verified_meal is authenticated-only and validates identity/claim/event.
- Both private guard functions and three RPCs are owned by postgres, SECURITY DEFINER, fixed empty search_path. Installed grants were verified, not inferred from source.
- Existing opened_boxes owner/visit cascade, owner/box primary key, box-to-visit check and country/collectible checks remain validated.

Final row counts:

| Table | Rows |
|---|---:|
| profiles | 1 |
| recent_dish_views | 7 |
| dish_favorites | 0 |
| restaurant_favorites | 0 |
| meal_logs | 0 |
| opened_boxes | 0 |
| collectible_favorites | 0 |
| visit_verifications | 0 |
| nom_private.verification_budgets | 0 |
| nom_private.verification_redemptions | 3 |

The three retained rows are synthetic QR/receipt/image replay fingerprints and timestamps. Deleting them would erase the demonstrated durable anti-replay state; they are intentionally not cleaned up. No claim tokens, signatures, coordinates, personal account values, passwords or production keys are reproduced in this report.

## Advisors and recovery

Final Performance Advisor: **no findings**. Immediately after migration it reported two unused-index INFO findings; neither remained after focused validation.

Security Advisor is **not clean**:

- Existing anonymous and authenticated rls_auto_enable SECURITY DEFINER WARN findings remain. This managed helper was not changed. [Anonymous advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Existing leaked-password-protection-disabled WARN remains. No Auth configuration was changed. [Hardening reference](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- New authenticated SECURITY DEFINER WARN for record_nom_verified_meal is expected: this is the deliberately callable authenticated claim boundary. Live identity, token, ownership and event checks passed. [Advisory reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Two new RLS-without-policy INFO findings on private tables are deliberate default denial, with revoked client access and controlled SECURITY DEFINER paths. [Advisory reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

No advisor-driven changes were made. The verified scoped private backup remains available at the location recorded in [preflight](./preflight.md). Pause/resume recovery scripts were not executed. Forward correction must preserve newly accepted evidence and durable replay records; do not rerun the migration or restore stale rows wholesale.

## Exact next local phase — not performed

With explicit approval, configure the local server only:

| Variable | Placement | Source / requirement |
|---|---|---|
| VITE_SUPABASE_URL | Public client/server | Existing verified Nom project URL; already part of current account setup. |
| VITE_SUPABASE_PUBLISHABLE_KEY | Public client | Existing verified Nom publishable key; retain current account setup. |
| SUPABASE_SECRET_KEY | Server-only local .env.local / secure environment | Existing Nom Secret API key from a separately approved secure retrieval/manual provision step. Must use the modern sb_secret_ key accepted by the current handler. It was not retrieved or added here. |
| GOOGLE_PLACES_API_KEY | Server-only | Existing Places credential used locally; needed for trusted server-fetched restaurant coordinates. Retain its working configuration. |

VITE_NOM_VERIFICATION_PUBLIC_KEY is derived automatically by vite.config.js from the server key and only that public key enters the client build. Do not manually create a VITE_ secret or a mismatched independent verification key. No separate private signing key, OCR credential, QR partner configuration, Maps restriction change or policy override is needed for location-only testing.

Restart the local Vite server after approved server configuration, check GET /api/visit-verification reports location:true, then exercise I Ate Here → browser location permission/fresh sample → trusted restaurant lookup/distance/accuracy decision → signed evidence → Continue → feedback/verified meal → eligible reward/sync. Use controlled disposable accounts before personal GPS and exercise failure/manual-log paths. Application and transport checks remain open until then.

## Scope preserved

No local production credential was added; no Vercel, Google Maps, Auth/OCR/QR configuration changed; no UI/application source changed; no recovery, staging, commit, push or deployment occurred. Before documentation updates, every pre-existing working-tree file, index and HEAD matched this turn's baseline. The exact migration hash stayed unchanged. Only this report and historical report pointers were added/updated afterward.

**STOP: database phase complete. Await explicit approval for local configuration and real-GPS application validation.**
