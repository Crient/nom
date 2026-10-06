#!/usr/bin/env python3
"""Import local generated candidates only; never generates/downloads images.

Canonical-ID PNG/JPEG/WebP files go in src/assets/food/generated-incoming/.
Imported candidates remain generated-pending unless exact completed human
decisions are supplied for the audited staging manifest.
"""
import argparse
import copy
from datetime import datetime, timezone
import hashlib
from pathlib import Path
import re
import runpy
import shutil
import subprocess
import sys
import tempfile
from zipfile import ZipFile
from pathlib import PurePosixPath

from image_workflow import review_status, is_renderable
from fetch_dish_image_lock import single_run

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}


def import_generated(entry, record, queued, input_path, metadata, importer, root=ROOT, audited_provenance=None, review_authorization=None):
    root = root.resolve()
    dish_id = record['id']
    if entry['dishId'] != dish_id or queued['dishId'] != dish_id or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', dish_id):
        raise ValueError('Generated image must match a canonical dish ID')
    authorized = (audited_provenance and review_authorization
                  and review_authorization.get('decision') == 'USE_GENERATED'
                  and review_authorization.get('approved') is True
                  and review_authorization.get('promptReviewed') is True
                  and review_authorization.get('dishId') == dish_id
                  and review_authorization.get('candidateSourceHash') == audited_provenance.get('sourceHash')
                  and review_authorization.get('candidateOutputHash') == audited_provenance.get('outputHash'))
    if review_authorization and not authorized:
        raise ValueError('Human review authorization does not match the imported candidate')
    if review_status(entry) in {'approved', 'temporary'} and not authorized:
        raise ValueError('Approved/temporary image protected; no replacement imported')
    incoming = (root / ('image-audit/staged-import' if audited_provenance else 'src/assets/food/generated-incoming')).resolve()
    source = input_path.resolve()
    if not source.is_relative_to(incoming) or source.stem != dish_id or source.suffix.lower() not in EXTENSIONS:
        raise ValueError('Use a canonical-ID PNG/JPEG/WebP in generated-incoming; external/symlink paths are rejected')
    if not source.is_file() or not 0 < source.stat().st_size <= 20_000_000:
        raise ValueError('Generated input missing, empty or larger than 20 MB')
    if audited_provenance:
        if (audited_provenance.get('dishId') != dish_id or audited_provenance.get('confidence') != 'HIGH'
                or audited_provenance.get('auditStatus') != 'READY' or source.suffix != '.webp'
                or hashlib.sha256(source.read_bytes()).hexdigest() != audited_provenance.get('outputHash')):
            raise ValueError('Audited source identity, confidence or checksum mismatch')
    if not isinstance(metadata, dict):
        raise ValueError('Generated sidecar must be a JSON object')
    if any(key not in {'tool', 'model', 'prompt', 'createdAt', 'notes'} for key in metadata):
        raise ValueError('Sidecar allows only tool, model, prompt, createdAt and notes')
    if any(not isinstance(value, str) for value in metadata.values()):
        raise ValueError('Generated sidecar values must be strings')
    destination = root / 'src/assets/food/catalog' / (dish_id + '.webp')
    food = (root / 'src/assets/food').resolve()
    if not destination.resolve().is_relative_to(food):
        raise ValueError('Output path escapes food assets')
    if destination.exists() and entry.get('localPath') != str(destination.relative_to(root)):
        raise ValueError('Unmapped output file retained; inspect before replacing')
    original = copy.deepcopy(entry)
    with tempfile.TemporaryDirectory(prefix='nom-generated-') as folder:
        optimized = Path(folder) / 'optimized.webp'
        if audited_provenance:
            # Already encoded and decoded during staging: do not recompress it.
            width, height = importer['dimensions'](source)
            if (width, height) != (audited_provenance['outputWidth'], audited_provenance['outputHeight']):
                raise ValueError('Staged image dimensions changed')
            shutil.copyfile(source, optimized)
        else:
            width, height = importer['optimize_photo'](source, optimized)
        if not optimized.is_file() or not optimized.stat().st_size:
            raise ValueError('Generated conversion produced no output')
        history = copy.deepcopy(original.get('history', []))
        if original.get('localPath'):
            old_path = (root / original['localPath']).resolve()
            if not old_path.is_relative_to(food) or not old_path.is_file():
                raise ValueError('Prior image missing or outside food assets; provenance retained without replacement')
            previous = {key: value for key, value in original.items() if key != 'history'}
            if old_path == destination.resolve():
                checksum = hashlib.sha256(old_path.read_bytes()).hexdigest()
                archive = root / 'src/assets/food/archive' / dish_id / (checksum + '.webp')
                if not archive.resolve().is_relative_to(food):
                    raise ValueError('Archive path escapes food assets')
                archive.parent.mkdir(parents=True, exist_ok=True)
                if archive.exists() and hashlib.sha256(archive.read_bytes()).hexdigest() != checksum:
                    raise ValueError('Archive checksum conflict')
                if not archive.exists(): shutil.copyfile(old_path, archive)
                previous['originalLocalPath'] = previous['localPath']
                previous['localPath'] = str(archive.relative_to(root))
            history.append(previous)
            # Recovery snapshot before changing any runtime file. Source metadata
            # survives even if the process stops before the manifest checkpoint.
            backup = root / 'catalog/images/import-backups' / (dish_id + '-' + hashlib.sha256(old_path.read_bytes()).hexdigest() + '.json')
            importer['write'](backup, previous)
        new_entry = dict(dishId=dish_id, status='generated-local', sourceType='generated', reviewStatus='generated-pending',
                         reviewReason='Generated replacement awaits explicit cultural and visual review.',
                         visuallyReviewed=False, needsVisualReview=True, needsPromptReview=True,
                         localPath=str(destination.relative_to(root)), inputPath=str(source.relative_to(root)), width=width, height=height,
                         sha256=hashlib.sha256(optimized.read_bytes()).hexdigest(),
                         sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(), history=history,
                         creator=None, license=None, licenseUrl=None, sourcePageUrl=None,
                         generation=dict(sourceType='generated', documentaryEvidence=False,
                                         requestedPrompt=queued['prompt'], promptUsed=metadata.get('prompt'),
                                         tool=metadata.get('tool'), model=metadata.get('model'), createdAt=metadata.get('createdAt'),
                                         notes=metadata.get('notes'), importedAt=datetime.now(timezone.utc).isoformat()),
                         changes='Optimized local generated illustration to quality-82 WebP, maximum edge 1200px; not documentary evidence.')
        if audited_provenance:
            new_entry['auditProvenance'] = copy.deepcopy(audited_provenance)
            new_entry['sourceSha256'] = audited_provenance['sourceHash']
            new_entry['changes'] = 'Copied verified staged quality-82 WebP without recompression; raw sources preserved.'
        if authorized:
            review = runpy.run_path(str(Path(__file__).with_name('review-dish-image.py')))
            review['apply_review'](new_entry, 'approved', review_authorization['reason'], prompt_reviewed=True)
            new_entry['humanReviewAuthorization'] = copy.deepcopy(review_authorization)
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix('.webp.tmp')
        shutil.copyfile(optimized, temporary)
        temporary.replace(destination)
        entry.clear(); entry.update(new_entry)


