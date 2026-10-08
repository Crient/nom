# Discovery fidelity, compatibility scoring and experience QA

Implemented locally with one root agent against `c7b834ce27c17d7e9c1825f096c4cf350caab837`. No deployment, authentication/Supabase implementation, Vercel setting changes or live Google request was made. Existing unrelated untracked work was preserved.

**Region composition and scrolling**

All eight normal regions now form the original vertical tile composition in a two-column, four-row grid. Each tile centers its existing 80px illustration above its centered, single-line title and centered country examples. The existing white rounded surface, shadow, selected border and approximately 23px upper-right check remain. Country examples reserve two lines so neighboring cards have equal heights. Cards use 12px vertical padding, 4px internal gaps, a 156px minimum and intrinsic content height (approximately 166px with the two-line subtitle reservation). Rows are separated by 16px. Title size retains the original 18px/17.5px cap and scales modestly with screen width, rather than viewport height; long titles do not wrap beside the artwork.

The question's original line break is restored. Surprise Me remains a distinct full-width card after the grid, with its 80px world illustration on the left and title/subtitle on the right, a 92px minimum and the existing reserved right-side selection slot. Its component, artwork and selection behavior are unchanged.

Region intentionally scrolls on smaller phones because the full illustrations, comfortable tile proportions, gaps, header and Continue exceed the viewport. Continue stays after the options in document flow with its real safe-area clearance. Food Type, Flavor and Adventure keep their existing hierarchy and responsive minimums; they can also scroll on short screens or with larger text. No horizontal Region mini-card or height-triggered compressed mode remains.

This restores the requested reference hierarchy using the existing canonical components/artwork. No pixel-level comparison with a rendered Figma reference or native Safari screenshot is claimed.

**Ranking and displayed compatibility**

`rankingScore` remains explicit evidence: base weights Food 35, Flavor 30, Adventure 20, Region 15 are normalized over active explicit dimensions. Food/region exact matches earn their dimension weight; flavors split their weight equally among selected `preferenceFlavors`; adventure factors remain 1, 0.6 and 0.2 for zero, one and two levels of distance. Descriptors never earn points. Anything and Surprise answers contribute no ranking evidence. Existing explicit-region candidate tiers, the 70-point Anything regional priority threshold, and the 40-point More Options relevance threshold remain intact.

`displayMatchPercent` uses the same base weights, normalized over answered dimensions. Intentional Anything/Surprise answers earn their full compatibility weight; explicit answers use the same exact/partial factors. An absent optional region is still excluded, rather than receiving open-answer credit. Visible badges round the computed sum to a whole percentage. `displayBreakdown` records each available/earned weight and marks open compatibility separately from exact matches. The old `score` property remains a ranking alias for older callers/fixtures; selection uses `rankingScore`, and all badge surfaces use `displayMatchPercent`.

For Anything + Spicy + Comforting + Adventure Surprise + Region Surprise:

| Dish | Food compatibility | Flavor evidence | Adventure compatibility | Region compatibility | Display | Ranking |
|---|---:|---:|---:|---:|---:|---:|
| Nasi Goreng | 35 | 30 (both flavors) | 20 | 15 | 100% | 100 |
| Lort Cha | 35 | 15 (comforting only) | 20 | 15 | 85% | 50 |
| Mie Goreng | 35 | 15 (spicy only) | 20 | 15 | 85% | 50 |

Why This Matched retains the honest explicit-evidence explanation and appends the compatibility accounting: 70 compatible points plus 30/15 explicit-preference points. Partial matches are never described as matching both flavors. Genuine ties retain equal percentages. Top cards, More Options, Dish Details and the Nearby badge read the same candidate-specific display percentage.

**Session variation and swipe preservation**

