# Nom overnight final validation — October 7, 2026

**Local validation PASS; restored UI safe for manual localhost review. Migration approval NOT recommended unchanged for an uncoordinated rollout.** The full final suite has **1,208 passing Vitest tests across 71 files**, plus **74 offline Python tests**. Production build, 201-dish workbook consistency, credential/bundle scans, dependency validation and npm audit pass. Rendered responsive/device QA and actual verification-provider/cloud rollout remain **BLOCKED**, not substituted by DOM mocks.

One objective navigation bug was fixed: a fresh user opening a Google restaurant URL now returns to that selected restaurant after completing discovery. No page, style, card, Home, Restaurant Details, I Ate Here, collection, Profile, desktop or Auth implementation was changed overnight. Two reproduced remaining issues are the migration's legacy-box accounting and recovery-form reload after its PKCE code has been consumed; Auth and the read-only migration were deliberately left unchanged.

[Detailed migration inventory, compatibility and recovery](migration-review.md). [Remaining human/device QA](manual-qa.md).

## 1. Preservation and remote-action boundary

Starting HEAD/local main: `c13329e86e89b17dfcf78b2815557b37ce04703c`. **Before: 53 modified tracked + 63 new files = 116; zero staged. After: 54 modified tracked + 69 new = 123; zero staged.** Exact expanded statuses are below. Hash baseline included 818 nonignored tracked/untracked files. Of those, **817 remain byte-identical**; only `src/utils/navigation.js` changed. No starting file is missing. HEAD and the real index hash are unchanged. Safety branch `safety/main-before-cursor-cleanup-f2d7266` still points to `f2d726662f44b54cf7204cb746dc742417579f3d`.

No reset/restore/stash/discard, branch switch, staging, commit, push, deployment, Supabase/Vercel configuration/data mutation, remote migration, credential rotation, Auth email or actual Places/Vision request occurred. No remote service/account environment was inspected. External reads were official documentation and the requested npm registry vulnerability audit. No connected Supabase/Vercel mutation tool was called.

Ignored environment files were read for presence flags only, never written or printed. Build/test caches and ignored generated dist were refreshed as required by the requested checks. Disposable PostgreSQL and Happy DOM fixtures are local only; SQL engines were closed, SQL rollback retained zero fixture users, and no disposable remote account/data was created. Raw receipt/GPS fixture content is not a production asset.

The rejected broad redesign remains absent. The original rich Home, four icon quick actions, progress cards, Mystery Box content, Recently Explored, original Restaurant actions and desktop composition were preserved byte-for-byte. No root README, new marketing sidebar, generic minimal cards, NotFound/JourneyLoading/ConnectivityNotice or deleted-polish components were reintroduced.

## 2. Automated matrix and exact counts

| Check | Result | Evidence / scope |
|---|---|---|
| Starting full Vitest suite | PASS | 1,072 tests / 68 files; existing tree before overnight additions |
| Final full `npm test` | PASS | **1,208 / 71**; 136 new tests: 39 policy/SQL, 84 route/flow DOM, 13 navigation validator |
| High-risk repeat 1 | PASS | 277 tests / 13 files |
| High-risk repeat 2 | PASS | 277 / 13 |
| Final high-risk repeat after last two diagnostic tests | PASS | 279 / 13; no flakiness observed in these runs |
| All Python discovery | PASS | 74 tests / 3 offline suites; image imports/downloads in the logs are mocked temporary fixtures |
| Embedded Python checks | PASS | 16 + 40 reported inside Vitest; not additional Vitest tests and not extra unique Python tests |
| Production `npm run build` | PASS | VERCEL_ENV=production with both design-preview and reward-QA flags deliberately true; 611 modules; source and generated-asset scanners passed |
| Catalog validation | PASS | 201 unique canonical dishes |
| `npm run catalog:check` | PASS | 201 workbook records in spreadsheet order match runtime import |
| Source credential scanner | PASS | src/shared/server/api; privileged frontend env/reference checks |
| Final generated scanner | PASS | `node scripts/validate-account-secrets.mjs --dist` |
| Synthetic server-key production build | PASS | 64 JS/HTML assets scanned; derived public verification key present, synthetic signing secret absent, privileged server/OCR/OAuth/QR references absent, no QA Playground chunks |
| `npm ls --all` | PASS | Installed dependency graph valid; lockfile unchanged overnight |
| `npm audit --json` | PASS | 0 vulnerabilities at all severities; npm metadata 125 dependencies. Initial restricted-network DNS failure was retried read-only with network approval; no package installation |
| `git diff --check` | PASS | No whitespace/patch errors |
| Packaging / `npm run ship -- --dry-run` | PASS for dry-run safety | Disposable index copy; real index/HEAD unchanged; no commit/push/deployment. Packaging omissions described below |
| Existing SQL assertions | PASS locally | Unchanged accounts_rls.sql on account-only local PostgreSQL; transaction rollback left zero users |
| Ledger/trigger/RLS suite | PASS locally | 11 existing PostgreSQL tests + 3 controlled handler/client/SQL/hydration tests; no real Supabase request |
| Overnight evidence/compatibility suite | PASS as investigation | 39 tests, including reproduction of unacceptable legacy-box behavior; green diagnostic tests do not make that behavior PASS |

