# Automatic Visit Verification — surgical correction, 2026-10-07

This report supersedes the **verification interaction model** in the earlier surgical-review snapshot: Location is now the automatic primary flow, not a fourth fallback action. Earlier approved work and reports were retained.

## Preservation — PASS

Captured hashes of 826 existing nonignored files, real Git index and HEAD before editing; also saved source snapshots under `/private/tmp/nom-auto-verification-review/before/`. This pass modifies 17 files that already existed in the working tree and adds five files (22 total). All 809 other baseline files remain byte-identical; zero original files were removed. HEAD/main remains `c13329e86e89b17dfcf78b2815557b37ce04703c` and the real index remains unchanged.

Home has exactly one changed JSX line: the Recently Explored rail’s alignment/padding/gap classes. Its structure, progress cards, icon-based actions and destinations are unchanged. Restaurant Details layout, I Ate Here interaction, questionnaire, Surprise Me deck, prior recommendation-copy fix, favorite sizing, friend sharing, Experience Logged composition, Mystery Box/audio, Collections, auth/account isolation/sync, reward rules, migration and canonical catalog remain byte-identical to the starting tree.

No staging, commit, push, deployment, migration, reset/restore/stash or remote Supabase/Vercel operation occurred. No environment configuration was changed or credential values exposed. No new dependencies were installed. Disposable fixtures were in controlled tests only; no remote test users/data were created.

## Exact files changed

### Existing working-tree files modified

- `server/overnightVerificationReview.test.js`
- `src/components/experience/EdgeStateModal.jsx`
- `src/components/restaurants/PlacePhoto.test.jsx`
- `src/components/ui/SearchField.jsx`
- `src/components/ui/SearchField.test.jsx`
- `src/data/liveVisitVerification.js`
- `src/pages/ExperienceFlow.test.jsx`
- `src/pages/ExperiencePlayground.test.jsx`
- `src/pages/Home.jsx`
- `src/pages/LiveNearbyRestaurants.test.jsx`
- `src/pages/OvernightNavigation.test.jsx`
- `src/pages/ProductionAudit.test.jsx`
- `src/pages/VerifyVisit.jsx`
- `src/pages/VisitVerification.test.jsx`
- `src/styles/experience.css`
- `src/styles/hubs.css`
- `src/styles/nearby.css`

### New files

- `src/components/experience/VisitVerificationMap.jsx`
- `src/components/experience/VisitVerificationMap.test.jsx`
- `src/components/experience/ActivityCard.test.jsx`
- `docs/automatic-visit-verification-validation/report.md`
- `docs/automatic-visit-verification-validation/dwell-time-notes.md`

## Automatic state flow — PASS in controlled tests

`I Ate Here → Verify Visit → readiness check → fresh browser location readings → server distance/accuracy validation → signed evidence accepted → Continue → feedback → verified history/reward eligibility`.

The page begins in a checking state immediately, without a “Verify my location” or “Verify with location” chooser. Granted permission begins fresh readings automatically. A known permission prompt shows “Waiting for location permission…”; acquisition timers wait for the answer. If the optional Permissions API is unavailable, the native browser acquisition timeout handles permission waiting. Known denial stops without another position/server request. Readiness failure keeps the framework, disables Continue and exposes fallback instead of requesting GPS when signed verification cannot complete.

