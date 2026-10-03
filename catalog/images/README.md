# Canonical dish photos

`manifest.json` has one entry per canonical dish ID, in the same order as the
201 generated catalog records. It is independent of workbook metadata and
recommendation scoring. `coverage-report.json` and
[`docs/missing-dish-images.md`](../../docs/missing-dish-images.md) enumerate every
remaining placeholder, with the reason.

## Current coverage

Ten supplied local dish photos are preserved. No new photo was imported in this
milestone: shell downloads failed with `Could not resolve host`, and the web
connector returned source-page text rather than transferable image files.
The workbook's Images sheet contains search-page references, no direct image
files or completed creator/license fields. Remaining coverage is 191 placeholders.

Run `npm run images:remaining` after preparation/import to regenerate
`remaining-image-manifest.json`. Each outstanding record includes the dish ID,
name, country, expected local WebP filename/path, alternate names, Commons and
Openverse search queries/links, and visual-review notes. These are external-fill
references, not approved runtime images. The existing import gates remain intact.
The expected filenames are optimized outputs. The manual workflow below stages
originals and records human review. The external fetcher uses a separate,
explicit metadata-selection gate; it never claims a human reviewed a photo.

Source candidates for Arepa, Kuy Teav, and Fish Amok are recorded separately in
the manifest. Candidates are **not** approved photos or runtime URLs. Reshteh
Polow must not accidentally receive an Ash Reshteh soup or pastry photo.
Existing supplied photos retain unknown attribution where none was supplied;
the pipeline does not invent licenses for them.

## Automatic acquisition from your normal Mac Terminal

`scripts/fetch-dish-images.py` reads `remaining-image-manifest.json` and uses
Wikimedia Commons without an API key. Run it **outside the Codex sandbox**; no
downloads were attempted there for this correction milestone. Requirements:
Python 3.9+, Node (already used by Nom), macOS `sips`, and `cwebp`. With Homebrew
installed, the complete commands are:

```sh
cd /Users/leng/Projects/nom
brew install webp
python3 scripts/fetch-dish-images.py --dry-run --batch-size 5
python3 scripts/fetch-dish-images.py --batch-size 191
```

The dry run makes Commons metadata searches and writes
`catalog/images/fetch-dry-run-report.json`; it downloads **no image bytes** and
does not change the source manifest, photos, attribution files or runtime maps.
The normal run selects/imports eligible photos without a confirmation for each
dish. It skips all good mapped local images and never replaces the original ten.

Selection requires the complete canonical name or catalog alias in a filename
or caption **and** dish-country evidence in that title/caption/categories. It
does not accept query rank as proof. Exact name + country searches are preferred;
up to three complete-name/alias queries are tried, followed by a complete-name
search without the country query term if necessary. Country evidence remains
mandatory in the returned metadata, accommodating demonyms such as “Japanese”.
There is never a generic food fallback.
Menus, logos, maps, obvious non-food captions, conflicting filename countries,
small/unsupported images, extra restrictions, missing creators and incomplete
or unsupported license declarations are rejected. Supported declarations are
CC BY / CC BY-SA 2.0, 3.0 or 4.0, CC0 1.0, or a public-domain mark with the
corresponding machine-readable URL. Uncertain dishes retain placeholders.

The implementation follows [MediaWiki Search](https://www.mediawiki.org/wiki/API:Search),
[Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo), and
[Commons attribution metadata](https://commons.wikimedia.org/wiki/Commons:Machine-readable_data).
It stores creator, source page, credit, original/normalized license, license URL,
download URL, source checksum, selected query and original matching metadata.
API metadata can be incomplete or wrong: automated matching is **not** human
visual verification. Imported entries explicitly keep `visuallyReviewed: false`
and `needsVisualReview: true`. Inspect successful imports before shipping them;
the script leaves ambiguous cases unresolved rather than selecting random food.

Downloads are direct HTTPS Wikimedia files with a 20 MB cap. Originals are staged
under `src/assets/food/incoming/`. The existing importer validates the saved
selection evidence, checks decoded dimensions, converts at WebP quality 82,
limits the maximum edge to 1200px without upscaling, and writes
`src/assets/food/catalog/<canonical-dish-id>.webp`. Runtime maps, dimensions,
credits, coverage and remaining-image reports regenerate offline after the run.
Neither catalog/workbook data nor recommendation scoring is changed.

To run smaller resumable batches:

```sh
python3 scripts/fetch-dish-images.py --batch-size 20
```

Repeat that command to advance through pending dishes. Completed imports are
skipped without redownloading. Failed dishes are skipped on subsequent normal
runs so they cannot block later batches. To retry them explicitly:

```sh
python3 scripts/fetch-dish-images.py --retry-failed --batch-size 20 --retries 2
```

Transient network failures get at most two retries by default, bounded backoff
and rate-limit handling. `--retries` accepts 0–5; requests are spaced by 0.8s
(configurable via `--delay`, minimum 0.5s). No Google Images, Pinterest or live
runtime hotlinks are used. Individual failures do not stop other dishes.

`catalog/images/fetch-report.json` checkpoints success/failure/pending status for
every dish, with source/evidence or failure reasons. Successes from earlier
batches remain in the report even after the remaining manifest shrinks. Staged
sources can be reused on retry when their selection evidence and checksum match.
Unmapped existing output files are reported for inspection rather than
overwritten. Ctrl-C saves completed work and regenerates maps; rerun to resume.
If a process was killed outright and left `.fetch.lock`, confirm it is no longer
running before removing that empty lock directory. A second simultaneous fetch
is blocked to protect mappings.

Offline fixtures run with `python3 -B scripts/test_fetch_dish_images.py` and are
included in `npm test`. Live API/download verification is still pending the
first normal-Terminal run; the Codex sandbox did not run either fetching mode.

## Local import workflow

1. Identify the actual dish and review the photo, source, creator and license.
2. For a `needs-image` entry, supply `creator`, `sourcePageUrl`, `license`,
   `licenseUrl`, and either `imageDownloadUrl` (direct HTTPS Wikimedia image)
   or `inputPath` (local photo under `src/assets/food`). A downloaded local file
   from another reuse-permitting source can use `inputPath`.
3. Only after visual/source review, set `visuallyReviewed: true` and
   `status: "approved"`. Copy candidate metadata into the approved fields;
   candidate fields alone never enable import.
4. Run `npm run images:import`. Import requires macOS `sips` and `cwebp`.
   The app itself does not require these tools. The importer checks metadata,
   rejects search pages and existing-photo replacements, limits remote files
   to 20 MB, and converts to quality-82 WebP with maximum edge 1200px and
   no upscaling. Failed imports retain placeholders and report the error.
5. Inspect the actual imported local photo in both a card and Dish Details.
   Commit the photo, manifest, generated maps, credits and coverage report together.

`npm run images:prepare` is offline: it validates mappings and regenerates maps,
credits, dimensions and reports without downloading anything. Run it after an
intentional metadata/mapping change. Runtime maps are generated in
`src/data/dishImageAssets.js`, merged with the protected originals in
`src/data/dishImages.js`, and used by the existing catalog adapter. Intrinsic
dimensions feed the shared Image component; layout cropping remains a UI concern.

Attribution is machine-readable in `src/data/dishImageCredits.json` and displayed
at `/image-credits`. Runtime dishes never use manifest search references,
candidate URLs or remote hotlinks. No dish descriptions, review status, taxonomy,
ranking, weights or workbook cells change during image preparation/import.