Commands and raw logs are retained outside the repository at `/private/tmp/nom-overnight-final/`. No logs or temporary scripts were added to the intended commit. There is no configured lint/typecheck script; no success is invented for absent checks.

Initial new-test failures were investigated rather than changing runtime to satisfy them: geofence fixture used a different Earth radius; old unverified writes are normalized by the trigger rather than rejected; fresh accounts correctly do not inherit Guest answers; global Nearby is intentionally an informative dish-missing route; invalid dish already falls back to results; a fixture provider needed a controlled Google venue. The selected Google return-path failure was a real implementation defect, reproduced before its narrow correction. All final checks pass.

## 3. Route and navigation audit

**PASS local DOM / BLOCKED browser/host transport.** All **34 production route entries** were mounted directly and remounted at their settled URL in Guest and fresh-account contexts (68 parameterized cases). This uses synthetic storage and SDK/provider adapters, not actual browser painting, HTTP deep-link hosting or deployed APIs.

| Route family | Observed local behavior / coverage |
|---|---|
| /, /home | Explicit Welcome; Guest/returning account choices; preserved Home. Reload stable |
| /discover/food-type, flavor, adventure, region | Normal four-step journey; in-app Back and completion; returning Guest/account tested |
| /recommendations, /recommendations/more | Requires completed answers; fresh account cannot inherit Guest answers, goes to discovery. Results stable with valid Guest answers |
| /recommendations/surprise | Opens canonical deck immediately for Guest/account, without questionnaire or preference rewrite |
| /recommendations/nearby | Has no dish ID; displays Dish not found, with a useful recovery button rather than Home loop |
| /recommendations/:dishId | Valid details; fresh normal entry goes through discovery. Invalid dish with answers silently replaces to /recommendations (existing fallback) |
| /recommendations/:dishId/nearby | List/map state, selected venue, surprise query and origin handling covered by existing route suites |
| /recommendations/:dishId/nearby/:restaurantId | Owned selected URL survives discovery after overnight fix, including encoded google: ID; invalid venue shows Restaurant not found. Direct saved Google IDs use honest metadata-only state until current details load |
| /visits/:visitId/verify, feedback, logged | Missing visit/log shows explicit recovery; completed feedback/verification revisits redirect to logged. Manual flow/history refresh and account merge newly exercised |
| /boxes/:boxId, opening, reveal | Missing box explicit error; valid opening/reload/reveal is idempotent; interrupted opening safely restarts |
| /collections, /collections/:countryId, /collections/:countryId/:collectibleId | Empty, invalid country/item, locked, earned/upcoming and origin/back states covered |
| /profile, /favorites, /history, /progress | Fresh zeros; URL categories survive remount; Profile origins and browser Back/filter retention covered in existing Happy DOM tests |
| /explore, /scan | Empty/no-results/special/long search; known/unknown scan inputs; inert text, focus and clear behavior |
| /account, /auth/callback, /account/reset-password | SDK initiation, missing/denied/expired callbacks, success/code exchange, reset form, logout and deletion UI covered with mocks. Reset reload limitation below |
| /image-credits, /terms, /privacy | Direct/remount readable; no exception or routing loop |
| unknown / QA paths in Production | Existing catch-all replaces to /home. Production QA chunks/routes disabled even with flag=true in build |

Existing tests also check returnTo allowlists, Explore/Favorites/History origin chains and browser-style Back through category navigation. **Actual browser Back on devices, server deep-link fallback, touch targets and images loaded/painted remain BLOCKED.** No root route redesign was made.

