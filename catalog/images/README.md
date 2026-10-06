# Nom dish image workflow

Dish scoring, catalog taxonomy and workbook data are independent of this pipeline.
`manifest.json` contains all 201 canonical IDs in catalog order. Search URLs are
reference metadata, never runtime photos. Final human-reviewed integration now
resolves all **201 dishes: 199 generated images and two retained real photos**.
Raw candidates, previous pixels and attribution remain preserved. The execution
record is [final-image-integration.md](../../image-audit/results/final-image-integration.md).

## Image review is separate from storage

`status` describes storage (`needs-image`, `staged`, `existing-local`,
`licensed-local`, `generated-local`; legacy staged `approved` is still supported).
`reviewStatus` describes the visual decision:

| Review status | Meaning | Rendered / completed coverage |
| --- | --- | --- |
| `approved` | Explicit human approval | Yes |
| `temporary` | Explicit, provisional human acceptance | Yes |
| `needs-replacement` | Failed human QA; file/provenance retained | No |
| `missing` | No imported local image | No |
| `generated-pending` | Imported generated candidate awaiting review | No |
| `pending-review` | Real local photo with no explicit manual decision | No |

A download is not approval. Automatic fetches always remain `pending-review`,
`visuallyReviewed: false`, `needsVisualReview: true`. Merely having a file or a
metadata confidence score never makes it a runtime image. Pending/rejected images
use Nom's existing placeholder. Stored originals stay available for review.

Current explicit user QA:

| Decision | Dishes | Count |
| --- | --- | --- |
| Keep existing real photo | Ramen, Harira | 2 |
| Use generated instead of protected real photo | Jambalaya, Carbonara, Biryani, Yakitori | 4 |
| Use reviewed generated image | All remaining canonical dishes, including new Ceviche and Lort Cha replacements | 195 |
| Unresolved / placeholders | None | 0 |

There are **201 approved runtime images and zero unresolved dishes**. Ten previous
canonical photos have checksum archives; ten original supplied photos remain at
their original paths. Previous metadata and attribution survive in image history.
`image-review-decisions.json` retains the earlier source-specific real-photo
decisions; these apply to archived sources after replacement.
`image-audit/results/final-image-decisions.json` records all 201 final choices,
bound to exact source/output checksums. Goulash uses B05-08; B05-10 remains a raw
alternative. Catalog `reviewStatus` is factual metadata and is never changed by an
image-review decision.

## Review the current collection

```sh
cd /Users/leng/Projects/nom
open catalog/images/image-review.html
```

`image-review.html` shows every current local candidate (including rejected photos),
status, country, source type, reason, generation prompt and target filename.
It loads local files only. `image-review.json` contains the same structured data,
provenance and image history. `coverage-report.json` separately counts approved real,
temporary real, rejected real, unreviewed real, missing and generated candidates;
`realAfter` now means renderable real coverage, not downloaded-file count.

To record a human decision after actually checking a photo:

```sh
python3 scripts/review-dish-image.py lort-cha --status approved --reason 'Canonical dish and composition checked'
```

Use `--status temporary` for a provisional real image, or `--status
needs-replacement` for a failed candidate. Approval requires a local imported file.
The command updates the manifest, runtime mappings, credits, review/coverage
reports and unresolved queue offline. Real-source decisions also update the
selector's source-specific QA list. It never approves any other dish implicitly.
Original supplied photos still have unknown creator/license provenance; visual
approval does not invent or resolve those attribution facts.

## Generated fallback queue — planning only

**`catalog/images/generated-image-queue.json`** contains all unresolved dishes,
including rejected and unreviewed local photos, in canonical catalog order.
Each entry includes ID, country/code, aliases, both catalog descriptions, visible
ingredient cues, catalog-supported presentation evidence, composition/orientation,
input/output filename, current state/reason, prompt and `needsPromptReview`.

Ingredient cues are extracted only when the phrase occurs in the catalog text.
They may describe optional variants, not an instruction to combine all ingredients.
Preparation/presentation sentences are retained verbatim. No regional garnish,
protein, vessel or recipe is invented from a flavor tag or country. Prompts ask
for one coherent finished version supported by that context, realistic food
photography, natural light, a dominant food subject, 4:3/square-friendly framing
and room to crop, without people, hands, text, logos or obstructing utensils.

