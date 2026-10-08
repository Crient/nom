# Nom engineering onboarding and Supabase handoff — October 6, 2026

This report audits the working checkout, not just committed HEAD. No application code, dependencies, migrations, assets, credentials, Git staging, remote data, or deployment settings were changed. The production build regenerated ignored `dist/` files. Temporary diagnostic fixtures were created outside the repository and removed. This report is the only new repository artifact from the audit.

Evidence labels:

- **[CONFIRMED]** Observed in source, local Git, command output, or an executed diagnostic. This does not imply a remote service was exercised.
- **[PRODUCT INTENT]** Requested in the onboarding document or expressed in the design/product material.
- **[INFERENCE]** A reconstruction that the available evidence supports without proving it.
- **UNKNOWN** Used for live configuration, deployed schema, and behavior that could not be verified.

## 1. Executive summary

**[CONFIRMED]** Nom is an existing mobile-first, dish-first food discovery application built with React, Vite, Tailwind, and React Router. It has a 201-dish catalog, a working four-question recommendation journey, Top 3 plus 7 More Options, dish details, Google Places/Maps integration code, favorites, history, meal feedback, progression, country collections, and animated rewards. The current checkout passes **936 Vitest tests in 56 files** and builds successfully.

**[CONFIRMED]** The Supabase work is substantial and **uncommitted**. Its scope is optional authentication and account persistence. It does not migrate the food catalog into a database or change the recommendation engine to query Supabase. The main app already routes its four persisted state providers through an identity-scoped journey store and cloud repository. Favorites and history are not waiting for their initial frontend wiring.

**[CONFIRMED]** The 25 new account-related files contain **1,750 lines**, closely matching the reported approximately 1,800 lines. They implement auth, account caches, an offline mutation queue, explicit Guest merge consent, row adapters, seven account tables, account screens, account deletion, and tests. Related edits to existing files add provider wiring, environment handling, dependency/build changes, and reward replay support.

**[CONFIRMED]** Supabase browser and server credentials are absent from the local development and production environment. Accounts therefore run as an optional, disabled capability in this checkout. No Supabase connector, CLI, PostgreSQL client, or Docker executable was available. The migration's remote application status, Auth provider settings, and actual database isolation are **UNKNOWN**.

The specific findings that remain despite green tests are:

1. **High:** two simultaneous offline stores for one account can overwrite pending changes in the shared account cache; reproduced locally.
2. **High:** the credential scanner skips `dist/assets`, including Vite's compiled browser JavaScript; reproduced with a synthetic secret.
3. **High:** `npm run ship` would omit the new, untracked `supabase/` directory.
4. **Medium:** even local-only discovery updates trigger full cloud hydration when signed in; reproduced with an injected repository.

**[INFERENCE]** The previous engineer stopped after source implementation, frontend wiring, and mocked validation, but before live database validation/configuration and a complete committed handoff. The exact last file edited and the reason for stopping cannot be proved from Git.

## 2. Current repository state

| Item | Observed value |
|---|---|
| Repository | `/Users/leng/Projects/nom` |
| Branch | `main`, tracking `origin/main` |
| HEAD | `c7b834ce27c17d7e9c1825f096c4cf350caab837` |
| HEAD subject/date | `Add safe Nom ship workflow`, October 5, 2026 |
| Local HEAD versus local origin/main ref | 0 ahead, 0 behind; no fetch was performed |
| Initial tracked changes | 44 modified files |
| Initial untracked files | 44 with `--untracked-files=all` |
| Staged changes | None |
| Tracked diff | 445 additions, 202 deletions across 44 files |
| Tracked file count | 716 |
| Applicable AGENTS.md | None found in repository or inspected ancestor paths |

**[CONFIRMED]** No history exists for `supabase/`, `src/lib/supabaseClient.js`, or `src/data/syncEngine.js` in available Git refs. Their implementation is in untracked files. The dirty tracked diff also includes earlier discovery/scoring/QA work; the complete diff must not be attributed to Supabase.

Six core catalog/image files were compared byte-for-byte with HEAD and match: `records.json`, `taxonomy.json`, `catalog/images/manifest.json`, `dishImages.js`, `dishImageAssets.js`, and `dishImageCredits.json`.

Recent commits, newest first: `c7b834c` ship workflow; `813d31b` discovery spacing/reward QA access; `fa08c00` mobile production polish; `11fec23` production audit/remediation; `ae2eb6f` product-polish merge; `5b95aa3` restaurant discovery/collections/product polish.

## 3. Development timeline

**[CONFIRMED]** Git provides this progression:

| Date | Commits | Result |
|---|---|---|
| Oct 2 | `7e83121`, `756ecf5`, `76508b1` | Scaffold, design tokens, Welcome, Home |
| Oct 2 | `7fc07ea`, `acad8e7`, `2ccc341`, `2c44f52`, `7e37eac` | Food Type, shared answers, Flavor, Adventure, Region |
| Oct 2 | `8c5fd73`, `5fcf03a`, `547695f` | Catalog/engine, preference-flavor versus descriptor separation, Dish Matches |
| Oct 2 | `0938719`, `27b8403`, `66e32a5`, `849fa90` | Favorites, More Options, Dish Details, layout/accessibility/routing stabilization |
| Oct 3 | `f4e92d6`, `df96fd5` | V1 consolidation and destinations/navigation |
| Oct 3 | `7d72823`, `e16b7a5` | Regional recommendation fixes and finalized behavior |
| Oct 5 | `5b95aa3`, `ae2eb6f` | Restaurant discovery and larger progression/collection journey |
| Oct 5 | `11fec23`, `fa08c00`, `813d31b` | Production audit, mobile polish, discovery/reward QA follow-up |
| Oct 5 | `c7b834c` | Ship script and ignore rules |
| After HEAD, uncommitted | Existing [scoring/experience report](../figma-scoring-experience-validation/report.md) | Compatibility percentages, seeded Surprise variation, vertical Region layout, isolated experience playground; report records 859 tests/51 files |
| Current working tree | Account files and provider edits | Optional Supabase account architecture; present suite is 936 tests/56 files |

The onboarding's approximately 29-test and 402-test figures are historical context, not the present baseline. The prior production audit records 829 tests/47 files; later local scoring work records 859/51. The current suite exceeds the user's 402-test milestone by 534 tests.

## 4. Repository architecture

