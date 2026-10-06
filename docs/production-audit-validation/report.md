# Nom production audit and remediation — 2026-10-05

Implementation and automated validation are complete. No deployment was performed. Work was done by the root agent only. The final suite passes **829 tests in 47 files**, plus **56 embedded Python checks**. The production build and both catalog checks pass. All **455 existing asset files** match their pre-edit SHA-256 hashes.

Two qualifications remain: real browser/device visual and motion QA could not run because the in-app browser returned no available browser; and the image provenance inventory identifies a material Harira license mismatch. This report does not claim visual sign-off or public-release rights for all images.

## 1. Files changed

There are 66 modified tracked files and 21 new implementation files. The complete path inventory appears at the end of this report and in [implementation-files.json](implementation-files.json). The new evidence files are confined to `docs/production-audit-validation/`. Pre-existing untracked user assets, catalog review outputs and prior audit documents were left intact.

The changes are concentrated in discovery layout, country presentation, shared progress, Profile/Favorites navigation, Surprise deck reconciliation, Nearby permission state, product copy, CSS, metadata and regression tests. Existing server endpoints, shared Google adapters, scoring, reward reducers and image import/fetch scripts have no changes.

## 2. Known audit issue → exact fix

| Phase | Issue | Exact remediation |
|---|---|---|
| 1 | Processed non-Cambodia overview images | `experience.css`: overview image opacity 1 and `filter: none`; removed contrast 1.32/saturation 1.22; preserved `center 22%` crop positions. |
| 2 | Completion reads as an outline | Thin 1px warm-gold edge, 24px soft halo with 7px spread and a 24px check accent; active only for actual complete state. |
| 3 | Low-opacity portraits, white veil, abrupt foundation, clipped corners | Non-Cambodia opacity 1; removed page-wide veil; retained portrait aspect ratio; lower 18% fades into palette sampled from the master’s lower edge; outer country-page radius 0. |
| 4 | Cambodia art shrinks on short screens; non-Cambodia empty composition | Cambodia keeps six large tiles with natural scrolling; non-Cambodia uses compact 3×2 explicitly labelled placeholders and a nearby pack notice. |
| 5 | Static Profile stats; ephemeral Favorite category | Full-card semantic links to the four specified destinations; URL-backed `view=dishes/restaurants/collectibles`; preserves browser Back, other query parameters and origin. |
| 6 | Home banner spacing/colors and incorrect daypart | 12px padding, shared teal tokens, centered icon/copy/CTA; narrow layout moves CTA below copy; timeless “Hello” greeting. |
| 6A | Shared progress alignment collisions | Flow-based shared component with baseline-aligned lifetime labels, evenly spaced markers, separate box slot and wrapping totals. Existing presentation values and math retained. |
| 7 | Flat match panel/generic explanation | 1.5s one-shot teal sweep; two bounded sparkle animations; static reduced motion; flavor-only fallback names actual earned preferences. |
| 8 | “See all”/arrow offset hacks | A wrapping flex heading row with centered alignment, fixed gap, 44px action and consistent 14×12 arrow; removed independent vertical offsets. |
| 8A | Selected Region check overlaps text | Persistent 38px top-right indicator slot and matching button padding in both states. |
| 9 | Render-time deck mutation and promotion instability | Pure slot projection plus guarded layout-effect reconciliation; stable occurrence keys, sorted DOM order and four pre-mounted occurrences; retained image sources during promotion. |
| 10 | Weak chewing | Active upper/lower jaws ±11°, 360ms cycle; original body, swipe logic, masks and rest/reduced-motion behavior preserved. |
| 11 | First-time prompt stays idle | First automatic prompt is claimed once per tab session; search waits for successful geolocation; granted/denied paths remain distinct; cache behavior retained. |
| 12 | Quota error uses generic provider copy | `QUOTA_LIMIT`: “Nearby search is busy right now. Try again in a minute.” No retry loop/quota increase. |
| 13 | Development copy and dead-end Home Scan | DEV gates for diagnostics; production copy cleanups; Home Scan replaced with working Explore; `/scan` explains upcoming camera support and retains working dish codes. |
| 14 | Fixed discovery frames/absolute CTA | Questions, option groups and CTA now in flex/grid flow; reference spacing retained, minimum page heights allow short-screen scrolling. |
| 15 | Important supporting text too small | Targeted 12px floor for progress, recent activity, notices, Nearby facts/credits, feedback, country counts and recommendation descriptions/refine help. Chips and decorative micro-labels preserved. |
| 16 | Fake OS chrome in production | `StatusBar` defaults to an empty safe-area spacer in production; fake chrome remains available in DEV or explicit design preview. |
| 17 | 1.4–1.6MB PNGs used as thumbnails | Seven 400px card WebPs and seven 941px portrait WebPs, quality 88; original masters retained. |
| 18 | Missing public metadata | Existing Ziggy art supplies favicon, touch icon and square social preview; description, theme, OG and Twitter metadata added using the existing Vercel domain. |
| 19 | Hardcoded collectible capacity | `collectionCountries.length * collectibleDefinitions.length`, currently 8×6=48. |
| 20 | Unverified release provenance | Per-dish 201-record inventory; source-page checks for two real photos; explicit Harira mismatch and generated-record evidence gaps. No food asset or credit-record edits. |