Final Region Continue creates one random seed in Discovery context memory. It is excluded from persisted answers. Surprise-enabled recommendations use that seed for identity-based weighted draws without replacement within equal-relevance tiers. Country and adventure repetition penalties operate together when those dimensions are open. Better explicit evidence always precedes weaker evidence; explicit-region priority still applies. No duplicate dish enters the result list, and catalog order does not dominate Surprise ties. Explicit sessions retain their deterministic catalog tie order.

Rerenders, Dish Detail navigation and More Options reuse the same seed. A new completed session can vary tied candidates. Restored answers use a fixed stable seed until discovery is completed again, so refresh neither introduces flicker nor falls back to spreadsheet ordering. The score audit recorded 20 distinct Top Match orders across 20 seeds. A uniquely stronger match can remain first: Nasi Goreng is the sole both-flavor match in this example and retains first place while the tied partial matches vary.

`surpriseSession.js` keeps its weighted queue, undo/forward history, stable three-card lookahead, cycle behavior and avoidance of immediate repeats. Its relevance calculations now explicitly prefer `rankingScore`, retaining the legacy fallback for old fixtures. A newly completed discovery seed starts a fresh ephemeral swipe context. No learned preference model, meal-feedback personalization or durable behavioral history is used.

**Experience flow playground**

Flag-enabled Preview/local builds provide `/dev/experience`, linked from **Profile → Developer tools → Experience flow playground**. The exact visible notice is **“Test mode — does not change your Nom progress.”** The existing `/dev/rewards` playground remains available through the same flag.

The new playground exposes labeled entry buttons for:

- Mock Restaurant Detail (Lort Cha at THMOR DA Restaurant).
- I Ate Here animation and start visit, using the actual swipe mascot/control, button alternative, keyboard confirmation and reduced-motion behavior.
- Verify Your Visit and successful location-demo verification.
- Manual/unverified path.
- Verification failed modal, including the existing QR/receipt/unverified alternatives.
- Already-counted-today fixture, whose Continue triggers the actual counted modal.
- Meal Feedback.
- Experience Logged with earned progress.
- Experience Logged with no extra progress.
- Mystery Box unlocked, including opening/reveal through the actual reward screen.
- Reset/close test preview.

Shared Restaurant Detail, verification, feedback and logged screens run under an isolated memory-only Experience provider, favorite provider and navigation/fixture context. The pure domain reducer runs against fresh local fixture state. Actions cannot navigate into real visit/box routes; unsupported restaurant actions show a simulated notice. Restaurant lookup exits before its provider call in this scope. Restaurant images and the illustrated map are local assets. There is no Text Search, Details, Photos, Maps, location acquisition or other network request in this QA journey.

Test meals, feedback, favorites, country progress, boxes and collectible grants exist only in the preview. Leaving, reset or reload discards them. Discovery answers and the real Experience state are never changed by QA actions. Box sound toggles in this playground are also memory-only; the existing Reward Playground's sound-preference behavior is preserved.

**Production gate and protected behavior**

The same build-time `VITE_ENABLE_REWARD_QA=true` flag controls both QA routes. The unchanged `VERCEL_ENV=production` Vite override forcibly compiles it false, even when the flag is deliberately supplied as true. Default and guarded Production builds register neither QA route, contain neither playground chunk, and compile Profile's QA guard false. A flagged Preview build includes both routes/chunks and a true Profile guard with `DEV=false`. Query parameters and localStorage cannot enable QA. Guarded Production application artifacts are byte-identical to the default build (excluding Finder metadata).

Normal Production mock restaurants remain blocked. Only the flag-gated playground supplies the mock scope. Nearby production provider behavior is unchanged. The 30/day and 6/minute Text Search protections and all server/API code are unchanged. Reward grant/state logic, serialization keys/schemas, catalog data, assets, safe-area/Search/navigation styles, audio files and reveal timing helpers were preserved.

**Validation results**