| Area | Responsibility and primary evidence |
|---|---|
| [`src/main.jsx`](../../src/main.jsx) | `createRoot`, StrictMode, global CSS |
| [`src/App.jsx`](../../src/App.jsx) | BrowserRouter, AuthProvider, readiness boundary, per-identity store remount |
| [`src/routes.jsx`](../../src/routes.jsx) | Central route registry; lazy results, restaurants, accounts, and rewards |
| `src/components/layout/` | 440px mobile shell, route focus/scroll, shared navigation, loading fallback |
| `src/pages/` | Discovery, dish/restaurant journey, account screens, hubs, collections, QA previews |
| `src/context/` | DiscoverySession, Favorites, Activity, Experience, Auth, LocalData; separate preview contexts |
| `src/data/catalog/` | Generated canonical records, frozen taxonomy, structural validation |
| `src/utils/recommendationEngine.js` | Pure scoring, tie handling, region priority, More Options selection |
| `src/data/syncEngine.js`, `cloudState.js`, `cloudRepository.js` | Local cache/outbox, domain-row adapters, Supabase transport |
| `src/lib/supabaseClient.js` | Optional SDK initialization, configuration restrictions, PKCE storage |
| `src/data/restaurant*`, `nearbyRestaurantService.js`, `placeExtrasService.js` | Search state/cache, provider seam, media/details lifecycle |
| `shared/` | Secret-free query rules, distance/dedupe, Maps/media validation, safe errors |
| `server/` and `api/` | Google adapters, request validation/budgets, Vercel wrappers, caller account deletion |
| `supabase/` | One accounts migration and one rollback-based SQL validation script |
| `src/assets/`, `public/` | Optimized food/country/mascot imagery, icons, public metadata/audio |
| `catalog/`, `scripts/` | Spreadsheet source, importer/validation, image provenance and review workflow |
| `docs/` | Historical decisions and validation reports; some older reports describe superseded states |

**[CONFIRMED]** This is JavaScript/JSX, not a TypeScript codebase. There are no generated database TypeScript types or `tsconfig` files. Runtime normalizers and tests currently provide the data-contract checks.

Initialization: `main` → `App` → `AuthProvider` → `JourneyBoundary` → `ScopedJourney` → `LocalDataProvider` → DiscoverySession/Favorites/Experience/Activity → routes → `RootLayout`/Suspense/`AppShell`. Callback and password-reset routes bypass `ScopedJourney` so a PKCE exchange can survive the Guest-to-user transition. Normal account switches key-remount the journey by user ID.

## 5. Current user flow

**[CONFIRMED]** These routes are registered in the working tree. Persistence is detailed in section 14. Lazy pages share `RootLayout`'s `Loading Nom…` status fallback. Catalog recommendations have no database loading phase.

| Screen / route | Component, input/state → output | Backend, errors/loading/recovery |
|---|---|---|
| Welcome `/` | `Welcome`; start or optional sign-in → Home/Account | Auth readiness boundary; Guest usable without configuration |
| Home `/home` | `Home`; display name, recent views/logs, seed-plus-earned progress; search and four quick actions | No mandatory remote call; links to Explore, Log Meal, Favorites, Progress |
| Food `/discover/food-type` | `FoodType`; one canonical answer → Flavor | Local discovery section; selection-gated Continue |
| Flavor `/discover/flavor` | `Flavor`; one or two of six flavors → Adventure | Local discovery section; max two |
| Adventure `/discover/adventure` | `Adventure`; familiar/different/adventurous/Surprise → Region | Local discovery section; selection-gated Continue |
| Region `/discover/region` | `Region`; optional region or Surprise; selected tile toggles off; finish creates memory seed | Continue supports skipping region; destination preserves a selected dish/restaurant return |
| Top Matches `/recommendations` | `Recommendations`; complete required answers → first three results | Incomplete answers redirect to Food; `surpriseMode` can render Surprise experience |
| More `/recommendations/more` | `MoreOptions`; regional/global extra seven; favorites | Incomplete answers redirect; no remote recommendation query |
| Surprise `/recommendations/surprise` | `SurpriseMe`; ephemeral weighted deck, skip/undo/select | Missing answers redirect; no durable impression/skip log |
| Dish `/recommendations/:dishId` | `DishDetails`; ranked candidate, catalog description, explanation, view record, save and nearby | Missing answers redirect with return destination; unknown dish redirects; location/search states, skeletons, retry/refresh, partial results |
| Nearby `/recommendations/:dishId/nearby` | `NearbyRestaurants`; selected dish, list/map, sorting/rating/open filters | Live provider seam; location/loading/error/empty/metadata-only states; explicit refresh |
| Compatibility nearby `/recommendations/nearby` | Same nearby screen resolves a dish from ranking | Compatibility alias, not a separate discovery architecture |
| Restaurant `/recommendations/:dishId/nearby/:restaurantId` | `RestaurantDetails`; Google venue → `LiveRestaurantDetails`; save/contact/map/meal start | Loading/retry/not-found; saved ID-only venue asks for refresh; fixture detail is DEV/QA-only |
| Verify `/visits/:visitId/verify` | `VerifyVisit`; draft → simulated verification or manual unverified path | Restaurant lookup loading/error; completed visits redirect; missing draft explains refresh expiration |
| Feedback `/visits/:visitId/feedback` | `MealFeedback`; reaction, observations, note → completed meal | Requires verification; completed visits redirect; missing restaurant/draft recovery |
| Logged `/visits/:visitId/logged` | `ExperienceLogged`; completed log, derived credit/box → Home or box | Missing log redirects to proper prior step; saved venue names may be generic after reload |
| Box `/boxes/:boxId` | `SurpriseBox`; ready box → opening → reveal | Invalid boxes use recovery states; guarded reducer grants once |
| Opening/reveal `/boxes/:boxId/opening`, `/reveal` | Same component with phase prop; motion/sound/reduced-motion timing | Events persist opening outcome; transient animation is not a remote state table |
| Collections `/collections` | `Collections`; country filters, unlocked counts, art → country | Static definitions plus derived experience state; no catalog query |
| Country `/collections/:countryId` | `CountryCollection`; six slots, progress, pending box | Invalid country recovery; other-country art is explicitly placeholder |
| Collectible `/collections/:countryId/:collectibleId` | `CollectibleDetails`; unlocked item, rarity, favorite, cultural art | Invalid/locked states recover; country-specific content is strongest for Cambodia |
| Progress `/progress` | `Progress`; activity totals, country progress, next box | Derived from views/logs and starter state, no separate progress table |
| Profile `/profile` | `Profile`; name, identity, linked stats, preferences, sync status | Guest/account copy, editable name, Account link, Retry/Refresh status |
| Favorites `/favorites?view=…` | `Favorites`; dishes/restaurants/collectibles tabs from URL | Catalog lookup for dishes; restaurant ID-only fallbacks; empty states |
| History `/history?view=…` | `History`; latest unique dish views plus completed meals | Empty state; not a history of recommendation sessions |
| Explore `/explore` | `Explore`; text/food-type search; `action=log`; local/account meal trends | All 201 local catalog rows available; empty/filter states; no global popularity service |
| Scan `/scan` | `Scan`; pasted Nom link/canonical code → dish | Camera is coming soon; invalid-code feedback; route exists, Home has no Scan quick action |
| Account `/account` | `Account`; OAuth/email signup/signin/reset; signed-in settings | Disabled when unconfigured; busy/error states; optional deletion capability check |
| Callback `/auth/callback` | `AuthCallback`; one-time code → sanitized return route | Missing/expired/exchange-error copy; callback code removed from address |
| Password `/account/reset-password` | `ResetPassword`; PKCE code, matching passwords → update | Code validation and errors; survives auth transition; no reset form from missing link |
| Credits `/image-credits` | `ImageCredits`; source/creator/generated labels | Review diagnostics DEV-only; no credentials |
| Terms/privacy `/terms`, `/privacy` | `PlacesPolicy` | Restaurant/location/storage and account disclosures |
| QA `/dev/rewards`, `/dev/experience` | `RewardPlayground`, `ExperiencePlayground` | Registered only with build flag; forced off for Vercel production; isolated memory/fixtures |
| Unknown route | Catch-all `Navigate` | Returns to `/home` |

