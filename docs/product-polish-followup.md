# Product polish follow-up

Completed October 5, 2026. This pass addresses the visible regressions and interaction feedback following the first overnight pass. Root integrated all changes; three read-only media, layout/Figma and motion audits informed the work, followed by a fresh skeptical review. Existing workspace changes were preserved. No dependencies, API endpoints, image assets or commits were added.

## Changes

### Restaurant photos

The selected map summary explicitly disabled its photo. It now renders the same shared photo as preview/list/detail, eagerly for the single selected venue, reusing loaded media without another Text Search. Offscreen list/preview photos retain IntersectionObserver loading.

Cached images now become visible when `complete` and `naturalWidth` show that loading already finished, rather than relying solely on an `onLoad` event. Browsers without IntersectionObserver automatically load available photos. Normalization selects the first safely usable returned photo instead of discarding later valid choices when the first is unusable; search fields and call limits stay unchanged.

Missing, saved, stale, loading and failed media have intentional monogram/gradient states. A transient failure offers a deliberate Retry photo action, with in-flight deduplication and no automatic retry loop. Switching venues does not retain an unrelated failed-image state. Hero fallbacks have appropriately larger typography and monograms. Credits remain quiet, preserve author links and the individual source-photo link, and avoid dangling punctuation when the author array is empty.