## 3. Collection card and background changes

Overview cards use separate optimized thumbnail URLs. The 77px art region keeps its existing crop; source colors receive no additional processing. The metadata band grows from 51px to 63px, making room for readable 12px counts, with card height increasing from 128px to 140px.

Country details use dedicated portrait assets instead of the overview thumbnail. Their 941:1672 aspect ratio remains intact. A mask blends the lower edge into a country-specific foundation sampled from the bottom 24 master-image rows. This continuation remains behind growing content rather than exposing an abrupt unrelated color block. Local translucent title/placeholder/notice surfaces provide readable copy. Cambodia’s artwork and existing background opacity remain unchanged.

Automated checks establish URLs, styles and structure. They cannot establish the perceived smoothness of the foundation blend or indistinguishable compression quality.

## 4. Completed-country treatment

The state is derived from existing unlocked counts. A complete card receives the thin warm-gold edge, larger static halo and an accessible “Country complete” check accent. The art itself has no completion filter. An incomplete Cambodia card has no accent; a completed 6/6 card does. No breathing animation was added, so completion remains static with reduced motion as well.

## 5. Country detail content layout

Cambodia retains six slots, its original character assets, title, next-box and lifetime progress. Tile height is `clamp(160px,43cqw,190px)` rather than shrinking with viewport height. Mascot width is approximately 115–144px for those tiles. The progress card follows the grid by 16px; a ready-box action remains at least 44px tall. Short phones scroll.

Other countries show six compact placeholders in three columns. The notice says the pack is coming soon and that progress is saved; tile labels and accessible names explicitly identify placeholders. Existing seeded unlock/progress data is preserved. Collectible detail copy also calls out the missing country-specific art. No new characters or unlocks were fabricated.

## 6. Progress-card consistency

Home, Progress and Country Collection render the same `CountryProgressCard` with the same existing presentation model. The title/note use normal flow; markers share one responsive track; the box occupies a fixed separate slot; lifetime label and rank share a baseline; totals wrap instead of overlapping. Primary fill uses the existing primary-teal token, with a thinner secondary lifetime bar in the existing yellow token.

The component computes rendered widths from existing fill/track ratios. The underlying reward reducer, presentation utility, seed meals, thresholds, completion rules and persistence format are unchanged. A regression compares the same state’s markup across all three destinations.

## 7. Profile and Favorites navigation

The four summary cards are semantic links with full-card hit areas, visible focus rings and tiny hover/press affordances:

| Stat | Destination |
|---|---|
| Dishes explored | `/history?view=views` |
| Meals logged | `/history?view=meals` |
| Countries explored | `/progress` |
| Saved dishes | `/favorites?view=dishes` |

Favorites reads the three supported categories from the URL and defaults to Dishes for missing/invalid values. Category changes preserve unrelated query parameters and the return origin, and add usable browser history. Restaurant/collectible detail return paths retain their category. History filter changes also preserve the Profile origin. Tests exercise link focus, click-through, return, category reload and browser Back. Saved data formats remain unchanged.

## 8. Region Surprise check

The selected indicator lives in an always-mounted 38px right-hand slot. That space is reserved whether selected or not. The check is independent of the title/subtitle and image; toggling selection retains the text node. The title/copy spacing now uses its intrinsic width. The selection behavior, yellow card identity and artwork are preserved. Pixel-level collision checks at 390px and browser text scaling remain manual QA.

## 9. Why This Matched

The existing earned-dimension checks remain authoritative. Canonical dish names, scored flavor attributes and exact-match conditions are retained. The generic flavor-only fallback now says, for example, that the actual Spicy + Comforting choices contribute to the match. It does not infer “strongest match” or invent a matched dimension.

