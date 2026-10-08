# Local real-GPS configuration and validation

October 8, 2026. Target **Nom — iwamwxsosrhxsdcsuoiu** only. Starting HEAD: `c13329e86e89b17dfcf78b2815557b37ce04703c`. The restored, dirty working tree was preserved.

**Local configuration, secret isolation, location capability, and the user-observed real far-away GPS path: PASS. Legitimate within-radius success and its subsequent real signed-meal flow: BLOCKED because the user cannot practically test near a restaurant now.** No coordinates were fabricated for the primary real GPS test.

## Local environment and credential boundary

- Git confirms .env.local is ignored and untracked. It remains ignored; file permissions are 0600.
- The owner manually supplied the existing modern Nom server key before this turn. Its presence/format were checked without outputting its value.
- The two missing public variables VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY were obtained read-only from the target Nom project's connected Supabase tools and appended to .env.local. Existing file bytes were preserved as a prefix; existing server/Maps entries were not overwritten.
- SUPABASE_SECRET_KEY is available to the server configuration only. No VITE_ secret variable was added.
- Existing Vite localhost configuration reloaded the environment changes: its actual capability response and served client verification public key match the new configuration.
- VITE_NOM_VERIFICATION_PUBLIC_KEY is derived from the local server key by existing vite.config.js. Its presence in development output and generated assets was checked against the locally derived value without reproducing the value.
- Exact-key scanning found no server-secret value in all 72 generated text client assets checked or seven key localhost-served HTML/JavaScript modules. Client import.meta.env output contained the public account settings and no server credential.
- Existing source/environment credential scanner and post-build asset scanner passed. No secret value, bearer token or raw coordinate is recorded here.
- No credential creation, rotation or remote environment changes occurred.

## Results

| Requested check | Result | Scope / evidence |
|---|---|---|
| Local environment readiness | PASS | All four required local variables present; verified Nom public configuration and functioning server readiness. |
| Location capability | PASS | GET /api/visit-verification returned location:true, receipt:false, qr:false, version:1. Prior diagnostic report had location:false with incomplete local configuration; a pre-append HTTP response was not captured in this turn. |
| Server secret remains server-only | PASS | Actual-key development/build scan, derived-key checks, client environment check and credential scanner passed. |
| Real browser GPS permission/acquisition | PASS, user-observed/inferred | User confirmed an actual browser GPS test with no simulated or changed location. Reaching too_far confirms a usable sample passed freshness/accuracy checks. No independent browser-tool trace or permission prompt transcript is available. |
| Real far-away verification | PASS, user-observed | Machu Picchu Boston: Location “We couldn’t confirm your location.”; Distance/Accuracy “You appear to be too far from the restaurant.”; Verification “We couldn’t verify this visit automatically.” Continue disabled; restaurant map loaded successfully. |
| Legitimate near-restaurant success | BLOCKED | User explicitly reported that a near-restaurant test is impractical now. No controlled synthetic test is substituted for this primary acceptance check. |
| Approximate distance and reported accuracy | BLOCKED / not displayed | User reported neither value was shown for the far outcome. No raw GPS coordinates were requested, collected by tooling, saved, or placed in this report. Do not invent metrics. |
| Trusted restaurant coordinates | PASS for source boundary and user-reported far path | Existing server fetches Places details using restaurant identity and server key; validates returned ID, coordinates, operational status and food-related type. Browser restaurant coordinates are not accepted. An unconfigured/failed provider cannot produce too_far. |
| Forged restaurant-coordinate request | PASS, actual localhost HTTP | Three payloads supplying top-level latitude/longitude, a restaurant object, or restaurantCoordinates all returned HTTP 400/server_error with no evidence. Source allowlist rejects these before subject/budget/provider/issuance paths. This does not simulate the user's GPS. |
| Signed evidence | PASS automated; BLOCKED legitimate real near path | Real local public-key derivation verified. Controlled integration and client tests passed signing, tamper rejection and persistence. Actual near-browser/server/ledger proof issuance was not performed. |
| Continue gating / status cards | PASS far manual + automated | Real far result kept Continue disabled. Focused component tests gate Continue on valid bound signed evidence; actual successful Continue remains untested until legitimate near GPS. Established copy/layout unchanged. |
| Verified meal / eligible rewards | PASS automated and previously live database; BLOCKED full real-GPS flow | Controlled integration verifies handler → claim → hydration/progress. Existing live database checks establish protected reward threshold and history-only legacy behavior. No actual near-GPS feedback/Experience Logged/persistent account write was performed in this turn. |
| Unverified fallback | PASS automated; manual browser flow not exercised | Focused UI/state/integration tests preserve explicit manual logging, unverified history, zero country/box/collectible credit, cancellation and restoration. No personal account write was requested. |
| Replay / idempotency | PASS automated + prior live backend evidence | Integration and persistence tests passed; the preceding application report documents actual live claim/box retries and deletion-surviving replay checks. No need to repeat those database fixtures in this phase. |
| Failure states | PASS controlled tests | Permission denied, poor accuracy, stale samples, timeout, unavailable provider/storage, invalid/tampered evidence and fallback cancellation pass. Real too_far was additionally user tested. Browser-supplied failure injection and production outages were not induced. |
| Expired evidence | PASS for freshness/expired-token cases; scope clarified | Stale GPS samples and expired QR tokens are rejected in existing tests. Persisted legitimate signed visit proofs are historical evidence, not expiring sessions; no new expiry rule was introduced. OCR/QR remained unconfigured. |
| Maps | PASS, user-observed | Actual restaurant map loaded; prior RefererNotAllowedMapError did not block the reported flow. No key/referrer/API/cloud settings were changed. |
| IntersectionObserver | PASS for current flow, user-observed; isolated diagnostic PASS | User confirmed the error no longer appears in the current Verify Visit flow and no red application errors are visible. All three app observer components were inspected; an isolated strict Element-checking observer accepted 18 calls over nine StrictMode mount/unmount cycles, with zero invalid targets. The earlier error's root cause cannot be attributed without its original stack; no speculative component fix or redesign was made. |
| Secret/security/build/test checks | PASS | Results below. |
| Disposable cleanup | PASS / no disposable live fixtures created | Forged HTTP payloads were rejected before evidence issuance. No disposable users or account writes were created in this phase. Normal private rate-budget rows from the user's real test, if present, are not deleted. The earlier three retained replay fingerprints are preserved. |