Permission waiting is distinct from acquisition time under the browser specification. [W3C timeout behavior](https://www.w3.org/TR/geolocation/#timeout).

A successful automatic result turns all three existing Nom cards green: near the selected restaurant, distance confirmed (with actual signed distance when present), and “All set! Your visit has been verified.” No hard-coded 200 m radius or 17-minute dwell appears. The existing server policy/radius is unchanged; display copy describes the allowed range without inventing its numeric setting.

Permission denial, too-far, poor accuracy, timeout, missing location, unavailable readiness and server/proof failures preserve the map + three-row hierarchy. Their real reason appears in the status stack. Continue remains disabled. The small **Try location again** action is outside the fallback sheet. No automatic retry loop runs on ordinary rerenders.

Cancellation aborts client requests/listeners and ignores late GPS/server results after fallback/manual logging, navigation or effect cleanup. Native `getCurrentPosition` permission prompts cannot be programmatically dismissed; late callbacks are discarded. React StrictMode produces one effective acquisition/verification run after its effect cleanup cycle.

## Map implementation — PASS in SDK-controlled tests; real rendering pending

The previous pin/name/address circle is replaced by an actual Maps JavaScript canvas using Nom’s existing `loadGoogleMaps` loader and the established public browser key/map ID. It plots the selected restaurant’s existing trusted Google Places coordinates, and a fresh user marker when a reading is available. Bounds frame their relationship. It never treats marker placement as proof.

The map imagery is masked to the existing 251 px circular treatment. A separate unmasked 48 px footer area retains the SDK’s native attribution/terms region. Native branding is not replaced or hidden with private SDK DOM/CSS selectors. A secondary Google Maps directions link sits below the map. Review the actual rendered logo/terms at mobile widths before declaring visual/attribution parity. Google’s policies require attribution; the loader already provides the marker library and the Maps SDK supports programmatic Advanced Markers. [Maps policies](https://developers.google.com/maps/documentation/javascript/policies), [Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/add-marker).

Missing/untrusted coordinates, QA-only examples, missing Maps configuration or SDK/auth failures show an honest map-specific state; no mock imagery substitutes for a real map. The QA playground requests neither live maps nor real GPS. User marker coordinates exist only in page/map memory and are removed on cleanup; no location storage/watch/background tracking was added. No server credential is imported by the map component.

## Fallback before / after — PASS

Before: a four-choice method sheet, including Location and configuration warnings inside its method cards.

After: title **“We couldn’t verify your visit automatically”**, supporting **“Other options to verify your visit”**, then exactly three product actions:

1. **Scan restaurant QR code** — For partnered restaurants.
2. **Scan receipt** — Take or import a photo of your receipt.
3. **Log without verification** — Save to history without rewards or Mystery Box progress.

Location is absent from the alternatives. Configuration explanations appear only after selecting QR/receipt. The primary privacy card is shortened to “We only use your location to verify this visit. Your exact location isn’t saved.”

- **QR — PASS in controlled tests:** when ready, opens the existing camera/BarcodeDetector scan flow, sends the detected token to the server and accepts only genuine signed verification. Rejected/arbitrary codes cannot enable Continue. If trusted partner support is unavailable, selecting the action explains that this restaurant does not currently support Nom QR verification, without opening the camera or faking success.
- **Receipt — PASS in controlled tests:** when ready, opens photo import/capture, shows uploading/processing and enables continuation only after a valid signed receipt result. Without OCR readiness, the receipt flow explains it cannot complete; no file processing/OCR is invoked.
- **Unverified history — PASS:** requires the separate explicit confirmation, records method `none`/unverified and follows feedback/history with no earned progress or box. Late automatic results cannot overwrite that choice. Earlier logged-screen safety tests remain intact.
- **Fallback verified evidence:** successful QR/receipt can continue into verified feedback using the same signed-proof gate, while the Location/Distance cards retain their actual failed state; fallback evidence does not fabricate a location match.

## Recently Explored / Search — PASS

Only the existing compact ActivityCard CSS and the Home rail’s classes changed. Every compact card has 112 px height, 12 px padding/gap, 64×64 px centered image, a reserved 36 px two-line title slot, and 16 px metadata/date line heights. Labels such as “Dish explored” and “Meal logged · Unverified” no longer change the row geometry. Long titles clamp visually while retaining their text/destination. Normal History cards retain their prior geometry.

Width is `min(78cqw, 290px)` with the same fixed flex basis, based on Nom’s existing container; one card fits normal mobile widths with the next peeking in. The rail aligns with its heading and uses a 12 px gap. Existing links, return state, date/country metadata and scrolling remain intact. Actual browser wrapping/overflow still needs inspection.

Search now hides the placeholder immediately on focus, restores it after blur, and leaves typed value/search submission/clearing unchanged. Focus/blur callbacks are preserved. Tests cover empty focus, text entry, clearing, empty blur and callback delivery.

## Expand/zoom audit — PASS for source and controlled interactions

The **same** PlacePhoto overlay now uses a transparent 44×44 px button surrounding a 26×26 px visible circle and 14 px expand icon for every non-hero photo.

| Instance | Result |
| --- | --- |
| Dish page nearby carousel (`RestaurantPreviewCard → PlacePhoto compact`) | Existing smaller control retained. |
| Nearby list cards (`RestaurantCard → PlacePhoto`) | Previously oversized full-circle overlay corrected. |
| Selected restaurant cards in nearby map/results (same `RestaurantCard`) | Same corrected shared overlay. |
| Live restaurant detail hero (`LiveRestaurantDetails → PlacePhoto hero`) | Already has no expand overlay; unchanged. |
| Dish hero (`DishDetailHero`), development restaurant hero (`RestaurantPhoto`), generic `Image` | No separate photo expand control exists in these components. |
| Expanded photo/credits dialog | Credits, source links, focus restoration and no-extra-photo-request behavior preserved. |
| Photo-source link / retry control / Google’s map zoom controls | Separate actions, not the oversized photo-expand circle; accessible targets retained. |

## Validation results

| Check | Result |
| --- | --- |
| Focused verification/Home-related/search/recent/photo/server tests | PASS — 284 tests across 12 files before the final attribution-footer spacing adjustment; final full suite includes the corrected footer guard. |
| Full Vitest | PASS — 1,246 tests across 74 files. |
| Python | PASS — 74 tests. |
| Production-mode build, including QA suppression flags | PASS — build and dist credential-boundary checks. |
| Canonical catalog + workbook | PASS — 201 unique dishes, all 201 spreadsheet records match. |
| Source/client security checks | PASS — no privileged browser env/references/embedded credentials. |
| Package graph | PASS — `npm ls --all`, exit 0. |
| npm audit | PASS — zero vulnerabilities. |
| Git whitespace, including newly added files | PASS — `git diff --check` plus untracked patch checks. |
| Preservation | PASS — 809 unrelated files byte-identical, zero removals, unchanged HEAD/index. |
| Read-only localhost readiness | PASS inspection — HTTP 200, `location: false`, `qr: false`, `receipt: false`. No verification POST or provider mutation was sent by the agent. |
| Real signed verification / real QR / real OCR | BLOCKED by local readiness and separate backend rollout. Controlled tests are not live-provider validation. |
| Real browser / exact Figma visual parity | BLOCKED — browser discovery returned no available browser; latest attachment contains written instructions only. No rendered no-overflow/pixel-parity claim. |

## Configuration / migration still pending

This inspection is **localhost only**. Existing public Maps browser key and map ID are present locally; their values were neither printed nor changed. Actual SDK rendering, key/referrer authorization and attribution layout were not exercised by a real browser.

Local server signing/service credential and client `VITE_NOM_VERIFICATION_PUBLIC_KEY` are absent. Local receipt OCR and QR partner configuration are absent. The verification endpoint reports all methods unready. Successful real verification requires the separately coordinated server/client configuration and pending `supabase/migrations/20261006234854_nom_visit_verification.sql` rollout. The migration and all server trust/reward rules remain untouched. This pass neither applies the migration nor configures local/remote credentials.

Do not infer production configuration from local absence. No remote project was inspected or changed during this pass.

Future dwell-time options are documented separately in [dwell-time-notes.md](dwell-time-notes.md); none was implemented.

## Remaining manual review

At 360, 375, 390, 430 and 440 px: inspect the circular map/markers and native Google attribution/terms, three concise status cards, fallback sheet with exactly three choices, privacy/Continue spacing, Recently Explored alignment/next-card peek, placeholder focus/blur and both compact/full photo expand overlays. Check actual horizontal overflow and vertical scrolling. Then verify the real automatic location/QR/receipt paths only when the separate migration/configuration rollout is approved and ready.

Private logs and source snapshots are under `/private/tmp/nom-auto-verification-review/`; none was added to the repo. The working tree is ready for this focused local review, with no ship action performed.