Known controls/fallbacks documented for owner review, left unchanged: Send to a friend reports Friends on Nom are coming soon; it does not send. Call/Website are disabled if unavailable. Unsupported camera/scanner or missing verification provider reports unavailable. Unknown routes go to Home; invalid dishes go to results. These are not fake network successes, but the silent fallbacks/placeholder friend action can surprise users.

## 4. Guest, onboarding and production chrome

**PASS controlled/local.** Fresh Guest has zero meals, explored dishes/countries, favorites, collectibles, reward progress, opened boxes and history; all country progress starts zero. No demo seed import. Returning legitimate local events survive repeated remounts. A → B → Guest isolation and signout restoration preserve distinct Guest bytes. Guest → account remains pending until explicit Merge & Sync; account-only choice uploads no Guest events. Discovery answers/unfinished visits stay local. QA-only events/flags/proofs are rejected by normal persistence and never enter the account outbox.

Welcome exact intended helpers are present: Continue as Guest / Stay on this device.; Sign in or create account / Sync across devices. Authenticated Welcome uses Continue to Home / Your synced journey. and Your Profile. No vague Get Started restored. **360 px paint/overflow is BLOCKED**: source has a full-width flow sheet, but actual font/viewport geometry is not certified by DOM tests.

Normal dev StatusBar renders only web safe-area spacing: no fake 9:41/Wi-Fi/signal/battery. Explicit VITE_NOM_DESIGN_PREVIEW=true in DEV permits mock chrome. DEV=false forbids it, including explicit preview prop. Production build ignores both design-preview and reward-QA flags. Original mobile-width shell and desktop centering are unchanged; no marketing sidebar.

## 5. Search and Surprise Me

**Search PASS local / BLOCKED actual mobile/desktop input.** Controlled text input avoids browser-native extra cancellation chrome. Empty input has no clear button; typed input has exactly one; clearing doesn't submit and restores focus. Form submission/Home arrow, empty/no-results and Explore filter retention pass. Added emoji/script-looking/special and 5,000-character query tests: no HTML/script execution, honest no results, clear restores full 201 articles. Mouse button/focus handling is exercised synthetically; physical Enter/touch/keyboard activation and overflow await browser QA.

**Surprise PASS controlled/local.** Home → deck → select canonical dish; never Flavor/questionnaire/direct one-dish jump. All 201 canonical dishes appear once per deck cycle; next cycle avoids immediate repeat. Repeated launches, tiny 0/1/2/3 candidate pools, undo through cycle exhaustion, preference/context changes and reduced-motion paths pass. Newly exercised **25 consecutive pointer swipes** preserve promoted rear card/image node identity, image source, focus, Undo, select and reload without rewriting discovery answers. This gives DOM continuity evidence, **not a rendered no-flicker/device PASS**. Guest/account entry covered; no ML or changed recommendation scoring/catalog.

## 6. Mystery Box/audio and unverified history

**PASS locally.** Existing audio/reward tests cover Open-gesture-only start, default sound on, saved mute, unmute/replay, refused/failed audio without blocking grant, triple/rapid tap, reduced-motion reveal, abandoned/opening/reveal routes, reload and repeated route. Reduced motion intentionally suppresses opening audio in current code. Events/progress/collectibles are not duplicated. Fresh Guest cannot open an earned box. Actual speaker/audio policy/device experience remains BLOCKED.

New controlled full manual journey: I Ate Here → verification → Log without verification → confirmation → feedback → logged → History → reload → explicit Guest merge → second synthetic account device. Saved row has verified=false, status=unverified, method=none, no opened box or country reward; history survives and mock account hydration preserves the status. Real PostgreSQL manual insertion/box denial is separately covered. **Live Supabase manual sync remains BLOCKED by configuration/rollout**, not claimed as proven by the SDK mock.

Current feedback copy is exactly **Be honest. Your feedback won’t affect Mystery Box progress.** Meaning is correct; **FAIL against the overnight prompt's exact string**, which includes an additional “your” before Mystery Box. Copy was not rewritten tonight. The explicit manual warning states history without rewards/Mystery Box progress.

## 7. Controlled visit-verification and abuse results