def validate_staged_manifest(document, records, root=ROOT, importer=None):
    """Preflight the entire batch before any runtime/metadata mutation."""
    root = root.resolve()
    stage = root / 'image-audit/staged-import'
    raw = root / 'image-audit/generated-batches'
    if stage.resolve() != stage or raw.resolve() != raw:
        raise ValueError('Staging/raw roots must not be symlinks')
    if not isinstance(document, dict) or document.get('version') != 1 or not isinstance(document.get('dishes'), list):
        raise ValueError('Unsupported staged manifest')
    if document.get('catalogCount', len(records)) != len(records):
        raise ValueError('Staged catalog count differs from canonical catalog')
    seen_ids, seen_outputs, seen_sources = set(), set(), set()
    validated = []
    for row in document['dishes']:
        if not isinstance(row, dict) or any(not isinstance(row.get(key), str) for key in
                ['dishId', 'targetFilename', 'targetRelativePath', 'sourceRelativePath', 'sourceFilename', 'sourceBatch', 'notes']):
            raise ValueError('Malformed staged candidate')
        dish_id = row.get('dishId')
        if dish_id not in records:
            raise ValueError('Unknown canonical dish ID')
        if dish_id in seen_ids or row.get('targetFilename') != dish_id + '.webp':
            raise ValueError('Duplicate dish or noncanonical output filename')
        if row.get('dishName') != records[dish_id]['name']:
            raise ValueError('Staged dish name differs from canonical catalog')
        if row.get('confidence') != 'HIGH' or row.get('auditStatus') != 'READY':
            raise ValueError('Only HIGH-confidence READY inputs can be imported')
        if row.get('sourceType') != 'generated' or row.get('documentaryEvidence') is not False:
            raise ValueError('Accurate generated provenance is required')
        source = (root / row['targetRelativePath']).resolve()
        if source != stage / (dish_id + '.webp') or not source.is_file():
            raise ValueError('Staged output missing or path escapes canonical staging directory')
        if not 0 < source.stat().st_size <= 20_000_000 or source.stat().st_size != row.get('outputBytes'):
            raise ValueError('Staged output size mismatch')
        pixels = source.read_bytes()
        if pixels[:4] != b'RIFF' or pixels[8:12] != b'WEBP' or hashlib.sha256(pixels).hexdigest() != row.get('outputHash'):
            raise ValueError('Staged WebP checksum/header mismatch')
        if any(not isinstance(row.get(key), int) or row[key] <= 0 for key in ['outputWidth', 'outputHeight']):
            raise ValueError('Staged dimensions must be positive integers')
        if importer and importer['dimensions'](source) != (row['outputWidth'], row['outputHeight']):
            raise ValueError('Staged WebP decoded dimensions mismatch')
        for key in ['sourceHash', 'outputHash']:
            if not isinstance(row.get(key), str) or not re.fullmatch(r'[a-f0-9]{64}', row[key]):
                raise ValueError('Invalid checksum')
        archive_value, member = row.get('sourceArchive'), row.get('sourceArchiveMember')
        if archive_value:
            if not isinstance(archive_value, str) or not isinstance(member, str):
                raise ValueError('Malformed raw archive reference')
            archive = (root / archive_value).resolve()
            if not archive.is_relative_to(raw) or not archive.is_file():
                raise ValueError('Raw archive missing or outside protected raw directory')
            path = PurePosixPath(member)
            if path.is_absolute() or '..' in path.parts or path.name != row['sourceFilename'] or path.parent.as_posix() != row['sourceBatch']:
                raise ValueError('Unsafe/inconsistent raw archive member')
            if row.get('sourceRelativePath') != archive_value + '::' + member:
                raise ValueError('Raw archive reference mismatch')
            with ZipFile(archive) as zipped:
                info = zipped.getinfo(member)
                if not 0 < info.file_size <= 20_000_000:
                    raise ValueError('Raw image size outside limits')
                raw_pixels = zipped.read(member)
        else:
            raw_reference = PurePosixPath(row['sourceRelativePath'])
            batch_match = re.fullmatch(r'nom_batch([1-9]|1[0-9]|20)', row['sourceBatch'])
            raw_lexical = root / row['sourceRelativePath']
            raw_path = raw_lexical.resolve()
            replacement = row.get('sourceKind') == 'final-replacement'
            replacement_roots = [root / 'image-audit' / name for name in ('replacements', 'final-replacements')]
            allowed_root = next((p for p in replacement_roots if raw_path.parent == p), None) if replacement else raw
            if (raw_reference.is_absolute() or '..' in raw_reference.parts
                    or str(raw_path.relative_to(root)) != row['sourceRelativePath']
                    or raw_path != raw_lexical or allowed_root is None
                    or allowed_root.resolve() != allowed_root or not raw_path.is_relative_to(allowed_root)
                    or not raw_path.is_file()):
                raise ValueError('Raw source missing or outside protected directory')
            if replacement:
                if (dish_id not in {'ceviche', 'lort-cha'} or row['sourceBatch'] != raw_path.parent.name
                        or member is not None or raw_path.name != row['sourceFilename']
                        or raw_path.suffix.lower() not in EXTENSIONS):
                    raise ValueError('Final replacement filename/dish provenance mismatch')
            elif (not batch_match or raw_path.name != row['sourceFilename']
                    or raw_path.parent.name != row['sourceBatch'] or member is not None
                    or row.get('batch', int(batch_match[1])) != int(batch_match[1])):
                raise ValueError('Raw directory filename/batch provenance mismatch')
            if not 0 < raw_path.stat().st_size <= 20_000_000:
                raise ValueError('Raw image size outside limits')
            raw_pixels = raw_path.read_bytes()
        if hashlib.sha256(raw_pixels).hexdigest() != row['sourceHash']:
            raise ValueError('Raw source checksum mismatch')
        if source in seen_outputs or row['sourceHash'] in seen_sources or row['outputHash'] in {r['outputHash'] for r in validated}:
            raise ValueError('Candidate/output reused for multiple dishes')
        seen_ids.add(dish_id); seen_outputs.add(source); seen_sources.add(row['sourceHash'])
        validated.append(row)
    return validated


