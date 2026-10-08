# Five targeted UI polish fixes

One root agent handled this pass. No recommendation, Google Places, collectible data, sound architecture, canonical asset or shared layout-shell changes were made.

## Exact implementation files changed

- `src/styles/experience.css`
- `src/styles/restaurant-live.css`
- `src/styles/hubs.css`
- `src/pages/Collections.jsx`
- `src/pages/Home.jsx`
- `src/pages/VisualStatePolish.test.jsx`
- `src/components/restaurants/AteHereSwipe.jsx`
- `src/components/restaurants/AteHereSwipe.test.jsx`
- `src/components/recommendations/DishDetailHero.jsx`
- `src/components/recommendations/SessionChip.jsx`
- `src/components/restaurants/AteHereMascot.jsx`

The remaining additions are this report, `validation.json`, and captured test/build logs in this directory.

## I ate here mouth animation

`AteHereMascot` reuses `ate-here.webp` without changing its pixels or creating a new asset. Its mounted SVG has upper/lower clips and a fixed strip covering the body seam. While dragging at positive progress, opposing jaw groups rotate ±6° over a quiet 520ms chew cycle. The original resting image returns on release/cancel. The SVG and resting image stay mounted; no animation library, interval, additional React animation state or audio was added. Reduced motion keeps the original resting mouth. The existing gradient transform, handle travel, 85% threshold, pointer cancellation, keyboard confirmation and celebration are unchanged.

## Country overview art and completion

Overview artwork was already opaque; its washed appearance comes partly from the pastel source masters, rather than completion-dependent alpha. Opacity is now explicit at 1. New-country contrast increases from 1.12 to 1.32 and saturation from 1.10 to 1.22; Cambodia retains its existing source/treatment. Artwork settings do not vary with progress.

At six unlocked collectibles, the outer card gains a restrained 1.5px gold ring and a soft 15px gold shadow at 24% opacity. Incomplete cards retain normal elevation and the same image visibility. Completion is derived from the existing `unlockedCount`; no data/reward rules or stored state were modified. The regression earns the sixth Cambodian collectible through the existing reducer, reloads, checks the completion accent, and verifies unchanged image source/crop/style across that transition.

## Top edge / corner geometry

Two concrete source-level geometry mismatches were corrected:

1. The overview card was 128px high with a 110px image and a 51px absolute footer. The footer overlapped 33px of the image, and the outer button owned all clipping. The card now explicitly lays out its art from the top using flex. A dedicated 77px artwork surface (128 minus 51) owns its 21px top-corner mask; the footer uses matching 21px bottom corners. The outer card stays unclipped so its completion glow survives. This sizes the actual visible region rather than arbitrarily shrinking the source image.
2. Country-page portrait art started at `safe-area-inset-top`, while its fade layer started at zero. This left a foundation-only strip and inconsistent layer boundaries at the top. For country pages only, both layers now share `inset: 0` and inherit the page's 20px top radius. Existing safe-area padding remains on the content; the art extends behind that region. Image aspect ratio and zoom are unchanged. Other Flow pages and the app shell are unchanged.

These source mismatches are verified by inspection. The specific chipped corner reported by the user was not reproduced: no screenshot was attached to this prompt, and no browser is connected. Visual confirmation on the reported frame is still needed.

## Home status overlap

The Home header applied `padding-top: 203.2px` to its normal-flow children, including StatusBar. Search and quick actions were absolutely positioned at 55.01px and 126.89px, outside that flow. Therefore the status icons were displaced below the controls rather than occupying the top status region.

Home now reserves top safe-area padding and uses normal flow in this order: status → search → quick actions → divider → greeting. The status region has its own local stacking level. The shared StatusBar, AppShell and navigation components were not modified. Existing search/actions still pass integration tests.

## Detail tags

Dish detail now uses the same default SessionChip variant and 8px row gap as Surprise. Detail-only minimum-width overrides were removed. The shared chip remains 34px high with 13px text, 20px icon and 12px horizontal padding. Chips, icons and labels do not flex-shrink; labels remain `white-space: nowrap`. Rows wrap between complete chips. A rendered comparison covers Anything, Spicy, Comforting, adventure Surprise Me and region Surprise Me.

## Validation and limits

- Focused: **256 tests across 5 files passed**.
- Full: **790 tests across 46 files passed**, including nested Python workflows (56 Python tests).
- Catalog validation / production build: passed.
- `git diff --check`: passed. Baseline-to-current whitespace checks also cover all changed source files and the new untracked mascot component.
- SHA-256 scope check: **530 protected files unchanged** across data, existing assets, server, shared rules and utilities.
- No Google API request or image generation occurred.
- Browser selection failed with “No browser is available”; browser discovery returned `[]`.

The tests verify drag state, mounted mouth groups, resting reset, reduced motion, swipe/keyboard behavior, completion persistence, unchanged country image visibility and matched chip markup. DOM tests do not verify actual CSS animation frames, pixel clipping, contrast perception, notch geometry or text fit in a rendering engine. Manual QA remains for those visual checks at 440px and smaller phone widths, including long chip labels and a safe-area device.