The main journey is fully represented in reachable routes. Its verification portion is a deliberate preview; route completeness is not proof of live verification.

## 6. Design implementation

**[CONFIRMED]** Figma MCP successfully returned metadata for [Nom's `04 — Final Design` page](https://www.figma.com/design/xVMCeNJV8S3axojtIgtoCr/Untitled?node-id=1-7). Its actual page ID is `1:7`. The page includes Discovery, Recommendations, Restaurant Discovery, Verify & Log, Surprise Box, Collections, and edge states. Relevant frame IDs match the implementation history: `263:4127`, `263:4258`, `263:4426`, `263:4540`, `263:4729`, `263:5531`, `263:4807`, `263:4864`, `263:4936`, `263:5313`, `263:5356`, `263:5398`, `263:5000`, `263:5150`, and `263:5451`.

**[CONFIRMED]** Most frames use 440px width. `AppShell` caps the application at 440px and centers it on wider screens. `tokens.css` preserves Nom's teal/pastel/gold identity and records its Design System provenance. Current actual surface tokens are mostly white/light gray with warm surfaces in some contexts; the onboarding's general cream description is not an exact assertion about every screen.

Current source preserves vertical, two-column Region tiles and a separate full-width Surprise tile. Shared discovery CSS uses flex/grid, intrinsic minimums, normal-flow Continue, and bottom safe-area padding. Minimum heights on other screens still reflect Figma compositions. Mobile screens can scroll rather than shrinking every element to fit.

**UNKNOWN:** pixel fidelity, perceived clipping/overflow, animation smoothness, real mobile browser insets, large-text behavior, and current screenshot-to-screenshot comparisons. Browser setup returned `No browser is available` and discovery returned `[]`. Figma provided a Region screenshot URL, but local download failed DNS resolution; pixels were not inspected. No substitute browser was used. Metadata and code support structural fidelity, not visual sign-off. The Product and Design System pages were not freshly inspected. Account screens have no verified final Figma frame in this audit.

## 7. Data architecture

**[CONFIRMED]** Four distinct data paths exist:

1. **Canonical food:** workbook `Dishes` → Python importer → `src/data/catalog/records.json`/taxonomy → `dishes.js` enrichment → engine/UI. The server reads the same `records.json` to validate dish searches.
2. **Images:** canonical dish ID → reviewed manifest → generated `dishImageAssets.js` → `dishImages.js` → `dishes.js` image; approved/temporary gating and fallback SVG.
3. **Personal journey:** contexts → `usePersistedSection` → journey store → local Guest sections or account cache/outbox → cloud repository → seven Supabase account tables → row adapters/normalizers → same contexts.
4. **Restaurants:** local catalog dish → location/search controller → same-origin server endpoint → Google adapter → normalized session state/media. Durable local storage saves only permitted ID/coordinate/search metadata. Supabase favorites/meal rows contain restaurant IDs, not Google result payloads.

There is one runtime food catalog. The workbook is an authoring source and the JSON a checked import artifact, not two competing runtime catalogs. No Supabase dish loader, remote food seed, or second food table was found.

## 8. Food catalog, identifiers, and imagery

**[CONFIRMED]** There are **201 unique dishes across 58 country codes**. `npm run catalog:check` verifies JSON against workbook order; `catalog:validate` verifies structure. All food records remain `reviewStatus: needs-review`; structural validity does not mean factual/cultural review is complete. Image approval is a separate state.

| Region ID | Count |
|---|---:|
| `southeast-asia` | 29 |
| `east-asia` | 25 |
| `south-asia` | 24 |
| `middle-east` | 25 |
| `africa` | 26 |
| `europe` | 24 |
| `latin-america` | 25 |
| `north-america` | 23 |

Food IDs/counts: `noodle` 34, `rice` 41, `soup-broth` 39, `grilled-protein` 43, `handheld` 44. `anything` is an answer, not a dish category. Preference flavors are `spicy`, `comforting`, `fresh`, `rich`, `crispy`, `tangy`; `savory` belongs to descriptors and is not scored. Adventure levels are 1/2/3, answers familiar/different/adventurous plus `surprise-me`.

Record fields: `id`, `name`, `countryCode`, `region`, `foodType`, `adventureLevel`, `shortDescription`, `description`, `reviewStatus`, `notes`, `validationStatus`, `aliases`, `preferenceFlavors`, `descriptors`, `sourceRow`. `dishes.js` adds country names/flags using `Intl.DisplayNames` and the reviewed image mapping.

Cambodia remains represented by `lort-cha`, `num-banh-chok`, `bai-sach-chrouk`, `kuy-teav`, `fish-amok`, all `KH` and `southeast-asia`. No identifier/content rewrite occurred in this audit or in the account food path.

**[CONFIRMED]** Manifest and catalog ID sets are equal. All 201 manifest entries are image-approved; 199 are generated, two real (`ramen`, `harira`). Every manifest image path exists; there are 201 catalog WebPs totaling **28,938,042 bytes**. Existing original dish imagery remains review evidence and only overrides a catalog image if its approved storage status explicitly allows it. Incoming files are importer inputs, not runtime sources. `Image.jsx` supplies intrinsic dimensions, async decoding, and an SVG error fallback; recommendation-list images are lazy-loaded.

**[CONFIRMED]** Generated entries still lack actual tool/model/creation-time metadata. The previous audit's Harira rights concern remains unresolved in repository metadata: the manifest still records CC BY 2.0. Its prior source-page mismatch is documented in the [production audit](../production-audit-validation/report.md), but this audit did not recheck the live license page or make a new legal conclusion. No image replacement or approval decision was made.

Identifier relationships: dish slugs are shared by routes, catalog, image keys, favorites/views/meal rows. Countries use uppercase two-letter codes in food/meal data and slugs in collections. Collectibles use `country:collectible` keys locally and two columns remotely. Live restaurant IDs are `google:<Place ID>` and route segments are encoded. `box-<visit ID>` is enforced by local replay and SQL. DB dish IDs are format-checked, not foreign-keyed to a nonexistent remote catalog. Frontend normalizers reject unknown catalog IDs.

## 9. Recommendation engine and end-to-end trace

Primary implementation: [`recommendationEngine.js`](../../src/utils/recommendationEngine.js), [`useRecommendations.js`](../../src/hooks/useRecommendations.js), [`DiscoverySession.jsx`](../../src/context/DiscoverySession.jsx), [`whyMatched.js`](../../src/utils/whyMatched.js).

**[CONFIRMED]** Base weights remain food 35, flavor 30, adventure 20, region 15. Food and region earn their full weights on exact match. Selected flavors divide their weight evenly and match only `preferenceFlavors`. Adventure fit is 1, 0.6, or 0.2 for distance zero, one, or two.

Two computed measures now coexist deliberately:

- `rankingScore`: normalizes the weights of active explicit preferences to total 100. Anything and Surprise are excluded. No active dimensions gives zero ranking evidence.
- `displayMatchPercent`: normalizes included explicit/intentional-open dimensions. Anything and Surprise earn their full compatibility weights. Missing optional answers remain excluded. Visible badges round this computed percentage. `score` remains a legacy alias of ranking relevance.

Ordinary ties follow catalog source order. Surprise in region/adventure varies **equal-relevance tiers** using an identity-based seeded draw and country/adventure repetition penalties. Higher relevance is not displaced by weaker evidence within this variation. An explicit selected-region promotion can separately override global score order. The completed-session seed is memory-only; restored answers use `restored-session`. Therefore explicit sessions are deterministic, Surprise sessions are stable for a given seed, and newly completed Surprise sessions can vary.

Selected-region Top 3 rules: for an explicit food type, regional same-food candidates precede regional other-food candidates, up to three; global ranking fills shortages. Anything uses regional candidates scoring at least 70; it does not guarantee three regional cards below that threshold. The remaining global ranking stays intact.

More Options excludes the first three. Without explicit region it takes the next seven. With explicit region it filters relevance at 40, fills shortages using lower-scoring regional then global candidates, groups regional candidates before cross-region candidates, and takes seven. Candidate scores stay attached to their dishes.

**[CONFIRMED]** `whyMatched` reflects actual earned factors and appends explicit/open compatibility accounting where relevant. Static percentage mocks are not used. This is a change from the earlier historical recommendation notes, attributable to the documented uncommitted scoring/QA pass rather than Supabase.

### Representative trace executed during this audit

Selections: Noodle → Comforting + Fresh → Try Something Different → Southeast Asia.

| Stage | Exact participating implementation |
|---|---|
| Click answers | `FoodType.jsx`, `Flavor.jsx`, `Adventure.jsx`, `Region.jsx` invoke DiscoverySession setters |
| Shared state | `DiscoverySessionProvider` → `usePersistedSection('discovery', …)` → `createJourneyStore.update` |
| Persistence normalization | `persistedState.normalizeDiscovery` validates frozen IDs and max two flavors when reading persisted state |
| Finish | `useDiscoveryNavigation.finish` invokes `completeSession`, then navigates to stored discovery return or results |
| Readiness/ranking | `useRecommendations.hasRequiredDiscovery` and `recommend(session, dishes)` |
| Lookup | `dishes.js` imports `catalog/records.json`; no Supabase food query |
| Score/order | `normalizeWeights`, `scoreDish`, normal score/catalog tie order, regional candidate tiers |
| UI | `Recommendations` takes first three; `MoreOptions` uses `selectMoreOptions`; cards read candidate display percentage |
| Detail/view/save | `DishDetails` resolves full ranking, calls `recordDishView`, invokes `whyMatched` and Favorites actions |
| Restaurant | `useRestaurants` → `restaurantSearchState` → `findRestaurantsForDish` → `nearbyRestaurantService.findByDish` → `/api/nearby-restaurants` → handler/provider |
| Query | Canonical Num Banh Chok produces `Num Banh Chok Cambodian restaurant`; optional fallback is `Cambodian restaurant` |

The pure engine was run through Vite's module loader using the current catalog:

| Top result | Food | Flavor | Adventure | Region | Ranking / display |
|---|---:|---:|---:|---:|---:|
| Num Banh Chok | 35 | 30 | 20 | 15 | 100 / 100% |
| Pancit Canton | 35 | 15 | 20 | 15 | 85 / 85% |
| Kolo Mee | 35 | 15 | 20 | 15 | 85 / 85% |

More Options: Pancit Bihon 85%; Lort Cha 77%; Mì Quảng 77%; Cao Lầu 77%; Mie Goreng 70%; Char Kway Teow 70%; Hokkien Mee 70%. These differ from historical examples because the audited selection/catalog/engine state is current. No live restaurant request was issued for this trace.

Tests protecting this contract include `recommendationEngine.test.js`, `recommendationAudit.test.js`, `regionPriority.test.js`, `moreOptions.test.js`, `catalogCompatibility.test.js`, `matchCompatibility.test.js`, `whyMatched.test.js`, and page recommendation identity/compatibility tests.

## 10. Restaurant / map architecture

**[CONFIRMED]** The production provider uses Google's Places API (New) through same-origin Vercel/Node handlers. Vite mounts the same handlers for local development. Mocks require explicit test injection; normal production does not silently substitute fixture restaurants.

`nearbyRestaurantsHandler` validates a canonical dish ID and rounded coordinates, rejects extra fields/oversized JSON, enforces the request marker and same-origin browser checks, shares in-flight jobs, handles cancellation, and emits fixed safe errors. `googlePlacesProvider` builds queries from canonical names and country-to-cuisine labels; it issues one primary Text Search and at most one sequential cuisine fallback when fewer than eight primary results survive normalization. No search pagination or automatic provider retry occurs.

Current constants: 50,000m location bias; **250-mile acceptance cap**; page/result limits 10; results sorted by distance; dedupe by Place ID then normalized nonempty name/address. The 50km bias is not a strict local-result boundary. UI distinguishes Nearby/Extended/Farther distance bands. Match provenance means a search match, not confirmed menu availability.

Per-warm-instance Text Search protection is 6/minute and 30/day. Project-wide settings are not verified here. Places details and photo endpoints have separate counters (details 6/minute, 20/day; photos 10/minute, 30/day). These are code budgets, not proof of Google project quota settings or serverless-global enforcement.

Client search cache: 24-hour TTL, at most 20 dish/rounded-area buckets, version `places-text-v3`. Full results are memory-only; durable storage contains Place IDs, venue coordinates, and Nom metadata, not names/ratings/hours/reviews. Reload shows generic saved-search information until refresh. The old v2 search buckets are discarded. Hours are treated as fresh for five minutes. Extras have independent bounded timeout/quota/fallback state. Details load on explicit selection; media failure does not remove a venue.

Maps: browser-key SDK loader, quarterly channel, Advanced Markers, lazy map activation; map sessions retain at most three instances and update markers/selection. Map failure leaves list navigation available. `RestaurantMap` is the illustrated fixture surface; `LiveRestaurantMap` is the actual Google surface.

Credential names and boundaries: server `GOOGLE_PLACES_API_KEY`; browser `VITE_GOOGLE_MAPS_BROWSER_KEY`; browser map ID `VITE_GOOGLE_MAPS_MAP_ID`. All three are present locally. Exact values were never printed. No direct live Google requests or provider-setting changes were initiated. Deployed endpoint availability, quota availability, and cloud key restrictions remain UNKNOWN.

## 11. User state / persistence and actual reward rules

**[CONFIRMED]** Favorites, Activity, Experience, and DiscoverySession use `usePersistedSection`. In the real app, `LocalDataProvider` supplies one store; standalone component tests/previews intentionally retain local-only fallback behavior.

Guest keys became `nom.v2.guest.discovery`, `.favorites`, `.experience`, `.activity`; legacy `nom.v1.*` bytes are copied once without deletion. Cache envelopes still use payload version 1; the v2 key namespace is an identity-scoping change, not proof of envelope version 2. Corrupt/repaired payloads receive recovery copies; newer envelope versions block downgrade writes.

Account cache key: `nom.v2.user.<id>.cache`, containing serialized journey, pending operations, and Guest-merge decision/fingerprint. Session credentials use `nom.auth.supabase`; PKCE verifier uses a separate SDK key. Only Google provider tokens are stripped; Supabase access/refresh tokens are necessarily retained for session restoration. Return navigation uses sessionStorage `nom.auth.returnTo`.

Cloud synchronization is optimistic and identity-scoped. It loads owned cloud rows, overlays **only unacknowledged mutations**, writes them in dependency order, removes acknowledged operations, and rehydrates. Favorites use active/inactive tombstones; views preserve greatest timestamp; meals/box events insert idempotently. Failed operations stay queued; retries are bounded to 5/20/60 seconds with manual/online/focus retry paths. There is no realtime subscription or multi-tab cache coordination.

Guest merge is explicit: Merge & Sync or account-only. It preserves original Guest bytes, cloud names take precedence over meaningful Guest names, and provider metadata is a fallback. Completed events preserve IDs, local day, and recorded rewards. Discovery answers, unfinished drafts, derived counters, and QA events do not upload.

Reward rules: `BOX_TARGET = 3`; an eligible verified-preview dish earns progress once per local calendar day across restaurants, for one of eight supported collection countries. Every supported-country log increments lifetime meal count; unverified/repeat logs earn no extra credit. A threshold consumes three credits and creates `box-<visit>`. Opening picks the first still-locked collectible, or the first collectible as a duplicate when complete. It is deterministic, not a random reward service.

**[CONFIRMED]** Starter state is still intentional: 27 seeded unlocks across eight countries and 52 seeded lifetime country meals, with no actual logs. Cambodia begins with five unlocks and 2/3 credit; one eligible Cambodian meal can therefore earn the first box. Actual Profile activity totals use views/logs, not seeded country meal totals. Cloud writes persist completed events/openings and user favorites, not starter counters/unlock grants. Hydration replays the same reducer over starter state. No attempt was made to remove the demo seeds.

Unfinished visit drafts are memory-only and disappear on refresh. Animation state and recommendation seeds/decks are memory-only. Reward sound preference stays device-local. Nearby caches/search permission markers are not account tables.

## 12. Supabase database model

Authoritative local schema: [`202610060001_nom_accounts.sql`](../../supabase/migrations/202610060001_nom_accounts.sql). It targets the existing Nom project reference `iwamwxsosrhxsdcsuoiu`. A comment describing an inspected empty project is historical text; this audit did not independently confirm the live project is empty.

**[CONFIRMED]** The migration defines seven tables, not a remote catalog or ML schema:

| Table | Primary key / relationships | Important columns / constraints | Frontend shape and consumers |
|---|---|---|---|
| `profiles` | `id` UUID → `auth.users`, cascade | 1–40 character display name; optional HTTPS avatar ≤2048; created/updated timestamps | Activity name, account identity metadata; Profile/Home |
| `dish_favorites` | `(user_id,dish_id)`; user → auth cascade | Dish slug regex; `is_active`, server `updated_at` | Favorites.dishIds; recommendation/detail saves, Favorites/Profile |
| `restaurant_favorites` | `(user_id,restaurant_id)`; user cascade | Text ID length 1–256; tombstone and timestamp | Favorites.restaurantIds; restaurant saves/Favorites |
| `recent_dish_views` | `(user_id,dish_id)`; user cascade | Dish slug; `viewed_at`; greatest-time RPC/trigger | Activity.recentDishes; Detail writes, Home/History/Profile reads |
| `meal_logs` | `(user_id,id)`; user cascade | IDs exclude QA prefix; dish, restaurant, country code; start/completion/local day; verification method/source/check time; reaction/observations/note; immutable event | Experience.logs; Feedback writes; Logged/History/Progress/Collections replay |
| `opened_boxes` | `(user_id,box_id)`; user cascade; `(user_id,visit_id)` → owned meal | `box_id = 'box-' || visit_id`; eight country/six collectible allowlists; duplicate/open time; immutable event | Experience.boxes/unlocks after replay; SurpriseBox writes; Collections/Favorites |
| `collectible_favorites` | `(user_id,country_id,collectible_id)`; user cascade | Eight-country/six-collectible checks; active flag, server timestamp | Experience.favorites; collectible detail/Favorites |

RLS is enabled on all seven. SELECT and INSERT use `auth.uid()` ownership for every table. UPDATE is allowed only on profiles, mutable favorites, and views, with USING and WITH CHECK. Authenticated event tables have SELECT/INSERT only. There are no client DELETE policies. `public`, `anon`, and `authenticated` table grants are revoked first and selected authenticated grants reissued. Auth-user deletion cascades through all account tables.

Indexes: owner/time for recent views; owner/completed for meals; owner/visit and owner/open-time for boxes; primary-key indexes for ownership/identity. No unused catalog indexes were found.

Functions: `nom_stamp_updated_at` server-stamps mutable rows and preserves profile creation time; `record_nom_dish_view` uses `greatest(existing, incoming)` for an owned upsert; `nom_keep_newest_view` protects direct updates. Functions use invoker security and an empty configured search path. Profile creation is application-driven upsert, not an `auth.users` trigger.

No foods/countries/regions/preferences/recommendations/analytics tables, seed imports, generated types, or Supabase Edge Functions are present. Domain integrity is partly frontend-owned: schema validates formats and ownership, but does not prove a dish exists, a verification occurred, or a collectible was earned. That limitation is consistent with a preview verification flow, but matters for future trusted analytics/rewards.

## 13. Supabase migration status

Statuses refer to inspected source completion. Live completion is explicitly separate.

| Area | Classification | Evidence / limit |
|---|---|---|
| Browser SDK/config | MOSTLY COMPLETE | `supabaseClient.js`; dynamic import; Nom/local allowlist; publishable-key requirement; local variables absent |
| Authentication UI/provider | MOSTLY COMPLETE | Google PKCE, email signup/signin/reset/update, restore/refresh/signout, callback dedupe; mocked tests pass; real provider/redirect settings unknown |
| Seven-table migration | MOSTLY COMPLETE | Full SQL tables/constraints/indexes/RLS; not executed in this audit |
| SQL RLS test script | PARTIAL validation | Isolated fixtures/rollback script exists; not wired into npm tests or executed here |
| Row adapters | COMPLETE for intended account scope | `cloudState.js`, `persistedState.js`; event-only replay with stable rewards |
| Cloud repository | MOSTLY COMPLETE | All seven tables paginated in 500-row pages; session identity check; RPC/upsert writes; transport tests mocked |
| Provider consumers | COMPLETE wiring | App boundary and all four contexts use LocalData; source paths are connected |
| Offline queue | PARTIAL robustness | Durable/coalesced/idempotent operations and retry tests; concurrent offline cache overwrite reproduced |
| Guest migration | MOSTLY COMPLETE | Consent, fingerprint, resume/decline logic and replay tests; no live two-device test |
| Loading/error/retry UX | MOSTLY COMPLETE | Auth readiness, Profile/Account SyncStatus, cached/offline/issue states; no real browser QA |
| Server account client/delete | MOSTLY COMPLETE | Per-request privileged server client; caller verified by `getUser(token)`; admin delete; locally unconfigured |
| Credential validation | BROKEN for compiled assets | Source check works; dist recursion excludes assets; fixture proves false pass |
| Migration packaging | PARTIAL / defective | Ship script stages source/server/API/scripts but not new supabase files |
| Remote project/schema state | UNKNOWN | No live credentials/connector or inspection result |
| Generated DB types | UNUSED / absent | JS project; no generated type artifact or consumer |
| Remote food/seeds/preferences | UNUSED / absent by current scope | No query/consumer/schema; canonical V1 remains local |
| Recommendation/event analytics | PLACEHOLDER product direction | No durable impressions/session/skip/search analytics schema |
| Legacy Guest keys | LEGACY, intentional retention | Preserved compatibility/read-copy path; not a second cloud store |

There is no evidence that the next task should be to migrate foods or invent new tables. The present implementation deliberately excludes that data from account mutations.

## 14. Local versus remote state matrix

**[CONFIRMED]** Account remote rows are implemented but locally disabled until configured; “BOTH” means intended cache-plus-cloud runtime with authentication, not verified current live persistence.

| System | Guest | Signed-in code path | Notes |
|---|---|---|---|
| Food/taxonomy/descriptions | LOCAL ONLY | LOCAL ONLY | Same bundled catalog |
| Dish/country/collectible assets | LOCAL ONLY | LOCAL ONLY | Build assets, not Supabase Storage |
| Discovery answers | LOCAL ONLY | LOCAL ONLY | Identity-specific local cache; no preference table |
| Recommendation ranking, seed/deck | Local computation + memory | Same | No remote personalization |
| Name/profile | LOCAL ONLY | BOTH | `profiles` plus account cache |
| Dish favorites | LOCAL ONLY | BOTH | Active/inactive rows plus local optimistic state |
| Restaurant favorites | LOCAL ONLY | BOTH | IDs only; public venue facts separately cached |
| Latest dish views | LOCAL ONLY | BOTH | One latest timestamp per dish, not every interaction |
| Completed meals/feedback | LOCAL ONLY | BOTH | Immutable source events |
| Visit drafts | Memory only | Memory only | Neither DB nor durable refresh state |
| Progress/lifetime counts | Locally derived | Locally derived from cloud-backed meals + seeds | No competing remote counters |
| Ready boxes | Locally derived | Locally derived from meal chronology | No unopened-box row table |
| Opened boxes/reward choice | LOCAL ONLY | BOTH | Persisted opening event drives replay |
| Unlocked collectibles | Locally derived | Locally derived from openings + seeds | No direct unlock snapshot table |
| Collectible favorites | LOCAL ONLY | BOTH | Actual user favorite relationships |
| Sound preference | LOCAL ONLY | LOCAL ONLY | `rewardSound.js` key `nom.reward-sound.v1` |
| Nearby metadata | LOCAL ONLY/shared device | Same | `nom.nearby.place-metadata.v1`; no user association |
| Full restaurant/media/map state | Memory | Memory | TTL/in-flight/session caches |
| Location prompt marker | Session storage | Session storage | `nom.nearby.location-prompt-attempted`; boolean only |
| Auth session / PKCE | Absent | Local SDK storage + remote Auth | Nom session tokens kept, Google provider tokens stripped |
| Account return destination | Session storage | Session storage | Sanitized internal route |
| Outbox/merge decision | Absent | LOCAL ONLY control data | Per-account cache, not a remote table |
| QA preview data | Memory only | Memory only | Guarded preview providers exclude durable writes |

The personal-data architecture as a whole is **TRANSITIONING operationally**: fully wired optional cloud paths, local-only Guest behavior, and unverified live setup.

## 15. Test results and coverage limits

**[CONFIRMED]** Exact command: `npm test` → exit 0, **56 test files passed, 936 tests passed**, duration 4.45s in the observed run. Embedded Python output also reported 16 + 40 checks passing (56). These are separate Python checks invoked by bridge tests, not extra Vitest test files.

Vitest defaults to Node; UI tests opt into happy-dom and React render/interaction helpers. Categories include app/routes, questionnaire, recommendation identities/compatibility, catalog/image workflow, provider/services/server handlers, permission/quota/media/map state, visits/rewards/collections, accessibility/navigation, and account behavior.

The five added account test files are `src/context/Auth.test.jsx`, `src/data/accountSync.test.js`, `src/pages/AccountFlows.test.jsx`, `server/accountHandler.test.js`, and `server/accountSchema.test.js`. They cover restore races, callback exchange, account switching, sanitized returns, merge consent/idempotence/recovery, offline replay, tombstones, view-time conflict, immutable reward choices, QA isolation, and caller-only account deletion.

**[CONFIRMED]** `accountFixtures.mockSupabase` explicitly identifies itself as a transport mock. `accountSchema.test.js` explicitly identifies itself as static SQL-contract validation. No current passing test establishes executed RLS, real Auth redirects, an actual two-device cloud round trip, production account deletion, or browser rendering. There is no configured coverage report/threshold or browser E2E runner. Tests were not deleted or edited.

## 16. Build, dependency, typecheck, and lint results

| Exact command / check | Result |
|---|---|
| `npm ls --depth=0` | Exit 0; all declared top-level dependencies installed without reported mismatch |
| `npm test` | Exit 0; 936/936 tests, 56/56 files |
| `npm run catalog:check` | Exit 0; 201 rows match workbook in source order |
| `npm run catalog:validate` | Exit 0 as build prerequisite; 201 unique dishes structurally valid |
| `npm run accounts:validate` | Exit 0 as build prerequisite; source/env checks pass, with dist limitation below |
| `npm run build` | Exit 0; catalog check → source credential check → Vite build → `--dist` check; 594 transformed modules |
| `git diff --check` | Exit 0; current tracked diff has no reported whitespace errors |
| `npm run dev -- --host 127.0.0.1` | Starts successfully at localhost:5173; no connected browser for interaction |
| Lint | No lint script/configured lint dependency found; no lint pass claimed |
| Typecheck | No typecheck script/TypeScript config; no typecheck pass claimed |
| PostgreSQL/RLS execution | Not run; `psql`, Supabase CLI, Docker unavailable; no existing live credential/connector |

No install was needed; lockfile is npm's `package-lock.json`. Installed versions include React/React DOM 19.3.0, Router 7.18.4, Vite 8.3.2, Vitest 5.0.3, Supabase JS 2.93.3. These are observed installed versions, not assertions about latest public releases.

Additional independent compiled-output inspection recursively scanned **62 JS/HTML files including `dist/assets`**: zero privileged Supabase secret/service-role literal matches and zero matches for configured server credential values. Values were not printed. This reduces concern about the current local bundle; it does not repair the defective future build guard.

The account SDK is dynamically split; the observed generated SDK chunk is approximately 159.64kB (41.53kB gzip). Entry JS is approximately 306.38kB (94.37kB gzip); lazy Image Credits is approximately 394.11kB (42.48kB gzip). These are build measurements, not measured page load timings.

## 17. Previous audit findings: current verification

| Historical issue | Current evidence / disposition |
|---|---|
| Country filters/opacity/white veil/clipping | Current definitions use card/portrait WebPs and explicit foundation colors; production audit describes removed filters/veil. Existing asset-audit.md describes older PNG use and is superseded. Code/test changes present; perceived quality remains unverified. |
| Cambodia has strongest collectible pack | Still true in source: `CollectibleArtwork` supplies actual character art only for Cambodia; other packs explicitly say coming soon/placeholder. |
| Profile stats not interactive | Resolved in source: four semantic summary links navigate to History/Progress/Favorites; tests pass. |
| Static Why This Matched | Resolved in source: earned-factor explanation plus computed compatibility accounting and tests. |
| Surprise render-time updates | Shared deck uses pure projection plus guarded layout effects; page initializes deck in effects. Tests protect identities/undo/promotion; browser smoothness unknown. |
| Fixed discovery layouts | Main questions/options/Continue are flow-based; current Region restores vertical tiles. Other screens still use Figma minimum heights; real viewport tests pending. |
| Nearby permission/quota/search handling | Source has once-per-tab prompt claim, permission states, cache revalidation, dedicated quota copy, explicit retry, max two Text Searches. Mocked tests pass; live quota/config unknown. |
| Fake OS chrome/development copy | StatusBar renders only safe-area spacer outside DEV by default. Diagnostics are gated; Home removes Scan quick action. QA build flag forced off for Vercel production. |
| Scan and visit verification | Still deliberately partial: pasted dish codes work; camera absent. Verification adapter remains simulated and openly disclosed. |
| Image optimization/provenance | Runtime WebPs and approved mappings are present; generated provenance gaps and unchanged Harira metadata remain. No new external license validation. |

## 18. Duplicated / legacy code

**[CONFIRMED]** Retained compatibility code is mostly intentional:

- `localPersistence.js` + `identityStorage.js` retain legacy bytes and Guest migration, while `syncEngine.js` reuses their envelope/normalizers. They are not two independent active personal-data authorities in the App boundary.
- `usePersistedSection` supports standalone local providers for tests/previews; App has one atomic store.
- `score` aliases ranking relevance, while the real UI uses `displayMatchPercent`. Old test fixtures may still use fallback `score`.
- Mock restaurants, menus, images, illustrated maps, design preview fixtures, and development verification remain isolated fixture/preview functionality. Production restaurant detail rejects mock venues outside the explicit QA scope.
- Original food images and archived provenance remain review inputs; canonical mapping gates which assets render.
- `ExperienceFlow` and preview providers let the QA playground use real screens without real personal-data/Places operations.

Some comments still describe providers as local/session-only even though App now supports account sync. This is stale explanatory text, not proof the code is unused. The older country asset-audit report and older test-count reports must not override present imports/output.

No general TODO/FIXME trail identifies an unfinished food repository or a missing initial favorites/history hook. Abruptness is chiefly uncommitted account files, absent live setup/evidence, and validation/package gaps.

## 19. Broken / partial systems, ranked

No **Critical** code defect was established: current tests/build pass and independent bundle inspection found no actual privileged credential literal. The following priorities distinguish reproduced defects from unknown operation and intentional previews.

### High — offline account-cache overwrite

**[CONFIRMED, reproduced]** [`syncEngine.js`](../../src/data/syncEngine.js) reads a cache once per store and `persist()` rewrites the entire account snapshot/outbox. Two stores sharing one user key have no storage-event subscription or coordination. Diagnostic:

1. Create A and B for the same synthetic account with `online: () => false` and the same in-memory localStorage.
2. A favorites `lort-cha`: A reports one pending operation.
3. B favorites `num-banh-chok`: B reports one pending operation, overwriting A's cache.
4. Create C as a reload: C restores only `num-banh-chok` and one pending operation.

The first tab's in-memory operation still exists while that tab lives; the durable cache no longer contains it. Closing/reloading before upload loses it. This is a data-loss condition, not merely delayed cross-tab UI refresh. Existing two-device/mock tests do not cover this shared-key concurrent case.

### High — compiled credential guard blind spot

**[CONFIRMED, reproduced]** [`validate-account-secrets.mjs:13`](../../scripts/validate-account-secrets.mjs) skips directories named `assets`, including `dist/assets`. Its `--dist` entry uses the same scanner. A temporary fixture containing a synthetic `sb_secret_…` literal under `dist/assets/probe.js` exits 0; the same literal under `dist/probe.js` exits 1. The current bundle independently passed, but the build guard would miss future leaked literals in the normal output location.

### High — migration omitted from shipping workflow

**[CONFIRMED]** [`scripts/ship.sh`](../../scripts/ship.sh) uses `git add -u` and then explicitly stages `src api server shared public scripts`, selected configs, and final reports. It never stages new `supabase/` files. Because the migration and SQL tests are untracked, shipping the current account code with that script would leave its schema outside the commit. The script also commits/pushes without running tests/build itself. It was not run during this audit.

### High — remote integration status unknown

**[CONFIRMED local configuration; UNKNOWN remote behavior]** Local Supabase env variables are absent, and real RLS/Auth/pagination/upsert/deletion have not been exercised. This is an operational validation gap, not proof that the remote project is broken or empty. The migration is not idempotent (`create table`), so inspect actual existing schema/history before any application.

### Medium — remote reads on local-only updates

**[CONFIRMED, reproduced]** `createJourneyStore.update` always schedules synchronization for an account, even when `journeyMutations` yields zero operations. Start plus one discovery-food update yielded two `loadCloudUserState` calls and zero mutations in an injected-repository probe. Each hydration normally upserts the profile and reads all seven tables; draft keystrokes can likewise initiate repeated hydration when no request is already in flight. Coalescing only combines overlapping flights, not successive unnecessary reads.

### Medium — trusted analytics / domain enforcement absent

**[CONFIRMED]** RLS restricts ownership but clients submit verification/reward facts; latest-view rows collapse repeats and no impressions/decision context is retained. This is appropriate to current previews but insufficient for trusted visit proof or unbiased learned ranking data.

### Medium — visual/runtime QA outstanding

**UNKNOWN** Browser/device results. Source/mobile acceptance tests cannot confirm clipping, real Auth redirects, touch gestures, or actual audio/motion on a phone. Historical reports carry the same limit.

### Medium / Low — product/content incompleteness

**[CONFIRMED]** Non-Cambodia character packs and camera scanning are placeholders; factual catalog review and generated provenance remain incomplete. Profile avatar alt text still identifies Ziggy even when rendering an account photo (low accessibility accuracy issue). Some comments/reports are stale. These do not require redesigning the backend during stabilization.

## 20. What the previous account engineer completed

**[CONFIRMED]** New account work comprises 25 files and **1,750 lines** (1,053 non-test/fixture/SQL-test implementation lines; 697 remaining test/fixture lines). Source files alone cannot prove who authored every line, but this is the account-related footprint.

| Group | Files / work |
|---|---|
| Client/Auth | `src/lib/supabaseClient.js`, `src/context/Auth.jsx`; optional config, dynamic SDK, PKCE, token cleanup, events, account methods |
| Identity/persistence | `src/context/LocalData.jsx`, `src/data/identityStorage.js`, `cloudState.js`, `cloudRepository.js`, `syncEngine.js`; scoped caches, outbox, consent/merge/replay |
| UI/navigation | Account, AuthCallback, ResetPassword; GuestMigration, SyncStatus; `account.css`, `accountNavigation.js` |
| Database | Seven-table accounts migration, RPC/triggers/indexes/ownership policies; isolated SQL RLS test script |
| Server/security | `api/account.js`, `server/accountHandler.js`, `scripts/validate-account-secrets.mjs`; caller-verified deletion, credential checks |
| Automated tests | Auth, sync/replay, account routes, handler/schema tests and SDK fixtures |

Related tracked edits already wrap App in auth/local-data boundaries, wire Activity/Favorites/Experience/DiscoverySession to the store, add account routes/profile/welcome entry points, add Supabase dependency and env/build checks, and preserve original reward choices during merge/replay. Existing working tree also contains separate scoring/layout/experience-QA changes from the earlier local report; those should be preserved independently.

## 21. Where the previous engineer stopped

**[INFERENCE]** The stopping point is **integration validation and robustness**, after implementing the account persistence path. There is no evidence that Favorites is still using an unwired old store or that History is missing its basic repository mapping.

Concrete resume locations:

- `src/data/syncEngine.js`: fix concurrent cache/outbox durability and avoid remote hydration for local-only mutations.
- `scripts/validate-account-secrets.mjs`: make compiled-output scanning include Vite asset chunks.
- `scripts/ship.sh`: ensure intended new database artifacts are included before any future commit/push workflow.
- `supabase/migrations/202610060001_nom_accounts.sql` and `supabase/tests/accounts_rls.sql`: execute and verify in an existing authorized isolated database; inspect the existing Nom project's real schema/history before applying anything remotely.
- `src/lib/supabaseClient.js`, `Auth.jsx`, account callback/reset screens, `cloudRepository.js`: enable and exercise real project configuration, Auth redirects, and account round trips after database validation.

Do not replace the store with a new backend layer, add a second catalog, or remove the uncommitted earlier scoring/QA work. The base integration architecture already exists.

## 22. Supabase work remaining

1. Preserve a deliberate checkpoint containing account source **and** migration/tests, separately accounting for prior polish and existing untracked artifacts. No checkpoint was committed by this audit.
2. Repair the shared account-cache/outbox write model in `syncEngine.js`; add an actual concurrent-store offline regression.
3. Repair compiled secret scanning, with an executable fixture covering `dist/assets` and source versus bundle behavior.
4. Avoid full cloud hydration for discovery/draft-only updates while retaining initial hydration, explicit refresh, retry, reconnect, and dirty cloud operations.
5. Execute the SQL RLS script against an inspected, authorized isolated Supabase-compatible PostgreSQL database; validate actual constraints/RPC/upsert grants and account isolation.
6. Read existing project schema/migration history and Auth provider/redirect settings. Apply only a reviewed, compatible migration to the intended existing project when implementation is authorized. Do not assume its comment proves the project remains empty.
7. Configure optional `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` in the intended environment; server deletion separately needs `SUPABASE_SECRET_KEY`. Local inspection found these absent; no values were requested or changed.
8. Exercise real email/Google sign-in, confirmation/reset callback, signout/account switch, Guest merge/decline, offline reload/retry, unfavorite reconciliation, latest views, meal/opened-box replay, and second-device hydration.
9. Exercise caller-only account deletion and cascades against disposable authorized accounts; preserve Guest/other-account caches. Confirm Vercel API packaging without deployment as part of audit.
10. Record actual DB/Auth/integration validation evidence and remote migration status; finish the account handoff documentation. Generated types are optional in this JS architecture, not a reason to rewrite the app.

## 23. Other product work remaining

**[PRODUCT INTENT]** Separate from Supabase stabilization: native/mobile browser QA, non-Cambodia character artwork, camera scanning, real visit verification, factual/cultural catalog review, provenance recovery, and eventually personalization.

**[CONFIRMED]** Real restaurant discovery code already exists. It needs live environment/browser verification, not replacement with invented restaurant facts. Review the 250-mile acceptance behavior against product expectations only as a separate product task. Keep menu availability disclosures and quota boundaries.

Account/profile/persistence comments should be updated once the final behavior is stabilized. Existing Profile interactions and computed Why This Matched are already present. No general UI redesign is recommended.

## 24. ML readiness

**[CONFIRMED]** With accounts configured, useful persistable signals are dish/restaurant/collectible favorite state, latest detail-view time per dish, completed dish/restaurant/country meal events, feedback reaction/observations/note, and actual opened-box choices. Auth IDs provide stable user association. The catalog already supplies content features for a later content-based baseline.

Missing signals: questionnaire snapshots linked to sessions, ranked impressions/display percentages/model version, every detail open, skip/undo/More Options usage, restaurant search/selection events, eligibility/exposure context, and device/session attribution. Discovery answers remain local. Latest-view rows and favorite tombstones are state summaries rather than append-only behavioral history. Nearby diagnostics are memory/dev diagnostics, not durable analytics.

Verification is simulated, collection seeds are not earned behavior, and QA events are deliberately excluded. These need clear labels/exclusions in any eventual training data. No recommendation learning currently uses feedback, favorites, or cloud history. ML readiness is therefore **partial data foundation**, not a ready ranking-training dataset. Stabilize persistence first, then define a minimal exposure/event contract without changing V1 recommendation behavior.

## 25. Recommended implementation order

1. **Checkpoint/preserve:** identify all current working-tree scopes and deliberately include Supabase artifacts in version control when authorized; do not run the existing ship shortcut blindly.
2. **Fix reproduced local defects:** concurrent offline cache durability, credential scanner, migration packaging, unnecessary cloud reads. Verify with focused regressions, then run existing suite/build once.
3. **Validate SQL execution:** isolated database checks first, then read the existing remote state and reconcile any drift.
4. **Enable real accounts:** optional browser env/Auth redirects; separately configure deletion server credential if required.
5. **Validate full journeys:** disposable real accounts and two devices, offline replay, explicit Guest merge, immutable reward replay, account switch/deletion.
6. **Browser/mobile QA and documentation:** real visual/runtime checks and clear evidence of what is deployed versus local.
7. **Product extensions/data collection:** only after account stabilization; preserve canonical food IDs, eight regions, preference taxonomy, 3+7 hierarchy, and Cambodian representation.

This order does not require migrating the food catalog, replacing libraries, inventing schema, changing scores to match mock screenshots, or launching an ML project.

## 26. One immediate next task

**Fix concurrent offline account-cache/outbox durability in `src/data/syncEngine.js`.**

Start at `createJourneyStore`, its cache read and `persist()` whole-envelope write, and the store subscription/lifecycle boundary. Decide how stores sharing the same account coordinate mutations without resurrecting acknowledged favorites or sharing data across identities. Preserve event IDs and the existing transport/replay architecture.

Acceptance: two same-account offline stores can independently queue dish favorites and a completed meal; closing/reloading either must preserve all unacknowledged operations exactly once. Include mutable tombstone and account-switch cases, and retain existing tests for in-flight toggles, idempotent merge, and recorded rewards. No external credentials are needed for this first task.

After that, repair the compiled credential guard and migration packaging, then move to executed SQL and real Auth/data validation. “Continue Supabase” should resume this existing architecture and these specific gaps.
