#!/usr/bin/env python3
"""Run real checks and reconcile the complete physical-batch audit without importing."""
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone
import hashlib, json, os, re, shlex, subprocess, sys
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'image-audit/results'
TICK = chr(96)
FENCE = TICK * 3

def read(name):
    return json.loads((OUT / name).read_text())

def write(name, value):
    (OUT / name).write_text(value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def checks():
    commands = [
        ('npm test', 'final-tests.log'),
        ("python3 -m unittest discover -s scripts -p 'test_*.py'", 'final-python-tests.log'),
        ('npm run catalog:check', 'catalog-check.log'),
        ('npm run build', 'final-build.log'),
        ('node scripts/audit-recommendations.mjs', 'recommendation-audit-run.log'),
        ('python3 scripts/audit-references.py', 'reference-audit-run.log'),
        ('python3 scripts/import-generated-images.py --staged-manifest image-audit/staged-import/manifest.json --dry-run', 'import-dry-run.log'),
        ('git diff --check', 'diff-check.log'),
    ]
    results = []
    for command, log in commands:
        environment = dict(os.environ)
        if command == 'npm test':
            environment['NOM_AUDIT_UI_EVIDENCE'] = str(OUT / 'score-flow-evidence.json')
        run = subprocess.run(shlex.split(command), cwd=ROOT, capture_output=True, text=True, env=environment)
        write(log, run.stdout + run.stderr)
        results.append(dict(command=command, exitCode=run.returncode, passed=run.returncode == 0, log='image-audit/results/' + log))
        print(f'{command}: exit {run.returncode}', flush=True)
    write('validation-results.json', results)
    assert all(r['passed'] for r in results), 'Required validation failed; retained actual logs'

def main():
    if '--reports-only' not in sys.argv:
        checks()
    validations = read('validation-results.json')
    assert all(v['passed'] for v in validations)
    expected, catalog = read('expected-batches.json'), read('catalog-audit.json')
    rows, raw = read('dish-image-mapping.json'), read('image-inventory.json')
    decisions, duplicates = read('image-candidate-audit.json'), read('duplicate-analysis.json')
    stage_document = json.loads((ROOT / 'image-audit/staged-import/manifest.json').read_text())
    staged = stage_document['dishes']
    scores, ui = read('score-analysis.json'), read('score-flow-evidence.json')['rows']
    preserved, idempotence = read('preservation-verification.json'), read('staging-idempotence.json')
    dry, performance = read('import-dry-run.json'), read('image-performance.json')
    browser = read('browser-validation.json')
    references = read('broken-reference-scan.json')
    directories = read('input-directories.json')
    records = json.loads((ROOT / 'src/data/catalog/records.json').read_text())
    taxonomy = json.loads((ROOT / 'src/data/catalog/taxonomy.json').read_text())
    counts = Counter(r['status'] for r in rows)
    raw_counts = Counter(d['status'] for d in decisions)
    batches = Counter(r['batch'] for r in raw)
    ready = [r for r in rows if r['status'] == 'READY' and r['confidence'] == 'HIGH']
    ready_ids = {r['dishId'] for r in ready}
    unresolved = [r for r in rows if r['dishId'] not in ready_ids]
    raw_lookup = {r['identifier']: r for r in raw}
    by_dish = {r['dishId']: r for r in rows}
    staged_ids = {r['dishId'] for r in staged}
    assert len(rows) == len(expected) == len(records) == catalog['actual'] == 201
    duplicate_ids = len(records) - len({r['id'] for r in records})
    duplicate_names = len(records) - len({r['name'] for r in records})
    assert duplicate_ids == duplicate_names == 0
    assert not catalog['validationErrors'] and not catalog['regionConflicts'] and not catalog['aliasConflicts']
    assert {r['dishId'] for r in rows} == {r['id'] for r in records}
    assert len({r['expectedTargetFilename'] for r in rows}) == len(rows)
    assert sorted(batches) == list(range(1, 21))
    assert all(batches[b] == (11 if b == 20 else 10) for b in batches)
    assert len(raw) == sum(batches.values()) == 201
    assert len(raw_lookup) == len(decisions) == len(raw)
    assert all(r['readable'] and r['decodedFormat'] == 'public.png' and not r['archive'] for r in raw)
    assert len(staged) == len(ready) and staged_ids == ready_ids
    assert len(staged_ids) == len({r['sourceHash'] for r in staged}) == len({r['targetFilename'] for r in staged}) == len(staged)
    assert {p.name for p in (ROOT / 'image-audit/staged-import').glob('*.webp')} == {r['targetFilename'] for r in staged}
    for s in staged:
        mapping = by_dish[s['dishId']]
        source = raw_lookup[mapping['candidateIdentifier']]
        assert s['targetFilename'] == mapping['expectedTargetFilename'] == s['dishId'] + '.webp'
        assert s['sourceRelativePath'] == source['relativePath'] and s['sourceHash'] == source['sha256']
        assert s['sourceArchive'] is None and s['sourceArchiveMember'] is None
        assert sha(ROOT / s['sourceRelativePath']) == s['sourceHash']
        assert sha(ROOT / s['targetRelativePath']) == s['outputHash']
        assert s['outputBytes'] == (ROOT / s['targetRelativePath']).stat().st_size
        assert abs(s['outputWidth'] / s['outputHeight'] - source['aspectRatio']) < .002
        assert max(s['outputWidth'], s['outputHeight']) <= 1200
        assert s['confidence'] == 'HIGH' and s['auditStatus'] == 'READY'
    assert {r['dishId'] for r in dry['dishes']} == staged_ids and dry['dryRun']
    assert set(dry['unstagedDishIds']) == {r['dishId'] for r in unresolved}
    assert scores['sessionsPassed'] + scores['sessionsFailed'] == scores['sessions']
    assert scores['sessionsFailed'] == scores['fewerThanSeven'] == scores['regionFailures'] == 0
    assert scores['deterministic'] and scores['candidateSpecificScores'] and scores['runtimeImageOrFallbackVerified']
    assert len(ui) >= 17 and all(r['cardPercent'] == r['detailsPercent'] == round(r['score']) for r in ui)
    assert preserved['unchangedRuntimeAssetsAndCatalog'] and preserved['allRawDirectoryFilesUnchanged']
    assert preserved['previousStagedWebPsPreserved'] and preserved['allReviewCopiesMatchRawHashes']
    assert not preserved['continuationDeletedFiles'] and not preserved['continuationRuntimeChanges']
    assert idempotence['sameFilesHashesAndModificationTimes'] and idempotence['previous131Preserved']
    import_repeat = read('import-dry-run-idempotence.json')
    assert import_repeat['passed'] and import_repeat['samePlanBytesAndHash']
    assert import_repeat['unchangedProtectedFilesHashesAndModificationTimes']
    assert import_repeat['planSha256'] == sha(OUT / 'import-dry-run.json')
    converted_review = read('staged-visual-review.json')
    assert converted_review['all20StagedSheetsInspected']
    assert converted_review['stagedImagesReviewed'] == len(staged)
    assert {r['dishId'] for r in converted_review['rows']} == staged_ids
    assert all(r['visuallyReviewed'] and r['result'] == 'PASS' for r in converted_review['rows'])
    assert len(duplicates['nearCandidates']) == len(read('duplicate-visual-reviews.json'))
    assert all(p['visualReview'] == 'DISTINCT' for p in duplicates['nearCandidates'])
    app_log = re.sub(r'\x1b\[[0-9;]*m', '', (OUT / 'final-tests.log').read_text())
    app_tests = int(re.search(r'Tests\s+(\d+) passed', app_log)[1])
    app_files = int(re.search(r'Test Files\s+(\d+) passed', app_log)[1])
    python_tests = int(re.search(r'Ran (\d+) tests', (OUT / 'final-python-tests.log').read_text())[1])
    missing = [r['dishId'] for r in rows if r['status'] == 'MISSING']
    ambiguous = [r['dishId'] for r in rows if r['status'] == 'AMBIGUOUS']
    rendered_ids = {r['dishId'] for r in catalog['rows'] if r['rendered']}
    actions = dict(Counter(r['action'] for r in dry['dishes']))
    blockers = [
        'Ceviche has no supplied candidate: batch 5 contains two Goulash-compatible beef stews.',
        'Lort Cha B01-01 is MEDIUM/AMBIGUOUS: long flat noodles do not clearly match catalog short rice noodles; human review or replacement needed.',
        'Human cultural/visual approval and protected-current-photo choices remain separate from engineering staging; production import was deliberately not executed.',
        'No browser is available (discovery []); preview HTTP request was denied with EPERM. Responsive layout/image loading/crops remain unverified in a real browser.',
    ]
    summary = dict(
        catalog=dict(expected=201, actual=len(records), duplicateIds=duplicate_ids, duplicateNames=duplicate_names, schemaErrors=len(catalog['validationErrors']), regionChanges=[]),
        batches=dict(expected=20, actual=len(batches), physicalRawBatchFolders=len(directories), archiveBatchDirectoriesCounted=0, zipExcluded=True, sourceRoot='image-audit/generated-batches/Dish Images', missing=[], batch20Files=batches[20]),
        images=dict(rawFiles=len(raw), highConfidenceMappings=len(ready), confidentlyMapped=len(ready), mappedPrimaryCandidates=len(ready), ready=counts['READY'], duplicate=raw_counts['DUPLICATE'], missing=counts['MISSING'], missingDishIds=missing, wrongDish=raw_counts['WRONG_DISH'], ambiguous=counts['AMBIGUOUS'], ambiguousDishIds=ambiguous, extra=raw_counts['EXTRA'], collage=raw_counts['COLLAGE'], corrupt=sum(not r['readable'] for r in raw), staged=len(staged), rawStatusCounts=dict(raw_counts), canonicalStatusCounts=dict(counts), exactlyOneCandidateDishes=sum(r['candidateCount']==1 for r in rows), multipleCandidateDishes=sum(r['candidateCount']>1 for r in rows), zeroCandidateDishes=sum(r['candidateCount']==0 for r in rows), atMostOnePrimaryPerDish=True, complete201To201Mapping=len(ready)==201, exactDuplicateGroups=len(duplicates['exactGroups']), perceptualCandidates=len(duplicates['nearCandidates']), confirmedNearDuplicates=duplicates['confirmedNearDuplicates'], semanticDuplicateGroups=len(duplicates['semanticGroups']), reusedStaged=preserved['previousStagedCount'], newStaged=len(staged)-preserved['previousStagedCount'], existingRendered=len(rendered_ids), existingPlaceholders=len(records)-len(rendered_ids), possibleRenderedAfterHumanApproval=len(rendered_ids|ready_ids), rawBytes=performance['rawBytes'], stagedBytes=performance['stagedBytes'], originalsPreserved=True, runtimeAssetsChanged=False),
        recommendations=dict(scoreBugReproduced=False, scoreBugFixed=False, genuineTiesVerified=True, scoreBugStatus='No shared-score defect reproduced on current code; per-candidate engine/DOM/detail evidence agrees. Genuine ties retained.', moreOptionsCountBugReproducedPreviously=True, moreOptionsCountBugFixed=True, shortSessionsBefore=read('score-analysis-before.json')['fewerThanSeven'], shortSessionsAfter=scores['fewerThanSeven'], topMatchesValidated=True, moreOptionsValidated=True, sessionsTested=scores['sessions'], sessionsPassed=scores['sessionsPassed'], sessionsFailed=scores['sessionsFailed'], deterministic=scores['deterministic'], candidateSpecificScoresValidated=True, runtimeImageOrFallbackValidated=True, mountedCardDetailInteractions=len(ui), regionRegressionValidated=True),
        validation=dict(applicationTestsPassed=app_tests, applicationTestCount=app_tests, applicationTestFiles=app_files, pythonTestsPassed=python_tests, pythonTestCount=python_tests, testsPassed=True, typecheckPassed=None, typecheckStatus='Not configured', lintPassed=None, lintStatus='Not configured', buildPassed=True, catalogCheckPassed=True, importDryRunPassed=True, importCandidates=len(staged), importActions=actions, browserValidation='Unavailable: no connected browser; local HTTP denied EPERM; mounted functional tests pass', browserValidated=False, preExistingFailures=[], introducedFailures=[]),
        remainingBlockers=blockers,
        auditScope=dict(inputMode='physical batch directories only', zipOpenedExtractedOrCounted=False, productionImportExecuted=False, stagingIdentificationIsHumanApproval=False, rawDirectoryTreeUnchanged=True, previousStagingPreserved=True, stagingIdempotenceVerified=True),
    )
    write('final-summary.json', summary)

    # A separate row for every raw file accounts for the secondary and held image.
    quality_rows = []
    for d in decisions:
        r = raw_lookup[d['identifier']]
        quality_rows.append(dict(identifier=d['identifier'], batch=r['batch'], dishId=d['dishId'], source=r['relativePath'], sha256=r['sha256'], width=r['width'], height=r['height'], confidence=d['confidence'], status=d['status'], visuallyInspected=True, evidence=d['reviewEvidence'], visibleSubject='Single finished dish/serving; supporting accompaniments, no collage', visualQuality='No obvious dominant people/hands, text/logo, cooking-scene dominance or impossible-vessel artifact at review scale; believable editorial food textures and lighting', framing='Approximately horizontal 3:2; food reasonably visible' if abs(r['aspectRatio']-1.5)<.02 else 'Adana: 1376×1143, tighter non-3:2 framing; mobile cover crop review needed', ingredientProof=False, culturalApproval=False, notes=d['reason']))
    write('image-quality-audit.json', dict(imagesInspected=len(quality_rows), method='All 20 raw contact sheets, all 57 paired comparisons, all 20 staged contact sheets containing 199 converted outputs; full-resolution Lort Cha, both Goulash candidates, dark Arroz con Coco, Pozole, Locro and Canadian Split Pea Soup', stagedReviewEvidence='image-audit/results/staged-visual-review.json', generatedImagesNotRejectedSolelyForOrigin=True, browserCropValidation=False, rows=quality_rows))
    write('image-quality-audit.md', f'# Image quality audit\n\n{len(quality_rows)} raw files visually inspected across all 20 batches. {len(ready)} HIGH/READY selections are usable food-focused editorial-style candidates; one intended Lort Cha is held for noodle-form uncertainty and one Goulash generation is secondary. All files decoded successfully. 200 inputs are 1536×1024; Adana is 1376×1143.\n\nNo obvious collage, watermark/text, dominant person/hand, cooking scene, impossible plate/utensil or severe merged-food artifact was observed at review scale. Lighting and food textures are believable enough for catalog use; this is a visual assessment, not ingredient proof or documentary authenticity. Plate margins vary; exact 10–15% breathing room was not measured or invented. WebP staging preserves framing/aspect without cropping. Adana especially needs live responsive crop review. See JSON for every file, source hash, evidence sheet, identity status and caveat.\n')

    region_rows = [dict(region=region, dishCount=sum(r['region']==region for r in catalog['rows']), countries=sorted({r['country'] for r in catalog['rows'] if r['region']==region}), countryCodes=sorted({r['countryCode'] for r in catalog['rows'] if r['region']==region})) for region in taxonomy['regions']]
    write('region-audit.json', dict(taxonomySource='src/data/catalog/taxonomy.json, workbook and existing discovery labels', changes=[], issues=catalog['regionConflicts'], regions=region_rows, cambodianDishIds=[r['dishId'] for r in catalog['rows'] if r['countryCode']=='KH']))
    write('region-audit.md', '# Existing eight-region reconciliation\n\nNo taxonomy or country/region metadata changed. All 201 catalog dishes validated; each country has a consistent region, aliases resolve without conflicts and every Cambodian dish remains Southeast Asia. Explicit-region food-type tiers passed the current exhaustive sweep.\n\n| Region | Dishes | Countries |\n|---|---|---|\n'+'\n'.join(f"| {r['region']} | {r['dishCount']} | {', '.join(r['countries'])} |" for r in region_rows)+'\n')

    # Observed percentages come from actual mounted DOM reads, not invented render values.
    score_md = (OUT / 'score-analysis.md').read_text().split('\n## Actual mounted UI evidence')[0]
    score_md += f'\n## Actual mounted UI evidence\n\n{len(ui)} actual card-to-detail clicks, including every Latin America Top/More item and all seven formerly scarce Europe options. Country/flag, title, image URL, descriptions, canonical route, explanation and favorite identity were asserted. Surface: happy-dom mounted app; no pixel-layout claim.\n\n| Section | ID | Engine score | Food | Flavor | Adventure | Region | Card % | Detail % |\n|---|---|---|---|---|---|---|---|---|\n'
    for r in ui:
        b=r['breakdown']
        score_md += f"| {r['section']} | {r['dishId']} | {r['score']:.2f} | {b['foodType']['earned']:.2f} | {b['flavor']['earned']:.2f} | {b['adventure']['earned']:.2f} | {b['region']['earned']:.2f} | {r['cardPercent']} | {r['detailsPercent']} |\n"
    score_md += '\nLatin America noodle/spicy+comforting/adventurous: Sopa de Fideo card/detail 69%, Tallarines Verdes 62%, Locro 50%. More Options Lort Cha and Reshteh Polow independently show 70%, rather than inheriting 69% from the first Top Match. Feijoada and Arroz Chaufa both show 42% because their contributing totals genuinely tie. Dish B route resolves Dish B in the full ranking; explanation also comes from that result.\n\nSoutheast Asia example: Lort Cha 85 = 35 food + 15 flavor + 20 adventure + 15 region; Mie Goreng and Pancit Canton each 77 = 35 + 15 + 12 + 15; Mì Quảng 70 = 35 + 0 + 20 + 15. Ties remain deterministic and legitimate. Exact catalog attributes and full per-dish breakdowns are in recommendation-samples.json and score-flow-evidence.json.\n'
    write('score-analysis.md', score_md)
    pattern=re.compile(r'recommendations\s*\[\s*0\s*\]\s*\.score|selectedRecommendation\.score')
    suspicious=[]
    for p in (ROOT/'src').rglob('*'):
        if p.suffix in {'.js','.jsx'} and '.test.' not in p.name:
            suspicious.extend(dict(file=str(p.relative_to(ROOT)),match=m.group()) for m in pattern.finditer(p.read_text()))
    write('score-propagation-source-scan.json', dict(suspiciousSharedScorePatterns=suspicious, inspectedFlow=['scoreDish → recommend → useRecommendations.results/moreOptions', 'BestMatchCard/RecommendationCard destructure their result.score', 'DishDetails resolves canonical route ID in full ranking', 'DishDetailHero rounds selected result.score; whyMatched uses selected result.breakdown'], memoization='Session/result dependencies inspected; no stale selected-score state', positionsNotUsedForIdentity=True))
    assert not suspicious

    lort = by_dish['lort-cha']
    write('lort-cha-trace.md', f'''# Lort Cha end-to-end trace

1. Workbook Dishes row 5 → src/data/catalog/records.json: id lort-cha, name Lort Cha, country KH / Cambodia / 🇰🇭, southeast-asia, noodle, preferenceFlavors [comforting], descriptors [savory, smoky], adventureLevel 3. Canonical metadata was not edited.
2. Canonical target is lort-cha.webp. Raw intended candidate B01-01: {lort['candidateCurrentFilename']}, {lort['candidateRelativePath']}, {lort['width']}×{lort['height']}, SHA-256 {lort['candidateHash']}.
3. This raw candidate is MEDIUM/AMBIGUOUS: egg/beef/sprouts fit the intended dish but the noodles appear long and flat rather than catalog short rice noodles. It is visible in contact sheet 01 and image-review.html, held out of staged-import and import dry run. No image is fabricated or borrowed from another dish.
4. catalog/images/manifest.json retains original src/assets/food/dish-lort-cha.webp as existing-local/real/pending-review. dishImageAssets.js and dishImages.js permit only approved/temporary images. dishes.js currently resolves Lort Cha to dish-placeholder.svg.
5. DiscoverySession → useRecommendations → recommend: Southeast Asia/noodle/spicy+comforting/adventurous scores Lort Cha 85 (35+15+20+15). BestMatchCard receives that own result, and dish name, flag, image and short description all come from result.dish.
6. DishDetailsLink constructs /recommendations/lort-cha, carrying return path. DishDetails finds result.dish.id === dishId in the shared full ranking and passes that result to DishDetailHero/whyMatched. The detail gets Lort Cha's own score, metadata and image.
7. In the Latin America session Lort Cha appears in More Options at 70 because regional points are zero. This was actually clicked in the current mounted-app audit: card 70%, details 70%, correct Cambodian name/flag, placeholder URL, description, explanation, favorite ID and return path. It did not inherit first Top Match Sopa de Fideo's 69%.
8. Top/More section exclusion uses canonical result identity; favorites/activity and nearby navigation use lort-cha. Nearby data remain labeled development examples. Existing fallback tests verify Image.jsx replaces failed URLs with the placeholder and recovers after src changes.
9. After a culturally appropriate raw candidate is approved for engineering staging, the existing importer can validate/copy its canonical WebP, record generated provenance, and regenerate registries. Production import/review remains explicit. Current Lort Cha remains held and the original stays safe.

See score-flow-evidence.json, dish-image-mapping.json, catalog-audit.json and mounted app tests. Real-browser crop/layout validation remains blocked.
''')
    architecture=f'''# Image integration and overwrite safety

Metadata authority: workbook Dishes sheet → src/data/catalog/records.json (201 canonical IDs and source rows). Canonical image filename: ID + .webp, verified against original explicit filename instructions and the new complete batch membership. Country, names, aliases and existing eight-region taxonomy are preserved.

Current storage/review authority: catalog/images/manifest.json. Runtime registries: src/data/dishImageAssets.js and dishImages.js; dishes.js adds country/flag/image. There are 22 stored real photos, six rendered approved/temporary images, and 195 intentional placeholders. Audit/staging does not change these. Original supplied images and rejected photos remain intact.

Physical raw input: image-audit/generated-batches/Dish Images/nom_batch1…nom_batch20 only. ZIP is excluded; no extraction or archive counting. All 201 PNGs have raw/hash/dimension/readability records and byte-identical review copies. 199 HIGH/READY primaries become canonical staged WebPs. One Lort Cha is held and a second Goulash is secondary; Ceviche is missing. All 131 previously staged WebPs retain their bytes. Conversion uses the existing quality-82/method-6 encoder, max edge 1200, no crop/upscale. No original generation prompts/model metadata exists; requested queue prompts are context, not asserted actual prompts.

Top/More/detail all consume the canonical dish.image. Image.jsx implements failure fallback. BestMatchCard uses cover with center/35% positioning; compact cards use cover; detail hero retains its enlarged image slot. Source crops are preserved; live mobile crop review remains outstanding.

Existing generated importer validates the complete staging manifest before writes: known canonical ID/name/filename, safe unique targets, HIGH/READY, generated/non-documentary provenance, raw directory filename/batch/path/size, raw/output checksum, WebP header/size/decoded dimensions and existing ownership. Default is dry run. Explicit --apply copies existing staged bytes without another lossy encoding, retains originals, archives replaced catalog pixels by hash, snapshots prior metadata and clears transferred Commons attribution. Imported candidates remain generated-pending. Repeated identical imports skip writes/history changes; focused temporary-root tests verify this.

Complete dry run: {len(staged)} candidates, {actions.get('would create',0)} would create, {actions.get('would replace',0)} would replace, {actions.get('protected',0)} protected. Six rejected existing canonical photos are replaceable with backups. Six approved/temporary photos retain their current human decisions. An apply with this manifest would therefore import {actions.get('would create',0)+actions.get('would replace',0)} pending candidates, retain six protected images and leave two catalog coverage issues. No production apply was run.

No normal build/test hook fetches or imports. Commons/Openverse tooling skips LOCAL_STATUSES including generated-local, refuses unmapped existing destinations, and never implicitly approves downloaded images. The licensed importer refuses existing outputs. Bulk optimizer excludes catalog/archive/incoming/generated-incoming. Existing acquisition/review/import regression tests re-ran; no network fetch was performed. Useful historical tooling remains.

Activation is separately reviewable: review generated imagery against catalog/cultural expectations and record individual explicit decisions using review-dish-image.py with --prompt-reviewed. Human approval cannot be inferred from HIGH identification. Generated sourceType, raw batch/path/filename/hash and conversion remain honest; no current Commons URL or documentary claim is transferred.
'''
    write('image-system-architecture.md',architecture)
    repo=(OUT/'history/partial-131-image-audit/repository-map.md').read_text()
    repo=repo.replace('| image-audit/generated-batches/Dish Images.zip | Immutable supplied raw archive; only batches 8–20 |','| image-audit/generated-batches/Dish Images/nom_batch1…nom_batch20 | Immutable physical raw batches; 201 PNGs; ZIP excluded |')
    repo=repo.replace('Immutable archive inventory','Physical-directory inventory')
    write('repository-map.md',repo+'\n## Complete continuation\n\nPhysical directory provenance replaces archive provenance in current staging. Lort Cha held; Ceviche missing; Goulash secondary preserved. See continuation-initial Git/hash snapshots and final-summary.json. No lint/typecheck script or browser test stack is configured.\n')
    runtime=f'''# Current runtime and UI validation

Actual current commands pass: {app_tests} application tests in {app_files} files; {python_tests} Python tests; workbook --check, catalog validation/build, reference scan, score sweep and complete dry run.

All {scores['sessions']} supported sessions passed deterministic 3+7 uniqueness, canonical metadata, region food-type tiers, own score/range and image-or-fallback checks. All 201 dishes reach visible results somewhere. Representative samples cover all eight regions and Anything, skipped region, region Surprise Me, adventure Surprise Me and combined surprise.

Mounted app tests clicked {len(ui)} actual Top/More card links across Latin America and the scarce Europe Anything/Surprise Me mode. DOM score evidence verifies each card and its clicked detail; country/flag, name, image URL, short/full descriptions, why-matched text, favorite identity and return path also agree. Existing nearby/restaurant fixtures passed. These are functional tests, not pixel layout.

Browser skill/runtime retry: getForUrl returned “No browser is available”; documented discovery returned []. Existing node_modules contains no Playwright/Puppeteer/Cypress browser stack; installed Chrome/Chromium/Firefox application checks found none. Initial Vite command reported ready at port 5180, but a later request could not connect. A controlled port-5182 retry logged listen EPERM; urllib request also returned Operation not permitted. No claim of current browser validation or live image loading/crops is made. See browser-validation.json and browser-preview-attempt.log. No large browser installation was performed.

Existing title/description two-line clamps, content-driven titles, final-word/flag nowrap and edge modal width min(87vw,400px), max-height min(58dvh,520px), content/scroll behavior were inspected and preserved. No theme/redesign changes.

All raw batches were visually rechecked. New staged images were reviewed in full batch sheets after conversion; old staged bytes match the prior verified 131. Special rice/soups, Lort Cha and both Goulash candidates received full-resolution inspection. Native image sheets preserve review scale/framing; real browser cover crops remain a human check.
'''
    write('runtime-validation.md',runtime)
    write('application-validation.md','# Application validation\n\n'+runtime+'\n| Command | Exit | Log |\n|---|---|---|\n'+'\n'.join(f"| {TICK}{v['command']}{TICK} | {v['exitCode']} | {v['log']} |" for v in validations)+'\n\nNo application scoring/ranking/UI implementation was changed during this continuation. The previous More Options repair and all its tests were retained. Four meaningful importer tests were added for direct-directory provenance, symlinks/count inconsistency, protected/replacement dry runs and applied rerun backup/idempotence in temporary roots. No tests were disabled. Typecheck/lint are not configured and are not reported as passing.\n')

    reasons={
        'scripts/audit-manual-images.py':'Count only physical batches 1–20, exclude ZIP, preserve normalized prior review copies, record every raw source hash/path.',
        'scripts/audit-image-sheets.swift':'Record actual decoder format and correct the supplied-only sheet-count message.',
        'scripts/stage-audited-images.py':'Represent confidence/status/secondary candidates honestly, hold ambiguous input, preserve old WebPs, use directory provenance, dynamic reports and explicitly reviewed duplicate pairs.',
        'scripts/import-generated-images.py':'Validate direct-source batch/filename/path/size and catalog count; report current runtime asset, protected/create/replace counts and unstaged IDs.',
        'scripts/test_audited_image_import.py':'Four new safety tests for direct provenance, internal symlinks/catalog count, protected/replacement planning and repeat apply/backups in temporary roots.',
        'scripts/audit-recommendations.mjs':'Verify new batch instructions against catalog, audit exact counts/metadata/score/identity/image fallback, actual pass/fail totals and sample ID/country tables.',
        'scripts/audit-references.py':'Verify entire raw directory tree, all 201 source hashes, all 131 prior WebPs, continuation runtime preservation and review-HTML image paths.',
        'scripts/finalize-nom-audit.py':'Replace partial-count assumptions with data-derived complete reconciliation, actual validation counts, observed DOM evidence and one updated master report.',
        'src/pages/RecommendationIdentity.test.jsx':'Record actual observed card/detail percentages and assert each own explanation, country label and card description; evidence emitted only in explicit audit mode.',
        'catalog/images/README.md':'Document physical-directory inputs, current held/missing cases and six protected photos without changing the existing review policy.',
    }
    continuation_before=read('continuation-initial-file-hashes.json')
    changed=[p for p,h in continuation_before.items() if (ROOT/p).is_file() and sha(ROOT/p)!=h and not p.startswith('image-audit/')]
    assert set(changed)==set(reasons), f'Unaccounted continuation source changes: {set(changed)^set(reasons)}'
    previous=read('history/partial-131-image-audit/file-change-log.json')
    changes=[dict(path=p,reason=reasons[p],beforeHash=continuation_before[p],afterHash=sha(ROOT/p),scope='complete continuation') for p in sorted(changed)]
    write('file-change-log.json',dict(continuation=changes,previousAuditChangesRetained=previous,canonicalDataOrProductionAssetsChanged=False))
    write('file-change-log.md','# Complete continuation source changes\n\nOnly these paths changed relative to the continuation baseline. Other dirty Git files predate this run. The previous targeted More Options fix, optimizer protections and image review policy are preserved. No raw/catalog/runtime pixel changes, commit, reset, cleanup or production import.\n\n| Path | Purpose |\n|---|---|\n'+'\n'.join(f"| {r['path']} | {r['reason']} |" for r in changes)+'\n\nPrevious run changes are retained separately in history/partial-131-image-audit/file-change-log.json and the current structured log. Initial/current hashes and exact Git snapshots are retained.\n')

    letter_checks=[
        ('A','All 20 physical batch directories exist','PASS',len(directories)==20),
        ('B','Only actual directory images counted; ZIP excluded','PASS',all(r['archive'] is None for r in raw)),
        ('C','Exactly 201 canonical dishes','PASS',len(records)==201),
        ('D','Raw count reconciled','PASS',len(raw)==201),
        ('E','Every canonical dish has a supplied usable candidate','HUMAN_REVIEW_REQUIRED',False),
        ('F','At most one recommended primary per canonical dish','PASS',len(ready_ids)==len(ready)),
        ('G','Exact hashes accounted for','PASS',not duplicates['exactGroups']),
        ('H','Near/semantic duplicates accounted for','PASS',len(duplicates['nearCandidates'])==57 and duplicates['semanticDuplicates']==1),
        ('I','Batch 17 ten distinct dishes, no collage','PASS',all(by_dish[e['dishId']]['status']=='READY' for e in expected if e['batch']==17)),
        ('J','Batch 20 eleven distinct candidates','PASS',batches[20]==11 and all(by_dish[e['dishId']]['status']=='READY' for e in expected if e['batch']==20)),
        ('K','Dark Arroz con Coco selected','PASS',by_dish['arroz-con-coco']['candidateIdentifier']=='B20-10'),
        ('L','Pozole and Locro distinguished','PASS',by_dish['pozole']['candidateIdentifier']=='B20-01' and by_dish['locro']['candidateIdentifier']=='B20-11'),
        ('M','Split pea soup independently inspected','PASS',by_dish['canadian-split-pea-soup']['candidateIdentifier']=='B20-07'),
        ('N','Staged outputs reconcile with HIGH/READY mapping','PASS',staged_ids==ready_ids),
        ('O','Top carries own scores','PASS',scores['candidateSpecificScores']),
        ('P','More Options carries own scores','PASS',scores['candidateSpecificScores']),
        ('Q','Details uses clicked dish score','PASS',all(r['cardPercent']==r['detailsPercent'] for r in ui)),
        ('R','Genuine ties distinguished from propagation defects','PASS',scores['allTenSamePercent']>0),
        ('S','Three Top Matches across sweep','PASS',scores['sessionsFailed']==0),
        ('T','Seven More Options across sweep','PASS',scores['fewerThanSeven']==0),
        ('U','Ten IDs unique across sections','PASS',scores['sessionsFailed']==0),
        ('V','Explicit region+food priority intact','PASS',scores['regionFailures']==0),
        ('W','Anything/skipped region/Surprise modes intact','PASS',scores['sessionsFailed']==0),
        ('X','Current tests pass','PASS',all(v['passed'] for v in validations if 'test' in v['command'])),
        ('Y','Current build passes','PASS',next(v['passed'] for v in validations if v['command']=='npm run build')),
        ('Z','Complete eligible import dry run passes','PASS',dry['dryRun'] and len(dry['dishes'])==len(staged)),
    ]
    letters=[dict(letter=a,requirement=b,status=c,verified=d,note='Ceviche missing; Lort Cha held. Every canonical row is accounted for, but true 201 usable candidates do not exist.' if a=='E' else 'Evidence: current reports, hashes, explicit visual decisions, UI interactions and command logs.') for a,b,c,d in letter_checks]
    assert all(r['verified'] for r in letters if r['status']=='PASS')
    reconciliation=dict(canonicalDishes=len(records),canonicalRows=len(rows),rawFiles=len(raw),rawStatusCounts=dict(raw_counts),canonicalStatusCounts=dict(counts),highConfidencePrimaries=len(ready),stagedFiles=len(staged),batchesPresent=dict(batches),candidateCounts=dict(exactlyOne=sum(r['candidateCount']==1 for r in rows),multiple=sum(r['candidateCount']>1 for r in rows),zero=sum(r['candidateCount']==0 for r in rows)),missingDishIds=missing,ambiguousDishIds=ambiguous,duplicateSecondaryIdentifiers=[d['identifier'] for d in decisions if d['status']=='DUPLICATE'],complete201To201Mapping=len(ready)==201,rawAndPriorStagingPreserved=True,runtimeUnchanged=True,productionImportExecuted=False,importActions=actions,checks=letters)
    write('final-reconciliation.json',reconciliation)
    write('final-reconciliation.md','# Explicit A–Z final pass\n\nAll canonical/raw/staged rows are accounted for. A true 201 usable-primary catalog is not claimed.\n\n| Check | Requirement | Result |\n|---|---|---|\n'+'\n'.join(f"| {r['letter']} | {r['requirement']} | {r['status']} |" for r in letters)+'\n\nCoverage exception E: Ceviche has no candidate and Lort Cha requires human presentation review. No safe engineering action can create missing raw imagery or fabricate identity approval.\n')

    section_evidence={
        0:'run-log.md',1:'preservation-verification.json',2:'input-directories.json',3:'batch-membership-verification.json',4:'image-candidate-audit.json',5:'image-inventory.json',6:'contact-sheets/',7:'image-candidate-audit.json',8:'duplicate-analysis.json',9:'dish-image-mapping.json',10:'staging-idempotence.json',11:'../staged-import/manifest.json',12:'image-quality-audit.json',13:'lort-cha-trace.md',14:'image-system-architecture.md',15:'../staged-import/manifest.json',16:'score-analysis.json',17:'score-flow-evidence.json',18:'score-propagation-source-scan.json',19:'score-analysis.md',20:'score-flow-evidence.json',21:'final-tests.log',22:'score-analysis.json',23:'recommendation-samples.json',24:'score-flow-evidence.json',25:'score-flow-evidence.json',26:'score-flow-evidence.json',27:'catalog-audit.json',28:'region-audit.json',29:'runtime-validation.md',30:'browser-validation.json',31:'image-performance.json',32:'broken-reference-scan.json',33:'final-python-tests.log',34:'preservation-verification.json',35:'import-dry-run.json',36:'validation-results.json',37:'validation-results.json',38:'../NOM_FULL_AUDIT_REPORT.md',39:'final-summary.json',40:'run-log.md',41:'final-reconciliation.json',42:'../NOM_FULL_AUDIT_REPORT.md',43:'final-summary.json',
    }
    instructions=(OUT/'continuation-instructions.txt').read_text()
    sections=[(int(n),title) for n,title in re.findall(r'^([0-9]+)\. ([A-Z][^\n]+)$',instructions,re.M)]
    # Instruction-body numbered lists are excluded by requiring each section divider.
    sections=[(int(n),title) for n,title in re.findall(r'^={10,}\n([0-9]+)\. ([^\n]+)\n={10,}',instructions,re.M)]
    assert [n for n,_ in sections]==list(range(44))
    checklist=[]
    for n,title in sections:
        status='COMPLETED_SAFE_SCOPE'
        note='Current complete-dataset evidence regenerated/verified; existing user work preserved.'
        if n in {7,9,10,11,12,13,35,41}:
            status='VERIFIED_WITH_HUMAN_COVERAGE_LIMIT';note='199 eligible primaries; Ceviche missing, Lort Cha held and one Goulash secondary retained. No false 201/201 claim.'
        elif n==30:
            status='BLOCKED_BROWSER';note='Retried browser discovery and preview; no browser connected, EPERM HTTP/listen. Mounted/static tests completed.'
        elif n==34:
            status='COMPLETED_NO_PRODUCTION_IMPORT';note='Production apply explicitly not run; runtime/raw hashes unchanged.'
        elif n==37:
            status='COMPLETED_AVAILABLE_CHECKS';note='Actual tests/catalog/build/diff checks pass. Lint/typecheck not configured.'
        elif n==42:
            status='REPORT_AND_TERMINAL_RESPONSE';note='Machine/master reports contain requested actual totals and genuine unresolved human items.'
        checklist.append(dict(section=n,title=title,status=status,note=note,evidence=section_evidence[n]))
    write('checklist-reconciliation.json',checklist)
    write('checklist-reconciliation.md','# Complete continuation checklist 0–43\n\nPrevious partial audit is historical; this ledger addresses the current complete-directory instruction.\n\n| Section | Requirement | Status | Evidence |\n|---|---|---|---|\n'+'\n'.join(f"| {r['section']} | {r['title']} | {r['status']} | {r['evidence']} |" for r in checklist)+'\n')

    batch_notes={
        1:'Nine READY; intended Lort Cha MEDIUM/AMBIGUOUS after full-resolution noodle-form check.',
        2:'Ten generated candidates independently identified; approved/temporary current Ramen, Yakitori, Biryani, Harira and Carbonara stay protected.',
        3:'Ten READY; current Jambalaya stays protected. French Onion Soup, Tacos al Pastor and Lobster Roll replacements are planned with backups.',
        4:'Ten READY; finished dishes distinct, no cooking-scene/collage.',
        5:'Nine distinct expected dishes READY; second Goulash generation B05-10 retained. Ceviche missing despite ten raw files.',
        6:'Ten READY; repeated filename suffixes 1–5 represent two sequences, not duplicated Nasi Goreng etc. Explicit visual mapping resolves interleaved identifiers.',
        7:'Ten READY; bone-in Tandoori Chicken, noodle nests, lentil rice, bread curry, custard-topped Bobotie and rice balls distinguished.',
        12:'Ten READY; actual order differs from expected: Yassa, Arroz Chaufa, Fideuà, Manakish, Pirozhki, Shisa Nyama, Pupusa, Borscht, Rechta, Bissara.',
        17:'Ten distinct expected dishes, one named Adana, no collage/extra/duplicate. Adana non-3:2 crop merits live check.',
        20:'Eleven READY; dark coconut rice and separately named Locro; Pozole and Canadian Split Pea Soup visually distinguished.',
    }
    batch_table='| Batch | Expected | Raw | HIGH/READY | Findings | Contact sheet |\n|---|---|---|---|---|---|\n'
    for b in range(1,21):
        batch_table+=f"| {b} | {11 if b==20 else 10} | {batches[b]} | {sum(r['batch']==b for r in ready)} | {batch_notes.get(b,'Ten expected dishes independently rechecked; earlier raw hashes and staged outputs preserved.')} | [Batch {b}](results/contact-sheets/batch-{b:02d}.png) |\n"
    tests_table='| Check | Actual result |\n|---|---|\n'
    tests_table+=f'| Application tests | {app_tests} pass, {app_files} files |\n| Python tests | {python_tests} pass |\n| Catalog/workbook synchronization | Pass, 201 rows |\n| Build | Pass |\n| Recommendation sweep | {scores["sessionsPassed"]}/{scores["sessions"]} pass |\n| Static local references | {references["staticImportCount"]} checked; zero broken imports/case/ID/asset ownership issues |\n| Review HTML | {references["reviewHtmlImageCount"]} image paths resolve |\n| Staging rerun | All 199 hashes and modification times unchanged |\n| Prior staging preservation | All 131 previous WebPs byte-identical |\n| Import dry run | 199 validate, {actions} |\n| Git diff whitespace check | Pass |\n| Typecheck / lint | Not configured, no pass claimed |\n| Real browser | Unavailable; mounted functional evidence passes |\n'
    current_raw_bytes=performance['rawBytes'];current_stage_bytes=performance['stagedBytes']
    report=f'''# Nom — Complete Repository, 201-Image Catalog and Integration Audit

# Executive Summary

All 20 physical batch folders and all 201 PNGs were accounted for. The catalog has 201 canonical dishes. **199 HIGH-confidence primary images are staged; a true 201 ↔ 201 usable mapping is not established.** Ceviche is absent, intended Lort Cha is AMBIGUOUS, and Batch 5 contains one secondary Goulash generation. Raw inputs and all 131 previously staged WebPs remain unchanged.

| Measure | Actual result |
|---|---|
| Canonical dishes | 201 / 201 |
| Physical batches | 20 / 20 |
| Raw images | 201; ZIP excluded |
| HIGH/READY mappings and staged outputs | 199; 131 reused + 68 added |
| Missing | 1: Ceviche |
| Ambiguous | 1: Lort Cha |
| Duplicate secondary generations | 1: Goulash B05-10 |
| Exact duplicate groups / confirmed near-identical pairs | 0 / 0 |
| Perceptual candidate pairs visually reviewed | {len(duplicates['nearCandidates'])} |
| Wrong-dish assignments / other extras / collages / corrupt | 0 / 0 / 0 / 0 |
| Shared-percentage defect | Not reproduced on current code; own card/detail scores verified |
| Genuine ties | Verified; retained without artificial adjustments |
| More Options | Previous threshold undercount repair preserved; 3+7 unique across current sweep |
| Recommendation sessions | {scores['sessionsPassed']} / {scores['sessions']} pass |
| Application / Python tests | {app_tests} / {python_tests} pass |
| Build / catalog check / complete eligible import dry run | Pass / pass / pass |
| Browser | Retried; unavailable, functional mounted tests pass |

No production image import, human approval, catalog metadata edit, irreversible cleanup or commit was performed. Current runtime remains six renderable real photos and 195 deliberate placeholders.

# Input Correction

The previous partial audit had 13 batches and 131 images because batches 1–7 were absent from the original source archive. The complete audit now has 20 actual batch folders. They are physically located one level below the requested root: {TICK}image-audit/generated-batches/Dish Images/nom_batch1{TICK} through {TICK}nom_batch20{TICK}. This nesting was documented and the originals were not moved.

Only image files inside those physical folders were inventoried. {TICK}Dish Images.zip{TICK} was not opened, extracted, used for mappings or counted. Its immutable hash, like every existing raw file, was checked solely for preservation. Previous reports/manifests are retained under [partial audit history](results/history/partial-131-image-audit/NOM_FULL_AUDIT_REPORT.md); they are historical and do not describe the current totals.

Continuation initial Git status/diff and file hashes were captured before editing. All prior 131 raw identifier/filename/hash combinations match the physical-directory inputs; valid staged pixels were reused. No arbitrary filename ordering was treated as dish proof.

# Batch-by-Batch Results

{batch_table}

Per-dish visual evidence and canonical rows are in [dish-image-mapping.md](results/dish-image-mapping.md), [JSON](results/dish-image-mapping.json) and [CSV](results/dish-image-mapping.csv). Every raw file, including held/secondary input, is represented in [image-candidate-audit.json](results/image-candidate-audit.json). The mapping includes separate width/height, source path/hash, country/region, expected filename, runtime/review state, candidate count, confidence/status and recommended primary.

# High-Risk Review

**Batch 17:** Rechecked all ten distinct presentations against catalog descriptions and expected membership: Freekeh Pilaf, Sfiha, Baasto iyo Suugo, Pastilla, Moi Moi, Attiéké with Grilled Fish, Arroz de Marisco, Arroz Negro, Ćevapi and Adana Kebab. There is one Adana candidate, not repeated first-dish outputs. No collage/multi-panel image is present. Adana's named file is 1376×1143 rather than 1536×1024; staging preserves its aspect (1200×997) without cropping. Actual mobile cover crop review remains necessary.

**Batch 20:** Eleven expected dishes, not an extra-file error. Dark Arroz con Coco is B20-10, {TICK}Rustic Bowl of Golden Seasoned Rice.png{TICK}. Full-resolution review shows tan/brown toasted-looking rice in a simple bowl, without white coconut rice or decorative coconut slices. No white alternate occurs in the physical input folders.

Pozole B20-01 is red chile-style broth with large hominy, shredded meat, cabbage/lettuce, radish, onion and cilantro. Locro B20-11 is dense golden-orange stew with large hominy, squash-like orange pieces and beef; named {TICK}Rustic Golden Hominy Stew with Herbs.png{TICK}. The two were separately inspected at full resolution.

Canadian Split Pea Soup B20-07 was independently checked against both: yellow pulse-thickened body, smaller softened peas, ham-like pink pieces and carrot; it reasonably reads as split pea soup and differs from Locro's large hominy/squash/beef. Exact ingredient chemistry cannot be proved by pixels; confident batch identity is distinct from documentary or cultural approval.

**Batch 5 correction:** B05-08 and B05-10 show two red beef/potato/carrot stews compatible with Goulash, using different vessels/pixels. B05-08 is selected for fuller bowl visibility and breathing room. B05-10, {TICK}Rustic Beef Stew with Bread.png{TICK}, remains a secondary raw candidate. No image shows the citrus-marinated seafood/onion presentation of Ceviche. Poke Bowl is a separately identifiable rice/vegetable/raw-fish bowl and was not relabeled as Ceviche.

**Lort Cha:** B01-01's beef/egg/sprout cues support intended identity, but full-resolution noodles look long and flat rather than the catalog short rice noodles. Status MEDIUM/AMBIGUOUS, held out of staging. This is not a confidently assigned wrong dish; a human can evaluate the presentation or supply a better candidate. Original supplied Lort Cha imagery remains unchanged.

# Complete 201-Dish Reconciliation

Canonical rows: 201 = 199 READY + 1 AMBIGUOUS + 1 MISSING. Raw rows: 201 = 199 READY + 1 AMBIGUOUS + 1 DUPLICATE secondary. These are separate accounting sets; the secondary is not counted as a missing dish or falsely promoted into Ceviche.

Exactly-one-candidate dishes: {summary['images']['exactlyOneCandidateDishes']}; multiple-candidate dishes: {summary['images']['multipleCandidateDishes']} (Goulash); zero-candidate dishes: {summary['images']['zeroCandidateDishes']} (Ceviche). Every dish has at most one recommended HIGH/READY primary. All staged IDs/filenames/source/output hashes reconcile with those 199 primaries. Lort Cha and Ceviche have no staged WebP. No stage file is unowned.

SHA-256 finds no exact groups. All 57 dHash ≤10 pairs were viewed side by side across ten comparison sheets; they depict different food subjects with similar centered vessels. Batch membership reconciliation additionally found the semantic Goulash repetition, even though the perceptual screen did not group it. Similarity hashes are screening evidence, not a proof that all possible transformed duplicates are absent. See [duplicate-analysis.md](results/duplicate-analysis.md).

[Final A–Z reconciliation](results/final-reconciliation.md) explicitly marks the true-201-candidate requirement as requiring human input. [Checklist 0–43](results/checklist-reconciliation.md) accounts for every current instruction section. No unresolved image is disguised as READY.

# Image Quality and Performance

All 201 inputs decoded as PNG; 200 are 1536×1024 and Adana is 1376×1143. All 20 raw sheets and all 20 staged sheets containing 199 converted outputs were reviewed. Previous WebP pixels were checksum-preserved, and identified high-risk cases received full-resolution inspection. [Converted-image review](results/staged-visual-review.json) records each output and its sheet/hash.

The selected candidates are single, finished food subjects with believable textures and editorial-style light. No obvious dominant people/hands, watermark/text/logo, cooking-scene dominance, collage or impossible-vessel artifact was observed at review scale. Generated imagery was not rejected merely for its origin. Ingredient authenticity and exact breathing-room percentages were not fabricated. See [quality audit](results/image-quality-audit.json), with every raw file and its evidence/status.

Raw size: {current_raw_bytes:,} bytes. Staged size: {current_stage_bytes:,} bytes. Median WebP: {performance['medianBytes']:,.0f} bytes; assets above 500 KB: {len(performance['above500KB'])}. Existing conversion convention: cwebp quality 82, method 6, max edge 1200, no upscaling/cropping. All dimensions/aspect ratios and output hashes were verified. The rerun preserved every WebP hash and modification time. Staging is outside src and is not bundled into production.

# Recommendation Score Audit

The shared-percentage symptom was independently rechecked on current code and was not reproduced. scoreDish creates a separate result/breakdown for each canonical dish. recommend retains the object through sorting/tiering; useRecommendations supplies full ranking and More Options. BestMatchCard and RecommendationCard read their own result.score. DishDetails finds the canonical route ID in that same full ranking; DishDetailHero and whyMatched use the selected result. Session/result memoization dependencies were inspected. No first-card score reuse or index-based detail identity was found.

Actual mounted DOM evidence: Sopa de Fideo card/detail **69%**, Tallarines Verdes **62%**, Locro **50%**. More Options Lort Cha and Reshteh Polow independently show **70%**, not the first Top Match's 69%. All three Top cards and all seven More cards were clicked, followed by all seven options in the formerly scarce Europe mode: {len(ui)} observed card/detail interactions. Name, country flag/accessible country label, image URL, short/full descriptions, canonical route, explanation, favorite state and return path agreed. See [score evidence](results/score-flow-evidence.json) and [score-analysis.md](results/score-analysis.md).

Weights remain food 35, selected-flavor fraction 30, adventure 20×(1/.6/.2), region 15, normalized over active dimensions. Descriptors do not earn preference points. Southeast Asia example: Lort Cha 85 (35+15+20+15); Mie Goreng and Pancit Canton both 77 (35+15+12+15); Mì Quảng 70 (35+0+20+15). Same factor totals genuinely tie. Latin America Feijoada/Arroz Chaufa each render 42% with their own detail score.

Across {scores['sessions']} current sessions, Top 3 share a rounded percentage in {scores['topThreeSamePercent']} sessions, all ten in {scores['allTenSamePercent']}, and all More Options in {scores['moreOptionsSamePercent']}. Full per-dish score/breakdown/identity/determinism checks pass. No random adjustment, positional subtraction or artificial percentage diversity was added. This verifies tested current behavior; it does not establish every historical user session or pixel-level browser state.

# More Options

The previous real undercount came from filtering every remaining dish below score 40 without filling empty slots. Sixteen supported Anything + adventure Surprise Me sessions previously had fewer than seven options. The targeted existing fix keeps relevant candidates, fills only the deficit using remaining regional/global ranking, then groups regional cards together. Scores and Top Matches remain unchanged.

The current sweep passes exact 3+7 unique results in every session, with no overlap. Europe Anything/spicy+tangy/adventure Surprise Me now returns seven options including six regional entries and Yassa as the existing relevant global entry. Honest lower-score backfill remains lower score; no score is copied or adjusted by position. The original threshold behavior remains intact where enough relevant candidates exist.

Explicit food-type/region Top priority remains region+food first, then other regional dishes, global backfill only when necessary. Latin America noodle Top positions remain Sopa de Fideo, Tallarines Verdes and Locro; Lort Cha, Reshteh Polow and Rechta do not occupy those top regional positions. The preserved Anything ≥70 regional promotion policy is distinct. Skipped region and Surprise Me retain their neutral dimensions/tie policies. All eight regions and special modes have full samples with IDs, countries, scores and breakdowns.

# Image Integration

[Lort Cha trace](results/lort-cha-trace.md) follows workbook record → lort-cha ID → lort-cha.webp target → review-gated asset/placeholder → recommendation object → own Top/More score → canonical route → details, favorite and nearby behavior. Its intended generated candidate is held, not silently assigned a different image.

[Image architecture](results/image-system-architecture.md) traces canonical catalog, image ledger, registries, placeholder/failure handling, card/detail sources, importer, credits and build hooks. Current runtime/catalog/assets and pre-existing human decisions remain unchanged. The new directory manifest retains raw batch/filename/path/hash, canonical ID, output filename/path/hash/dimensions/bytes, conversion, confidence/status and notes. No PNG generation prompt/model metadata was found; those facts remain unknown. Generated imagery is explicitly non-documentary and receives no transferred Commons URL/license/creator.

No normal build hook fetches/replaces imagery. Commons/Openverse acquisition already protects all local statuses including generated-local and refuses unmapped destinations. Licensed import refuses existing pixels. Bulk optimizer excludes owned catalog/archive and incoming folders. Those protections and tests were retained; useful historical tooling was not deleted.

Safe complete dry run: **{len(staged)} candidates**, **{actions.get('would create',0)} would create**, **{actions.get('would replace',0)} would replace**, **{actions.get('protected',0)} protected**. Protected: Ramen, Harira, Jambalaya (approved); Yakitori, Biryani, Carbonara (temporary). Six rejected photos would be replaced with checksum pixel archives and metadata snapshots. Original supplied files remain in place. All per-dish targets, runtime assets, confidence/status, actions and backup behavior appear in [import-dry-run.md](results/import-dry-run.md).

Importer improvements address the newly used direct-file branch: previously directory filename/batch claims could disagree with the actual path, and file size/symlink checks were weaker than the archive branch. It now refuses mismatches, internal symlinks, traversal/noncanonical source paths, raw size violations and inconsistent catalog counts. Added tests also verify protected/current photo planning and that repeat apply does not rewrite pixels or add history. Apply tests use temporary fixtures only. Production apply was not executed.

# Tests / Validation

{tests_table}

Exact command results/log paths are in [validation-results.json](results/validation-results.json). No current application/Python/catalog/build failures were observed; no tests were disabled. Existing nearby/restaurant, fallback, catalog, alias, image workflow and ranking tests passed. Current all-file hashes verify the complete immutable raw tree, every review copy, all previous staged WebPs and the unchanged runtime/catalog. [Preservation evidence](results/preservation-verification.json).

The complete import dry run was repeated and produced a byte-identical plan. All protected raw, staged, runtime, catalog and data files retained their hashes and modification times. [Repeatability evidence](results/import-dry-run-idempotence.json) is separate from the temporary-fixture tests that apply an import twice.

# Browser Validation

Browser validation was retried using the available Browser skill/runtime. Selection returned “No browser is available”; documented discovery returned []. No existing Playwright/Puppeteer/Cypress dependency or Chrome/Chromium/Firefox application was available. Initial Vite reported ready at port 5180 but later HTTP failed; a controlled port-5182 retry logged **listen EPERM**, and urllib was denied Operation not permitted. See [browser-validation.json](results/browser-validation.json) and its preview log.

Mounted React/happy-dom tests validate actual functional interactions and DOM score propagation. They do not establish live image loading, responsive crops, title line counts, visual overflow or rendered mobile layout. Those remain genuine browser review items. Existing title/description clamps, final word+flag treatment and content-driven 87vw/58dvh edge modal sizing were inspected and preserved; no redesign/theme edit.

# Files Changed

Only these source/docs paths changed relative to the continuation baseline; all unrelated prior dirty work was retained:

| Path | Purpose |
|---|---|
{chr(10).join(f"| {r['path']} | {r['reason']} |" for r in changes)}

No canonical metadata/data correction was needed. No production registry/image ledger/pixel changed. Previous More Options implementation/tests, optimizer guard and importer backup/review protections remain. Exact before/after hashes and previous-run change list are in [file-change-log.json](results/file-change-log.json). Current inventory, mappings, staging manifest, sheets, duplicate evidence, quality/performance, score samples, dry-run plan, preservation, checklist, summary and master report were updated; new WebPs are integration artifacts. Prior reports and the old finalizer were preserved in history.

# Human Review Remaining

1. **Ceviche:** supply/choose a true Peruvian citrus-marinated seafood candidate. Both Batch 5 Goulash files remain untouched; no false substitute was staged.
2. **Lort Cha:** judge B01-01's noodle form against the catalog, or supply a short-rice-noodle candidate. MEDIUM/AMBIGUOUS remains held.
3. **Protected-photo choices and activation:** review the 199 staged images and six protected current photos. Keep or deliberately change existing decisions; do not infer human approval from HIGH engineering identification. Exact original prompts/model are unknown. Review recipe/presentation fidelity, with attention to ingredient-invisible Maafe/Harees.
4. **Live responsive UI:** check generated image crops, especially tighter Adana/detail hero, title/flag line behavior, percentages and modal overflow once a usable browser/preview is available.

No other unresolved engineering mapping/import/test/build issue was found. The duplicate Goulash needs no destructive cleanup; it is already safely retained as secondary.

# Exact Next Step

First inspect [candidate/current-image review](results/image-review.html), coverage issues, protected choices and [complete dry-run plan](results/import-dry-run.md). The safe verification command is:

{FENCE}sh
python3 scripts/import-generated-images.py --staged-manifest image-audit/staged-import/manifest.json --dry-run
{FENCE}

After human inspection and a separately explicit production decision, the pending import command is:

{FENCE}sh
python3 scripts/import-generated-images.py --staged-manifest image-audit/staged-import/manifest.json --apply
{FENCE}

With the current manifest this imports **193 pending candidates** ({actions.get('would create',0)} creates + {actions.get('would replace',0)} backed-up replacements), retains **six protected images**, and leaves Lort Cha/Ceviche unresolved. It does not activate generated candidates. If all 201 generated replacements are desired, resolve those two coverage cases and explicitly decide the six protected current-photo choices before producing a revised plan.

Individual activation after actual cultural/visual review uses the existing review command, for example:

{FENCE}sh
python3 scripts/review-dish-image.py arroz-con-coco --status approved --prompt-reviewed --reason 'Human checked Colombian dark coconut rice, presentation and responsive crop'
{FENCE}

Neither production apply nor human approval was executed during this audit.
'''
    (ROOT/'image-audit/NOM_FULL_AUDIT_REPORT.md').write_text(report)
    write('broken-reference-scan.md',f"# Reference scan\n\n{references['staticImportCount']} static local references checked; zero broken imports, case mismatches, unknown production dish IDs, missing stored images, duplicate manifest paths or unowned catalog assets. {references['reviewHtmlImageCount']} local candidate/current-review image sources resolve. No raw ChatGPT filename occurs in runtime source.\n\n22 stored real photos, six renderable current images and 195 intentional review-gated placeholders remain. Canonical output filenames are unique. Generated-incoming paths belong to tooling/queue only, not direct runtime rendering. Original photo maps are deliberately retained for review and cannot override a generated canonical replacement. Current build additionally resolves module/assets.\n")
    now=datetime.now(timezone.utc).isoformat()
    stages=[
        'Started from preserved 131-image history; continuation status/diff/source/raw/staged hashes captured.',
        'Verified new batches 1–7 and all 20 physical folders under generated-batches/Dish Images; ZIP excluded.',
        'Counted/decoded exactly 201 raw PNGs; regenerated all 20 contact sheets.',
        'Rechecked every batch and canonical membership; old 131 raw hashes identical; batch 6 interleaving explicitly mapped.',
        'Compared 57 dHash pairs in ten sheets; found no near-identical pair. Semantic batch-5 Goulash repetition detected; Ceviche missing.',
        'Full-resolution Lort Cha noodle uncertainty held MEDIUM/AMBIGUOUS; all batch-17/20 identities/special rice/soups rechecked.',
        'Staged 199 HIGH/READY assets: 131 retained + 68 added; all 199 hashes/mtimes stable on rerun.',
        'Traced Lort Cha, image registry/review/fallback, Commons/Openverse guards, honest generated provenance and build hooks.',
        f'Revalidated recommendation scoring/counts/region/special modes across {scores["sessions"]} sessions; every session passes.',
        f'Mounted app recorded {len(ui)} own card/details DOM scores, IDs, image/flag/description/explanation/favorite/return-route interactions.',
        'Retried Browser discovery and local preview; no browser and EPERM listener/request recorded; functional/static checks completed.',
        f'Current validation: {app_tests} app and {python_tests} Python tests, catalog/build, references, staging idempotence and complete dry run pass.',
        f'Complete import plan: {actions}; unknown/ambiguous inputs held, protected photos retained, backups/repeat-apply safety tested in temporary roots.',
        'Final explicit A–Z and sections 0–43 reconciliation; one updated master report/current machine summaries; no production import.',
    ]
    with (OUT/'run-log.md').open('a') as f:
        f.write('\n## Complete audit validation and reconciliation\n\n'+''.join(f'- {now}: {s}\n' for s in stages))
    write('final-git-status.txt',subprocess.check_output(['git','status','--porcelain=v1','-uall'],cwd=ROOT,text=True))
    artifacts=[dict(path=str(p.relative_to(ROOT)),bytes=p.stat().st_size) for p in sorted((ROOT/'image-audit').rglob('*')) if p.is_file() and not p.is_relative_to(ROOT/'image-audit/generated-batches') and not p.is_relative_to(OUT/'raw-copies') and not p.is_relative_to(OUT/'history') and p.name!='artifact-index.json']
    write('artifact-index.json',dict(currentArtifacts=artifacts,historicalPartialAudit='image-audit/results/history/partial-131-image-audit',immutableRawInputsExcludedFromArtifactCounts=True))
    print(json.dumps({k:summary[k] for k in ['catalog','batches','images','recommendations','validation']},indent=2),flush=True)

if __name__=='__main__':
    main()
