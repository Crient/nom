# Nom targeted fixes after restoration — October 7, 2026

Local implementation and automated validation PASS. Live verification and rendered/physical-device validation remain BLOCKED on the explicit dependencies below. No commit, staging, push, deployment, remote Supabase/Vercel write, Auth email, Google Places request or OCR request was performed. Registry audit and official documentation reads were the only external checks.

## Starting inventory and preservation

[Exact pre-implementation status and grouped inventory](inventory.md): 49 modified tracked files, 56 new files, 105 total; nothing staged. HEAD and local main were both `c13329e86e89b17dfcf78b2815557b37ce04703c`. All 811 saved pre-polish files matched byte-for-byte. Every remaining modified/new file existed before the rejected broad pass.

The rejected stripped-down Home, removed progress/icon actions, removed restaurant Share/Send to a friend, desktop marketing sidebar, generic card/layout overhaul and four polish-only source/test components were absent. Root README and docs/final-product-polish were absent. Older reports named product-polish describe earlier requested work; they are historical evidence, not leftovers from the rejected pass. None was deleted.

The generated-incoming/.gitkeep is an empty intentional directory placeholder. Test fixtures are deliberate, isolated automated evidence; no runtime source imports the signing/earned-journey fixture modules. Ignored environment files, dist, node_modules, supabase/.temp, private temporary scripts, screenshots and disposable browser artifacts are excluded from the intended commit.

No pre-existing file was deleted. Apart from the 18 exact files listed below, the other 793 starting files retain their exact recorded bytes. The Home artwork/layout, four original icon quick actions, progress cards, Mystery Box banner and Recently Explored remain. Restaurant Details/actions, I Ate Here, Mystery Box/audio source, collection artwork, recommendation engine and 201-dish catalog remain unchanged during this task. AppShell class/layout is unchanged; only its explicit device-chrome mode changes as requested. No desktop sidebar was added.

## Flow results

| Item | Status | Result and limits |
|---|---|---|
| Welcome | PASS | Continue as Guest / Stay on this device. Sign in or create account / Sync across devices. Existing composition and account entry preserved. |
| Fake OS status bar | PASS | Normal npm run dev uses real web safe-area spacing with no 9:41, signal, Wi-Fi or battery. VITE_NOM_DESIGN_PREVIEW=true npm run dev explicitly enables local Figma chrome and matching header insets. Production ignores the flag and preview prop because DEV is false. |
| Search clear | PASS | One accessible app clear button, displayed only for a nonempty query. It clears without submitting and returns focus to the input. Home form submission/arrow still navigates; Explore clearing preserves active filters. |
| Surprise entry | PASS | Before: Home opened one random dish immediately. After: Home opens /recommendations/surprise, with no questionnaire and no rewrite of normal answers. Selecting Try this opens the canonical dish with surprise=1. |
| Swipe deck | PASS | Existing animations, rear-card/image node continuity, skip, undo, reduced motion and identity-scoped transient history retained. Automated tests exercise all 201 canonical dishes once per cycle and avoid an immediate repeat at the cycle boundary. |
| Location implementation | PASS locally / BLOCKED live | Explicit Verify my location; no GPS on screen entry. Fresh high-accuracy samples, trusted server Google Place coordinates, bounded radius/accuracy, signed proof, persistent ledger, account claim and hydration validated with controlled evidence. Real local/live acceptance requires migration and environment configuration. |
| QR implementation | PASS locally / BLOCKED live | Server-signed restaurant-bound token, issue/expiry, nonce/replay checks and participating-place allowlist. QR proof issuance, redemption and account hydration pass against local PostgreSQL. No real restaurant issuer/partner deployment exists; camera scanning also needs real-browser testing. |
| Receipt implementation | PASS locally / BLOCKED live | Photo/upload, Uploading/Processing and signed Receipt verified UI covered. Provider abstraction uses real Google Cloud Vision; merchant, address, date window and confidence checks precede signed acceptance. Full controlled HTTP/SQL/hydration test passes. No live OCR credential or provider request was used. |
| Log without verification | PASS | Explicit confirmation precedes feedback. Saves an unverified history event; no country or Mystery Box credit, no verification rewards. |
| Verification UI | PASS automated / BLOCKED rendered | Reuses Nom verify-check rows, icons and teal/cream treatment. Idle/checking, verified/distance, too far, permission denied, poor accuracy, timeout, unavailable, server/provider/receipt/QR failures have honest states. Continue requires actual signed evidence. No giant generic error panel. |
| Mystery Box/audio | PASS preserved | No implementation change. Existing tests cover default on, saved mute, opening-gesture start, reduced motion, replay, failed audio, refresh/reload, duplicate and retry integrity. |
| Feedback copy | PASS preserved | Be honest. Your feedback won’t affect Mystery Box progress. No em dash or claim of current recommendation learning. |
| Fresh Guest | PASS preserved | Zero activity/favorites/earned collectibles/progress/history; legitimate returning Guest data restores separately from accounts. No QA seed import into normal routes. |
| Account/auth | PASS preservation and existing local regressions | Google/email entry, confirmation/reset handlers, sessions, logout, explicit Guest merge/account-only choices, sync and deletion retained. No Auth email or live-account retest performed. |
| Auth branding | PASS local / BLOCKED external branding | Normal account screens have no Supabase/project-ID/database copy. Existing 13 Nom email templates and subjects pass tests; prepared remote patch remains unapplied. Google published branding/custom Auth domain are external changes. Privacy intentionally identifies processing providers. |