Existing 10-minute media-reference expiry and metadata-only durable restoration remain conservative. Stale/saved media asks for explicit nearby refresh; this pass does not silently perform billable Text Search or persist richer Google content. Attribution follows the [Google Places photo policy](https://developers.google.com/maps/documentation/places/web-service/policies#photos_and_reviews).

### Mystery Box and sound

The previous padded gift export rotated around the transparent canvas center; the reward panel mounted with a dark background and changed stage height; final-route remounts replayed entrance motion. These combined into the reported orbiting gift and growing/shrinking panel.

The replacement uses a reserved theatre with separate gift, glow, character, identity, progress and CTA slots. Gift shaking pivots around its visible base and uses restrained horizontal movement. The lid uses a conventional ease-out. No dark reward panel, whole-scene scaling or reward-driven height switch remains. The final route is static.

| Time | Presentation |
| --- | --- |
| Before opening | Soft, opacity-only idle energy; visible Sound off/on control |
| 0–600ms | Charge and restrained shake |
| 600ms | Lid release and small radial sparkle burst |
| 780ms | Existing guarded domain grant; actual reward silhouette |
| 1080ms | Silhouette resolves into supplied character artwork |
| 1260ms | Name, rarity and collection context become visible |
| 1460ms | Actual collectible count/progress updates |
| 1750ms | Static reveal route and enabled View Collection CTA |

Reduced motion uses a 220ms sequence without shake, particles or animated transforms. Duplicate rewards keep the actual count unchanged; opening never adds meal progress. Abandoning before grant clears timers; reloading an already-earned opening URL goes directly to the static reveal. The canonical reward reducer and persisted-state implementation remain unchanged.

A quiet original four-note WebAudio chime is optional and **off by default**. Its context is created/resumed only inside the user’s Open interaction, with notes scheduled near character resolution. Sound can be muted during opening, stops on abandonment, survives development StrictMode effect replay, and is suppressed with reduced motion. Audio failure leaves the visual flow usable and displays a nonblocking notice. No copyrighted sound or external audio asset is used.

### Country backgrounds and collections

Seven country scenes are **500×375 landscape images**. Full-page `cover` on a 440×961 portrait page previously scaled them to approximately **1281×961**, cropping most of the scene and enlarging its pixels. Changing WebP to PNG would not recover the missing resolution.

A shared scene helper now renders landscape art at full available width and its original aspect ratio, with a gentle fade into a matching foundation color. Cambodia retains its dedicated **880×1913 portrait background**; its detail background remains separate. Collection, box and collectible-detail pages use the same sizing rules. Non-Cambodia collections have consistent light tile surfaces, tighter grid spacing and readable dark headings rather than white labels on the pale foundation.

This removes severe enlargement and cropping; higher-resolution source landscapes would still improve high-density displays. Non-Cambodia character variants remain the supplied artwork placeholder—the background/layout fix does not invent country-specific character art.

### I Ate Here

The whole-label fade and solid moving block are replaced by a spatial phrase mask. Layout/ResizeObserver measurements determine phrase position and thumb travel; the clip boundary follows the mascot mouth. At partial swipe, passed letters disappear while the uneaten suffix remains. A narrow trail and small local crumbs support the eating effect without covering the track. Cancel restores the full phrase; completion uses a separate unmasked confirmation state.

The existing 85% release threshold, pointer cancellation, keyboard confirmation, Escape, visible button alternative, reduced motion and once-only visit guard remain intact.

### Surprise Me and general motion

The rear card now contains the actual upcoming dish photo, title and description. A non-consuming queue `peek` prepares that preview without marking it shown; the next draw promotes exactly that dish. Weighted quality, constraints and no-repeat history remain unchanged. Single-candidate pools omit the duplicate rear card.

The stack exposes a 64px band and scales the rear card from its top, keeping its photo and Up next label visible. Drag adds restrained rotation/parallax; the next active card settles in; controls preserve keyboard focus. Gesture transforms are not overridden by the entry animation. Reduced motion suppresses decorative movement.

Scoped press feedback, favorite-heart feedback and view-toggle transitions add small responses to actions without moving gesture controls or introducing a broad page animation.

### Restaurant spacing and Figma

The layout auditor reviewed the previously fetched high-fidelity Dish Detail, Nearby List, Restaurant Detail and box/reward contexts from the [supplied Figma page](https://www.figma.com/design/xVMCeNJV8S3axojtIgtoCr/Untitled?node-id=1-7).

Live cards use uniform padding, a 10px image-to-copy gap and 3px copy spacing. Rating, distance and hours are grouped tightly in a wrapping row. Preview cards remove the large auto-pushed match gap and reduce reserved copy space. Title/metadata text reserves the real favorite/Maps target widths. Map cards use the same photo badge numbering and selected-state outline. Detail facts and hero proportions retain the Nom hierarchy. Dynamic content remains readable rather than copying tiny prototype metadata sizes.

## Review and validation

The fresh reviewer identified a remaining peek occlusion caused by scaling the rear card around a low pivot. Root increased the exposed band and anchored scaling at the top; the reviewer verified the fix and reported no remaining material findings in the reviewed changes.

- **125 targeted tests passed across 9 files.** Coverage includes photo recovery/lazy loading, map/detail media reuse, safe photo alternatives, partial text consumption, queue preview promotion, box stage ordering, reload/abandonment, duplicates, sound opt-in/mute/reduced motion and StrictMode.
- **700 full tests passed across 44 files.**
- Production build and 201-dish catalog validation passed.
- `git diff --check` passed.
- All **201 canonical dish images**, and all other existing runtime media, remain byte-identical to this pass’s baseline.
- Normal recommendation engine/More Options, catalog/image maps, rewards/persistence, shared search rules, quota handler and key-loader architecture match the baseline hashes.
- Configured server secret is absent from browser build and diffs. Browser credentials match only the intended browser key; no new credential strings were found. `.env.local` remains ignored.
- Maximum two Text Searches, 250-mile filtering, existing quota protections and trust copy are preserved. No live Google API call was used during automated validation.

The [validation manifest](product-polish-followup-validation/validation.json) lists all 30 changed implementation/test files, logs, review outcomes and limitations. [Safety results](product-polish-followup-validation/safety.json) contain redacted credential checks and preservation hashes.

## Manual browser QA

Browser setup/discovery was attempted, but no browser connection was available. Runtime screenshots and motion feel were not verified; passing tests do not establish pixel-perfect appearance.

1. **Mystery Box:** open once at normal speed; inspect stable gift position, glow, lid, silhouette, character, rarity, progress and CTA; verify no dark/scaling panel. Enable sound before opening, mute during opening, then test reduced motion, rapid taps, leaving/reloading before and after grant, and revisiting the earned box.
2. **Country scenes:** inspect Cambodia and all seven landscape countries in collection, box and collectible-detail views at 320/390/440px and desktop. Verify the full landscape composition, clean fade/foundation, readable locked/unlocked names and tile alignment. Note the existing non-Cambodia character placeholder separately from background quality.
3. **I Ate Here:** stop near halfway and check that only letters behind the mouth are consumed. Reverse, cancel and release just below/at the threshold. Check completion, keyboard/button/Escape paths, reduced motion and resized text.
4. **Surprise stack:** confirm a real next dish is visible at rest, its full label remains exposed and Skip promotes that exact dish. Try left/right/partial/vertical/cancel gestures, repeated keyboard Skip, reduced motion, preference changes and exhaustion.
5. **Restaurant photos:** check preview→list→map-selected→detail consistency, cached revisits, cold reload, missing/stale media, broken-photo retry and attribution links. Throttle the network: text should remain usable before photos; offscreen supported-browser photos should stay lazy.
6. **Spacing/Figma:** inspect short/long names and addresses, stale hours, far-distance context, favorite/Maps targets, previews, numbered selected map cards, detail actions and hero crops at mobile/tablet/desktop sizes. Check the new small press/favorite feedback with and without reduced motion.
