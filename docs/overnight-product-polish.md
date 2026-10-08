# Overnight product polish

Completed October 5, 2026. Root integrated all changes sequentially against the existing dirty workspace. No commits, resets, dependency additions, canonical image changes, or live Google API tests were made.

## Multi-agent execution

Three read-only auditors investigated in parallel before implementation:

- Logic: Surprise reused deterministic ranking; missing session history and skeletons; ambiguous rating sorting; wrong cuisine wording; abort/remount and stale-area cache risks. The existing provider already enforced distance filtering before fallback and a two-search maximum.
- Figma/UI: inspected the supplied page and Dish Detail, Nearby List, Restaurant Detail, box tap and reward frames using direct Figma metadata, design context and screenshots. Compared shared tokens and component geometry.
- Motion: no animation library installed; native pointers and CSS fit the existing stack. Identified swipe fill/label/radius artifacts and the one-stage box reveal. Existing reward guards were sound.

After all three phases, the UI auditor independently reviewed the integrated changes while a fresh reviewer initially could not start because of a native thread limit. A fresh skeptical reviewer subsequently started, found an additional cache-to-detail propagation issue, and reviewed its concrete fix. Both reviewers were read-only.

## Phase 1 — behavior

Surprise now draws from explicitly eligible, sufficiently strong candidates using a weighted shuffle without replacement. Ephemeral session history prevents repeats until exhaustion, avoids an immediate repeat across reshuffles when alternatives exist, and resets with preference context. Normal Top Matches and More Options retain the existing deterministic engine and ordering.

The server's existing centralized 250-mile Haversine cap, filtering/deduplication before the fallback count, one optional cuisine fallback, provenance-preserving merge and closest-first final sort were verified and preserved. Local sort controls support Closest, Highest Rated and Lowest Rated; missing ratings sort last. No venue is hardcoded. THMOR DA-type consistency work addresses cached area/distance, direct-route loading and partial-fallback visibility; actual Google results still need manual confirmation.

Already-granted location auto-load remains automatic. Three matching skeletons appear during cold loads; resolved restaurant text does not wait for photos. A cancelled search settling after a remount can resume safely. Valid cached text renders immediately; permitted background geolocation recalculates distances locally and filters distant venues without a Places request. Previous-area matches and unverified old distances have explicit notices. Refresh remains deliberate. Revalidation cannot overwrite a newer search, and original cached candidates remain available when returning to the original area.

Cuisine ideas use the selected dish's canonical country metadata, including Singaporean Hainanese Chicken Rice, rather than restaurant type. Existing exact-search and fallback evidence remains distinct from menu confirmation, with call-ahead advice and honest catalog wording.

Checkpoint: **650 tests / 38 files passed; production build passed.**

## Phase 2 — UI / Figma