The glass treatment receives a low-opacity teal sweep lasting 1500ms once on entry. Two small sparkles animate twice at 1600ms/1900ms with a slight delay, then settle. Reduced motion removes those animations. Existing reasoning tests cover missed dimensions, partial adventure scores and skipped/Surprise preferences.

## 10. Surprise stack implementation

The deck has four occurrence slots: front A, rear B, queued C and hidden buffer D. D is mounted before it is needed. During a left exit, B transforms toward front, C toward rear and D toward queued. When the draw commits, the same B/C/D articles and images remain mounted; a new hidden occurrence is allocated. Keys are monotonically numbered occurrences, so tiny two-item pools can safely contain repeated dish IDs in different slots. Sorting by occurrence key preserves DOM order through promotion.

Reconciliation is a pure projection during rendering, followed by guarded `useLayoutEffect` state reconciliation. This keeps image sources paired with their slots even in the first intermediate commit and removes render-time setters. Motion uses transform and opacity, with the original subtle front tilt and peeking rear. The queue’s only change is permitting `peek(...,2)`; candidate eligibility, weighted sampling, scoring and history navigation are unchanged.

Tests cover 12 consecutive left swipes with 2, 3 and 12 candidates, stable article/image identities, unchanged retained image `src` attributes, matching promotion poses, Undo and retained button focus. Existing page/utility tests cover ten swipes, right action, repeated launches, preference resets, reduced motion, cancel and deterministic recommendation order. Real compositor behavior, decoded-image readiness and absence of a device-visible blink still need browser/device QA.

## 11. I Ate Here chewing

Only the two jaw keyframes and cycle duration changed: upper +11°, lower −11°, 360ms. They animate only on the existing `is-eating` state. Gesture thresholds (including 85% confirmation), progressive phrase masking, moving gold warmth, keyboard/button equivalents, repeat/cancel behavior and body position are unchanged. Existing gesture tests and the new CSS regression pass. Reduced motion shows the original resting mascot. Actual visual cuteness and jaw alignment remain manual QA.

## 12. Nearby location permission behavior

An eligible opened dish without a usable cached result handles permission as follows:

| Permission/state | Behavior |
|---|---|
| Already granted | Acquire location and load using the existing search safeguards. |
| Prompt, no prior attempt in tab | Claim the attempt, request geolocation once, wait for success, then search. |
| User denies / already denied | Friendly denied state; no Places request. |
| Prompt dismissed/times out | Location error on the first dish; later automatic mounts do not prompt again. The deliberate search button remains available. |
| Permissions API unavailable | One first-time geolocation attempt; successful in-memory grants may be reused. |
| Valid cached result | Reuse cache; current-area revalidation recalculates distances locally without silently repeating Places search. |

A boolean `nom.nearby.location-prompt-attempted` in session storage survives app reloads in the same tab. It stores no coordinates. Existing ephemeral location state, rounded search-area transport, cache, distance filtering, dedupe and explicit-refresh controls are preserved. The Privacy route explains the prompt/boolean storage behavior. Tests cover first acceptance, deferred geolocation, denial, concurrent dishes, dismissal, reload, existing grants and cache use. No exact user coordinates were logged or displayed.

## 13. Quota / 429 behavior

`QUOTA_LIMIT` has distinct friendly copy without quota counts, raw provider failures or credentials. Existing explicit retry controls remain; no automatic error retry loop was introduced. Max two sequential Text Searches, server limits and daily/minute safeguards remain untouched. Photos/reviews retain their independent safe fallbacks. Tests use injected/mock transport; **zero billable Google requests** were made. Current production quota availability was not probed.

## 14. Production copy removed or gated

Collections preview diagnostics and Explore catalog-review notices are DEV-only. Image Credits gates review status, import implementation notes and historical-source diagnostics behind DEV while retaining creators/source/license links. Profile/Progress use plain local/starter-data disclosures. Experience Logged explains device storage. Scan says camera support is coming soon and retains working dish-link/code entry. Home’s primary quick action now leads to Explore.

Legacy restaurant fixtures cannot render their Figma-example detail screen in production; the route offers refresh/current-result guidance instead. Saved legacy entries are labelled “Saved preview; not a live restaurant result.” Real Google restaurant details remain available. Visit Verification no longer presents sample distances or measured dwell times as facts: its rows explicitly describe preview checks and no measured duration. Feedback says it is saved on this device and does not change current matches; the modal title no longer claims personalization.

