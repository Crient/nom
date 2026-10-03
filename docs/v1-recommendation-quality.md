# Nom V1 recommendation quality and visual polish

The later [targeted correction](v1-recommendation-correction.md) supersedes the
70-point rule for explicit food types, reserved title/card heights, modal limits,
and manual-only image acquisition described below. This report records the
earlier milestone.

## Explicit-region ranking

The scorer and its 35/30/20/15 weights are unchanged. After the existing
deterministic score and Surprise Me tie policies, promote up to three dishes
from an explicitly selected region with a score of at least 70. Rank these
picks using their existing score/tie order, then append all remaining global
results in their original order. Backfill missing Top 3 positions globally.
More Options still consumes `results.slice(3, 10)` without duplicates or UI
sorting. Skipped region and region Surprise Me retain their previous behavior.

With all four scoring dimensions active, 70 requires 55 points beyond the
15-point region bonus. A dish with no food-type match can score at most 65,
so region alone cannot promote an obviously mismatched food type. When a
dimension is skipped, the existing normalized score still determines eligibility.
Scores describe preference fit; promotion can intentionally place a 70% regional
match ahead of a 77% global match. No percentages are increased for promotion.

For Grilled/Protein, Comforting, Try Something Different:

| Region | Previous Top 3 | New Top 3 (unchanged scores) |
| --- | --- | --- |
| East Asia | Yakitori, Bulgogi, Tonkatsu | Yakitori 92%, Bulgogi 92%, Tonkatsu 92% |
| Southeast Asia | Chicken Adobo, Aji de Gallina, Yakitori | Chicken Adobo 92%, Satay 70%, Ayam Bakar 70% |
| South Asia | Korma, Butter Chicken, Aji de Gallina | Korma 92%, Butter Chicken 92%, Seekh Kebab 70% |
| Middle East | Aji de Gallina, Yakitori, Bulgogi | Kabab Koobideh 70%, Adana Kebab 70%, Aji de Gallina 85% |
| Africa | Bobotie, Aji de Gallina, Yakitori | Bobotie 92%, Suya 70%, Yassa 70% |
| Europe | Schnitzel, Fish and Chips, Moussaka | Schnitzel 92%, Fish and Chips 92%, Moussaka 92% |
| Latin America | Aji de Gallina, Yakitori, Bulgogi | Aji de Gallina 100%, Ceviche 70%, Lomo Saltado 70% |
| North America | Aji de Gallina, Yakitori, Bulgogi | Aji de Gallina 85%, Yakitori 77%, Bulgogi 77% |

North America has no qualifying regional dish for that particular combination;
it deliberately uses global backfill. All eight regions have three qualifying
regional picks with Anything, Comforting, Try Something Different. The painted
noodle/Spicy/Comforting/Adventurous/Southeast Asia session retains its existing
full-catalog order: Lort Cha 85%, Mie Goreng 77%, Pancit Canton 77%.

## Shared presentation

`DishTitle` groups the last word and country flag without breaking between them.
Recommendation hero/list/ranked cards, details, nearby selected-dish headings,
restaurant menu cards and activity/history cards reuse it. Favorites and Explore
already reuse RecommendationCard. Flags retain accessible country names.
Complete canonical names remain visible; title text is not ellipsized or clamped.

List/ranked cards reserve a two-line title area with responsive 16–20px type.
Compact descriptions clamp visually to two lines; Dish Details retains full
descriptions. List cards have a consistent 120px minimum height. Tag spacing and
padding are tighter below 390px, retaining existing tag limits rather than
shrinking every font or hiding labels. Long exceptional names can grow instead
of being truncated; actual wrapping still needs a browser visual check.

Food and flavor labels reuse established maps. Display-only descriptors use an
explicit allowed-ID label map; unsupported IDs are omitted. The level-three
adventure tag uses the existing “Adventurous” label instead of “Adventure”.
Descriptors continue to contribute zero recommendation points.

Edge-state dialogs now use 88vw with a 400px maximum width and a 68dvh/600px
maximum height. They have no forced minimum height. Smaller artwork and readable
body text leave room for actions. Content scrolls separately from close/primary
controls; the three verification alternatives can scroll on very short screens.
Existing focus trapping, Escape dismissal, body scroll lock and trigger focus
restoration are retained and covered by tests.