| Area | Status | Cases and boundary |
|---|---|---|
| Location | PASS local | Fresh accurate inside, 150 m boundary, immediately outside, far; capped 30 m accuracy allowance; stale/future/poor/malformed/absent samples, denied/timeout/unavailable/cancel. Explicit GPS only; trusted server Place ID/coordinates, forged extra restaurant-coordinate fields rejected |
| Location retry/replay | PASS local | Same visit + subject is idempotent; another subject/venue/dish denied; altered proof/quality/bindings loses credit; cross-user ledger adoption denied |
| QR | PASS local | Signed correct venue; bad/changed signature, expired, future, overlong TTL, wrong/altered venue, invalid nonce, malformed and arbitrary QR rejected. SQL durable nonce uniqueness/redemption survives account deletion |
| Receipt | PASS local | Correct and normalized accented/punctuated merchant + matching branch/address + one recent date, minimum confidence; wrong merchant/branch, expired/future/invalid/ambiguous/missing date, unreadable/low confidence, provider/config/error, invalid MIME/base64, oversized/SVG/mismatched upload. Controlled accepted retries are idempotent; receipt/image hashes replay-denied |
| Ledger/claim/reward guards | PASS local | No bare verified flag; owner/event/restaurant/dish/country/claim binding, metadata/UTC day overridden by ledger, one evidence per meal, distinct dish/day credit, verified-country-only boxes, deterministic reward and no legendary forgery. Another user's rows/evidence inaccessible |
| RLS/security functions | PASS local | Anonymous denied, authenticated owner-only reads, private claim/budget/issuance denied, deletion cascade, durable budget; existing seven-table account SQL tests executed unchanged on base schema |
| Populated legacy reward migration | **FAIL** | Retained old box consumes first new real earned box's credit; proven locally; SQL left untouched |
| Actual Supabase/provider/device acceptance | **BLOCKED** | No remote migration/config/data write, provider call or real camera/GPS occurred |

Exact raw GPS coordinates, samples, image base64 and extracted OCR text are not persisted in accepted ledger rows or browser-generated assets. Distance/accuracy are rounded; merchant/image fingerprints are retained. Location/QR freshness is enforced before issuance. Already accepted signed historical proofs do not expire during rehydration; otherwise ordinary historical rewards would vanish. They remain bound to their original event and ledger/claim, not reusable as a new meal.

Security limits: a browser can spoof **its own GPS readings**, change its local program/storage, or copy a legitimate signed proof into a local optimistic view; this is not hardware presence/purchase attestation. SQL owner/claim/event/replay/credit guards prevent those edits from minting unauthorized cloud rewards. Receipt matching is a heuristic and can reject local date formats; OCR does not authenticate a purchase. Guest cookie reset can evade a subject budget, though the global 60/day budget remains. Genuine concurrency across multiple live server/database sessions was not load-tested. No unsupported claims of impossible fraud or full Production security are made.

## 8. Auth regression and newly confirmed limitation

**PASS mock-controlled core flows.** Google OAuth initiation, email signup/login, session restoration, callback exchange once across identity transition, error-neutral UI, reset password update, signout, explicit merge/account-only, A/B/Guest isolation, two-device hydration, offline durable outbox/retries and deletion UI/protected handler pass existing full suites. Auth source unchanged. No emails sent; no personal account accessed/deleted.

**FAIL: reset form readiness after reload.** New controlled regression probe confirms that successful code exchange removes the URL code and displays the form; remounting the same /account/reset-password then loses the form and reports missing/expired, despite restored signed-in session. No Home fallback occurs. The diagnostic test is green because it reproduces this limitation. Do not “fix” it by accepting any ordinary signed-in session as recovery; a safe follow-up needs an explicit recovery-session/readiness design. User explicitly prohibited Auth changes tonight, so none were made.

External Google consent/published branding/custom Auth domain, actual mailbox/PKCE links and deployed current handlers remain BLOCKED for this run. Prior known Google OAuth secret screenshot exposure remains a separately approved rotation follow-up; no secret was exposed or rotated here.

## 9. Responsive and code health

**Rendered QA BLOCKED at 360/375/390/430/440/desktop**: runtime selection failed, read-only discovery list was empty. No alternative browser was used to bypass that limitation, no screenshots generated, and no DOM measurement was presented as rendered evidence. Static review notes full-width max-440 shell, min-width:0 in content/search/card grids, bounded CTA widths, modal scroll constraints and fixed Welcome composition. Potential font collisions, short-screen sheet/nav overlap, long-text clipping, deck paint/image loads and camera/audio must be checked manually. No subjective layout change made.