The default effective location policy was read from the loaded local environment: **150 m base radius**, **100 m maximum browser accuracy**, allowance **min(accuracy / 2, 30 m)**, sample age **30 seconds**, up to **three samples**, acquisition timeout **4 seconds per sample after permission**. The actual far distance and accuracy remain unknown. Exact personal coordinates exist only transiently within the intended browser/request/server computation; no new location persistence or diagnostic logging was added.

The real far result is the user's observation, not automated browser observation. The Browser skill runtime was initialized and queried according to its instructions, but reported no browser available and an empty discovery list. No alternate automation surface or fabricated location was used.

The user additionally reported only a Google Maps advanced-marker event-listener warning and Chrome slow-network/font-fallback warnings, with no red application errors. These are recorded as remaining nonblocking console observations; their exact messages/stacks were not provided, so no unsupported root cause or fix is asserted.

## Automated validation

| Command/check | Result |
|---|---|
| Focused verification/server/client files | PASS — 98 tests, seven files |
| Full Vitest | PASS — 1,269 tests, 76 files |
| Python unittest discovery | PASS — 74 tests |
| Production build | PASS — 613 transformed modules, credential scan passed |
| npm audit | PASS — zero vulnerabilities |
| Catalog validation / import check | PASS — 201 unique dishes, spreadsheet order preserved |
| Account credential scanner | PASS |
| Exact actual-key client scan | PASS — generated assets plus served development modules |
| git diff --check | PASS |
| StrictMode observer diagnostic | PASS — isolated DOM only, actual console cause unresolved |

Full Vitest also invoked its existing Python subchecks successfully. No test/build failure required application changes. Generated build outputs are ignored; temporary validation scripts/results are outside the repository in a private temporary directory, not intended commit files.

## Exact files changed in this phase

- .env.local (ignored/untracked): appended only VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY; preserved the owner's server key and working Maps settings.
- docs/local-real-gps-validation/report.md: this report.
- docs/visit-verification-compatibility-validation/application.md: a dated pointer to this subsequent local validation.

No application, UI, styling, source test, migration, package or lockfile was changed. HEAD/index and all pre-existing non-documentation working-tree files were checked against this turn's hashes. No staging, commit, push, deployment, schema mutation, additional migration, remote credential/configuration changes, OCR or QR configuration occurred.

## Remaining acceptance / Preview blockers

Localhost location capability now genuinely works, and the real browser far-rejection path has been confirmed. Full successful verification is **not yet certified**.

1. At a restaurant actually within range, use the real browser flow. Confirm valid fresh GPS/accuracy, signed evidence and enabled Continue, then feedback → Experience Logged → restoration/retry/progress. Use Guest for local persistence; use a disposable account for any controlled persistent account validation, with safe cleanup.
2. Current real-console check passed: the earlier IntersectionObserver error did not recur. The reported Maps/Chrome warnings remain nonblocking observations. If an application error recurs later, retain only the app filename/line and sanitized stack for a demonstrated narrow fix.
3. Preview remains unapproved. Its two public Supabase variables already exist remotely according to the preceding read-only environment check; its server-only Supabase key is currently Production-only. Before Preview credentials are changed, review why server issuance requires the key and approve an appropriate secret/signing configuration. Do not copy credentials or deploy automatically.

**STOP for the owner's manual localhost inspection. No Preview or Production deployment is authorized.**
