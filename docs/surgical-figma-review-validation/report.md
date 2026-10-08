# Surgical Figma review fixes — 2026-10-07

## Scope and preservation — PASS

Started from the CURRENT restored working tree, not from HEAD. Before this pass: HEAD/main `c13329e86e89b17dfcf78b2815557b37ce04703c`, 54 modified tracked files, 69 new files (123 pending files), zero staged files. Captured hashes of all 824 nonignored tracked/untracked files and the real Git index in `/private/tmp/nom-surgical-ui-review/baseline.json` before editing.

This pass changes 19 files that already existed in the working tree and adds one test file and this report (21 files total). No starting files were removed. All 805 other baseline files remain byte-identical. HEAD and the real index remain identical. Existing edits in the affected files were retained while applying the requested corrections.

The restored Home, Discovery questionnaire, Surprise Me deck, navigation, I Ate Here interaction, Mystery Box artwork/audio, Collections, account architecture, server verification implementation, reward reducer/rules, database migrations, and 201-dish dataset remain byte-identical to the starting tree. Restaurant Details retains its established structure and actions; only the requested favorite glyph and friend/share action changed. Shared experience CSS edits are confined to verification, logged completion and verification-method options.

No staging, commit, push, deployment, branch switch, reset, restore, stash, migration application, or remote Supabase/Vercel operation occurred. Only the read-only npm security audit used external network access. No credentials or environment values are recorded here.

## Exact files changed in this pass

### Existing files modified

- `src/components/experience/EdgeStateModal.jsx`
- `src/components/restaurants/LiveRestaurantDetails.jsx`
- `src/components/restaurants/PlacePhoto.test.jsx`
- `src/components/restaurants/RestaurantActions.jsx`
- `src/pages/DiscoveryCompatibility.test.jsx`
- `src/pages/ExperienceFlow.test.jsx`
- `src/pages/ExperienceLogged.jsx`
- `src/pages/ExperiencePlayground.test.jsx`
- `src/pages/LiveNearbyRestaurants.test.jsx`
- `src/pages/NearbyPhase2.test.jsx`
- `src/pages/OvernightNavigation.test.jsx`
- `src/pages/RestaurantDetails.jsx`
- `src/pages/VerifyVisit.jsx`
- `src/pages/VisitVerification.test.jsx`
- `src/styles/experience.css`
- `src/styles/nearby.css`
- `src/utils/matchCompatibility.test.js`
- `src/utils/whyMatched.js`
- `src/utils/whyMatched.test.js`

### New files

- `src/pages/SurgicalUiReview.test.jsx`
- `docs/surgical-figma-review-validation/report.md`

## Requested behavior

| Item | Result | Change / evidence |
| --- | --- | --- |
| Why this matched | PASS | Removed compatible-point totals, explicit-preference arithmetic, percentages, rounding and scoring jargon from the explanation. Uses only actual matching food/flavor/adventure/region selections. Existing compatibility badges and recommendation engine are unchanged. |
| Neutral explanation | PASS | No active selections produce “Lort Cha is a dish worth discovering. Explore it for something new.” No invented preference or popularity claim. Existing random Surprise Me neutral paragraph remains unchanged. |
| Compact restaurant photo expand | PASS | Kept the 44×44 px button target; only compact photos now use a 26×26 px visible overlay with a 14 px icon. Uses existing surface/text contrast tokens. Full-size photo overlays, image/card structure, credits, expansion and focus restoration remain intact. |
| Detail favorite heart | PASS | Live and development restaurant detail header glyphs changed from 37 to 27.75 px (25% reduction). Existing 44 px target, favorite state/toggle, surrounding header and ellipsis are retained. Other hearts/stars are unchanged. |
| Send to a friend | PASS | Both live and development restaurant actions reuse the existing share helper: native Web Share on gesture, clipboard fallback, and manual copying if unavailable. Shares restaurant name, “Try [name] with Nom” and the current Nom restaurant deep link, including selected Place ID/dish context. Cancelled native sharing does not copy automatically. QA sharing remains explicitly simulated and isolated. |
| Verification-method modal | PASS | Always shows Location, Restaurant QR, Receipt and a separate Log without verification action, with existing Nom artwork/cards. Taller scoped sheet allows the complete choices to scroll on short screens. No method is hidden or disabled merely because configuration is absent. |
| Location | PASS (controlled tests) | Explicit selection/retry only. Retry remains available after failure. When signed location verification is unavailable, a method-specific unavailable state appears and no GPS or verification request occurs. Signed results alone enable Continue. No dwell duration is claimed. |
| Restaurant QR | PASS (controlled tests) | Visible even when trusted issuance is unavailable. Selection shows an honest unavailable state; no camera or fabricated success. Existing configured scanner/verification path is retained. |
| Receipt | PASS (controlled tests) | Visible even without OCR readiness. Selection shows an honest unavailable state; upload remains disabled, with no processing request. Existing configured upload/processing/signed-result behavior passes tests. |
| Verify Visit hierarchy | PASS (structure); visual review pending | Back/overflow, centered title/restaurant, actual restaurant-location context, three stacked method/distance/verification cards, privacy, alternate actions and Continue. Context uses the selected restaurant/address and a key-free Google Maps link when available. It deliberately does not present the old unrelated mock map as the selected restaurant’s actual map. Distance is shown only from an accepted location proof; QR/receipt do not claim location/dwell tracking. |
| Experience Logged spacing | PASS (structure); visual review pending | Original celebration/background/box artwork retained. Navigation precedes artwork in normal flow; artwork reserves a responsive 240–302 px height and the title has a separate 24 px gap. Supporting copy stays below the title. Both verification states use this composition and retain Back to Home. |
| Verified completion | PASS (controlled tests) | Valid signed proof (or the existing isolated QA-only proof) plus actual earnedProgress gates the country/progress presentation. A box is shown only if earned and present in the journey with the correct visit owner. Same-day verified repeat shows history success and no additional progress; existing totals remain intact. |
| Unverified completion | PASS | Shows history success, dish context, “Logged without verification” and “This meal doesn’t count toward country or Mystery Box progress.” No progress card, unlocked box, reward claim or state mutation. Tests also reject forged proof/misleading earned/box flags. |

