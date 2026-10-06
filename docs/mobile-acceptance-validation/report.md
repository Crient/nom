# Nom mobile acceptance remediation — 2026-10-05

Implementation is complete locally. Native iPhone Safari visual and audio acceptance remains pending. This was a targeted pass by one root agent; no deployment or live billable Google request was made.

**1. Files changed**

The complete implementation/test file list is in [changed-files.json](changed-files.json). Changes cover shared chrome, discovery cards and spacing, Home arrows, recommendation artwork/actions, Search, Why Matched, country crop metadata, reward presentation/audio, QA routing, and regression tests. Validation artifacts are in this directory.

Recommendation ranking, the 201-dish catalog, grant/progress/persistence logic, SessionChip, source artwork, portrait derivatives, and detail-page content are unchanged. All 479 protected files match the before-pass SHA-256 baseline: [protected-results.json](protected-results.json). Existing unrelated untracked files were preserved. Restaurant component edits only replace the favorite control's fixed top coordinate with the shared header inset.

**2. Safe-area / top-spacing strategy**

`chrome.css` defines `--nom-safe-top: env(safe-area-inset-top,0px)` and `--nom-header-inset`. Production and Preview builds reserve only the actual inset. The old simulated status height is confined to the development design preview.

Home and Discovery consume the inset once through the production StatusBar spacer. Home's extra safe-top padding is removed. FlowHeader reserves inset + 52px and puts 44px controls inset + 4px below the top; collection background padding no longer adds a second top inset. Recommendation headers, nearby content and dish back controls use the same variable. The existing `viewport-fit=cover` declaration remains. On desktop, the actual inset normally evaluates to zero. Production renders no fake time, Wi-Fi or battery UI.

**3. Discovery single-frame strategy**

Discovery now uses `min-height:100dvh`, with intrinsic content and a bottom safe inset. The 956px/1150px canvas minima are removed. Header, artwork, card height, spacing and CTA use `clamp()` with `dvh`; Continue stays last in document flow and uses remaining space through its auto top margin.

Food/Flavor cards use 84–125px minimums and Adventure rows 64–100px. Continue uses a 52–80px minimum. Region uses compact 64px two-column cards on viewports up to 1000px tall: small art beside a readable 16px title, existing 12px examples across the full card width, and permanent selected-check clearance. Its Surprise Me copy and reserved 38px indicator slot remain intact. Questions stay 26–30px. No fixed-height clipping is introduced; large text and unusually short viewports can scroll.

These dimensions target common Safari phone frames, but automated DOM tests cannot prove the rendered single-frame fit. Verify Steps 1–4 with Safari toolbars expanded and collapsed at 100% zoom.

**4. View All Progress alignment**

Home's View All Progress and Recently Explored → See all use the same flex row: centered items, 6px gap, a block 8×12px arrow box, and a 44px minimum link target. Their section containers and destinations are retained. Dish Detail's See all layout was not modified.

**5. Recommendation artwork seam**

Map and wave now share a 308px illustration wrapper. The map retains its existing crop/opacity; the wave anchors to the wrapper bottom with a 1px overlap instead of an unrelated absolute top. The original wave SVG is retained. Heading and artwork retain their design-relative positions while following the real top inset.

The wrapper gives both layers one bottom edge at 390px and 440px widths. Actual Safari raster seam/edge verification at those widths remains pending.

**6. CTA size normalization**

All three recommendation actions share full wrapper width, symmetric 23px gutters, 63px minimum height, the same radius, and 11px gaps. Equal fractional grid rows keep their outer heights equal if text needs more space. Nearby, More Options and Surprise Me keep their respective colors, icons and destinations.

**7. Why This Matched**

The full-width bitmap band and separate glass overlay are replaced with one crisp 18px rounded aqua foil card: thin teal edge, inset edge light, subtle depth, and a readable dark text layer. A diagonal white/aqua gloss sweep runs once for 1800ms when at least 25% of the card enters the viewport. Two small sparkles run once with a 420ms stagger. The observer disconnects after entry; updating the explanation does not replay it.

Reduced motion keeps the premium gradients, edge and depth completely static. There is no tilt, repeated shake or infinite effect. The earned explanation text and matching logic are retained.

**8. Search focus**

The rounded search pill now receives a visible 2px teal `:focus-within` outline with a 3px offset. The input's own focus outline/shadow is suppressed. Focus remains visible for keyboard users and the pill shape is retained while typing. Other controls retain the global keyboard focus treatment.