def validate_review_decisions(document, rows, entries, records, root=ROOT):
    """Bind explicit final human choices to every canonical ID and exact pixels."""
    root = root.resolve()
    if (not isinstance(document, dict) or document.get('version') != 1
            or document.get('humanReviewCompleted') is not True
            or document.get('catalogCount') != len(records) or not isinstance(document.get('dishes'), list)):
        raise ValueError('Complete explicit human review document required')
    staged = {r['dishId']: r for r in rows}
    decisions, destinations = {}, set()
    for decision in document['dishes']:
        dish_id = decision.get('dishId') if isinstance(decision, dict) else None
        if dish_id not in records or dish_id in decisions or decision.get('dishName') != records[dish_id]['name']:
            raise ValueError('Unknown, duplicate or mismatched human decision ID/name')
        if (decision.get('decision') not in {'KEEP_EXISTING', 'USE_GENERATED'}
                or decision.get('approved') is not True or not isinstance(decision.get('reason'), str)
                or not decision['reason'].strip()):
            raise ValueError('Explicit human image choice and approval reason required')
        entry = entries[dish_id]
        current = (root / entry['localPath']) if entry.get('localPath') else None
        if current and (current.resolve() != current or not current.is_relative_to(root / 'src/assets/food') or not current.is_file()):
            raise ValueError('Existing selected image path unsafe or missing')
        current_hash = hashlib.sha256(current.read_bytes()).hexdigest() if current else None
        if decision['decision'] == 'KEEP_EXISTING':
            if not is_renderable(entry) or decision.get('selectedRuntimePath') != entry.get('localPath'):
                raise ValueError('Retained image must be renderable and match its existing path')
            if current_hash != decision.get('currentImageHash'):
                raise ValueError('Retained pixels changed after human review')
        else:
            row = staged.get(dish_id)
            if (not row or decision.get('promptReviewed') is not True
                    or decision.get('candidateSourceHash') != row['sourceHash']
                    or decision.get('candidateOutputHash') != row['outputHash']
                    or decision.get('selectedRuntimePath') != 'src/assets/food/catalog/' + dish_id + '.webp'):
                raise ValueError('Human review must match exact staged candidate and canonical target')
            same_import = (entry.get('status') == 'generated-local' and current_hash == row['outputHash']
                           and entry.get('sourceSha256') == row['sourceHash'] and entry.get('sha256') == current_hash)
            if not same_import and current_hash != decision.get('currentImageHash'):
                raise ValueError('Existing pixels changed since replacement authorization')
        destination = decision['selectedRuntimePath']
        if destination in destinations:
            raise ValueError('Selected runtime image collision')
        destinations.add(destination); decisions[dish_id] = decision
    if set(decisions) != set(records):
        raise ValueError('Final human choices must cover every canonical dish exactly once')
    return decisions


