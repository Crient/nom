# Nom V1 consolidation

This records the completed core milestone. The subsequent
[content/navigation milestone](v1-content-navigation.md) adds functional Home
actions, Progress, Profile, Favorites, History and the guarded dish-photo pipeline.

## Run locally

From this repo, run `npm run dev` and open the localhost address Vite prints.
Use `npm test` for automated tests and `npm run build` for strict catalog
validation followed by the production bundle. `npm run preview` serves that
bundle. There are no provider credentials, paid services, or backend requirements.

## Connected journey

Home → Discovery → Matches → More Options → Dish Details → Nearby → Restaurant
Details → Verify Visit → Feedback → Logged → Mystery Box → Unlock → Collections
→ Home is connected through visible controls. In the painted noodle session,
Num Banh Chok in More Options supports the complete mock journey. Lort Cha and
Bai Sach Chrouk also have explicit mock menu support. Other catalog dishes
correctly show an empty development restaurant state.

The recommendation engine, weights, taxonomy, and all 201 catalog records are
unchanged by consolidation. Results are sliced by rank; UI screens never sort
dish results. Restaurant sorting applies only to restaurant provider records.

## State and persistence

- Discovery Context owns preferences. Recommendations derive from those values.
- Selected dish/restaurant IDs live in routes, not competing selected-item stores.
- Favorites Context owns dish IDs and restaurant IDs separately.
- Experience Context owns visit drafts, logs, daily credit, progress, boxes,
  collectible unlocks, and collectible favorites. UI progress is a projection.
- Feedback option IDs are shared between the page and persistence validation.

Local storage uses `{version: 1, data}` envelopes under `nom.v1.discovery`,
`nom.v1.favorites`, and `nom.v1.experience`. Persisted experience data contains
completed logs, box-opening events, and collectible favorites. Progress, earned
credit, pending boxes, and unlocks are reconstructed through the same reducer
used while navigating. This avoids independently stored, conflicting counters.

Draft visits, loading state, map filters, and navigation return state are not
persisted. Refreshing an unfinished visit offers recovery instead of inventing
a completed meal. An interrupted box rehydrates as ready and can be reopened
without granting a second reward. Completed log routes survive refreshes.

Canonical IDs, verification methods, reactions, observations, calendar days,
dates, and unique log IDs are validated on hydration. Invalid records are
ignored safely; corrupt or repaired source data is backed up under a
`.recovery.<timestamp>` key before replacement. Legacy unversioned data can be
salvaged. Newer schema versions remain untouched. If recovery storage cannot be
written, the original stays intact. Unavailable/full storage falls back to
in-memory behavior. No reset, data deletion, credentials, or synchronization is
introduced. This is a local prototype, not an authoritative reward backend.

## Figma audit references

Authenticated MCP design contexts and screenshots were inspected in file
`xVMCeNJV8S3axojtIgtoCr`:

| Section | Frames |
| --- | --- |
| Welcome/Home | `330:8131`, `263:3630` |
| Discovery | `263:3768`, `263:3804`, `263:4018`, `263:4056` |
| Recommendations | `263:4127`, `263:4258`, `263:4426` |
| Restaurant discovery | `263:4540`, `263:5531`, `263:4729` |
| Verify/log | `263:4807`, `263:4864`, `263:4936` |
| Box/unlock | `263:5313`, `263:5356`, `263:5398` |
| Collections | `263:5000`, `263:5150`, `263:5451` |
| Edge modals | `263:3843`, `263:3891`, `263:3933`, `263:3973` |

Corrections include collectible/rarity/inspiration asset mappings, Lumi's
overlay geometry and warm detail surfaces, collection card footers and filter
pills, and dynamically projected country progress. The current Dish Details
frame `263:4426` shows **Peephuptmei: 16 mi**; the mock retains that value.

Intentional differences: real recommendation scores replace Figma example
percentages; progress follows eligibility rather than contradictory painted
counters; restaurant menus link to canonical catalog dishes instead of inventing
Sach Ko Ang or Beef Lok Lak records. Static map labels remain an illustration
and are not interpreted as live search results or coordinates.

## Interaction, responsiveness, assets, and performance