Any unresolved queue prompts require cultural review because the catalog still has
`needs-review` factual metadata. Sparse descriptions additionally flag missing
ingredient/presentation evidence. Review/correct a prompt before using it; do not
mass-generate the queue. For an already imported generated candidate, the review
report retains its submitted prompt (if supplied) or requested queue prompt.

## Import one generated candidate

Generation happens separately, using a tool of your choice. This importer never
calls a generation provider and never claims generated imagery is documentary
photography. Start with **one** rejected dish, such as Bibimbap:

1. Review its queue prompt for culturally accurate ingredients and presentation.
2. Generate a candidate yourself and save it under its canonical ID:
   **`src/assets/food/generated-incoming/bibimbap.png`**. JPEG/WebP also work;
   keep only one input image per ID. Inputs need a minimum edge of 480px and
   must be no larger than 20 MB. Raw incoming files are ignored by Git.
3. Prefer a matching optional `bibimbap.json` sidecar to record actual provenance:

```json
{
  "tool": "Name of the tool you actually used",
  "model": "Model if known",
  "prompt": "Exact prompt actually used",
  "createdAt": "Actual creation time if known",
  "notes": "Optional factual/cultural review notes"
}
```

Omit unknown fields. Without the sidecar, the tool and actual prompt used remain
null; the requested queue prompt is preserved without pretending it was used.
Do not include API keys, license claims or Wikimedia/Openverse attribution in
this sidecar.

4. Validate the planned import, then explicitly import locally:

```sh
python3 scripts/import-generated-images.py --dish bibimbap --dry-run
python3 scripts/import-generated-images.py --dish bibimbap --apply
open catalog/images/image-review.html
```

The importer validates the canonical ID and paths, decodes/resizes with macOS
`sips`/`cwebp`, uses quality-82 WebP, caps the maximum edge at 1200px without
upscaling, and writes **`src/assets/food/catalog/bibimbap.webp`**. It marks the
candidate `generated-pending`, explicitly generated and non-documentary; it is
not rendered until reviewed. Approved and temporary photos are protected.

A rejected/unreviewed existing catalog image is archived under
`src/assets/food/archive/<dish-id>/<old-sha256>.webp` before replacement.
Original supplied files stay at their original paths. Complete old metadata,
creator/license/source and review reason survive in manifest `history`, with a
recovery snapshot in `catalog/images/import-backups/`. No prior attribution is
silently transferred to the generated image. Failed conversion leaves the old
image untouched. Identical already-imported candidates are skipped on resume.
The generated importer shares the acquisition lock and writes
`catalog/images/generated-import-report.json`.

The generated importer defaults to dry run. For the separately audited
manual batches, use the verified staging manifest rather than copying/renaming
raw files into the incoming folder:

```sh
python3 scripts/import-generated-images.py --staged-manifest image-audit/staged-import/manifest.json --dry-run
```

This preflights every dish ID, canonical filename, path, confidence, decoded
dimensions, staged checksum and raw source checksum before any asset mutation.
The dry-run report lives under `image-audit/results/`. After reviewing it,
`--apply` copies verified WebPs without another lossy conversion, preserves
previous pixels/provenance and records raw batch provenance. Imported candidates
remain `generated-pending` by default; use the existing individual review command with
`--prompt-reviewed` only after human cultural and visual review. The raw ZIP and
batch files are never changed. The complete audit uses the physical `nom_batch1`
through `nom_batch20` folders under `image-audit/generated-batches/Dish Images/`;
the ZIP is excluded. Current staging contains 201 HIGH/READY generated candidates,
including two reviewed replacements supplied in `image-audit/replacements/`.
Staged Ramen and Harira generations remain unused alternatives. The final
selection contains 199 generated images and the two retained real photos.

The completed human review authorizes only the exact selected assets. Supply its
checksum-bound decisions with the staging manifest to retain Ramen/Harira and
approve the expressly chosen generations:

```sh
python3 scripts/import-generated-images.py --staged-manifest image-audit/staged-import/manifest.json --review-decisions image-audit/results/final-image-decisions.json --dry-run
```

