# Nom V1 content and navigation completion

The subsequent [recommendation-quality milestone](v1-recommendation-quality.md)
documents explicit-region ranking and shared card/dialog polish added after this
navigation milestone.

## Design references

Authenticated Figma MCP inspection of file `xVMCeNJV8S3axojtIgtoCr`, final page
`1:7`, confirmed Home `263:3630` and Collections `263:5000` as the closest
references. No dedicated final Progress/Profile/Favorites/search screens were
present. New destinations reuse their typography, semantic teal colors, cards,
country progress, pills, headers, collectibles and persistent navigation.
Recommendation geometry and actual scores remain unchanged.

## Destinations and navigation

| Route | Behavior |
| --- | --- |
| `/explore` | All 201 dishes in catalog order; actual name/alias/country/flavor search and food-type filters. Cards have no invented match percentages. |
| `/explore?view=trending` | Counts only local logged meals; explicitly labeled local trends, with an empty state before any meal. |
| `/explore?action=log` | Explains the existing dish → restaurant → I ate here flow. Unsupported mock menus retain their empty state. |
| `/favorites` | Dishes and restaurants from Favorites Context, collectibles from Experience Context. Shared hearts and removal; empty states. |
| `/history` | Actual dish views and completed meal logs, sorted by activity date; filters for views/meals; selected-dish and meal return navigation. |
| `/progress` | Actual exploration totals plus existing eight country progress cards, collection links, eligible box links and authoritative progress explanation. Demo seed totals are disclosed. |
| `/profile` | Local avatar/name, summaries, saved items, preferences, destination links, photo credits. Name persists locally. No account or reset controls. |
| `/scan` | Manual canonical dish-code/Nom-link entry with error state; camera scanning explicitly unconnected. |
| `/image-credits` | Actual image attribution records, including unknown provenance for the ten supplied photos. |

Home search, Trending, Scan, Log Meal, Favorites, Progress, See all and Surprise
Me now work. Surprise Me uses existing `anything`/`surprise-me` preference IDs
and preserves flavors; missing flavors still require the real discovery question.
Welcome's Profile CTA and persistent Profile tab now open Profile. Collections
also has persistent navigation. Selected search/saved dishes survive the four
discovery steps when preferences are missing; skipped region remains valid.
Back buttons preserve approved internal origins, including filtered search and
history URLs, country collections, Profile and Progress.

## State and existing protections

The new lightweight Activity Context persists `displayName` and unique canonical
`{dishId, viewedAt}` entries under a separate version-1 `nom.v1.activity` key.
It records only valid rendered dish details. It never awards meal/box credit.
History merges these views with existing Experience logs; totals count unique
dishes/countries and actual logs. The static Recently Explored fixtures were
removed. Favorites Context exposes its existing ID lists without creating another
favorites store. Collectible favorites remain authoritative in Experience.

Existing discovery/favorites/experience keys, corrupt-data recovery, newer-version
write protection, country demo seeds, three-eligible-experience box rule and
once-per-dish/day reward protection are preserved. No development progress was
reset. The workbook, generated 201 records, taxonomy and recommendation engine
are unchanged. Catalog browsing and chronological/local-log sorting do not sort
recommendation results.

## Image coverage

Coverage remains **10 → 10** real local photos, **191 placeholders**. Source
downloads are blocked in this session; no incorrect or unreviewed replacement
was shipped. The canonical manifest, guarded import/optimization workflow,
generated ID map, intrinsic dimensions, credits and full missing-dish report are
in [`catalog/images`](../catalog/images/README.md). Three candidate source pages
are recorded separately; they still need actual file transfer and visual approval.

## Remaining development behavior

Restaurants/menus/maps/ratings and visit verification remain development examples.
Only the three previously supported canonical dishes have mock restaurant menus.
Progress/collectible seeds remain Figma examples; non-Cambodian character art uses
existing silhouettes. Trending is local meal frequency; Scan accepts text, not
camera imagery. No live API, auth, GPS, deployment, paid service, AI or WebGPU
was added.

## Manual browser pass

The Browser integration returned “No browser is available”; browser discovery
returned no connections. DOM tests verify interactions, not rendered geometry.
At 360/375/390/440px and desktop, inspect Home's long profile names, fixed bottom
navigation and last card visibility; wrapping filters/chips; long dish names and
restaurant favorites; Progress country cards; collectible favorites; keyboard
focus and back navigation. Shared hub grids use flexible columns, wrapping
controls and narrower container spacing; the established app shell caps desktop
at 440px. Test a saved dish without preferences through discovery, refresh Profile,
log a meal and inspect Home/History/Progress, then check an eligible box and a
same-day repeated dish. Check images and console output in the actual browser.

## Validation

- `npm run catalog:validate`: passed for all 201 unique dishes, with no taxonomy exceptions.
- Focused destination/image/persistence tests: **15 passed across 3 files**.
- `npm test`: **353 passed across 17 files**, including strict rejection tests,
  full-catalog recommendation compatibility, connected meal/reward flows and persistence.
  The complete suite was run once after implementation; no failures required reruns.
- `npm exec vite build`: passed, **300 modules**, largest JS chunk **284.33 KB**
  (**86.79 KB gzip**), no >500 KB chunk warning. The production build ran once;
  this is the Vite stage of `npm run build`, after its catalog validation stage
  had already passed separately.
- `npm run images:prepare`: passed; mapping/report/credits generated offline.
- Relative import/asset check: no missing imports. `git diff --check`: passed.
- Automated runs emitted no application console warnings/errors. Actual browser
  console and pixel geometry still need the manual pass described above.

Run locally with `npm run dev`; use the URL Vite prints.