## Search diagnosis and boundary

The earlier broad patch added a custom X beside a type=search input without suppressing its browser-owned cancellation control. That combination can display two X controls. The restored snapshot had removed the custom X and retained only native search behavior. No browser was connected, so the exact current screenshot symptom could not be independently reproduced.

SearchField now uses type=text with role=searchbox, inputMode=search and enterKeyHint=search, and owns exactly one controlled clear button. This prevents native search cancellation chrome from appearing beside the app button. It preserves the original pill, search icon and useful Home submit arrow. Empty/typed/clear/form submission/filter retention pass DOM tests; physical keyboard Enter and mobile/desktop painting remain explicit manual checks.

## Verification implementation and limitations

Browser reads use enableHighAccuracy=true, maximumAge=0, up to three four-second samples; samples older than 30 seconds are discarded. Server restaurant coordinates come from Google Places, never client-selected venue coordinates. Radius defaults to 150 m, configurable between 50 and 250 m. Accuracy must be at most 100 m (configurable down to 10 m); any allowance is bounded to at most 30 m. No dwell time is inferred.

Location results include checking, verified, too_far, permission_denied, poor_accuracy, timeout, location_unavailable and server_error. Explicit backend unavailability is surfaced honestly without asking for unnecessary GPS. A hung verification request times out; a deliberate route cancellation stays cancellation. A changed account session never silently becomes a Guest verification request.

Accepted evidence is signed and bound to visit, canonical dish, restaurant, country, method, server time and approximate distance/accuracy/confidence. Exact latitude/longitude, uploaded receipt images and extracted OCR text are not saved. Receipt/image fingerprints and QR redemption fingerprints protect replay. Account rewards additionally require the owned server ledger and claim, not a browser boolean. Browser GPS and OCR evidence are signals, not device attestation or proof that a particular dish was eaten.

Restaurant QR tokens expire within 120 seconds and carry a random nonce. A trusted operator/partner issuer must create fresh signed QR tokens; a permanent printed arbitrary QR is not this protocol. Signing remains server-only. Only configured participating Google Place IDs are eligible. BarcodeDetector/media camera support needs testing on actual target browsers; an unsupported browser reports unavailable rather than granting a reward.

Receipts must be JPEG/PNG/WebP under 2 MB. The real Vision adapter sends DOCUMENT_TEXT_DETECTION to Google's API. Matching restaurant name plus branch/address and an unambiguous recent date are required with at least 0.85 OCR confidence; default receipt window is 72 hours and can be reduced. This version supports numeric YYYY-MM-DD/YYYY/MM/DD and MM/DD/YYYY dates. Localized/ambiguous receipt formats may be rejected honestly. No raw image bucket, public URL or log storage is used.

The deck strategy still uses equal randomV1 canonical candidates, separate from normal recommendation answers/ranking. createSurpriseSession manages stable deck, queue and undo; its candidate/result boundary can later accept a history-based strategy that returns only canonical dishes. No learned ranking or ML was added.

## Migration review — approval required, not applied

Prepared migration: `supabase/migrations/20261006234854_nom_visit_verification.sql`. It was not changed in this task. Target only Nom / iwamwxsosrhxsdcsuoiu.

It creates public.visit_verifications, private verification_budgets and verification_redemptions, RLS/restricted grants, consume_nom_verification_budget, issue_nom_visit_verification and record_nom_verified_meal RPCs; adds verification status/ID/evidence/quality/version fields and indexes to meal_logs; and adds owned-evidence and verified-box guard triggers.