Menu-unconfirmed notices, Google attribution, approximate-distance disclosures, Terms/Privacy links, local-storage limitations and simulated QR/receipt wording remain. Build checks confirm the known gated route phrases do not appear in generated JS. The unchanged raw credit JSON can still contain historical internal metadata in its lazy-loaded chunk; it is not displayed as product copy and is not asserted to be purged from shipped data.

## 15. Responsive layout and final consistency sweep

Discovery retains the current assets, options and visual hierarchy. Status spacing and the relative header remain, but question/support/options/CTA follow document flow. Pages use minimum heights, flex/grid, flexible gaps, safe-area bottom padding and 44px-or-larger controls. CTA order is tested after the options. The 440×956 reference spacing is represented in CSS; actual visual parity is unverified. Region’s existing longer content remains scrollable.

Home’s mystery CTA gets a separate row at widths ≤390px. Progress totals wrap. Feedback reaction labels can wrap at 12px. Nearby preview/list text, photo credits and fallbacks use readable supporting sizes. More Options keeps its hierarchy, seven rows and regional divider behavior; only its 10px refine-help text and shared 11px dish descriptions increase to 12px. SessionChip is untouched. Fixed bottom navigation and the corresponding Home/Collections/hub padding now include bottom safe areas.

The read-only-first source sweep used the requested category order. No raster/browser findings are implied by this source review:

| Order | Audit category | Finding/action |
|---|---|---|
| 1 | Spacing and margins | Removed known country dead-space/shrink pressure, progress absolute rows and Nearby manual offsets; retained other established layouts. |
| 2 | Typography hierarchy/minimum sizes | Targeted supporting-copy floor; kept title hierarchy, SessionChip and decorative labels. |
| 3 | Color/token consistency | Raw country colors; existing primary/accessibility teal for banner and progress; no new theme. |
| 4 | Repeated components | Shared progress and stat links; common safe-area status/nav strategy. |
| 5 | Selected/saved/completed/disabled | Reserved Region check slot; actual completion accent; retained heart, reaction and disabled-contact behavior. |
| 6 | Responsive behavior | Discovery flow and narrow banner/placeholder/progress layouts; real viewport QA outstanding. |
| 7 | Motion/transitions | Bounded match glow, stable Surprise occurrences, active-only chew, static reduced motion. |
| 8 | Keyboard/focus/accessibility | Semantic full-card stat links; retained global focus, modal focus management and accessible gesture alternatives; small photo/Maps targets corrected. |
| 9 | Loading states | Kept shared route fallback, Nearby skeletons, location-pending state and independent photo/review loading. |
| 10 | Empty states | Kept actionable empty Favorites/History/Explore/Surprise states and honest upcoming packs. |
| 11 | Error states | Distinct quota/permission errors; existing retry/invalid-ID/expired-session fallbacks retained. |
| 12 | Navigation/back behavior | Profile destinations; Favorites URL categories; fixed lost Profile origin in Favorites and History filters; existing detail/list/map origin tests pass. |
| 13 | Product-flow consistency | Working Explore replaces primary camera dead end; preview verification and saved-only feedback described honestly; local persistence/reward journey retained. |

Additional accepted fixes from that sweep are recorded here:

| Route/component | Concrete issue | Fix | Reason |
|---|---|---|---|
| Favorites / History filters | Query updates dropped Profile return state | Preserve `location.state` in URL updates | Broken back navigation after filtering. |
| Verify Visit | Sample location/time appeared measured | Preview/no-measurement rows and disclosure | Product-state mismatch. |
| Feedback / explanation modal | Implied implemented recommendation personalization | Saved-feedback copy; “About your feedback” | Product claim exceeded implementation. |
| Image Credits | Internal review/import/archive notes in product | DEV gate those paragraphs | Production-development artifact. |
| Restaurant detail / saved legacy card | Fixture facts or development wording could appear in production | Guard fixture detail with DEV; honest saved-preview label | Production artifact and misleading live-state risk. |
| Nearby photo/Maps controls | 22–32px source/expand/Maps targets | 44px targets and extra reserved match-copy space; credit links also ≥44px high | Touch accessibility. |
| Fixed nav / scroll content | Missing bottom safe-area reservation | Add inset to nav height and page padding | Browser-chrome overlap risk. |
| More Options/shared dish descriptions | 10–11px supporting copy | Targeted 12px text/line height | Readability issue; card hierarchy retained. |