The authorized production import used the same command with `--apply`. It created
189 canonical assets and replaced ten, preserving previous pixels and metadata.
The post-import dry run reports 199 unchanged and two protected assets. Without
`--review-decisions`, existing approval protection and pending-review defaults
remain in force. The earlier `image-audit/NOM_FULL_AUDIT_REPORT.md` describes the
pre-integration audit snapshot; use the final integration record for current
coverage. No global audit or recommendation sweep was rerun during integration.
Bulk optimization excludes catalog/archive
assets and incoming originals; external fetching already protects local images.

5. Inspect the actual image for canonical identity, composition and cultural
   accuracy. Only after checking both prompt and image, approve explicitly:

```sh
python3 scripts/review-dish-image.py bibimbap --status approved --prompt-reviewed --reason 'Canonical presentation, cultural details and image checked'
```

If it fails, use `--status needs-replacement --reason 'Describe the problem'`.
Do not use an approval command before doing the visual review. Approved generated
assets retain generated provenance and are counted separately from real photos.

## Real-source acquisition remains available

Commons and Openverse adapters remain in `scripts/image_providers.py`. The default
fetcher now requires a **strong** metadata candidate; lower-quality candidates
remain unresolved instead of being imported as temporary final imagery. Known
manual rejections are excluded. Even a strong automatic candidate is imported
only as `pending-review`, never approved or mapped. Metadata cannot reliably
assess pixels, authentic presentation, lighting or subject prominence.

Run from normal Mac Terminal, not the network-restricted Codex sandbox:

```sh
python3 scripts/fetch-dish-images.py --dry-run --batch-size 10
python3 scripts/fetch-dish-images.py --batch-size 10
```

No batch was run during this milestone. Default providers: `all`; options include
`--provider commons|openverse|all`, `--min-confidence 80–100` (default 85),
`--retry-failed`, `--retries 0–5` (default 2), and `--delay` (default 0.8s,
minimum 0.5s). Every bounded name/alias query is considered before deterministic
identity/visual ranking. Commons wins score ties; a better Openverse candidate
can win. Reusable metadata must include creator and consistent CC BY/BY-SA
2.0/3.0/4.0, CC0 or public-domain license URL.

Only supported Wikimedia/Flickr/StockSnap sources and direct HTTPS image CDNs
are accepted. No Google Images, Pinterest, recipe-blog scraping, arbitrary
restaurant imagery, paid API or credentials. Redirect/MIME/20 MB checks and bounded
retries remain. At most three eligible candidates are tried after download/decode
failures. Existing local photos (including rejected candidates) are never replaced
by a fetch; deliberate local generated replacement is a separate operation.

`fetch-report.json` preserves history and distinguishes `downloaded`, `mapped`,
`visuallyApproved` and `imageReviewStatus`. Downloaded means technical success,
not visual success. `fetch-report.html` is a latest-fetch-batch view; **use the
current `image-review.html` for manual status decisions**. Old dry-run/fetch HTML
files are historical plans and may show prior technical classifications.

## Preparation, tests and tracking

Python 3.9+, Node and macOS `sips` are expected; install the encoder if needed:

```sh
brew install webp
```

`npm run images:prepare` regenerates runtime maps, dimensions, attribution,
coverage, queue and review reports offline. `npm run images:remaining` updates
`remaining-image-manifest.json`; it includes unresolved dishes regardless of
whether a rejected local file exists and is currently empty. Generated mapping lives in
`src/data/dishImageAssets.js`; existing image components and placeholders are reused.
At `/image-credits`, generated imagery is labeled as generated; retained real
source attribution and previous-source history remain available.

Focused checks:

```sh
python3 -B scripts/test_image_workflow.py
python3 -B scripts/test_fetch_dish_images.py
npm test -- src/data/imageWorkflow.test.js src/data/imageFetcher.test.js src/data/dishImages.test.js
```

Tests use temporary files, including one offline encoder check; they do not fetch
or generate catalog imagery. Commit optimized images, archives, manifest, maps,
credits and reports together after a deliberate import/review. Raw inputs remain
ignored. Do not deploy or generate/download the entire catalog before reviewing
small batches.