Production-source keyword audit (src/server/shared/api JS/JSX/CSS/JSON, excluding test modules/test helpers/catalog records): TODO=0, FIXME=0, console.log=0, debugger=0, localhost=1, temporary=8, fake=1, simulate=4, preview=226, demo=37, mock=40. The one localhost is a DEV-only Supabase URL allowlist. QA fixtures/playgrounds are explicit isolated imports/routes; Production build removes their chunks. Preview/demo words also occur in CSS class names, saved legacy metadata, honest upcoming artwork notices, normal restaurant thumbnail labels, image provenance and dev/test fallback components. No blind removals performed.

DishDetails/Nearby console.debug is DEV-gated; server nearby debug uses an explicit configuration and sanitized diagnostics, not a shipped browser console log. Production restaurant provider uses real same-origin service, never auto-selects the mock provider; legacy saved favorites have honest metadata labels. Static restaurant mock rendering is forbidden outside DEV/isolated QA. No automatic sample account events or seed rewards found in normal Production paths. Upcoming non-Cambodia character art is explicitly placeholder copy, preserved as established behavior.

**Packaging caveat:** ship dry-run succeeds and preserves the real index, but its new-file allowlist includes only migration/test SQL plus docs named report.md. It does **not** include new supabase/auth-email-templates files or the new migration-review.md/manual-qa.md (nor prior inventory/support docs). A future coherent reviewed commit needs an explicit file list including legitimate templates/support docs; do not blindly run normal ship. No packaging script edit/staging happened tonight.

## 10. Migration, configuration and readiness

The detailed read-only [migration review](migration-review.md) inventories one schema, three tables, eight new meal columns, five functions, two triggers, one policy, ten indexes, grants and all local constraint definitions. It is not purely additive: it drops old constraints, updates every meal's verification fields, changes allowed methods and enforces owned signed reward evidence.

**Migration-first:** old simulated verified writes fail; old unverified writes save as none, but HEAD hydration drops all migrated methods. **App-first:** new meal fields/RPC do not exist on account-only schema. **Coordinated rollout required**, including excluding cached old writers or preparing a compatible staged transition. Preview using Nom shares the Production database. Resolve legacy box accounting, inspect actual row population, back up original flags/objects, rehearse recovery and use separately approved schema/client actions. A SQL transaction protects failures before commit; old-client redeploy alone cannot roll back a successful data reclassification. No remote approval/apply is inferred from this overnight request.

Exact local configuration presence, values never printed:

| Name | Present locally | Requirement |
|---|---|---|
| VITE_SUPABASE_URL | No | Verified Nom URL for browser/server; any other target rejected by server |
| VITE_SUPABASE_PUBLISHABLE_KEY | No | Browser public account client |
| SUPABASE_SECRET_KEY | No | Server ledger/claim budgets/account deletion plus build-time public proof-key derivation; never VITE_ |
| GOOGLE_PLACES_API_KEY | Yes | Trusted server venue data; no request made |
| VITE_GOOGLE_MAPS_BROWSER_KEY / VITE_GOOGLE_MAPS_MAP_ID | Yes / Yes | Existing public Maps configuration, unchanged |
| NOM_RECEIPT_OCR_API_KEY | No | Optional receipt method; approved Vision billing/API restrictions/quota + server-only key |
| NOM_QR_PARTICIPATING_PLACES | No | Optional QR method; comma-separated approved google: place IDs plus a trusted authenticated operator issuer |

Optional server policy knobs: NOM_VISIT_RADIUS_METERS (50–250, default150), NOM_VISIT_MAX_ACCURACY_METERS (10–100, default100), NOM_VISIT_ACCURACY_ALLOWANCE_METERS (0–30, default30), NOM_RECEIPT_MAX_AGE_HOURS (1–72, default72). Build injects only derived VITE_NOM_VERIFICATION_PUBLIC_KEY; runtime/build secret must match. No new QR-secret variable exists: QR/claim/proof keys currently derive from server Supabase secret; key rotation requires historical proof/claim preservation. Do not create QR partners, configure Vision/Auth domains or copy Production-only credentials into Preview without separate approval.

**Safe for manual localhost review: YES. Safe to apply pending migration unchanged now: NO recommendation. Production/cloud/device readiness: BLOCKED pending the documented migration/config/manual work.** User can review restored UI without remote writes. Exact external/device checklist is [manual-qa.md](manual-qa.md).

## 11. Bugs/fixes and exact overnight file changes

