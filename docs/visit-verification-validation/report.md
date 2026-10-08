# Nom real visit verification: local review

Prepared October 6, 2026 against `/Users/leng/Projects/nom`. No commit, push, deployment, remote schema/configuration write, disposable cloud account, or new Auth email. Production remains the previously deployed account checkpoint `f2d726662f44b54cf7204cb746dc742417579f3d` and still needs the reviewed verification release.

## Root causes

The production visit screen directly called the development verification provider; location, QR and receipt choices were simulated successes. The Continue control had no real evidence gate.

The Guest mismatch came from `createExperienceState()` and collection metadata seeding Cambodia 17, Colombia 9, United States 26 meals plus starter unlocks. Both fresh Guest and event hydration started from those seeds. The inspected path did not reveal account-to-Guest identity leakage. Defaults now start clean and counters/unlocks derive from signed events. Existing completed history/feedback is retained; old simulated verification is downgraded to manual, and isolated QA events cannot become production rewards. Raw recovery backups are retained by the existing recovery mechanism.

## Implementation and privacy

| Flow | Local result | Behavior / production dependency |
|---|---|---|
| Location | PASS | Up to three high-accuracy samples, cache age zero, 4-second bound per sample, 30-second freshness, best usable accuracy ≤100 m. Server fetches trusted Google Place identity and coordinates, computes Haversine distance, default 150 m + capped accuracy allowance of min(accuracy/2,30 m). Client venue coordinates/status/reward fields are rejected. |
| Verification UI | PASS | Requesting/checking/success/failure/retry states; Continue disabled without signed success; alternate methods and explicit manual confirmation. No duration preview or fake successful state. |
| QR validation | PASS | Server HMAC-signed identity, issue/expiry/UUID nonce; ≤120-second lifetime; wrong venue/signature/expiry/replay rejection. Browser cannot mint valid codes. Production option stays hidden without configured participating Place IDs; no public issuer exists. |
| Partner QR availability | BLOCKED | No participating restaurants/approved QR issuer are configured. Establish a trusted partner issuance workflow before enabling the optional server allowlist. Static shareable QR is deliberately insufficient. |
| Receipt policy/provider boundary | PASS | Private JPEG/PNG/WebP ≤2 MB; server Google Vision OCR abstraction, confidence ≥0.85, merchant and branch/address match, one unambiguous recent calendar date ≤72 h. Missing/failed provider, unreadable/wrong/old evidence fails closed. |
| Real external OCR | BLOCKED | No OCR credential is configured. **Provision a Google Cloud Vision API key with Vision enabled/billing and API restrictions, and securely store it as server-only `NOM_RECEIPT_OCR_API_KEY` in Nom's intended Vercel environment.** Do not reuse the browser Maps key or paste the credential into chat. Environment writes by the agent still require explicit approval. |
| Manual history | PASS | Explicit confirmation records status unverified / method none and feedback; zero verified country/box/collectible credit. |
| Reward integrity | PASS | Signed Ed25519 proof bound to verification/visit/dish/restaurant/country/method/server time/version; browser checks a pinned public key, database independently requires owned ledger evidence. Distinct dish/UTC-day credits, one proof per meal, three credits per box, retries and replay cannot add credit. Locked rare rewards cannot be selected arbitrarily. |
| Guest restoration/merge | PASS | Clean defaults; legitimate signed returning Guest events survive refresh and merge; private claim adopts evidence once into one authenticated identity. QA flags, fake snapshots and old demo rewards grant no production credit. Existing separate Guest/account scopes remain. |
| Sync/hydration/outbox | PASS | Verification metadata/signature persist through account events, retries, two-device transport hydration and immutable source replay. Verified meals use the protected claim RPC; ordinary manual logs use owner RLS. Tests include isolated real PostgreSQL guards and mocked application transport; no new live round trip is claimed. |
| Migration live state | BLOCKED | Exact project reconfirmed **Nom / iwamwxsosrhxsdcsuoiu**, ACTIVE_HEALTHY; new ledger absent; existing meal_logs/opened_boxes each zero. Draft requires owner approval before application, then affected live validation. |
| Receipt/GPS retention | PASS | No public/private bucket created, no raw receipt/OCR text or exact user coordinates saved. They exist only during the request. Ledger retains method/time/IDs/distance/accuracy/confidence/signed proof and hashed replay evidence. Private non-identifying redemption fingerprints survive account deletion; adopted account evidence cascades away. Unclaimed Guest evidence remains available for later merge. Provider retention is governed separately. |
| Catalog / recommendations / Places | PASS | 201 canonical dishes unchanged; catalog/workbook, recommendation and existing nearby/maps/privacy/cache tests pass. Only server verification fetches additional trusted Place details. |
| QA isolation | PASS | Simulation provider is used only by the explicitly isolated playground. Production-with-QA-flag build excludes both playgrounds; Preview retains them. No QA writes or network activity in its integration tests. |