**9. Country-by-country thumbnail diagnosis**

Each PNG master was downsampled losslessly to the card derivative's dimensions and compared with its existing WebP. Mean absolute RGB error is approximately 1.59–1.90 on an 8-bit 0–255 scale. Neither the PNG masters nor WebP cards contain embedded color profiles; [metadata checks](country-color-metadata.json) found no ICC/profile loss. The original portraits themselves use pale pastel palettes; no obvious conversion-induced color washout was found. The common 22% crop also includes more pale water, paving, mist or lower empty background than these upper landmark crops.

| Country | RGB mean error | Chosen object-position | Composition retained |
|---|---:|---|---|
| Colombia | 1.901 | center 14% | Colorful façades, flowers, church towers and blue sky |
| United States | 1.752 | center 14% | Bridge, skyline and Statue of Liberty; less pale water |
| Japan | 1.627 | center 8% | Fuji, red torii, blossoms and pagoda; less lower mist |
| Italy | 1.722 | center 8% | Colosseum, rooftops and foreground foliage; less pale paving |
| India | 1.593 | center 8% | Taj Mahal dome, trees and floral framing; less empty courtyard |
| China | 1.594 | center 8% | Temple, mountains, blossoms and Great Wall; less empty foreground |
| France | 1.699 | center 14% | Eiffel Tower, façades and foliage; less pale river foreground |

[Master vs derivative and crop alternatives](country-crop-comparisons.png): rows China, Colombia, France, India, Italy, Japan, United States. In each row the left pair shows the lossless master reference and card derivative; the right four crops are 0%, 8%, 14%, 22%, read left-to-right then down.

[Final before/after crops at 390px and 440px](country-final-before-after.png): rows follow the table above; columns are 390px before/after, then 440px before/after. These are offline object-fit crop reconstructions at 77px card height, not browser screenshots. [Metrics](country-conversion-diagnosis.json) and [choices](country-crop-choices.json) are retained.

No WebP regeneration was warranted. Source masters, card WebPs and portrait backgrounds are unchanged. CSS remains `opacity:1; filter:none`. Crops improve landmark composition but preserve the original pastel color; they cannot make these masters as saturated as Cambodia without changing the artwork itself.

**10. Mystery Box animation by rarity**

All tiers retain the fixed theatre, preloaded artwork and stage order. Presentation timers and CSS run on the same rarity-scaled clock. Anticipation compresses/wiggles the gift, the lid pops decisively, expanding rings and particles release, and the character overshoots into a clean settle.

| Rarity | Reveal duration | Particles / rings | Treatment |
|---|---:|---:|---|
| Common | 1550ms | 6 / 1 | Warm glow, 48px lid lift, small character overshoot |
| Rare | 1850ms | 10 / 2 | Brighter aqua energy, 66px lift, larger radial burst |
| Epic | 2150ms | 14 / 3 | Violet/aqua layered rings, 86px lift, stronger glow and reveal |
| Legendary | 2550ms | 18 / 4 | Gold light and ring depth, 110px lift, largest burst and longer settle |

Particles/rings fade away before the final collection action. Effects use one bounded sequence, with no repeated rapid flash. Reduced motion disables animation/rings/particles and follows the existing short 220ms reveal sequence with static artwork.

The domain reducer and guarded deterministic grant are unchanged. Tests retain rapid-tap, duplicate, revisit, abandoned-open, reload and StrictMode coverage.

**11. Sound by rarity**

All sound remains original WebAudio oscillator synthesis, started only by an enabled Open interaction. The shared saved preference, mute cancellation, reduced-motion suppression and once-per-open guard are retained. Master gain remains 0.3; individual peaks remain at or below 0.05.

| Rarity | Sound | Approximate tail after reveal cue |
|---|---|---:|
| Common | Soft low pop and two glass notes | 0.55s |
| Rare | Low transient and rising three-note motif | 0.92s |
| Epic | Rounded bass drop and layered crystal ascent | 1.20s |
| Legendary | Warm bass foundation, rising major motif and soft high harmonics | 1.73s |

The cue tracks the rarity's character-reveal time. Longer tails survive the natural transition to the settled reveal; mute or leaving the screen stops them. Actual iPhone speaker/headphone listening remains pending.

**12. Reward QA Preview instructions**