This is not purely additive/backward-compatible: it changes allowed verification methods and reclassifies old simulated meal flags as unverified. It preserves history/feedback rows. Old opened-box rows are not deleted; if they exist remotely, their relationship to new verified credits must be reviewed before applying. A former client writing location-demo or verified booleans will no longer be compatible. Coordinate the reviewed schema and client release, and back up current data/definitions first. The transaction rolls back on migration failure; a later rollback needs a reviewed compensating migration/data recovery, not dropping evidence blindly.

Local PostgreSQL tests execute both migrations and real triggers/RLS/RPCs, covering anonymous denial, owner isolation, forged flags, Guest claim adoption, duplicate/replay, daily credit, reward choice, request budgets and account-deletion cascade. Controlled client → actual handler → PostgreSQL → JSON hydration succeeds for all three methods with retry-idempotency and disposable local-user cleanup. Local fixtures are not Supabase live validation. No remote schema assertions/advisors were run in this task.

## Required configuration and external setup

Inspection printed presence flags only. Local development currently has GOOGLE_PLACES_API_KEY but lacks VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NOM_RECEIPT_OCR_API_KEY and NOM_QR_PARTICIPATING_PLACES. No environment file or remote configuration was changed.

1. Migration: approve only the reviewed visit-verification migration for Nom before any remote application. Reconfirm actual remote data/schema and run focused live RLS/compatibility checks after approved application. Public UI and manual Guest logging can be reviewed before this.
2. Local account/server connection: explicitly configure the verified Nom public URL/public key and an approved server-only Supabase secret in ignored local environment storage. Do not place the secret in any VITE_ variable or client module, and do not copy Production secrets to Preview casually. Restart npm run dev after any approved local configuration change. A real account/verified claim cannot work here until this and the migration are complete.
3. Receipt OCR: owner must select a Google Cloud project, enable billing and Cloud Vision API, create a credential restricted to Vision API, and configure it as server-only NOM_RECEIPT_OCR_API_KEY. Set provider quotas/budget limits before testing one controlled receipt. Never put it in VITE_*, git or chat. No Google Cloud setup or billable analysis performed. [Official Vision setup](https://cloud.google.com/vision/docs/setup).
4. Restaurant QR: register real participating Google Place IDs in server-only NOM_QR_PARTICIPATING_PLACES and build/deploy an authenticated trusted partner/operator issuer that emits short-lived restaurantId/issuedAt/expiresAt/nonce/signature tokens using signRestaurantQr. Then scan a newly issued code, retry the same visit, and reject a replay into a new visit. No partner or arbitrary QR is treated as verified today.
5. Auth branding: owner can approve installation of prepared Nom email templates independently of SMTP. Nom sender identity needs a verified owned domain/custom SMTP. Google Auth Platform Branding must use Nom and complete its verification/publishing requirements. Replacing the actual callback hostname requires an owned subdomain, DNS/certificate setup and Supabase's paid custom-domain add-on on a paid plan; coordinate the Google callback allowlist and trusted endpoint checks. [Google branding guidance](https://supabase.com/docs/guides/auth/social-login/auth-google), [custom Auth domain requirements](https://supabase.com/docs/guides/platform/custom-domains), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
6. Hardening: Google OAuth client-secret rotation after its prior screenshot exposure remains a separate approval-required follow-up. No secret was retrieved, displayed or rotated.

## Exact files changed during this task

Modified 18 existing/pre-existing untracked files (all other earlier files preserved):

- server/visitVerificationHandler.js
- server/visitVerification.test.js
- src/data/liveVisitVerification.js
- src/components/layout/AppShell.jsx
- src/components/layout/StatusBar.jsx
- src/components/ui/SearchField.jsx
- src/pages/Home.jsx
- src/pages/Welcome.jsx
- src/pages/Explore.jsx
- src/pages/VerifyVisit.jsx
- src/styles/experience.css
- src/pages/AppDestinations.test.jsx
- src/pages/ExperienceFlow.test.jsx
- src/pages/ExperiencePlayground.test.jsx
- src/pages/GuestOnboarding.test.jsx
- src/pages/ProductionAudit.test.jsx
- src/pages/VisualStatePolish.test.jsx
- src/utils/surpriseStrategy.test.js

Added seven files:

- src/utils/designPreview.js
- src/components/layout/StatusBar.test.jsx
- src/components/ui/SearchField.test.jsx
- src/pages/VisitVerification.test.jsx
- server/verificationIntegration.test.js
- docs/targeted-restored-fixes-validation/inventory.md
- docs/targeted-restored-fixes-validation/report.md

Final whole-tree status versus HEAD: **53 modified tracked files, 63 new/untracked files, zero staged files**. This includes the preserved earlier work, not just this task's 25 files. HEAD/main remain `c13329e86e89b17dfcf78b2815557b37ce04703c`; the index is unchanged. No environment, screenshot, temporary-script, patch-reject or backup artifact is listed in Git status.

## Final validation

- PASS: 1,072 Vitest tests across 68 files. Embedded Python checks reported 16 + 40 PASS; they are not additional Vitest test counts.
- PASS: standalone offline Python discovery, 74 tests.
- PASS: production build with VERCEL_ENV=production and both design-preview/reward-QA flags deliberately set; production guards remain effective.
- PASS: catalog workbook/import check and production catalog validation, 201 canonical dishes.
- PASS: source/shared/server and emitted-client credential scanner.
- PASS: synthetic server-secret configuration derives only the expected public verification key; secret value is not in frontend definitions, Production QA remains disabled. No key values printed.
- PASS: npm ls --all; pinned added verification/test dependencies match lockfile.
- PASS: npm audit, zero vulnerabilities. Sandbox DNS failure was retried via the approved network-capable audit command.
- PASS: git diff --check, HEAD/index preservation, no pre-existing file deletion, and exact unchanged-byte checks outside the reviewed 18 files.
- BLOCKED: rendered browser/mobile/desktop QA: browser plugin reported no available browser and an empty browser list. No screenshot fidelity or physical-device success is claimed.
- BLOCKED: live location/QR/receipt, cloud reward claims and external Auth-branding verification on the new code until the owner-controlled dependencies above are resolved.

Initial full-suite failures were test expectations: one still expected default fake chrome, and the new integration fixture passed PGlite Date objects instead of PostgREST's JSON date strings. Both were corrected at the test boundary; final full suite passes. Runtime/layout was not broadened to satisfy outdated assertions.

## Exact manual localhost checks next

1. Run ordinary npm run dev with no design-preview flag. Open Welcome at mobile and desktop widths: no fake 9:41/radios/battery or marketing sidebar; two explicit choices with one short helper each.
2. Continue as Guest. Confirm all four original icon actions, progress cards at zero, Mystery Box banner and Recently Explored empty state. Visit Profile/History/Collections and confirm zero activity/earned items. Reopen a returning Guest to confirm legitimate local restoration.
3. Home search: empty query has no X. Type arepa: exactly one X plus the existing arrow. Clear it: stay on Home, input focused. Type again and press keyboard Enter: Explore shows Arepa. Repeat with the arrow. In Explore, apply a food-type filter and clear search; filter stays selected. Check at 320/390 px and desktop.
4. Save normal discovery answers, return Home and press Surprise me. The swipe deck opens immediately, with no questionnaire. Swipe/skip several cards, Undo skip, then Try this. Confirm selected dish opens, normal answers remain unchanged, rear images stay stable and no immediate repeats. Repeat with reduced motion.
5. Restaurant Details: Directions/Call/Website/Send to a friend/Share/Favorite and I Ate Here remain. Confirm the playful swipe/button interaction is unchanged. Enter verification; it must not request GPS before Verify my location.
6. With currently unconfigured backend, Verify my location must report unavailable without claiming success; Continue stays disabled. Log without verification shows the exact no-rewards warning, then feedback and History work with zero earned credit. Confirm the feedback sentence has no em dash.
7. With an approved migration and configured server only: at a real restaurant, verify a fresh accurate reading; test far-away, denied, low-accuracy and timeout paths. Confirm signed verified continuation, once-per-dish UTC-day rewards, retry/refresh isolation and account hydration on another device. Do not expect a live PASS before setup.
8. With a trusted issuer configured: scan one fresh restaurant QR, check expiry/wrong venue and replay rejection. With approved OCR setup: upload one controlled recent matching receipt, then a wrong/old receipt and retry; confirm raw image is not publicly exposed.
9. With a legitimately earned Mystery Box (or isolated local QA playground only), Open starts sound; previous mute persists, replay works, and double-click/reload never duplicates the grant. Test reduced motion and an audio-refusing browser.
10. Optional local Figma view: VITE_NOM_DESIGN_PREVIEW=true npm run dev shows mock chrome; stop/restart normal dev without the flag afterward. Production build must still hide it.

Safe for local UI review now. Not ready to claim live verification or Production rollout. Stop here for owner review/approval; nothing is staged or committed.