- Full suite: **859 tests across 51 files passed**, including existing reward, swipe, restaurant and persistence regressions. [Log](full-tests.log).
- Default production build: passed. [Log](production-build.log).
- QA Preview build: passed. [Log](qa-preview-build.log).
- Deliberately flagged QA Production build: passed; both QA features forcibly absent. [Log](qa-production-build.log), [compiled gate checks](qa-build-checks.json).
- Catalog import check and validation: **201 unique dishes**, spreadsheet order retained. [Import check](catalog-check.log), [validation](catalog-validation.log).
- Compatibility audit: **9,648 candidate breakdowns** checked for finite/bounded percentages and agreement with earned points; exact 100/85/85 example and 20 seeded orders recorded. [Evidence](score-evidence.json).
- **677 protected tracked files are byte-identical** to the before-pass/source baseline, including supplemental catalog/build inputs verified against the starting clean HEAD. No protected-file differences. [Hashes/results](protected-results.json).
- `git diff --check`: passed.
- QA tests mounted the real app with `DEV=false`, asserted that both `fetch` and restaurant lookup were never called, and compared all localStorage values before/after full flows, favorites, sound toggles, box reveal, reset, leaving and reload. Existing Reward Playground tests continue to pass.
- Browser runtime returned no browser and an empty session list; browser screenshots, rendered geometry and native Safari/audio verification remain outstanding.

**Files changed**

32 implementation/test files: 27 modified and 5 new. [Machine-readable manifest](changed-files.json). Validation artifacts are separate in this directory.

- `src/components/discovery/RegionCard.jsx`
- `src/components/recommendations/BestMatchCard.jsx`
- `src/components/recommendations/DishDetailHero.jsx`
- `src/components/recommendations/RecommendationCard.jsx`
- `src/context/DiscoverySession.jsx`
- `src/context/Favorites.jsx`
- `src/hooks/useDiscoveryNavigation.js`
- `src/hooks/useRestaurant.js`
- `src/pages/DishDetails.test.jsx`
- `src/pages/ExperienceLogged.jsx`
- `src/pages/MealFeedback.jsx`
- `src/pages/MobileAcceptance.test.jsx`
- `src/pages/MoreOptions.test.jsx`
- `src/pages/NearbyRestaurants.jsx`
- `src/pages/Profile.jsx`
- `src/pages/RecommendationIdentity.test.jsx`
- `src/pages/RestaurantDetails.jsx`
- `src/pages/SurpriseBox.jsx`
- `src/pages/VerifyVisit.jsx`
- `src/routes.jsx`
- `src/styles/discovery.css`
- `src/utils/moreOptions.test.js`
- `src/utils/recommendationAudit.test.js`
- `src/utils/recommendationEngine.js`
- `src/utils/surpriseSession.js`
- `src/utils/whyMatched.js`
- `src/utils/whyMatched.test.js`
- `src/context/ExperienceFlow.jsx` — new
- `src/pages/DiscoveryCompatibility.test.jsx` — new
- `src/pages/ExperiencePlayground.jsx` — new
- `src/pages/ExperiencePlayground.test.jsx` — new
- `src/utils/matchCompatibility.test.js` — new

**Remaining iPhone Safari QA**

At normal 100% page zoom, check all eight Region illustrations, centered single-line titles, country-example wrapping, equal card heights, selected checks and the special world card at 320/375/390/430px widths. Check natural vertical scrolling and bottom safe-area/Continue access with browser toolbars expanded/collapsed and larger text. Confirm Food/Flavor/Adventure hierarchy remains comfortable.

Check the 100/85/85 compatibility example in Dish Details, stable Top Matches through navigation and changed tied candidates after a newly completed Surprise discovery. A uniquely stronger candidate may remain first.

On a flagged Preview, enter Profile → Experience flow playground and run every direct state plus a complete animated visit. Check swipe dragging/cancellation, button/keyboard confirmation, reduced motion, failed/manual/counted modals, feedback, earned/no-progress logs and unlocked box reveal/audio. Leave/reload and confirm real history, favorites, progress and discovery answers are unchanged. Recheck the existing Reward Playground and ordinary production screens after deployment by the owner.
