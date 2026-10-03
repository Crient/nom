# Nom V1 targeted recommendation/card/image correction

Subsequent More Options adjustment: Top Matches remains unchanged. Additional
cards now use `selectMoreOptions`: remaining selected-region dishes scoring
at least 40% first, then qualifying cross-region dishes, preserving score/tie
order within each group. The seven-card limit remains. Skipped/Surprise Me
region still uses the original global slice. The cross-region boundary is
labeled “Similar dishes from other regions”.

For the Latin America noodle example, More Options now shows Feijoada, Arroz
Chaufa, Ají de Gallina, Jerk Chicken and Mofongo (42% each), then Lort Cha and
Reshteh Polow (70% each). The lower cutoff intentionally admits partial
flavor/adventure fits; with all dimensions active, region + half the selected
flavors + a one-level adventure fit earns 42, while region + adventure alone
earns at most 35. No scores or taxonomy values changed. The sections below
record the preceding milestone.

More Options verification: 74 focused recommendation/page/route checks passed,
including all eight regions and the existing 2,160-session score/determinism
matrix. The full suite was not run for this adjustment. One `npm run build`
passed, including validation of all 201 catalog dishes.

## Candidate selection, not a threshold

For an explicit real region and food type, Top Matches now consumes:

1. Selected region + food type, in existing score/tie order.
2. Other dishes from the selected region, in existing score/tie order.
3. Global backfill only if that region contains fewer than three dishes.

Only the first three picks are promoted. All remaining results retain their
original global score/tie order, so More Options remains `results.slice(3, 10)`.
Within each regional food-type tier, food/region contributions are constant;
the existing score therefore ranks flavor/adventure fit without new weights.
Scores are unchanged, including low percentages where preferences fit poorly.
Anything keeps its previous >=70 regional promotion behavior. Skipped region
and region Surprise Me keep their existing neutral scoring/tie policies.

Noodles + Comforting + Spicy + Adventurous + Latin America previously returned
Lort Cha 70%, Reshteh Polow 70%, Rechta 70%. It now returns **Sopa de Fideo 69%,
Tallarines Verdes 62%, Locro 50%**. The first two are the catalog's Latin American
noodle dishes; Locro is the highest-scoring remaining regional dish. Lort Cha
70% is first in More Options. No catalog additions or taxonomy edits were made.

For those same preferences, representative Top 3 across all eight regions:

| Region | Top Matches |
| --- | --- |
| East Asia | Dandan Noodles 77%, Zhajiangmian 77%, Jjajangmyeon 77% |
| Southeast Asia | Lort Cha 85%, Mie Goreng 77%, Pancit Canton 77% |
| South Asia | Dal Dhokli 85%, Idiyappam 77%, Thukpa 77% |
| Middle East | Reshteh Polow 85%, Manti 62%, Ash Reshteh 50% |
| Africa | Rechta 85%, Baasto iyo Suugo 85%, Doro Wat 50% |
| Europe | Spätzle 77%, Carbonara 69%, Cacio e Pepe 69% |
| Latin America | Sopa de Fideo 69%, Tallarines Verdes 62%, Locro 50% |
| North America | Saimin 77%, Macaroni and Cheese 69%, Baked Ziti 69% |

## Content-driven compact cards and smaller dialogs

Compact titles no longer reserve a second line. They have a maximum of two
visible lines; the complete canonical name remains in the accessible card link
and DOM. Exceptionally long names beyond that limit can be visually clamped.
`DishTitle` keeps the final word and flag together without dish-specific rules.
Fixed/minimum card and photo heights, and the description's reserved two-line
minimum height, were removed. Images stretch to actual card content. Descriptions
still clamp at two lines; tags wrap without reserved rows.

Info/edge-state dialogs are now 87vw (400px max) with a maximum height of 58dvh
or 520px. They use content-driven heights, smaller artwork and inner scrolling
while retaining 44px close targets, 52px primary actions, focus trapping, Escape
dismissal and focus restoration. No other app layout changes were made.

## External image workflow

[`scripts/fetch-dish-images.py`](../scripts/fetch-dish-images.py) adds automatic
Commons metadata selection, bounded retries, batches, dry runs, resumable local
imports and checkpointed per-dish reports. The source input is the existing
remaining-image manifest. The existing WebP importer and runtime generator are
reused; automatic matches carry saved evidence and pending human visual review.
Manual-source approval remains supported. Full Terminal commands, source filters,
dependency setup and resume instructions are in
[`catalog/images/README.md`](../catalog/images/README.md).

No sandbox image fetching was attempted. Coverage remains 10 supplied images
and 191 placeholders until the external script is run. Offline tests cover
metadata rejection, attribution, retry limits, dry-run isolation, batch resume,
per-dish failures, path drift, file preservation and manifest locking.

## Verification

Final results:

- Focused recommendation, full-catalog compatibility, app-route, card/title,
  dialog, image mapping and fetcher checks: 71 tests passed across eight files.
- Fetcher fixtures: 16 Python offline checks passed, including country-evidence
  fallback and checksum-verified staged-source resume. Included in the full suite.
- Full app suite: 385 tests passed across 21 files. Run once at milestone end.
  Existing 2,160-session deterministic/scoring coverage remains intact.
- `npm run build`: passed, including strict validation of 201 unique catalog
  dishes and 302 transformed modules. Largest JS chunk remains 284.71 kB
  (86.91 kB gzip). Production build run once.
- `git diff --check`: passed. No runtime image, catalog record, taxonomy,
  workbook, shared-context or persistence changes were made this correction.

Browser rendering at 360/375/390/440px still needs manual confirmation; connected
browser automation was unavailable in the preceding pass. Live Commons results
and image identity need a normal-Terminal run and subsequent visual review.
No deployment is included.