Location is evidence of proximity from browser-reported GPS, not device attestation. OCR and signed restaurant QR are evidence of a visit, not proof of dish consumption. Do not imply fraud-proof verification. Receipt policy uses a conservative UTC calendar date when transaction time cannot be reliably parsed; ambiguous formats fail closed.

## Reviewable database change

[`20261006234854_nom_visit_verification.sql`](../../supabase/migrations/20261006234854_nom_visit_verification.sql) was created with Supabase CLI and executed only in isolated PGlite/PostgreSQL tests, together with the existing base migration.

- Adds owner-readable immutable `public.visit_verifications`; RLS enabled, only safe columns selectable by an authenticated owner, no client issuance, hashes/claims private. Service role issues evidence.
- Adds private RLS-protected request budgets and non-identifying replay fingerprints. Issuance atomically consumes QR/receipt fingerprints; deletion cannot enable reuse.
- Extends `meal_logs` with verification status/ID/distance/accuracy/confidence/version/proof/signature. Reuses restaurant identifier and existing checked-at timestamp. Removes simulated-method constraints and downgrades old simulation flags while retaining history/feedback.
- Adds service-only budget/issue RPCs and authenticated `record_nom_verified_meal` with identity binding, hashed claim validation, row/advisory locks, idempotency, authoritative metadata and direct-write guards.
- Guards box credit and collectible order. Existing seven account tables, ownership RLS, append-only meal/box privileges, profile/favorites/recent-view APIs and deletion cascades remain intact. The original migration is not edited or reapplied.

Before applying, reconfirm target/schema/history and retain a secure operator backup. Apply only this new migration after explicit owner approval. Do not deploy new meal payloads against the old constraints: manual and verified sync now require this migration. After application, run focused real Guest claim, owned proof/RLS, retry, box credit, deletion and second-device verification checks with disposable accounts only. Rollback requires a separately reviewed forward migration; no production rollback was executed.

## Configuration

Existing server-only `SUPABASE_SECRET_KEY` derives domain-separated QR signing and Ed25519 verification signing material. Only the derived public key is embedded at build time; no new signing credential is needed. The Production secret must be present during both Vite build and function execution, as in the confirmed Vercel configuration. Local development without server credentials fails closed; local tests use explicitly synthetic signing material.

Server constants: `NOM_VISIT_RADIUS_METERS` (50–250, default150), `NOM_VISIT_MAX_ACCURACY_METERS` (10–100, default100), `NOM_VISIT_ACCURACY_ALLOWANCE_METERS` (0–30, default30), `NOM_RECEIPT_MAX_AGE_HOURS` (1–72, default72). Optional `NOM_QR_PARTICIPATING_PLACES` is a comma-separated list of full `google:` IDs, usable only after a trusted partner issuance workflow exists. Durable request limits are six attempts/hour/subject and sixty/day/project for the initial pilot; exhausted limits return retryable failure. Budget records are pruned on requests after two days.

POST requires same-origin JSON and a custom header, validates an available account session remotely, or issues a signed HttpOnly/SameSite Strict Guest cookie. Requests containing private server errors return fixed safe result codes. Raw evidence is not logged.

Verification signing material is currently derived from the existing server credential. Future rotation of that credential must retain the previous trusted verification public key for historical events; implement/version the key transition before rotating it or old signatures will no longer hydrate as verified. Google OAuth secret rotation is independent and remains the previously identified owner-approved hardening task.

## Files and verification

New server/API/shared files implement location/QR/OCR/trusted Places, proof signatures, repository and protected handler. Frontend changes cover VerifyVisit, scanner/manual modals, feedback, clean event reducer/hydration, sync payload/RPC, progress copy and QA-only simulation. New signed fixtures and local PostgreSQL tests replace starter/demo-dependent test setup. Vite/Vercel config bundles the catalog for the function and only the public verification key for clients. Dependencies added: pinned `@noble/curves` runtime signature verification and pinned `@electric-sql/pglite` dev-only database tests.

Final local checks: **1,034 Vitest tests / 62 files PASS**, embedded Python suites **16 + 40 PASS**, production build **PASS**, catalog/workbook **201 PASS**, source/emitted client credential scan **PASS**, package inventory **PASS**, npm audit **0 vulnerabilities**, `git diff --check` **PASS**. Production/Preview configured builds test a synthetic server key boundary and QA isolation, not live credentials. Local browser evidence uses fresh disposable Chromium and mocked restaurant/unconfigured-verification transport; it is not a remote integration pass. Temporary scripts/logs/screenshots remain outside source control in `/private/tmp`.

Deployment readiness: **BLOCKED pending migration approval/application and affected live validation**. Receipt verification remains explicitly unavailable until the real OCR credential is installed. Partner QR remains hidden and does not block location/manual launch. Review [Auth branding](../auth-branding-validation/report.md) for separate sender/Google/domain blockers. No remote behavior, mail delivery, credentials or deployment success has been fabricated.