## 16. Status-bar production strategy

`StatusBar` defaults to fake chrome only in DEV. Production emits an empty `aria-hidden` safe-area spacer. An explicit `preview` prop supports design previews; production route call sites do not enable it. The spacer reserves `max(63.376px, env(safe-area-inset-top))`, preserving current header geometry instead of abruptly removing 63px. Existing Home/FlowHeader/back spacing stays intact. Fixed navigation includes bottom safe-area spacing. Tests verify the production spacer has no child OS elements, and explicit preview still shows the clock/icons. Device inset behavior remains manual QA.

## 17. Country image sizes

Exact byte counts; reductions compare each derivative with its original master. Card derivatives are 400px wide; portrait derivatives keep the 941px master width. Both use quality-88 WebP. All seven PNGs remain unchanged.

| Country | Original PNG bytes | Card WebP bytes | Card reduction | Portrait WebP bytes | Portrait reduction |
|---|---:|---:|---:|---:|---:|
| China | 1,522,560 | 22,692 | 98.51% | 76,986 | 94.94% |
| Colombia | 1,525,403 | 30,208 | 98.02% | 95,450 | 93.74% |
| France | 1,585,585 | 26,996 | 98.30% | 89,248 | 94.37% |
| India | 1,499,227 | 23,644 | 98.42% | 79,058 | 94.73% |
| Italy | 1,506,713 | 24,442 | 98.38% | 84,166 | 94.41% |
| Japan | 1,476,213 | 23,208 | 98.43% | 75,568 | 94.88% |
| United States | 1,426,766 | 25,928 | 98.18% | 83,242 | 94.17% |
| Total | 10,542,467 | 177,118 | 98.32% | 583,718 | 94.46% |

Overview runtime references load thumbnails, not PNG portraits. Build inspection confirms 14 country WebPs and no country PNG master in `dist/assets`. [country-image-sizes.json](country-image-sizes.json) includes sampled foundation colors. The optimization script is separate from the protected food image pipeline.

## 18. Public metadata

Added a 64×64 PNG favicon, 180×180 Apple touch icon and 600×600 social preview, resized from the existing Ziggy PNG. Added primary-teal theme color, meta description, Open Graph type/title/description/url/image/dimensions/alt and Twitter summary/title/description/image. URLs use `https://nom-coral.vercel.app/`; no domain was invented. All three assets exist in the production output. Their live social-crawler rendering and cache refresh remain unverified until a separately authorized deployment.

## 19. Image provenance and license inventory

The inventory covers all 201 current runtime entries. Categories overlap:

| Category | Count | Evidence/limit |
|---|---:|---|
| Generated asset | 199 | Catalog identifies generated photographic illustrations. |
| Source confirmed | 2 | Current source pages for Ramen and Harira were opened. |
| Recorded license confirmed against current source | 1 | Ramen’s recorded CC BY-SA 3.0 matches the source page. |
| Creator/source metadata present | 2 | Both real-photo records include creator, source and license fields. |
| Source/license or generation-rights evidence needs verification | 200 | Harira mismatch plus 199 generated records with incomplete generation evidence. |

All 199 generated records contain a requested prompt and import timestamp, but none records the actual prompt used, tool, model or creation timestamp. They are labelled illustrations, not documentary restaurant evidence. This absence does not establish that use is prohibited; it prevents this audit from confirming applicable generation terms/ownership and release rights. Recover evidence for the generation batch rather than guessing a license.

Ramen: [Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:Soy_ramen.jpg) confirms Lusheeta at Japanese Wikipedia and CC BY-SA 3.0. Matching source metadata is not a blanket clearance; applicable attribution/share-alike conditions must be satisfied.

