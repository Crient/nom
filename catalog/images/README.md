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

Source candidates for Arepa, Kuy Teav, and Fish Amok are recorded separately in
the manifest. Candidates are **not** approved photos or runtime URLs. Reshteh
Polow must not accidentally receive an Ash Reshteh soup or pastry photo.
Existing supplied photos retain unknown attribution where none was supplied;
the pipeline does not invent licenses for them.

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
