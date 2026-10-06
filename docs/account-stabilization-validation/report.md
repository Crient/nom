# Nom account stabilization validation

Date: October 6, 2026. Scope: the three high-priority local defects from `docs/engineering-onboarding-validation/report.md`. Existing account architecture, repository transport, Guest consent, catalog, recommendations, UI, and restaurant integration were retained. No application commit, push, deployment, or remote database operation was performed.

## 1. Offline data-loss root cause

Each `createJourneyStore` read its own copy of the account cache and outbox once. Its `persist()` then replaced the entire shared localStorage envelope with that private snapshot. When A and B started from the same empty account state, A's queued favorite was erased by B's later snapshot write. Reading and merging arrays immediately before replacing the envelope would still permit interleaved browser-tab writes to erase operations.

The old fallback operation ID also used only a timestamp and a per-store sequence, allowing two stores without `crypto.randomUUID` to generate the same ID.

## 2. Offline fix

The existing account outbox now persists each operation independently under the account cache namespace, using the existing versioned localPersistence reader/writer. The original cache envelope remains a combined snapshot/projection with its existing `data`, `outbox`, and `guestDecision` fields. This is the same queue with durable backing records, not a separate transport or second queue.

- New operation records cannot overwrite another store's operation record.
- Before persistence and cloud synchronization, stores read shared pending records and overlay them onto the latest accepted snapshot. UI mutation intent is derived from the caller's visible state, so another store's pending changes do not become unintended removals.
- Operations use a monotonically advancing logical timestamp and an ID tie-breaker for deterministic replay. Cloud upload retains the existing dependency order. Mutable changes remain queued until acknowledged; an unacknowledged earlier operation is no longer discarded by coalescing.
- A durable acknowledgement receipt is written before removing an operation record. Stale stores and stale legacy snapshots cannot requeue an acknowledged ID.
- Snapshot-only legacy outboxes migrate once, preserving their original operation order. Malformed records retain recovery bytes; recovery records are excluded from recursive outbox reads.
- Account-specific Web Locks coordinate cloud drains between supported browser tabs. A promise chain serializes stores in the same JavaScript realm when Web Locks are unavailable. Durable operation records themselves do not depend on either lock mechanism.
- Storage events refresh active stores. Start/stop listener cleanup retains StrictMode behavior. Account deletion removes only that account's snapshot, recovery records, operation records, marker, and receipts.
- Failed operation persistence remains visible in memory with an explicit save error. Failed acknowledgement persistence keeps the operation pending for idempotent retry.
- Fallback writer IDs are allocated lazily for mutations that actually need them. Guest initialization consumes no discovery UUID or random draw.

The public store interface, cloud repository, database schema, and Guest storage keys are unchanged. Existing merge, account isolation, reward replay, retry, and identity-switch regressions pass.

Limits: acknowledgement receipts are deliberately retained until account cache deletion, protecting against stale stores; they consume small amounts of localStorage over time. Cross-tab cloud-drain serialization uses the browser's Web Locks API; the fallback coordinates only stores within one JavaScript realm. Browser-tab integration was not exercised against a running live account, and no real server behavior is inferred from the SDK mocks.

## 3. Added regressions

Fifteen account regressions were added to `src/data/accountSync.test.js`:

1. Deletion removes account outbox records and receipts without affecting Guest or another account.
2. Two offline stores load the same initial cache, queue different favorites independently, reload with both operations, and flush both.
3. Both pending operations survive a deliberately interleaved stale snapshot replacement.
4. Another store's completed meal and an unfavorite tombstone both survive reload and upload.
5. A stale store or restored old snapshot cannot requeue acknowledged operations or overwrite an accepted tombstone during ordinary persistence.
6. Simultaneous drains apply later toggles deterministically without duplicate uploads.
7. Storage events refresh a running offline store.
8. Snapshot-only legacy operations migrate once without acknowledgement resurrection.
9. Legacy in-flight and newer toggle operations retain their original order rather than UUID lexical order.
10. Storage failure retains optimistic pending changes with an error, then succeeds on retry.
11. Acknowledgement write failure retains pending work, then retries idempotently.
12. The cloud drain requests an account-specific browser lock.
13. Acknowledging an in-flight operation preserves another store's newer toggle.
14. Stores created at the same time use distinct fallback operation IDs.
15. Malformed operation records are rejected and recovery bytes are preserved without recursive recovery backups.

Seven executable scanner regressions cover safe emitted assets/public references, three generated locations (`dist/assets/nested`, `dist/catalog`, and generated `dist/test/asset.test.js`), service-role JWTs, vendor/binary exclusions, and privileged server-variable references. Synthetic values are checked against stdout/stderr to ensure diagnostics do not disclose them.

Three packaging regressions use disposable Git repositories. The dry run includes app files, migration, SQL tests, example env, and final report; excludes local env, local Supabase config/CLI state, scratch files, and diagnostic artifacts; and leaves status/index/HEAD unchanged. Each required SQL artifact's absence stops normal shipping before staging or committing.

## 4. Credential scanner defect and fix

The recursive scanner excluded directory names `assets` and `catalog` everywhere. Consequently Vite's normal `dist/assets/*.js` production chunks were never inspected.

Those exclusions were removed. `node_modules`, `vendor`, `.git`, and `.vite` remain excluded, and only regular JS/TS/HTML source files are read; binary assets are skipped. Source test fixtures remain excluded, while generated bundles are scanned even when their filename or directory resembles a test fixture. The existing privileged-value/JWT and privileged-browser-variable checks remain intact. Legitimate public environment-variable references and server-side credential variable names pass; embedded privileged values and browser references to server credential variables fail with filenames rather than values.