def import_audited(args, importer):
    manifest = importer['read_json'](ROOT / 'catalog/images/manifest.json')
    records = {r['id']: r for r in importer['read_json'](ROOT / 'src/data/catalog/records.json')}
    stage_path = (ROOT / args.staged_manifest).resolve()
    if stage_path != ROOT / 'image-audit/staged-import/manifest.json':
        raise ValueError('Use the canonical image-audit/staged-import/manifest.json')
    rows = validate_staged_manifest(importer['read_json'](stage_path), records, root=ROOT, importer=importer)
    entries = {e['dishId']: e for e in manifest['dishes']}
    review_path = getattr(args, 'review_decisions', None)
    decisions = {}
    if review_path:
        path = ROOT / review_path
        if path.resolve() != ROOT / 'image-audit/results/final-image-decisions.json':
            raise ValueError('Use canonical image-audit/results/final-image-decisions.json')
        decisions = validate_review_decisions(importer['read_json'](path), rows, entries, records, ROOT)
    plans = []
    for row in rows:
        entry = entries[row['dishId']]
        destination = ROOT / 'src/assets/food/catalog' / row['targetFilename']
        if destination.resolve() != destination:
            raise ValueError('Runtime destination escapes catalog directory')
        if (entry.get('status') == 'generated-local' and destination.exists()
                and hashlib.sha256(destination.read_bytes()).hexdigest() != entry.get('sha256')):
            raise ValueError('Existing generated pixels differ from manifest checksum; retain and inspect before replacement')
        action = 'would replace' if destination.exists() else 'would create'
        reason = row['notes']
        decision = decisions.get(row['dishId'])
        if ((decision and decision['decision'] == 'KEEP_EXISTING')
                or (not decision and review_status(entry) in {'approved', 'temporary'})):
            action = 'protected'; reason = 'Explicitly reviewed current image retained; requires deliberate review decision.'
        elif destination.exists() and entry.get('localPath') != str(destination.relative_to(ROOT)):
            raise ValueError('Unmapped runtime file retained; inspect before replacing')
        elif entry.get('status') == 'generated-local' and entry.get('sha256') == row['outputHash'] and entry.get('sourceSha256') == row['sourceHash']:
            action = 'unchanged'; reason = 'Identical audited candidate already imported'
        if entry.get('localPath'):
            prior = (ROOT / entry['localPath']).resolve()
            if not prior.is_relative_to((ROOT / 'src/assets/food').resolve()) or not prior.is_file():
                raise ValueError('Existing image missing or outside food assets')
        plans.append(dict(dishId=row['dishId'],dishName=row['dishName'],sourceCandidate=row['sourceRelativePath'],stagedFile=row['targetRelativePath'],targetAsset=str(destination.relative_to(ROOT)),action=action,existingAsset=entry.get('localPath'),existingRuntimeAsset=entry.get('localPath') if is_renderable(entry) else 'src/assets/food/dish-placeholder.svg',existingStatus=review_status(entry),auditStatus=row['auditStatus'],backupBehavior='Preserve original supplied photos; checksum archive and metadata snapshot before canonical replacement',confidence=row['confidence'],reason=reason))
    # Dry run writes only its reviewable audit report. Applying is explicit.
    if args.apply:
        countries = importer['country_names'](list(records.values()))
        from image_workflow import queue_entry
        with single_run(ROOT / 'catalog/images'):
            for row, plan in zip(rows, plans):
                if plan['action'] in {'protected', 'unchanged'}:
                    continue
                entry, record = entries[row['dishId']], records[row['dishId']]
                queued = queue_entry(record, entry, countries[record['countryCode']])
                import_generated(entry, record, queued, ROOT / row['targetRelativePath'],
                                 {'notes': row['notes']}, importer, root=ROOT, audited_provenance=row,
                                 review_authorization=decisions.get(row['dishId']))
                importer['write'](ROOT / 'catalog/images/manifest.json', manifest)
            importer['prepare_catalog'](manifest)
            subprocess.run(['node', str(ROOT / 'scripts/export-missing-images.mjs')], cwd=ROOT, check=True)
    from collections import Counter
    counts = dict(Counter(p['action'] for p in plans))
    unstaged = sorted(set(records) - {r['dishId'] for r in rows})
    report = dict(version=1, dryRun=not args.apply, canonicalDishes=len(records), candidates=len(rows), actionCounts=counts, unstagedDishIds=unstaged,
                  reviewDecisions=review_path, explicitHumanChoices=len(decisions),
                  productionReview='Exact selected generated images approved by completed explicit human review' if decisions else 'Imported candidates remain generated-pending until explicit human cultural/visual review', dishes=plans)
    importer['write'](ROOT / 'image-audit/results' / ('import-applied.json' if args.apply else 'import-dry-run.json'), report)
    policy = 'Completed explicit human decisions select exact pixels for replacement/approval; KEEP EXISTING assets remain protected.' if decisions else 'Protected entries retain existing approved/temporary images; --apply imports pending candidates and does not activate them.'
    table = f'# Audited import dry run\n\n{len(rows)} validated HIGH/READY candidates of {len(records)} canonical dishes. Actions: {counts}. Unstaged IDs: {", ".join(unstaged) or "none"}. {policy}\n\nDry run changes no runtime assets or image review metadata. HIGH/READY staging alone does not confer human cultural approval.\n\n| Dish | Raw candidate | Target | Current runtime image | Action | Existing status | Confidence/status | Reason |\n|---|---|---|---|---|---|---|---|\n'
    table += '\n'.join(f"| {p['dishId']} | {p['sourceCandidate']} | {p['targetAsset']} | {p['existingRuntimeAsset']} | {p['action']} | {p['existingStatus']} | {p['confidence']}/{p['auditStatus']} | {p['reason']} |" for p in plans)
    if not args.apply:
        importer['write'](ROOT / 'image-audit/results/import-dry-run.md', table + '\n\nBackups: ' + plans[0]['backupBehavior'] + '\n' if plans else table)
    print(f"{'Applied' if args.apply else 'DRY RUN'}: {len(plans)} validated candidates; raw/runtime data untouched by dry run")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dish', help='Import one canonical dish ID (default: staged candidates)')
    parser.add_argument('--staged-manifest', help='Validated audit staging manifest; defaults to dry run')
    parser.add_argument('--review-decisions', help='Exact final human choices; permits only expressly approved replacements/activation')
    execution = parser.add_mutually_exclusive_group()
    execution.add_argument('--dry-run', action='store_true', help='Validate/report only; no runtime or review metadata writes')
    execution.add_argument('--apply', action='store_true', help='Import pending candidates, or activate exact images with --review-decisions')
    args = parser.parse_args()
    if args.review_decisions and not args.staged_manifest:
        parser.error('--review-decisions requires --staged-manifest')
    importer = runpy.run_path(str(ROOT / 'scripts/import-dish-images.py'))
    if args.staged_manifest:
        if args.dish:
            parser.error('--dish cannot be combined with --staged-manifest; use the full validated audit batch')
        try:
            return import_audited(args, importer)
        except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
            parser.error(str(error))
    manifest = importer['read_json'](ROOT / 'catalog/images/manifest.json')
    records = {record['id']: record for record in importer['read_json'](ROOT / 'src/data/catalog/records.json')}
    queue = {item['dishId']: item for item in importer['read_json'](ROOT / 'catalog/images/generated-image-queue.json')['dishes']}
    entries = {entry['dishId']: entry for entry in manifest['dishes']}
    incoming = ROOT / 'src/assets/food/generated-incoming'
    results = []
    if args.dish and args.dish not in records:
        parser.error('Unknown canonical dish ID')
    if not shutil.which('sips') or not shutil.which('cwebp'):
        parser.error('Needs macOS sips and cwebp (brew install webp)')
    with single_run(ROOT / 'catalog/images'):
        paths = sorted(path for path in incoming.iterdir() if path.suffix.lower() in EXTENSIONS and (not args.dish or path.stem == args.dish)) if incoming.exists() else []
        counts = {path.stem: sum(other.stem == path.stem for other in paths) for path in paths}
        if args.dish and not paths:
            parser.error('No staged image found for that dish')
        for path in paths:
            dish_id = path.stem
            try:
                if dish_id not in records or dish_id not in queue:
                    raise ValueError('Unknown dish or protected/completed image not in fallback queue')
                if counts[dish_id] != 1:
                    raise ValueError('Multiple staged files for one ID; retain only the intended candidate')
                checksum = hashlib.sha256(path.read_bytes()).hexdigest()
                if entries[dish_id].get('status') == 'generated-local' and entries[dish_id].get('sourceSha256') == checksum:
                    results.append(dict(dishId=dish_id, status='skipped', reason='Identical candidate already imported'))
                    continue
                sidecar = path.with_suffix('.json')
                metadata = importer['read_json'](sidecar) if sidecar.exists() else {}
                if not args.apply:
                    results.append(dict(dishId=dish_id, status='planned', reason='Dry run; use --apply to import pending candidate'))
                    continue
                import_generated(entries[dish_id], records[dish_id], queue[dish_id], path, metadata, importer)
                importer['write'](ROOT / 'catalog/images/manifest.json', manifest)
                results.append(dict(dishId=dish_id, status='generated-pending', localPath=entries[dish_id]['localPath']))
            except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
                results.append(dict(dishId=dish_id, status='failed', reason=str(error)))
        if args.apply:
            importer['prepare_catalog'](manifest)
            subprocess.run(['node', str(ROOT / 'scripts/export-missing-images.mjs')], cwd=ROOT, check=True)
        importer['write'](ROOT / ('catalog/images/generated-import-report.json' if args.apply else 'image-audit/results/generated-import-dry-run.json'), {'version': 1, 'dryRun': not args.apply, 'dishes': results})
    for item in results: print(f"{item['dishId']}: {item['status']} {item.get('reason', '')}")
    return 1 if any(item['status'] == 'failed' for item in results) else 0


if __name__ == '__main__':
    sys.exit(main())
