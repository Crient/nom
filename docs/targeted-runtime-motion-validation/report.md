# Targeted runtime and motion pass

## Restaurant photos

**The exact failure in the user's live browser remains unconfirmed.** No browser is connected to this session, and the failing Network response has not been provided. No live Google requests were made. The implementation and synthetic requests establish the following concrete faults in the previous reporting:

- Nom's own warm-instance photo limits (10 requests/minute, 30/day UTC) and Google HTTP 429 both became `QUOTA_LIMIT`, without identifying the source. A local block spends zero Google requests.
- Google photo HTTP 403 was always classified as a configuration failure. Google documents photo quota failures as possible HTTP 403 responses. The patch uses structured error enums to recognize confirmed quota, preserves permission failures, and labels an unclassified 403 `PHOTO_QUOTA_OR_ACCESS` rather than guessing.
- Google HTTP 400/404 photo-resource failures became generic provider failures. These can include expired resources; the patch preserves the status and does not claim expiration is certain from status alone.
- API failures and image bitmap failures both produced the same prominent full-width “Retry photo” UI. The client discarded HTTP status and error source.

Reference: [Google Place Photos error documentation](https://developers.google.com/maps/documentation/places/web-service/place-photos#error-codes).

The patch retains the lazy loader, shared requests, in-memory cache and restaurant state handoff. Regression tests show that Surprise Me → right swipe → Dish Detail preserves photo metadata; preview/list/back/revisit reuse the same media requests. Removing a subscriber during navigation does not abort a shared photo request. Missing metadata does not fetch. Restored persistent search state still requires the existing deliberate refresh for current photo metadata.

Failures now retain safe code/source/HTTP status/upstream status and development diagnostics under `[Nom place media]` and `[Nom place]`. No raw provider messages, resource URLs, author information or keys enter the error diagnostics. Cancelled, timed-out, network, endpoint, stale metadata and bitmap failures are distinguished.

Confirmed photo quota failures pause subsequent new thumbnails for the reported local cooldown or a conservative 60-second Google cooldown (or Google's numeric Retry-After). Cached successes stay usable, and already-started requests finish. There are no automatic retry timers. A small retry icon requires a deliberate click and cannot spend another request during the cooldown. The daily app limit is unchanged; no quota is raised. Photo failure never changes restaurant facts, search results or details.

The fallback uses the existing Nom surface and restaurant initial, with subdued “Photo paused”/“View unavailable” copy. Expired/invalid resources direct users to the existing permitted nearby-search refresh; no additional Places searches were added.

## I ate here

The aqua → teal/blue base remains fixed. A soft radial gold layer uses exactly the mascot's horizontal transform and return easing. Its center is:

`8px + handleWidth / 2 + normalizedProgress * (trackWidth - handleWidth - 16px)`

For the test track of 300px and handle of 68px:

| Progress | Mascot / gold center |
| --- | --- |
| 0% | 42px |
| 25% | 96px |
| 50% | 150px |
| 75% | 204px |
| 100% | 258px |

The gradient moves by transform, without moving layout or adding per-frame React state. Progressive text eating, cancellation, the 85% threshold, keyboard/button confirmation, reduced motion and single visit confirmation remain covered by tests.

## Mystery Box

The old sequence combined independent opacity transitions, character/lid vertical entrances, animated brightness, staggered particles, rarity motion and a width-transitioned progress bar. The reward artwork also mounted after the grant, and the aura changed color once the reward was known. These were concrete sources of discontinuous presentation; actual browser frame performance could not be measured here.

The new sequence lasts **1550ms**:

| Time | Presentation |
| --- | --- |
| 0–300ms | Fixed box; subtle compression and two controlled horizontal offsets |
| 300–550ms | Glow intensifies; four small particles |
| 550–950ms | Lid releases; anchored silhouette scales .85 → 1.05 → 1 |
| 950–1250ms | Silhouette/artwork crossfade; name and rarity fade in |
| 1250–1550ms | Progress fills by scaleX; CTA fades in; static final scene |

All visual tracks start once on the opening phase, use the same duration, and end at the static reveal poses. Stage updates preserve the animation names and DOM nodes. The deterministic canonical reward artwork is mounted while closed, without changing the guarded reward grant. Outer theatre and reserved identity/progress/control rows remain fixed.

Removed: idle glow pulse, halo rings, twelve-particle stagger, character vertical entrance, rarity vertical entrance, animated dark filter, width animation and settled-stage transform resets. Only the lid lifts; neither the box anchor nor collectible translates vertically. The silhouette is the artwork shape, not a scaling dark panel. Existing optional sound hooks are preserved.

## Validation

Final check counts and logs are in `validation.json`, `focused-tests.log`, `full-tests.log`, `production-build.log` and `motion-audit.json` in this directory. Automated tests cover cold detail, Surprise right swipe, preview, See All, back, cached revisit, missing/successful/broken photos, quota/error responses, request cancellation, gradient positions, rapid box taps, isolated QA replay, abandonment, reward idempotency and reduced motion. The static CSS audit confirms every box keyframe uses only transform/opacity and every opening track uses the shared clock.

Remaining manual checks: inspect one currently failing live `/api/place-photo` response to establish the exact quota/resource/endpoint cause; inspect actual photo delivery and animation frames in a connected browser at phone sizes; replay the box through `/dev/rewards` and check the moving gold glow visually. DOM tests and static CSS checks do not establish absence of visible flicker or dropped frames in a real browser.

No recommendation engine, canonical reward reducer, dish catalogue or existing image asset was changed relative to the start of this pass.