Reference: [supplied Figma page](https://www.figma.com/design/xVMCeNJV8S3axojtIgtoCr/Untitled?node-id=1-7). Inspected nodes 263:4426, 263:4540, 263:4729, 263:5313 and 263:5398, plus page overview and map/collection context.

Reused Nom colors, spacing, type, radii, shadows, FlowHeader, DishTitle, Image, Button, HeartButton and existing illustrations. Preview cards have consistent photo proportions, readable titles/facts and independent favorites. Full-list cards use balanced image/text proportions, clearer titles, wrapping filters, whole-card hit areas and numbers matching visible map order. Detail restores the reference hero ratio, title/section hierarchy, circular action row, quiet metadata, hours spacing and bounded reviews. Long review text remains available behind Read more.

Photo credits use a quiet `Photo · Author ↗` presentation, preserving author/source links and Google attribution. Send to Friend displays “Friends on Nom are coming soon.” without invoking Share; Share keeps native, copy and manual fallbacks. Narrow layouts adapt card images, labels and swipe text. Reward content uses normal flow to prevent narrow-screen overlap.

Checkpoint: **127 focused tests / 6 files passed; 652 full tests / 38 files passed; production build passed.** Runtime browser screenshots were unavailable, so visual fidelity is not claimed as pixel-perfect.

## Phase 3 — motion

No library or dependency was added. Native pointer capture, shared CSS motion tokens and a reactive reduced-motion hook provide small, maintainable interactions.

I Ate Here directly follows the pointer, uses matching pixel geometry for fill and mascot travel, fades the resting label before overlap, and returns smoothly below its existing 85% threshold. Completion snaps, briefly munches/celebrates and calls the existing guarded visit handler once. Keyboard confirmation, Escape cancellation and a visible button equivalent remain available. Reduced motion removes movement and shortens confirmation.

Surprise supports left skip/right select, horizontal intent detection, vertical scrolling, partial-drag return, pointer cancellation and visible accessible controls. Exit callbacks are guarded and cancelled on unmount. Controls retain keyboard focus across repeated skips.

The box sequence uses existing closed/open/glow/reward artwork: anticipation and growing glow; lid pop at 650ms; small spark burst; actual collectible reveal and guarded grant at 900ms; collection count/progress update at 1300ms; stable reveal route at 1500ms. Reduced motion uses a 220ms sequence without shaking or particles. The count reflects actual canonical collectibles; duplicate rewards do not increase it. The canonical three-meal box target and six-collectible collection remain unchanged. Timers only present existing domain results; reload, revisit and rapid activation cannot create extra grants.

Checkpoint: **34 focused tests / 5 files passed; 669 full tests / 42 files passed; production build passed.**

## Final review and fixes

- Keyboard Skip lost focus when the entire card/control subtree remounted: retained the controls and reset only the visual card and gesture state.
- Reward text could collide with progress at narrow widths: moved reward, progress and CTA into flex flow with an adaptive minimum height.
- List numbers could be covered by the photo: corrected marker layering.
- Cached results used obsolete distances after relocation: added permitted background local revalidation, cap filtering, explicit prior-area notices and stale-work protection.
- Fresh review found Detail still read the service's original distance: Detail now subscribes to current restaurant state, uses the recalculated venue, hides obsolete distances for excluded venues and revalidates location independently of automatic search. Regressions cover a roughly 103-mile move with call-ahead advice and a move beyond 250 miles with no extra Text Search.

Fresh reviewer verified the final fix and reported no remaining material findings in the reviewed changes. Browser gesture and layout QA remains outstanding.

## Final validation

- **679 tests passed across 42 test files.** Post-review focused checks passed: 13 interaction tests, 43 cache/service tests, and 28 detail/cache integration tests.
- `npm run build` passed, including catalog validation of 201 unique dishes.
- `git diff --check` passed. Changes were reviewed against the task-start workspace, preserving pre-existing work.
- All **201/201 canonical runtime WebPs** remain byte-identical. Image maps, catalog, recommendation engine/hook, More Options, reward domain, server provider/handler and package files match the task-start hashes.
- Configured server secret is absent from the browser build and both task/repository diffs. Browser key occurrences match only the intended browser key; no new credential strings were found; `.env.local` remains ignored. No commit was created.
- Existing 30/day and 6/minute per-instance guards and maximum two sequential Text Searches remain unchanged. No new API endpoint, background Places refresh, search from sorting/map interaction, or automated live Google call was added. Cloud quota configuration was not changed or verified remotely.
- Durable restaurant metadata remains limited to existing Place IDs, coordinates and Nom search metadata; richer displayed text stays in session memory. Author/review/Google attribution remains present. See [Google Places policy](https://developers.google.com/maps/documentation/places/web-service/policies).

Evidence is saved in [overnight-product-polish-validation](overnight-product-polish-validation/validation.json), including phase/final logs and redacted safety results.

## Manual browser checks still required

No browser is connected. These checks were not represented as completed by unit tests:

1. Surprise Me variation: repeat launches and many skips; verify preference constraints, variety and no repeats until exhaustion; compare normal Top Matches/More Options.
2. Surprise Me swipe: left skip, right open, short drag return, vertical scrolling and cancellation; repeat keyboard Skip without losing focus; test visible buttons and reduced motion.
3. Lort Cha nearby results: allow location, open the dish, inspect local Cambodian options and THMOR DA if Google returns it; check partial-fallback messaging and explicit refresh.
4. Closest-first list: confirm increasing approximate distance; Highest/Lowest Rated and Open Now work locally without new searches.
5. No >250-mile places: verify list, preview and map; revisit cached results after changing location and open Detail to check consistent distance/notice.
6. Skeleton loading: throttle network, verify three stable placeholders, restaurant text before photos and immediate cached text on return.
7. Restaurant preview-card styling: equal visual heights, readable titles/facts, balanced images, whole-card click and independent favorites.
8. Photo attribution: quiet readable credits, full author access, functional source/author links, Google branding and photo fade.
9. Restaurant Detail: hero crop, hierarchy, facts, action spacing, About, hours accordion and call-ahead advice with honest availability wording.
10. Directions: returned directions URI opens the correct venue.
11. Call: returned phone uses `tel:`; absent phone is clearly unavailable; call-ahead action works.
12. Website: returned website opens correctly; absent website is unavailable.
13. Send to Friend: distinct coming-soon message; no operating-system share sheet or clipboard action.
14. Share: native share, cancellation, copy fallback and manual fallback; preserve correct detail URL.
15. Map/list relationship: visible list numbering matches pins, marker selection shows the corresponding summary, and toggles/selection do not search again.
16. Google reviews: no more than three; author/stars/date, preserved links, collapsed long text and working Read more/Show less.
17. Cuisine section: Hainanese Chicken Rice shows Singaporean ideas; Cambodian dish shows Cambodian ideas; copy never implies a verified restaurant menu.
18. I Ate Here swipe: connected mascot/fill, early label fade, no radius seam/overlap, subthreshold return, one completion, keyboard/button/Escape and reduced motion.
19. Surprise Box opening: growing anticipation/glow, lid, subtle burst and actual reward; roughly 1.5 seconds; rapid taps, route exits/reloads and reduced motion remain safe.
20. Progress animation: actual count advances once for a new collectible; duplicate stays unchanged; stable reward/CTA; revisit grants nothing extra.
21. Mobile responsiveness: inspect 320/375/390/440px, tablet and desktop, including long venue names/credits, filter wrapping, photos, slider labels and reward/progress layout.