- FIXED: discovery return validator rejected real/encoded Google IDs, dumping selected restaurant links onto results after questionnaire. Small nonvisual fix reuses canonical ID validator, preserves legacy routes, rejects malformed encodings/external/slash-injected paths. Reproduced by one full UI regression and raw/encoded unit cases before fixing.
- UNCHANGED FAIL: legacy box accounting in pending SQL; read-only migration scope and reward preservation decision require review.
- UNCHANGED FAIL: recovery form reload after PKCE consumption; explicit no-Auth-change constraint.
- UNCHANGED exact-copy mismatch: feedback lacks “your” before Mystery Box compared to overnight quoted requirement. Meaning is already honest; no subjective copy rewrite.
- DOCUMENTED: friend placeholder, unknown/invalid-dish silent fallbacks, long-ID limit mismatch, proof-key rotation coupling, packaging omissions, real camera/browser support, legacy-data rollout and retention/load considerations. No new redesign/features.

Modified one pre-existing file: `src/utils/navigation.js`.

Added six files:

- `server/overnightVerificationReview.test.js`
- `src/pages/OvernightNavigation.test.jsx`
- `src/utils/navigation.test.js`
- `docs/overnight-final-validation/report.md`
- `docs/overnight-final-validation/migration-review.md`
- `docs/overnight-final-validation/manual-qa.md`

All earlier legitimate account/auth/Guest isolation/merge/sync/Google/email/deletion/catalog/recommendation/Surprise/box/audio/verification/branding/tests/security/docs work remains. No .env, credentials, screenshot, temporary script, generated client asset or disposable fixture data is in these seven Git changes. Test fixtures are isolated automated inputs, not runtime seed data. Nothing staged or committed.

## 12. Exact Git statuses

These are expanded `git status --porcelain=v1 -uall`, relative to current HEAD/main. Existing prior work is intentionally included; this is not an overnight-only file list.

### Before