Both source validation and the current rebuilt production output pass.

## 5. Shipping defect and fix

The script staged tracked changes plus explicit app/config/report paths but omitted untracked `supabase` artifacts. The account implementation could therefore ship without its database migration and RLS validation SQL.

The script now checks the current required account migration and SQL test before staging anything, and stages only `supabase/migrations/*.sql` and `supabase/tests/*.sql` from that directory. Local config, credentials, CLI state, notes, and unrelated artifacts are outside the added path lists. Existing source/config/report staging and ignore rules remain intact.

`npm run ship -- --dry-run` uses the same staging commands with Git's dry-run flag and exits before commit/push. Git requests an index lock even for `add --dry-run`, so preview uses a disposable copy of the index in the temporary directory. This also works with this workspace's read-only Git metadata.

The actual repository dry run included:

- `supabase/migrations/202610060001_nom_accounts.sql`
- `supabase/tests/accounts_rls.sql`

The repository HEAD and index SHA-256 were equal before and after preview. HEAD remained `c7b834ce27c17d7e9c1825f096c4cf350caab837`. Dry-run diagnostics are outside the repository at `/private/tmp/nom-ship-dry-run.log`.

## 6. Every file changed during this pass

| File | Change |
|---|---|
| `src/data/accountOutbox.js` | New internal durable backing records, acknowledgement receipts, deterministic ordering, legacy migration, and synchronization coordination |
| `src/data/syncEngine.js` | Reconcile shared state; enqueue/acknowledge through the same durable outbox; storage-event lifecycle; preserve explicit Guest decisions |
| `src/data/identityStorage.js` | Account deletion clears its outbox namespace |
| `src/data/accountSync.test.js` | Fifteen account durability regressions |
| `scripts/validate-account-secrets.mjs` | Scan asset/catalog bundle directories and generated test-like filenames; retain bounded text/vendor filtering |
| `scripts/accountSecrets.test.js` | Seven executable credential-boundary regressions |
| `scripts/ship.sh` | Require/stage account SQL artifacts; add safe preview using a temporary index |
| `scripts/ship.test.js` | Three executable packaging regressions |
| `docs/account-stabilization-validation/report.md` | This validation report |

A SHA-256 inventory of 761 existing nonignored files was taken before edits. Comparison identifies only the five existing files above as modified, the four new files above as added, and no existing files as deleted. All other prior uncommitted implementation and product work remains byte-identical. Neither SQL artifact was rewritten.

## 7. Validation commands

| Command/check | Result |
|---|---|
| `npx vitest run src/data/accountSync.test.js` | Existing 23 tests passed immediately after initial outbox integration |
| `npx vitest run src/data/accountSync.test.js scripts/accountSecrets.test.js scripts/ship.test.js` | Focused regressions passed as added (41, then 45 tests) |
| `npx vitest run src/data/accountSync.test.js src/pages/DiscoveryCompatibility.test.jsx scripts/accountSecrets.test.js scripts/ship.test.js` | 49 tests passed after making fallback IDs lazy; subsequent three account regressions passed in the full run |
| `npm test` | Final run: 961 tests across 58 files passed; embedded Python suites also passed 16 and 40 tests |
| `npm run build` | Final rebuilt production output passed, including catalog validation and both source/bundle credential checks |
| `npm run catalog:check` | All 201 records match workbook contents and spreadsheet order |
| `npm ls --depth=0` | Dependency verification passed; no dependency files changed |
| `node scripts/validate-account-secrets.mjs --dist` | Current production bundle credential boundary passed |
| `npm run ship -- --dry-run` / `bash scripts/ship.sh --dry-run` | Current repository packaging preview passed; both SQL files included; original index and HEAD unchanged |
| `bash -n scripts/ship.sh` | Shell syntax passed |
| `git diff --check` | Tracked whitespace check passed |
| SHA-256 baseline and explicit changed-file whitespace checks | Only intended stabilization edits/additions; no deletions or trailing whitespace |

## 8–10. Counts, build, catalog, and deviations

The baseline was 936 Vitest tests in 56 files. The final result is **961 passing tests in 58 files**, an increase of 25 regressions and two test files. Production build passes. The catalog remains **201 unique dishes**, validated and consistent with its source workbook. Dependencies pass verification.

One intermediate full run caught a Guest discovery-seed regression caused by eagerly allocating an extra UUID for a store writer ID. The allocation was made lazy, the existing discovery compatibility test passed, and the final full suite and production build passed. The recommendation engine and its tests were not changed.

The first real packaging preview encountered a read-only `.git/index.lock` restriction despite Git's dry-run flag. Using a temporary index resolved this without requesting expanded permissions or changing repository metadata. Final preview passed.

## 11. Live validation blockers

Local environment inspection prints presence/absence only and confirms `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` are absent. Actual remote schema, migration history, Auth provider/redirect configuration, and executed RLS behavior remain unverified. These local tests use an SDK fixture and do not establish real Supabase isolation, Auth, grants, or deployed schema correctness.

No credentials were added, no fake configuration was installed, and no remote database was contacted or modified. Live validation remains blocked pending appropriate configuration/access and inspection of the existing project. The earlier medium-priority local-only hydration inefficiency remains outside this three-defect assignment.

## 12. Single recommended next task

**Execute the existing account migration and `supabase/tests/accounts_rls.sql` in an authorized isolated Supabase-compatible database and record the results.** Use that evidence before proceeding to the existing Nom project's live schema/Auth integration; do not assume the current remote state.