Native buttons/links, pressed states, labels, meaningful image descriptions,
keyboard focus, modal trapping/Escape/restoration, and reduced-motion box
animation are in place. Shared filters retain 44px hit areas around smaller
Figma pills. Recovery buttons name their actual destinations. Shared raster
images fall back to the existing plate placeholder on failure.

The shell remains mobile-first and capped at 440px on desktop. Existing container
rules cover narrow Nearby layouts; shared composition uses wrapping text/chips
and flexible grids. Collection/feedback/edge styles accommodate smaller phones.
Browser evidence from earlier work exists, but this consolidation's final
360/375/390/440/desktop rendering pass could not be run under current tool access.
Do not treat DOM tests as pixel/layout verification.

Restaurant, visit, reward, and recommendation pages now load on demand behind
one accessible Suspense fallback. Shared theme variables are emitted statically
so lazy ordinary CSS can use existing font/rarity roles even without matching
Tailwind utility classes. [Tailwind's documented behavior](https://tailwindcss.com/docs/theme#generating-all-css-variables)
supports this choice. No WebGPU, hardware shader, or map SDK is required.

Removed unused scaffold components, the obsolete painted progress dataset and
its three exclusive SVG tracks, two unused menu images, and stale comments/CSS.
Original high-resolution source image files are retained as authoring assets;
runtime references use optimized WebP/SVG. The largest runtime raster is about
449 KB. Ten dish photos remain real assets; 191 dishes retain the plate placeholder.

## Representative browser walkthrough still required

Use a browser where Chromium can launch. At 390px, start at Welcome/Home and
choose Noodle, Spicy + Comforting, Feeling Adventurous, Southeast Asia. Open More
Options, Num Banh Chok, save it, Find nearby, THMOR DA, save the restaurant,
I ate here, Continue, Loved it, Savory, Continue. Open the earned box, wait for
Ziggy, View Collection, View Ziggy, favorite it, refresh, and return to Home.
Check that favorites and the 18-meal Cambodia total remain. Repeat the same dish
that day to see Already Counted; use Other Dishes to choose Lort Cha and log it
without duplicate rewards. Also exercise failed verification, Log without
verification, modal Tab/Escape, empty filters, and unavailable IDs.

At 360px check restaurant/menu cards, long dish names, feedback controls,
collection grid, and modals for clipping; spot-check shared screens at 375,
440, and desktop. Verify no horizontal overflow, broken images, console errors,
or focus loss. This session's in-app browser reported no available browser and
Chromium failed with macOS sandbox permission denial; no bypass was attempted.

## Remaining launch work

Restaurant menus/availability/location, maps, visit verification, and progress
rewards remain explicit development mocks. Collection progress begins with
Figma demo seeds. Non-Cambodian character variants use labeled silhouettes.
The subsequent content/navigation milestone implements Search, the Favorites
index, Surprise Me, Profile and Progress. Scan supports manual dish-code entry;
Trending uses actual local meal frequency. Camera scanning and live popularity
providers remain unconnected.

Before a public launch: finish browser/device verification; define live provider
and authoritative identity/reward contracts; finish content review, restaurant
menu verification, real imagery/artwork, and launch scope for unavailable actions.
No deployment or live integration was performed.

## Final validation evidence

- `npm run catalog:validate`: all 201 unique dishes passed strict validation.
- `npm test`: 344 tests passed across 15 files, including the catalog rejection
  cases, recommendation compatibility, connected journey, recovery, and persistence.
- Representative browser walkthrough: blocked by unavailable browser binding
  and Chromium's sandbox launch failure; not claimed as verified.
- `npm exec vite build`: production build passed. This is the same Vite build
  stage used by `npm run build`, run directly because catalog validation had
  already been performed once. Largest JS chunk: 282.71 KB; no >500 KB warning.
- Built CSS includes all shared UI/collectible/rarity font and color tokens.
  Relative source import/asset checks and `git diff --check` passed.
- Git staging was attempted, but `.git/index.lock` creation was denied by the
  sandbox's read-only Git metadata access. Changes remain uncommitted; the repo
  could not be left with a clean Git status under this session's permissions.