```text
 M .gitignore
 M docs/supabase-account-sync-validation/report.md
 M package-lock.json
 M package.json
 M scripts/accountSecrets.test.js
 M scripts/validate-account-secrets.mjs
 M src/components/experience/EdgeStateModal.jsx
 M src/components/layout/AppShell.jsx
 M src/components/layout/StatusBar.jsx
 M src/components/recommendations/DishDetailHero.jsx
 M src/components/restaurants/LiveRestaurantDetails.jsx
 M src/components/ui/SearchField.jsx
 M src/data/accountSync.test.js
 M src/data/cloudRepository.js
 M src/data/cloudState.js
 M src/data/collectionDefinitions.js
 M src/data/experienceState.js
 M src/data/experienceState.test.js
 M src/data/localPersistence.test.js
 M src/data/persistedState.js
 M src/data/syncEngine.js
 M src/data/visitVerificationProvider.js
 M src/pages/AccountFlows.test.jsx
 M src/pages/AppDestinations.test.jsx
 M src/pages/DishDetails.jsx
 M src/pages/ExperienceFlow.test.jsx
 M src/pages/ExperiencePlayground.jsx
 M src/pages/ExperiencePlayground.test.jsx
 M src/pages/Explore.jsx
 M src/pages/Home.jsx
 M src/pages/LiveNearbyRestaurants.test.jsx
 M src/pages/MealFeedback.jsx
 M src/pages/NearbyRestaurants.jsx
 M src/pages/PlacesPolicy.jsx
 M src/pages/ProductionAudit.test.jsx
 M src/pages/Profile.jsx
 M src/pages/Progress.jsx
 M src/pages/RestaurantDetails.jsx
 M src/pages/RewardPlayground.test.jsx
 M src/pages/SurpriseBox.jsx
 M src/pages/SurpriseBox.test.jsx
 M src/pages/SurpriseMe.jsx
 M src/pages/VerifyVisit.jsx
 M src/pages/VisualStatePolish.test.jsx
 M src/pages/Welcome.jsx
 M src/styles/experience.css
 M src/test/accountFixtures.js
 M src/test/setup.js
 M src/utils/explorationSummary.js
 M src/utils/rewardSound.js
 M src/utils/rewardSound.test.js
 M vercel.json
 M vite.config.js
?? api/visit-verification.js
?? docs/auth-branding-validation/report.md
?? docs/engineering-onboarding-validation/report.md
?? docs/figma-scoring-experience-validation/report.md
?? docs/final-visual-state-validation/README.md
?? docs/final-visual-state-validation/asset-audit.md
?? docs/nearby-restaurants-google-places.md
?? docs/nearby-restaurants-phase2-validation.json
?? docs/nearby-restaurants-ux-correction-validation.json
?? docs/nearby-restaurants-ux-correction-validation/visual-code-review.md
?? docs/nearby-restaurants-validation.json
?? docs/onboarding-guest-surprise-validation/report.md
?? docs/overnight-product-polish.md
?? docs/product-polish-followup.md
?? docs/product-polish-v3.md
?? docs/targeted-restored-fixes-validation/inventory.md
?? docs/targeted-restored-fixes-validation/report.md
?? docs/targeted-runtime-motion-validation/report.md
?? docs/ui-polish-five-validation/report.md
?? docs/visit-verification-validation/report.md
?? server/receiptOcrProvider.js
?? server/restaurantQr.js
?? server/verificationDatabase.test.js
?? server/verificationIntegration.test.js
?? server/verificationPolicy.js
?? server/verificationRepository.js
?? server/verificationRestaurantProvider.js
?? server/verificationSignature.js
?? server/visitVerification.test.js
?? server/visitVerificationHandler.js
?? shared/visitVerification.js
?? src/assets/food/generated-incoming/.gitkeep
?? src/components/experience/RestaurantQrScanner.jsx
?? src/components/layout/StatusBar.test.jsx
?? src/components/ui/SearchField.test.jsx
?? src/data/liveVisitVerification.js
?? src/data/verificationPersistence.test.js
?? src/hooks/useDishRecommendation.js
?? src/pages/GuestOnboarding.test.jsx
?? src/pages/VisitVerification.test.jsx
?? src/test/earnedJourney.js
?? src/test/verificationFixtures.js
?? src/utils/designPreview.js
?? src/utils/surpriseStrategy.js
?? src/utils/surpriseStrategy.test.js
?? supabase/auth-email-templates/README.md
?? supabase/auth-email-templates/config-patch.json
?? supabase/auth-email-templates/confirmation.html
?? supabase/auth-email-templates/email-change.html
?? supabase/auth-email-templates/email-changed-notification.html
?? supabase/auth-email-templates/identity-linked-notification.html
?? supabase/auth-email-templates/identity-unlinked-notification.html
?? supabase/auth-email-templates/invite.html
?? supabase/auth-email-templates/magic-link.html
?? supabase/auth-email-templates/mfa-factor-enrolled-notification.html
?? supabase/auth-email-templates/mfa-factor-unenrolled-notification.html
?? supabase/auth-email-templates/password-changed-notification.html
?? supabase/auth-email-templates/phone-changed-notification.html
?? supabase/auth-email-templates/reauthentication.html
?? supabase/auth-email-templates/recovery.html
?? supabase/auth-email-templates/subjects.json
?? supabase/auth-email-templates/templates.test.js
?? supabase/migrations/20261006234854_nom_visit_verification.sql
```

### After

