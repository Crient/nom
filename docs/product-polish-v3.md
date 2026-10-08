# Nom follow-up polish: stack, restaurant reliability, and reward QA

## Implemented changes and causes

### Surprise Me

The rear card previously moved, rotated, and scaled with the pointer. The stack itself remounted after every skip, the front card arrived with a vertical translation, and a large top gap exposed an unwanted label. Those effects combined into the visible jump.

The stack now reserves a fixed 18px peek of the actual next dish image. The rear layer stays mounted and has no pointer-driven transform. Incoming content fades without vertical travel, and the front reserves title and description space. There is no visible “Up next” label. Left still skips and right still opens the selected canonical dish.

Undo skip moves a cursor through bounded, in-memory history. Skipping again replays the same future cards before drawing from the weighted queue. It supports multiple previous actions and cycle boundaries, clears with preference changes, and does not change normal recommendations, favorites, or durable storage. Native buttons, focus retention, pointer cancellation, and reduced motion remain supported.

### Restaurant results and media

Deduplication previously relied on Place ID in selected server paths, could discard a richer duplicate, and did not consistently repair client responses, restored metadata, or rendered collections. Results now pass through shared Place ID deduplication, followed by normalized name plus nonempty address deduplication. Distinct branches with different addresses remain distinct. Winners prefer useful metadata, distance, and search-match provenance; unknown distances and legacy distance fields are handled explicitly.

The shared boundary covers primary results before the fallback decision, the primary/fallback merge, client response presentation, restored Place IDs, shared search state, sorting/filtering, and Favorites. Venue aliases stay ephemeral; saved state recognizes known aliases and an explicit removal removes their currently saved IDs together. Persistence still stores permitted IDs and search coordinates rather than names or photos.

Restored searches contain identity metadata, not live restaurant facts. Dish previews and the nearby list now show one intentional refresh prompt instead of several generic placeholder rows. Refresh remains deliberate. Live restaurant text and facts render independently of image loading.

Two media causes were addressed: a valid URI did not imply that its browser image had loaded, and a cached PHOTO_STALE error could survive an explicit search that freshly observed the same photo resource name. Loading photos keep the intentional loading surface until image completion; a fresh observation can recover the stale error once. Photo expiry, pending-request deduplication, explicit retry, and quota error caching remain intact.

### Card polish

Photo credits and Google Maps source links remain beside the photo, in a small caption below it. They no longer cover the image. Author links remain interactive. The fallback badge is 24px in cards and 32px in the hero. Restaurant spacing, metadata gaps, heart alignment, and match text rhythm are tighter. Hearts retain filled saved icons and gain a quiet saved surface; accessibility labels and pressed semantics remain intact.

### Reward presentation and country scenes

The transparent padding in the gift artwork made rotational shake look like an orbit. The outer gift stays anchored; only an inner artwork layer shakes horizontally. The fixed theatre and reserved reward/progress/control rows persist through anticipation, pop, silhouette, color, rarity, progress, and the static final presentation. The final CTA fades in without a scaling dark panel.

Non-Cambodia scenes now use crisp CSS color, gradient, and dot foundations. Their 500px landscape exports sit in an inset scenic area capped at their native width. They are never stretched into full-screen portrait backgrounds. Cambodia's portrait background and supplied character art are preserved. Non-Cambodia character variants are still explicitly labeled artwork placeholders because no such art is supplied.

The existing optional original reward chime remains off by default, starts only from an enabled Open gesture, respects reduced motion, and stops on mute or abandonment. A generation guard prevents a rejected old audio resume from stopping a newer opening. No new sound was added to the I ate here slider.

### Local reward playground

In development, Profile → Developer tools → Reward playground opens `/dev/rewards`.

Controls trigger common, rare, epic, legendary, and selected-country boxes; replay the last test or earned reward; preview the final reveal; and reset test state. A nested provider uses only in-memory state and the existing domain reducer. Test previews cannot change real meals, progress, favorites, or collectibles. Replacing/resetting a preview cancels its presentation timers and does not navigate into earned reward routes. Actions retain stable identity so a grant does not restart the reveal timer.

Both the Profile link and route are gated by `import.meta.env.DEV`. The production output is checked for absence of the playground UI and its dedicated chunk.

### I ate here and Figma

The existing mouth-position text mask, crumbs, smooth return, guarded confirmation, pointer cancellation, two-press keyboard confirmation, and reduced-motion route were retained and regression-tested. No extra animation or mandatory audio was added.

Existing high-fidelity Figma contexts from the supplied design were reused for card/image proportions, type hierarchy, colors, and spacing. The follow-up's explicit interaction and attribution changes take precedence over static prototype behavior. No design screenshot is used as an implementation asset.

## Verification

Final result: **727 tests passed across 45 files**, production build and catalog validation passed, and `git diff --check` passed. The independent reviewer reran 68 alias/dedupe integration tests and confirmed both findings were fixed. Protection checks passed for all 201 canonical dish images, all existing runtime assets, and protected recommendation/reward/persistence files. The reward playground UI and chunk are absent from production output.

See `product-polish-v3-validation/validation.json` for final test counts, changed-file manifest, and protection checks. Focused tests cover queue/Undo/exhaustion, gesture cancellation, dedupe quality and branch separation, cached restoration, fresh photo recovery, attribution links, saved alias removal, reward timing and duplicate grants, optional audio, and isolated QA replay/reset. Full tests, catalog validation, production build, and whitespace checks are run after integration.

All 201 canonical catalog images and all existing runtime assets are checked byte-for-byte against the beginning of this pass. Normal recommendation scoring and More Options, canonical collection definitions, earned reward reducer, persistence schema, Maps loader, and package files are preserved. The Google search architecture still allows at most one primary plus one fallback, filters at 250 miles, and maintains separate photo/details quotas. No live Google calls are used by tests.

## Remaining manual browser QA

The browser runtime reported no connected browser. Automated tests use happy-dom; they verify behavior and DOM state, not rendered layout, smoothness, or real audio playback. No browser screenshot or pixel-perfect claim is made.

1. At 360px, 390px, and 440px, swipe slowly and quickly both ways; cancel a drag, scroll vertically, skip repeatedly, then Undo repeatedly. Confirm stable peek/card height, retained keyboard focus, and reduced motion.
2. Load restaurant previews/list/map/detail with slow, missing, cached, and broken photos. Check text appears immediately, images fade into place, captions stay below photos, long author credits remain usable, and fallback badges look balanced.
3. Compare duplicate Place IDs and equivalent name/address candidates. Confirm distinct branch addresses remain separate, sorting/filtering work, saved aliases show a filled heart, and one removal clears a known venue group. Reload cached searches and confirm the single refresh prompt.
4. Replay reward tiers through Profile's development playground. Check gift anchoring, horizontal anticipation, silhouette/color timing, rarity emphasis, progress, clean final CTA, replay, replacement, and reset. Confirm real collection/progress remains unchanged.
5. Check Cambodia and each non-Cambodia collection/reward/detail page on normal and Retina displays. Confirm the scenic inset is balanced and CSS foundations remain crisp; non-Cambodia artwork placeholders remain honest.
6. Enable reward sound and test Open, mute mid-opening, navigation away, reduced motion, unavailable audio, and replay. Check the existing I ate here mask consumes the phrase with the mascot, supports cancellation/keyboard/button alternatives, and confirms once.
