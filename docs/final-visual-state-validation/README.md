# Final visual/state and Collection polish pass

Implemented by one root agent. This report covers the original final visual-state request and the subsequent targeted polish attachment. Pre-existing workspace changes were preserved.

## Surprise stack

The original two-card renderer kept the incoming card keyed, but mounted its replacement rear card at promotion, changed DOM sibling order by role, and changed the transform function list at the rear/front handoff. The rear also used an overshooting spring. These are concrete code-level discontinuities consistent with the reported pop and side flick; a browser compositor diagnosis remains unverified.

The stack now keeps A/front, B/rear and C/queued mounted. C advances into the rear pose while B moves forward; the new D starts fully occluded behind C. Cards have unique occurrence keys even in two-dish cycles, and DOM order stays stable during forward promotion. Every role uses the same transform function order and matching handoff endpoints. Promotion uses a non-overshooting ease. Front tilt is deterministically varied within ±2.5°, with softer opposing rear tilt, and does not reroll on render or consume recommendation randomness.

Two-draw lookahead prepares/reuses the next weighted cycle without consuming history. Undo, both swipe directions, native keyboard controls/focus and reduced motion remain. A regression also caught and fixed a new allocation-counter bug during this pass: the counter must be recorded after allocating rear/queued slots.

Ten consecutive automated pointer swipes retain the exact rear and queued DOM/image nodes, never remove/reinsert them, keep unique keys and match transform endpoints. This verifies lifecycle continuity, not actual GPU frames or real image decoding.

## Favorites and restaurants

Dish and collectible favorite buttons share an inline star: outline before saving, current-palette fill after saving. `aria-pressed` stays correct. Navigation/reload/save/remove persistence is covered.

Preview and full-list hearts sit in a shared restaurant title row, with an 18px glyph and 44px target. Both live and development cards follow the alignment. Saved hearts remain filled. Existing thumbnail attribution handling remains in the photo viewer instead of a caption row; regression checks verify no card figcaption.

## I ate here

The existing gold/yellow and blue base remains. A faint trailing gold radial glow was added inside the same transformed layer as the main warmth. The mascot/glow center and improved swipe behavior remain synchronized; no new sound or completion logic was added.

## Mystery Box and sound

The existing mounted artwork and shared 1.55s anticipation → energy → reveal → identity → settle timeline remain. Character overshoot is reduced from 1.05 to 1.03, glow peaks are softer, and the silhouette is less harsh. There is no new vertical reveal movement or scaling dark panel.

Original Web Audio profiles now differ by rarity. Scheduled audible spans, including the oscillator stop tail, are approximately:

| Rarity | Span | Sound |
|---|---:|---|
| Common | 0.615s | soft triangle chime |
| Rare | 0.795s | brighter two-note sparkle |
| Epic | 1.065s | falling bass impact plus overlapping shimmer |
| Legendary | 1.395s | rising four-note crescendo with a bass landing |

`src/utils/rewardSound.js` holds the profiles and lifecycle hook; `SurpriseBox.jsx` passes the actual reward rarity only from an explicit Open event. Synthesized audio is shipped and playable; external SFX files are not needed. The shared box sound toggle remembers the preference in `nom.reward-sound.v1`. Muting, abandonment and reduced motion stop/suppress audio. Rapid taps and StrictMode rerenders do not replay it. Longer tails survive the natural opening-to-reveal route change; leaving the reveal still stops them. Actual listening/timbre QA remains outstanding.

## Country art and Collection fit

See [the asset audit](asset-audit.md) and [machine-readable mappings](asset-audit.json). Cambodia's portrait and related overview/detail images are preserved. Seven 941×1672 staged PNGs are byte-identical copies in `src/assets/experience/country-backgrounds/`, shared by Collection and Mystery Box with controlled overview crops. No currently defined country lacks portrait art; unknown countries use a clean gradient/motif fallback.

New page art opacity increases from the initial pass treatment of 0.50 to 0.625, and the added warm fade is reduced 25%. Overview images remain fully opaque regardless of progress and gain modest contrast/saturation. Cambodia keeps its existing 0.8 treatment. Non-Cambodia portrait foundations use warm cream instead of green dead space.

Country pages now account for safe areas, align back/ellipsis controls consistently, and retain one common two-column six-tile geometry. Header/title/grid/progress gaps are tightened. Tile sizing reserves the 129px progress card, optional ready-box button and country-art note before sizing the three rows. Art remains up to 144px in the intended 440×961 frame. Short viewports may scroll rather than clip content; real-browser fit and notch checks still need QA. Backgrounds stay at natural aspect ratio, top aligned, with no stronger zoom.

Preference summary chips grow to 34px tall with 13px text, 20px icons and 12px horizontal padding; nearby compact chips grow to 28px/11px/16px/10px. Labels stay unbroken and rows wrap naturally. These are informational summary chips, not additional interactive controls.

## THMOR DA

See [the investigation and capture procedure](thmor-da-investigation.md). Exact queries and every filtering stage were inspected; opt-in local diagnostics capture raw results, exclusions, aliases, ranking and visible IDs. Production query behavior and budgets are unchanged. There is no hardcoded THMOR DA insertion. Its actual absence remains unconfirmed without the same search area and a live response.

## Validation

- Focused: **189 tests / 11 files passed**.
- Full suite: **786 tests / 46 files passed**, including nested Python workflows (56 Python tests).
- Catalog validation and production build passed.
- `git diff --check` passed.
- SHA-256 comparison: **465 protected files unchanged**, including existing image bytes, staged sources, catalog/shared rules, normal recommendation engine, canonical dish-image mappings and reward state reducer. All seven runtime background copies match staging.
- No paid Google requests were issued.

No in-app browser was connected (`browsers.list()` returned `[]`). Remaining manual QA: real compositor motion over ten swipes and undo; mobile safe-area/viewport layout and thumbnail crops; listening at each rarity with mute/navigation; and location-specific THMOR DA raw-response capture. Automated DOM checks do not establish that those visual/audio/live-search checks passed.

Logs and structured results are stored beside this report.