```text
 M .gitignore
 M docs/supabase-account-sync-validation/report.md
 M package-lock.json
 M package.json
 M scripts/accountSecrets.test.js
 M scripts/validate-account-secrets.mjs
 M src/components/experience/EdgeStateModal.jsx
 M src/components/layout/AppShell.jsx
 M src/components/layout/StatusBar.jsx
 M src/components/recommendations/DishDetailHero.jsx
 M src/components/restaurants/LiveRestaurantDetails.jsx
 M src/components/ui/SearchField.jsx
 M src/data/accountSync.test.js
 M src/data/cloudRepository.js
 M src/data/cloudState.js
 M src/data/collectionDefinitions.js
 M src/data/experienceState.js
 M src/data/experienceState.test.js
 M src/data/localPersistence.test.js
 M src/data/persistedState.js
 M src/data/syncEngine.js
 M src/data/visitVerificationProvider.js
 M src/pages/AccountFlows.test.jsx
 M src/pages/AppDestinations.test.jsx
 M src/pages/DishDetails.jsx
 M src/pages/ExperienceFlow.test.jsx
 M src/pages/ExperiencePlayground.jsx
 M src/pages/ExperiencePlayground.test.jsx
 M src/pages/Explore.jsx
 M src/pages/Home.jsx
 M src/pages/LiveNearbyRestaurants.test.jsx
 M src/pages/MealFeedback.jsx
 M src/pages/NearbyRestaurants.jsx
 M src/pages/PlacesPolicy.jsx
 M src/pages/ProductionAudit.test.jsx
 M src/pages/Profile.jsx
 M src/pages/Progress.jsx
 M src/pages/RestaurantDetails.jsx
 M src/pages/RewardPlayground.test.jsx
 M src/pages/SurpriseBox.jsx
 M src/pages/SurpriseBox.test.jsx
 M src/pages/SurpriseMe.jsx
 M src/pages/VerifyVisit.jsx
 M src/pages/VisualStatePolish.test.jsx
 M src/pages/Welcome.jsx
 M src/styles/experience.css
 M src/test/accountFixtures.js
 M src/test/setup.js
 M src/utils/explorationSummary.js
 M src/utils/navigation.js
 M src/utils/rewardSound.js
 M src/utils/rewardSound.test.js
 M vercel.json
 M vite.config.js
?? api/visit-verification.js
?? docs/auth-branding-validation/report.md
?? docs/engineering-onboarding-validation/report.md
?? docs/figma-scoring-experience-validation/report.md
?? docs/final-visual-state-validation/README.md
?? docs/final-visual-state-validation/asset-audit.md
?? docs/nearby-restaurants-google-places.md
?? docs/nearby-restaurants-phase2-validation.json
?? docs/nearby-restaurants-ux-correction-validation.json
?? docs/nearby-restaurants-ux-correction-validation/visual-code-review.md
?? docs/nearby-restaurants-validation.json
?? docs/onboarding-guest-surprise-validation/report.md
?? docs/overnight-final-validation/manual-qa.md
?? docs/overnight-final-validation/migration-review.md
?? docs/overnight-final-validation/report.md
?? docs/overnight-product-polish.md
?? docs/product-polish-followup.md
?? docs/product-polish-v3.md
?? docs/targeted-restored-fixes-validation/inventory.md
?? docs/targeted-restored-fixes-validation/report.md
?? docs/targeted-runtime-motion-validation/report.md
?? docs/ui-polish-five-validation/report.md
?? docs/visit-verification-validation/report.md
?? server/overnightVerificationReview.test.js
?? server/receiptOcrProvider.js
?? server/restaurantQr.js
?? server/verificationDatabase.test.js
?? server/verificationIntegration.test.js
?? server/verificationPolicy.js
?? server/verificationRepository.js
?? server/verificationRestaurantProvider.js
?? server/verificationSignature.js
?? server/visitVerification.test.js
?? server/visitVerificationHandler.js
?? shared/visitVerification.js
?? src/assets/food/generated-incoming/.gitkeep
?? src/components/experience/RestaurantQrScanner.jsx
?? src/components/layout/StatusBar.test.jsx
?? src/components/ui/SearchField.test.jsx
?? src/data/liveVisitVerification.js
?? src/data/verificationPersistence.test.js
?? src/hooks/useDishRecommendation.js
?? src/pages/GuestOnboarding.test.jsx
?? src/pages/OvernightNavigation.test.jsx
?? src/pages/VisitVerification.test.jsx
?? src/test/earnedJourney.js
?? src/test/verificationFixtures.js
?? src/utils/designPreview.js
?? src/utils/navigation.test.js
?? src/utils/surpriseStrategy.js
?? src/utils/surpriseStrategy.test.js
?? supabase/auth-email-templates/README.md
?? supabase/auth-email-templates/config-patch.json
?? supabase/auth-email-templates/confirmation.html
?? supabase/auth-email-templates/email-change.html
?? supabase/auth-email-templates/email-changed-notification.html
?? supabase/auth-email-templates/identity-linked-notification.html
?? supabase/auth-email-templates/identity-unlinked-notification.html
?? supabase/auth-email-templates/invite.html
?? supabase/auth-email-templates/magic-link.html
?? supabase/auth-email-templates/mfa-factor-enrolled-notification.html
?? supabase/auth-email-templates/mfa-factor-unenrolled-notification.html
?? supabase/auth-email-templates/password-changed-notification.html
?? supabase/auth-email-templates/phone-changed-notification.html
?? supabase/auth-email-templates/reauthentication.html
?? supabase/auth-email-templates/recovery.html
?? supabase/auth-email-templates/subjects.json
?? supabase/auth-email-templates/templates.test.js
?? supabase/migrations/20261006234854_nom_visit_verification.sql
```