The exact enabling flag is `VITE_ENABLE_REWARD_QA=true`. It is off when absent or false, including in local development. Routes are compiled at build time. A Vercel Production build forcibly disables it in `vite.config.js`, even if the flag is accidentally present. There is no normal production navigation entry. Flagged local development keeps the existing Profile developer link; flagged Preview builds use the direct URL.

In the Nom Vercel project's **Settings → Environment Variables**, add `VITE_ENABLE_REWARD_QA` with value `true`, selecting **Preview only**. Optionally scope it to the QA branch. Build a new Preview deployment from this change and open `https://<preview-deployment-host>/dev/rewards` on the phone. Existing deployments do not pick up changed variables; a new build is required. These environment scopes and new-deployment behavior are documented by [Vercel](https://vercel.com/docs/environment-variables).

Choose Cambodia to inspect the designed characters. Trigger Common/Rare/Epic/Legendary, then tap the box to run closed → opening → reveal. Toggle Sound on before opening; toggle it off during playback to check immediate mute. The motion selector applies to the next preview and can follow the device or force reduced motion. Replay, final reveal, reset and test collection view remain available. Other countries keep their existing Coming Soon character treatment.

The playground uses an isolated context with memory-only display fixtures. It never calls the real beginBox/openBox actions, invokes the grant reducer, adds an earned collectible, or writes real collection/progress. The sound preference is the only intentional persisted QA setting. Regression tests check surrounding Experience state and saved storage.

Local development:

```sh
VITE_ENABLE_REWARD_QA=true npm run dev
```

For local production-style chrome:

```sh
VITE_ENABLE_REWARD_QA=true npm run build
npm run preview -- --host 0.0.0.0
```

No deployment or Vercel settings were changed during this pass. [Build inclusion checks](reward-qa-build-checks.json) confirm the route/UI/chunk are absent in default output, present in flagged Preview output, and absent in flagged Vercel Production output.

**13. Tests / build results**

Focused regression run: **79 tests passed across 7 files**. Full run: **838 tests passed across 48 files**. `npm run build`, its catalog validation, and `npm run catalog:check` passed: **201 unique dishes**, unchanged spreadsheet order. `git diff --check` passed. Protected-file verification: **479/479 unchanged**.

[Focused tests](focused-tests.log), [full tests](full-tests.log), [production build](production-build.log), [catalog check](catalog-check.log), [QA Preview build](qa-preview-build.log), [Production guard build](qa-production-guard-build.log).

New regressions cover real safe-area ownership, discovery canvas removal and selected clearance, Home arrows, shared artwork anchor, equal CTA sizing, rounded keyboard search focus, one-shot/reduced-motion Why Matched, default-off QA routing, every QA rarity without real state actions/mutations, and unfiltered country art. Existing box tests cover reduced motion and grant integrity; audio tests cover scheduling, bounded gains, mute, context failure and stale resume cleanup.

React review checked lazy feature loading, stable isolated preview actions, timer/observer cleanup, functional state updates, readable text, and keyboard/reduced-motion behavior.

**14. Remaining phone visual QA**

Browser verification could not run: the in-app browser reported no available browser and listed no sessions; agent-browser was absent and its isolated install failed with package-registry DNS resolution. The production reference was also inaccessible through the web reader. No rendered browser screenshot or native Safari/audio acceptance is claimed.

On a flagged Preview at normal Safari 100% page zoom, check:

- Home/Discovery/Collections/Dish Detail/Profile top controls below the real safe area, with no oversized empty status region or fake chrome.
- Steps 1–4 on common shorter/taller iPhones with toolbars expanded/collapsed: Continue visible, readable labels and no selected-state movement. Increase text size to verify scrolling fallback.
- Home arrow centering; all three recommendation action sizes; map/wave edge at approximately 390px and 440px.
- Why Matched gloss on first viewport entry, static reduced motion, and rounded search focus while typing/using an external keyboard.
- The seven thumbnail crops in the actual browser, preserving their source palette; Cambodia detail and non-Cambodia Coming Soon content.
- All four reward tiers: lid pop, character climax, ring/particle fade, sound distinctions/volume, immediate mute, replay/reset and short static reduced motion. Return to normal progress/collection and confirm unchanged counts.

The enlarged accidental-zoom screenshot was not treated as a regression. Dish Detail's existing See all alignment and the sticky bottom navigation implementation were left intact.