## Figma comparison

Authenticated MCP context and screenshots were inspected from the final designs
in `xVMCeNJV8S3axojtIgtoCr`:

| Product area | Frames |
| --- | --- |
| Home | `263:3630` |
| Discovery | `263:3768`, `263:3804`, `263:4018`, `263:4056` |
| Recommendations / More Options / Details | `263:4127`, `263:4258`, `263:4426` |
| Restaurant Discovery / map / restaurant details | `263:4540`, `263:5531`, `263:4729` |
| Verify & Log / feedback / logged | `263:4807`, `263:4864`, `263:4936` |
| Surprise Box | `263:5313`, `263:5356`, `263:5398` |
| Collections / country / collectible | `263:5000`, `263:5150`, `263:5451` |
| Edge-state dialogs | `263:3843`, `263:3891`, `263:3933`, `263:3973` |

Progress, Profile, Favorites and History continue using the established shared
Home/Collections/card patterns; no dedicated final frames were found in the
previous final-page inspection. Layouts, artwork, navigation and image cropping
remain intact. Changes address real catalog title lengths, card rhythm, proper
labels and the explicitly requested smaller dialog proportions. Static Figma
example dish scores are not copied. Peephuptmei remains 16 mi as in Details.
No pixel-perfect app comparison is claimed: the connected browser returned no
available browser, so rendered comparison at the requested widths is pending.

## Images

Coverage remains **10 real local photos / 201 dishes**, with **191 placeholders**.
A single download-access check failed with DNS resolution; blocked downloads
were not repeatedly retried. Original photos, placeholder behavior, attribution
records and the guarded approval/import/optimization pipeline are untouched.
No guessed food images, external hotlinks or search URLs enter runtime assets.

Run `npm run images:remaining` to regenerate
[`remaining-image-manifest.json`](../catalog/images/remaining-image-manifest.json).
Every missing dish includes its canonical ID/name, country/code, expected WebP
filename and runtime path, source/search queries, aliases and review notes.
Search URLs are research references only. Unapproved candidate sources remain
explicitly unapproved. Stage originals and attribution through the existing
pipeline documented in [`catalog/images/README.md`](../catalog/images/README.md).

## Validation and manual review

Focused checks cover all eight regions, partial/no-candidate fallback, the
70-point boundary, unchanged scores, full global-tail order, deterministic ties,
neutral regions, complete names/flags, accessible card links and dialog focus.
The existing 2,160-session full-catalog matrix still checks all 201 records,
scoring, uniqueness, immutability and determinism, with regional promotion
explicitly accounted for. Catalog records, workbook, taxonomy, persistence,
Mystery Box rules, duplicate protection and collection logic are unchanged.

Final validation results:

- Strict catalog validation: 201 unique valid dishes, no taxonomy exceptions.
- Focused recommendation, card, dialog, image mapping and route checks: 71 tests
  passed across eight files.
- Full app suite: 381 tests passed across 20 files, including the 2,160-session
  compatibility matrix and 25 catalog rejection cases. Run once at milestone end.
- Production build: passed, 302 modules transformed. Largest JS chunk 284.71 kB
  (86.91 kB gzip). `npm exec vite build` ran the production stage after the one
  strict validation run, avoiding a second validation via `npm run build`.
- No warnings/errors appeared in test or build output; runtime console inspection
  remains pending because no browser was available.

Manual review remains necessary at **360, 375, 390 and 440px**, plus desktop:

- Judge regional Top 3 relevance, especially 70% regional promotions and sparse
  regional coverage with global fallback.
- Inspect Baasto iyo Suugo, Nashville Hot Chicken and Montreal Smoked Meat
  Sandwich across ranked/list/hero cards; confirm complete names, attached flags,
  title spacing, compact descriptions and no unnecessary third chip rows.
- Open progress, already-counted, failed-verification and feedback dialogs;
  check visible actions, inner scrolling and short/landscape screens.
- Review shared cards in Favorites, History, Explore and restaurant menus.
- Confirm the ten real food images are correctly identified; remaining photos
  require external source acquisition and approval before import.

This milestone does not deploy the app.