Harira: the [Flickr source](https://www.flickr.com/photos/199745331@N06/53525181373) confirms Axel Freeman, but its license link currently resolves to [CC BY-NC-ND 2.0](https://creativecommons.org/licenses/by-nc-nd/2.0/deed.en), whereas Nom records CC BY 2.0. Treat release rights as unresolved. Recover original acquisition/license evidence or obtain appropriate permission before relying on the recorded grant. This pass does not adjudicate historical licensing or automatically relabel/replace the protected asset.

Ten historical source entries remain in archived credit histories and are separate from current runtime-photo evidence. The raw `dishImageCredits.json` is unchanged. [image-provenance-inventory.json](image-provenance-inventory.json) contains a record and reason for every dish. No food image was regenerated, replaced or deleted.

## 20. Tests run and totals

| Check | Result |
|---|---|
| Baseline `npm test` | 46 files / 790 tests passing; embedded Python 40+16 passing. |
| Final focused UI/deck/flow suite | 6 files / 104 tests passing. |
| Final `npm test` | **47 files / 829 tests passing**; embedded Python **40+16 checks passing**. |
| `npm run catalog:check` | 201 records valid, exact spreadsheet order checked. |
| `npm run catalog:validate` through build | 201 unique dishes valid. |
| `git diff --check` | Passed. |
| SHA-256 preservation check | 455/455 existing assets unchanged; seven protected core files unchanged; only allowed lookahead guard change in eighth file. |
| Production output check | Correct icon dimensions, 14 runtime country WebPs, zero country PNG masters, known DEV route phrases absent. |

Final regressions cover Profile links, URL category reload/Back/origin, country raw colors/full opacity/no corner clipping, completed accent, derived totals, shared progress markup, discovery CTA order, Region indicator structure, first prompt/granted/denied/once-per-session/reload behavior, quota copy, Surprise repeated swipes/Undo/tiny pools/source continuity, production copy/status behavior and reduced-motion CSS. Existing gesture/recommendation/catalog/Google provider/dedupe/cache/photo/review/map tests remain passing.

Legacy manual-search fixtures explicitly suppress automatic prompting so they continue to test their intended manual paths. First-time automatic behavior is tested separately with real state/hook logic and injected transport. No tests contact live billable Google services. Earlier implementation logs are retained as an audit trail; the final logs are the authoritative validation result: [final-focused-tests.log](final-focused-tests.log), [final-tests.log](final-tests.log), [final-build.log](final-build.log), [final-catalog-check.log](final-catalog-check.log).

## 21. Build result

`npm run build` passes with catalog validation and Vite production output. There are no build failures or reported warnings. Existing lazy route boundaries remain. Known gated route diagnostics are absent from production JS. The entry JS is approximately 281.53kB (86.13kB gzip); the Image Credits lazy chunk remains relatively large because it imports the full existing provenance JSON, approximately 394.11kB (42.48kB gzip). No architecture rewrite or metadata migration was introduced to reduce that separate route’s data.

## 22. Protected assets and semantics

[protected-results.json](protected-results.json) records all baseline paths and results. All 455 original asset files—including current food images, archived/incoming assets present at the start, Cambodia character/background artwork, country PNG masters, icons and mascots—are byte-identical. Added assets are only the 14 country derivatives and three brand metadata icons.

Catalog records/taxonomy, canonical dish mappings, food image imports/credits, recommendation scoring and the reward state reducer are byte-identical. SessionChip is unchanged. Collection seed values, six collectible definitions and box target are retained; only country image references/foundation metadata change. The Surprise session file differs only in permitting one extra preview offset. Eligibility and weighted draw logic are unchanged and tested against seeded draw order.

Server/shared Google code and key separation are unchanged: server-only Places key, separate browser Maps key and map ID architecture; existing max-two sequential searches, rate safeguards, cache, dedupe, distance bounds and attribution all remain. Local favorites/activity/experience persistence schemas are unchanged. No auth, database, social feature or quota increase was added.

## 23. Manual visual and motion QA still required

The browser skill was loaded, but obtaining a local browser failed and its browser list returned `[]`. No browser screenshot or production-device interaction was available. Source/DOM tests are not a substitute for rendered visual, frame-by-frame motion, native location-prompt or assistive-technology QA. The following routes were included in the source sweep; **all remain pending rendered QA** at ≤390px and ~440px, short and tall viewports, reduced motion and keyboard navigation:

| Target | Route / interaction | Manual focus |
|---|---|---|
| Welcome | `/` | Artwork crop, scroll access to entry buttons/nav. |
| Home | `/home` | Timeless greeting, header spacing, narrow mystery banner, bottom inset. |
| Food Type | `/discover/food-type` | Reference appearance, enlarged text, scroll/CTA spacing. |
| Flavor | `/discover/flavor` | Wrapped choices, selection, CTA spacing. |
| Adventure | `/discover/adventure` | List copy/art balance, scrolling and focus. |
| Region | `/discover/region` | Selected Surprise indicator at narrow width; full option/CTA access. |
| Recommendations | `/recommendations` | 3 Top Matches, title/photo hierarchy, unchanged chip wrapping. |
| Surprise Me | `/recommendations/surprise` | 10+ left swipes, right select, Undo, 2/3-item pools, launches/reset; GPU/image continuity. |
| More Options | `/recommendations/more` | Seven matches, regional divider, 12px supporting copy. |
| Dish Detail | `/recommendations/:dishId` | Long names, Why panel entry/reduced motion, Nearby heading/arrow/chips. |
| Nearby List | `/recommendations/nearby`, `/recommendations/:dishId/nearby` | Native first prompt/grant/deny, loading/empty/429 states, copy wrapping, attribution. |
| Nearby Map | Same route, Map selection | Real Maps rendering, selected pin/list synchronization, keyboard and back. |
| Restaurant Detail | `/recommendations/:dishId/nearby/:restaurantId` | Real Google facts/photos/reviews/credits, contact states, long content, detail return. |
| I Ate Here | Restaurant swipe/button | ±11° jaw alignment, 360ms rhythm, masking/warmth, release/cancel/keyboard/static motion. |
| Visit Verification | `/visits/:visitId/verify` | Honest preview disclosure, alternatives, duplicate-day modal and focus. |
| Meal Feedback | `/visits/:visitId/feedback` | Reaction label wrapping, note, button disabled state, explanation modal. |
| Experience Logged | `/visits/:visitId/logged` | Hero/progress/ready-box composition and Home return. |
| Profile | `/profile` | Full-card links, visible focus/press, destinations and return paths. |
| Favorites | `/favorites?view=…` | Three categories, saved states, reload/browser Back and empty actions. |
| History | `/history?view=…` | Views/meals/all, long activity rows and Profile return after filtering. |
| Progress | `/progress` | Next-box hierarchy, lifetime baseline/markers, wrapping and source-derived totals. |
| Collections | `/collections` | Raw pastel crops, larger complete halo/check, filters and bottom inset. |
| Cambodia Collection | `/collections/cambodia` | Six valuable mascots, natural progress placement, short-screen scroll. |
| Non-Cambodia Collection | `/collections/:countryId` | All seven portrait blends, upcoming placeholders, no white veil/corner clipping. |
| Mystery Box | `/boxes/:boxId`, `/opening`, `/reveal` suffixes | Tap/open/reveal/collection return and reduced-motion states. |
| Collectible Details | `/collections/:countryId/:collectibleId` | Cambodia art, honest other-country placeholder, save/back/locked states. |
| Explore | `/explore` including query/trending/log modes | Search/filter flow, empty states, no internal notices. |
| Scan | `/scan` | Coming-soon camera copy, working dish code/link handling. |
| Privacy | `/privacy` | Readable disclosures, optional location use and policy links. |
| Terms | `/terms` | Availability disclaimer and policy links. |
| Image Credits | `/image-credits` | Source/creator links, no visible internal import/review notes. |
| Fallbacks | Unknown route/invalid dish, restaurant, visit, box, collection IDs | Friendly recovery, expired unfinished visit behavior, keyboard focus. |

Also verify real safe-area insets/browser chrome, font scaling, screen-reader announcements, 44px touch targets and perceived WebP quality. Test quota UX with mocks or controlled safe responses; this audit did not authorize extra billable live probes. Metadata’s live crawler behavior is also pending. These are explicit validation limits, not asserted passes.

## 24. Deliberately unchanged

- Food catalog/images and raw credits: protected by instruction; Harira’s mismatch is inventoried for evidence-based follow-up instead of guessed relabeling or replacement.
- Generated-image rights metadata: actual generation tool/model/creation records cannot be inferred from requested prompts/import times.
- Cambodia art/background treatment, country seeds, box/reward math, favorites/history schemas and scoring/ranking/regions: preservation requirements.
- SessionChip and established recommendation/More Options hierarchy: already good; supporting text changes address concrete readability only.
- Real verification/auth/database/social/camera implementation: outside this pass. Verification and QR/receipt checks remain honestly described previews; camera scanning remains upcoming.
- Google credentials, quotas, providers and current Maps/API architecture: no changes needed; retained safeguards and attribution.
- Additional global animation or completion breathing: omitted because the static completion state communicates the achievement without continuous distraction.
- Unrelated route layout redesigns and earlier user audit artifacts: no concrete reason to change them.
- Live production site: not deployed or altered by this pass. Visual/device sign-off and the identified license evidence are outstanding before calling the release fully verified.

## Complete implementation path inventory

The following inventory is generated from the final diff and the explicitly added implementation files. Validation logs and inventory JSONs live beside this report.

Modified tracked files:

- `index.html`
- `src/App.test.jsx`
- `src/components/discovery/DiscoveryHeader.jsx`
- `src/components/discovery/ListOption.jsx`
- `src/components/discovery/OptionCard.jsx`
- `src/components/discovery/OptionRow.jsx`
- `src/components/discovery/RegionCard.jsx`
- `src/components/discovery/SurpriseRegionCard.jsx`
- `src/components/experience/EdgeStateModal.jsx`
- `src/components/layout/HubLayout.jsx`
- `src/components/layout/NomNavigation.jsx`
- `src/components/layout/StatusBar.jsx`
- `src/components/recommendations/BestMatchCard.jsx`
- `src/components/recommendations/SurpriseDishCard.jsx`
- `src/components/recommendations/SurpriseDishCard.test.jsx`
- `src/components/recommendations/WhyMatchedCard.jsx`
- `src/components/restaurants/RestaurantFacts.jsx`
- `src/components/ui/CountryProgressCard.jsx`
- `src/data/collectionDefinitions.js`
- `src/data/nearbyRestaurantService.js`
- `src/data/restaurantSearchState.js`
- `src/data/restaurantSearchState.test.js`
- `src/hooks/useRestaurants.test.jsx`
- `src/pages/Adventure.jsx`
- `src/pages/AppDestinations.test.jsx`
- `src/pages/CollectibleDetails.jsx`
- `src/pages/Collections.jsx`
- `src/pages/CountryCollection.jsx`
- `src/pages/DishDetails.jsx`
- `src/pages/ExperienceFlow.test.jsx`
- `src/pages/ExperienceLogged.jsx`
- `src/pages/Explore.jsx`
- `src/pages/Favorites.jsx`
- `src/pages/Flavor.jsx`
- `src/pages/FoodType.jsx`
- `src/pages/History.jsx`
- `src/pages/Home.jsx`
- `src/pages/ImageCredits.jsx`
- `src/pages/LiveNearbyRestaurants.test.jsx`
- `src/pages/MealFeedback.jsx`
- `src/pages/MoreOptions.jsx`
- `src/pages/NearbyPhase2.test.jsx`
- `src/pages/NearbyRestaurants.jsx`
- `src/pages/NearbyRestaurants.test.jsx`
- `src/pages/PlacesPolicy.jsx`
- `src/pages/Profile.jsx`
- `src/pages/Progress.jsx`
- `src/pages/Region.jsx`
- `src/pages/RestaurantDetails.jsx`
- `src/pages/Scan.jsx`
- `src/pages/SurpriseMe.jsx`
- `src/pages/SurpriseMe.test.jsx`
- `src/pages/VerifyVisit.jsx`
- `src/pages/VisualStatePolish.test.jsx`
- `src/styles/experience.css`
- `src/styles/global.css`
- `src/styles/hubs.css`
- `src/styles/nearby.css`
- `src/styles/recommendations.css`
- `src/styles/restaurant-live.css`
- `src/styles/surprise.css`
- `src/test/mockNearbyProvider.js`
- `src/utils/countryScene.js`
- `src/utils/surpriseSession.js`
- `src/utils/surpriseSession.test.js`
- `src/utils/whyMatched.js`

New implementation files:

- `public/apple-touch-icon.png`
- `public/nom-icon.png`
- `public/nom-preview.png`
- `scripts/optimize-country-art.py`
- `src/assets/experience/country-backgrounds/china-card.webp`
- `src/assets/experience/country-backgrounds/china-portrait.webp`
- `src/assets/experience/country-backgrounds/colombia-card.webp`
- `src/assets/experience/country-backgrounds/colombia-portrait.webp`
- `src/assets/experience/country-backgrounds/france-card.webp`
- `src/assets/experience/country-backgrounds/france-portrait.webp`
- `src/assets/experience/country-backgrounds/india-card.webp`
- `src/assets/experience/country-backgrounds/india-portrait.webp`
- `src/assets/experience/country-backgrounds/italy-card.webp`
- `src/assets/experience/country-backgrounds/italy-portrait.webp`
- `src/assets/experience/country-backgrounds/japan-card.webp`
- `src/assets/experience/country-backgrounds/japan-portrait.webp`
- `src/assets/experience/country-backgrounds/united-states-card.webp`
- `src/assets/experience/country-backgrounds/united-states-portrait.webp`
- `src/pages/ProductionAudit.test.jsx`
- `src/styles/discovery.css`
- `src/styles/progress.css`