Example explanation before: “55 compatible points plus 45 explicit-preference points give 100% compatibility (rounded).”

After: the explanation names only matched choices, e.g. “Lort Cha matches comforting flavors for a cozy, satisfying meal. It also fits your noodles craving, your adventurous preference, and Southeast Asian cuisine.” Missed flavors/regions are not presented as matches. Skipped/open dimensions add no numeric prose. The entire canonical catalog is checked for forbidden scoring language.

## Validation

| Check | Status | Evidence |
| --- | --- | --- |
| Focused tests | PASS | Initial corrected focused set: 188 assertions across 10 files; full suite subsequently includes the added photo/heart guards. |
| Full Vitest suite | PASS | 1,224 tests, 72 files. Includes existing account, Guest, sync, navigation, reward, server verification, database/RLS and isolated QA coverage. |
| Python suite | PASS | 74 tests. Test importer output describes controlled test fixtures, not real catalog downloads/changes. |
| Catalog validation / workbook consistency | PASS | 201 unique canonical dishes; all 201 spreadsheet records match. |
| Production-mode build | PASS | `VERCEL_ENV=production VITE_NOM_DESIGN_PREVIEW=true VITE_ENABLE_REWARD_QA=true npm run build`; existing production safeguards suppress QA despite those requested build flags. No deployment performed. |
| Source/client credential boundary | PASS | Account secret validator passes for source and generated dist; no privileged browser env/references/embedded keys. |
| Dependency graph | PASS | `npm ls --all`, exit 0. |
| Dependency security | PASS | `npm audit --json`: zero vulnerabilities. |
| React/accessibility review | PASS | Derived display eligibility, no new effects/dependencies/remote services, native sharing begins on the click gesture, 44 px targets retained, method buttons remain actionable, status updates announce via existing live region, text can wrap. |
| Git whitespace | PASS | `git diff --check`, including new patch files checked separately. |
| Ship packaging dry-run | PASS | Uses a disposable index copy and dry-run operations only. Does not stage in the real index, commit or push. |
| Preservation | PASS | Baseline hashes, HEAD/index identity and zero removals verified after all work. |
| Actual responsive browser checks | BLOCKED | Browser runtime reports “No browser is available”; discovery list is empty. DOM/computed-style tests protect flow ordering, reserved art space, clear title gap, touch/glyph dimensions and interactions. They cannot certify rendered geometry/no horizontal overflow. |
| Exact Figma visual parity | BLOCKED | Latest attachment provides written instructions only; no Figma image/file/URL was supplied. Existing Nom artwork and the requested hierarchy were used. No pixel-perfect parity or screenshot comparison is claimed. |
| Live verification backend readiness | Separate pending rollout | This pass does not configure providers, apply the existing verification migration or test real restaurant evidence. Unavailable UI is intentional when capabilities are absent. |

Private command logs: `/private/tmp/nom-surgical-ui-review/`. No scripts, screenshots, logs or disposable artifacts from that directory were added to the repository.

## Remaining local manual review

At **360, 375, 390, 430 and 440 px**, check the Why this matched prose wrapping, nearby carousel and smaller photo overlay, favorite heart/unchanged ellipsis, location context and status stack, complete method chooser, Logged illustration/title spacing and bottom CTA visibility. Verify no horizontal overflow and natural vertical scrolling. These widths remain unverified by a real browser.

On a device supporting native sharing, use Send to a friend and verify the selected restaurant deep link opens correctly. Also inspect clipboard/manual fallback. Exercise location denial/retry, unavailable QR/receipt messaging, manual history completion and the verified/earned result in the existing isolated QA playground. Real signed verification remains dependent on the separate approved backend rollout.

Nothing was shipped. The local tree is ready for this focused human review.
