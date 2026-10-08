# Visit Verification route recovery

October 8, 2026. **PASS — focused recovery tests, full suite, build and credential/catalog checks.** No redesign or remote operation occurred.

## Root cause and narrow fix

`startVisit` created an in-memory Experience draft. `serializeExperience` deliberately saved only completed events, and `normalizeExperience` discarded drafts. A fresh provider/router instance consequently had no active visit matching `/visits/:id/verify`, so `useVisit` immediately returned the existing Visit Not Found state. Router state alone could not recover the missing draft.

The existing identity-scoped journey persistence now includes an optional `activeVisits` context array. No new global storage key, session credential, cloud operation or server endpoint was introduced. Guest data stays in the existing Guest experience cache; account data stays in that account's existing cache. Live app state still wins during navigation. On a new provider/store, the normalizer restores only validated context into fresh, unverified drafts before the route renders.

The recovery whitelist contains **visit ID, dish ID, restaurant/provider ID, restaurant name, canonical dish country code, original start timestamp, active status, and one boolean Surprise Me return-context flag**. Dish name comes from the unchanged catalog. At most **eight** active contexts are retained, expiring **six hours from the original start**. Repeated serialization does not extend expiry. Expired/malformed/completed state and unknown or mismatched catalog/provider identifiers are rejected.

Exact GPS coordinates, location samples, device accuracy readings, raw restaurant objects/coordinates, arbitrary router state, feedback, Supabase credentials, signed proof/signature and claim tokens are **not stored in active recovery context**. Existing legitimate completed-history proof persistence remains unchanged. Restaurant names are restricted display context, never trusted verification evidence, and are omitted from completed-event serialization.

`useVisit` continues to resolve the selected restaurant through the existing provider. Fresh/in-memory provider details win; its metadata-only fallback uses the recovered name. Missing display details do not erase a valid visit. Authoritative restaurant coordinates remain fetched/validated on the server during actual verification; recovered client metadata cannot supply them.

## Behavior and authority

- Before: refresh, direct URL or losing provider/router memory produced Visit Not Found for unfinished visits.
- After: a valid active context in this browser/identity reconstructs the same visit, restores its selected dish/restaurant identity, and runs the normal verification flow. Reload of Feedback without in-memory verification routes back to Verify Visit for verification; feedback/proofs are not silently restored from context.
- Back/Forward retains the same in-memory visit and ID; restarting the provider/router still recovers it from the existing local cache.
- Completed History entries take precedence over conflicting active context and route to the logged experience. Completed drafts are excluded from serialization, so verification is not restarted.
- Recovery always sets verification and feedback to null. Even injecting a valid signed proof into the recovery record cannot enable Continue or create local progress. Server issuance/claim authority, proof bindings, database reward guards and replay/idempotency protections remain unchanged.
- Edited local context can at most name a new unverified flow; it cannot manufacture evidence. Existing server guards remain authoritative if account writes are attempted. This change does not make editable browser storage authoritative History or a security ledger.
- The earlier QA preview providers remain memory-only; QA-only contexts are explicitly excluded. Guest/account A/account B recovery is isolated and generates no outbox operations.
- If a draft was already lost before this fix and no safe context was ever saved, it cannot be reconstructed from a visit-ID-only URL. Start once from a restaurant; subsequent valid active visits can recover. Missing/expired/unrecoverable context continues to use the existing restart screen.
- Recovery is local to this browser's existing identity cache, not cross-device sharing of unfinished visits. Completed account history retains its existing sync behavior.

## Validation

| Check | Result |
|---|---|
| New recovery tests | PASS — 25 tests |
| Real start action followed by provider/router recreation | PASS — same ID, restaurant name, fresh location acquisition, no Visit Not Found |
| Direct reload/reopened URL without router state | PASS — identifiers recovered, existing restaurant resolver called |
| Back/Forward | PASS — same flow, no extra draft or meal |
| Malformed/expired/future/completed/catalog-mismatched context | PASS — rejected |
| Completed History plus conflicting active record | PASS — logged route, no GPS/capability request or second meal |
| Signed-proof/feedback/progress injection | PASS — verification null, Continue disabled, zero progress/boxes/unlocks |
| Exact GPS/signature/token privacy | PASS — serialized context has only the eight whitelisted fields |
| Guest/A/B and QA isolation | PASS — independent caches, no account outbox operation |
| Existing focused persistence/sync/verification/experience tests | PASS — 95 tests |
| Full Vitest | PASS — 1,294 tests, 78 files |
| Python unittest discovery | PASS — 74 tests |
| Production build and generated-client credential scan | PASS |
| Account credential scanner | PASS |
| Catalog validation/import check | PASS — unchanged 201-dish catalog |
| git diff --check | PASS |

Refresh/direct-route assertions recreated real Experience providers and routers in the isolated DOM test environment. They did not override `useVisit` or the persistence normalizer. Location and provider responses in these regression tests were controlled fixtures, not the user's GPS. This is automated regression evidence, not a new manual near-restaurant acceptance test. No real GPS request, verification issuance or Supabase fixture write was run in this change.

## Exact files changed by this task

1. `src/data/activeVisitContext.js` — safe context serializer/validation/recovery, expiry and bound.
2. `src/data/persistedState.js` — optional active contexts in existing persistence; History-first restoration.
3. `src/context/Experience.jsx` — capture selected restaurant name in the active draft.
4. `src/hooks/useVisit.js` — use the recovered display name only for metadata-only provider fallback.
5. `src/data/activeVisitContext.test.js` — expiry, privacy, tampering, completion and identity tests.
6. `src/pages/VisitRecovery.test.jsx` — start/refresh/direct URL/Back/Forward/History route regressions.
7. `docs/visit-verification-route-recovery/report.md` — this report.

All earlier working-tree changes remain. The ignored local environment, migration fingerprint, HEAD and index were preserved. Home, Restaurant Details, I Ate Here, desktop presentation, styles and remote configuration were not changed. No staging, commit, push or deployment occurred.

**STOP for manual localhost inspection.** Legitimate near-restaurant GPS acceptance remains the separate open validation item from the preceding local configuration phase.
