#!/usr/bin/env python3
"""Import reviewed or conservatively metadata-matched photos and generate ID maps.

Selection belongs to the separate external fetcher; this importer validates its
recorded identity evidence or a manual visual review. It never changes catalog
data or overwrites the ten original photos. Default mode generates maps offline.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import runpy
import subprocess
import sys
import tempfile
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from image_workflow import (LOCAL_STATUSES, build_queue, coverage, is_renderable,
                            review_html, review_report, review_status, source_type, validate_entries)
MANIFEST = ROOT / 'catalog/images/manifest.json'
RECORDS = ROOT / 'src/data/catalog/records.json'
LICENSES = {'CC0-1.0', 'CC-BY-2.0', 'CC-BY-3.0', 'CC-BY-4.0', 'CC-BY-SA-2.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0', 'public-domain'}


def read_json(path):
    return json.loads(path.read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    content = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(content)
    temporary.replace(path)


def local_path(value):
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT / 'src/assets/food'):
        raise ValueError('Dish photos must be local files under src/assets/food')
    return path


def dimensions(path):
    result = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', str(path)], check=True, capture_output=True, text=True)
    values = {line.strip().split(': ')[0]: int(line.strip().split(': ')[1]) for line in result.stdout.splitlines() if 'pixelWidth:' in line or 'pixelHeight:' in line}
    return values['pixelWidth'], values['pixelHeight']


def check_source(entry):
    if entry.get('license') not in LICENSES:
        raise ValueError(f"{entry['dishId']}: a reusable license is required")
    if not entry.get('visuallyReviewed'):
        if entry.get('selectionMethod') not in {'commons-exact-identity', 'multi-source-ranked'}:
            raise ValueError(f"{entry['dishId']}: visual review or explicit exact-identity metadata matching is required")
        canonical = next((dish for dish in read_json(RECORDS) if dish['id'] == entry['dishId']), None)
        if canonical is None:
            raise ValueError('Unknown canonical dish')
        if entry['selectionMethod'] == 'commons-exact-identity':
            runpy.run_path(str(ROOT / 'scripts/commons_images.py'))['validate_automatic_selection'](entry, canonical)
        else:
            from image_selection import validate_ranked_selection
            qa_path = ROOT / 'catalog/images/selection-qa.json'
            decisions = read_json(qa_path).get('sources', []) if qa_path.exists() else []
            validate_ranked_selection(entry, canonical, decisions)
    for field in ['sourcePageUrl', 'creator', 'licenseUrl']:
        if not isinstance(entry.get(field), str) or not entry[field].strip():
            raise ValueError(f"{entry['dishId']}: missing {field}")
    for field in ['sourcePageUrl', 'licenseUrl']:
        if urlparse(entry[field]).scheme != 'https':
            raise ValueError(f"{entry['dishId']}: {field} must be HTTPS")


def import_photo(entry):
    check_source(entry)
    if (ROOT / 'src/assets/food' / ('dish-' + entry['dishId'] + '.webp')).exists():
        raise ValueError('Existing supplied dish photo retained; no replacement imported')
    if not shutil.which('cwebp') or not shutil.which('sips'):
        raise ValueError('Image import needs cwebp and macOS sips')
    destination = ROOT / 'src/assets/food/catalog' / (entry['dishId'] + '.webp')
    if destination.exists():
        raise ValueError(f'{destination.name}: existing photo retained; replace only in a deliberate content edit')
    with tempfile.TemporaryDirectory(prefix='nom-photo-') as folder:
        source = Path(folder) / 'source-image'
        if entry.get('inputPath'):
            shutil.copyfile(local_path(entry['inputPath']), source)
        else:
            url = entry.get('imageDownloadUrl', '')
            parsed = urlparse(url)
            if parsed.scheme != 'https' or parsed.hostname not in {'upload.wikimedia.org', 'thumb.wikimedia.org'}:
                raise ValueError('Use a direct Wikimedia image file, never a search/description page')
            request = Request(url, headers={'User-Agent': 'NomDevelopmentPhotoImporter/1.0'})
            with urlopen(request, timeout=25) as response:
                if not response.headers.get('Content-Type', '').startswith('image/'):
                    raise ValueError('Download is not an image')
                data = response.read(20_000_001)
                if len(data) > 20_000_000:
                    raise ValueError('Photo exceeds 20 MB import limit')
                source.write_bytes(data)
        optimized = Path(folder) / 'optimized.webp'
        width, height = optimize_photo(source, optimized, minimum_edge=240)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(optimized, destination)
        entry.update(status='licensed-local', sourceType='real', localPath=str(destination.relative_to(ROOT)), width=width, height=height,
                     sha256=hashlib.sha256(destination.read_bytes()).hexdigest(), changes='Resized when needed and converted to WebP; presentation cropping varies by card.')
        if review_status(entry) not in {'approved', 'temporary'}:
            entry.update(reviewStatus='pending-review', needsVisualReview=True)


def optimize_photo(source, destination, minimum_edge=480):
    if source.stat().st_size > 20_000_000:
        raise ValueError('Image exceeds 20 MB import limit')
    width, height = dimensions(source)
    if min(width, height) < minimum_edge:
        raise ValueError(f'Image smaller than {minimum_edge}px minimum edge')
    command = ['cwebp', '-quiet', '-q', '82', '-m', '6']
    if max(width, height) > 1200:
        command += ['-resize', '1200' if width >= height else '0', '1200' if height > width else '0']
    subprocess.run(command + [str(source), '-o', str(destination)], check=True)
    return dimensions(destination)


def country_names(records):
    # Same country labels as the runtime catalog; Node is already a Nom prerequisite.
    result = subprocess.run(['node', '-e', 'const fs=require("fs");const names=new Intl.DisplayNames(["en"],{type:"region"});console.log(JSON.stringify(Object.fromEntries(JSON.parse(fs.readFileSync(0,"utf8")).map(code=>[code,names.of(code)]))))'],
                            input=json.dumps(sorted({record['countryCode'] for record in records})), check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def prepare_catalog(manifest=None, records=None):
    manifest, records = manifest or read_json(MANIFEST), records or read_json(RECORDS)
    entries = manifest['dishes']
    if manifest.get('version') != 1:
        raise ValueError('Unknown image manifest version')
    validate_entries(entries, records)
    for entry in entries:
        if entry['status'] not in {*LOCAL_STATUSES, 'needs-image', 'approved', 'staged'}:
            raise ValueError('Unknown image status')
    stored = [entry for entry in entries if entry['status'] in LOCAL_STATUSES]
    ready = [entry for entry in stored if is_renderable(entry)]
    catalog_images = [entry for entry in ready if entry['status'] != 'existing-local']
    for entry in stored:
        path = local_path(entry['localPath'])
        if not path.is_file() or not path.stat().st_size:
            raise ValueError(f"Missing local image for {entry['dishId']}")
        if entry in ready and entry['status'] == 'licensed-local':
            check_source(entry)
            if (ROOT / 'src/assets/food' / ('dish-' + entry['dishId'] + '.webp')).exists():
                raise ValueError('Licensed manifest entry conflicts with an existing supplied photo')
        if entry['status'] != 'existing-local' and not all(isinstance(entry.get(key), int) and entry[key] > 0 for key in ['width', 'height']):
            raise ValueError('Imported photos need valid intrinsic dimensions')
        if entry['status'] == 'generated-local':
            generation = entry.get('generation', {})
            if source_type(entry) != 'generated' or generation.get('documentaryEvidence') is not False:
                raise ValueError('Generated imagery requires explicit non-documentary provenance')
            if entry in ready and (not entry.get('visuallyReviewed') or entry.get('needsPromptReview') is not False):
                raise ValueError('Generated imagery requires explicit visual and cultural prompt review')
    lines = ['// Generated by scripts/import-dish-images.py. Only approved/temporary imagery is mapped.']
    for index, entry in enumerate(catalog_images):
        relative = Path(entry['localPath']).relative_to('src')
        lines.append(f"import photo{index} from {json.dumps('../' + str(relative))}")
    lines += ['export const catalogDishImages = {'] + [f"  {json.dumps(entry['dishId'])}: photo{index}," for index, entry in enumerate(catalog_images)] + ['}', 'export const catalogImageDimensions = {']
    lines += [f"  [photo{index}]: {{ width: {entry['width']}, height: {entry['height']} }}," for index, entry in enumerate(catalog_images)] + ['}']
    metadata = {entry['dishId']: dict(reviewStatus=review_status(entry), sourceType=source_type(entry), storageStatus=entry['status']) for entry in entries}
    lines += ['export const dishImageReview = ' + json.dumps(metadata, ensure_ascii=False, indent=2), '']
    write(ROOT / 'src/data/dishImageAssets.js', '\n'.join(lines))
    credit_keys = ['dishId', 'status', 'reviewStatus', 'reviewReason', 'sourceType', 'sourcePageUrl', 'creator', 'license', 'licenseUrl', 'changes', 'credit', 'attribution', 'attributionRequired', 'selectionMethod', 'needsVisualReview', 'generation']
    credits = [dict({key: entry.get(key) for key in credit_keys}, history=[{key: old.get(key) for key in credit_keys} for old in entry.get('history', [])]) for entry in stored]
    write(ROOT / 'src/data/dishImageCredits.json', credits)
    report = coverage(entries, records)
    missing = report['missing']
    write(ROOT / 'catalog/images/coverage-report.json', report)
    table = ['# Dishes still needing a photo', '', 'Generated from the canonical image manifest. A search link is never a runtime photo.', '', '| Dish ID | Dish | Reason |', '| --- | --- | --- |']
    table += [f"| {entry['dishId']} | {entry['name']} | {entry['reason']} |" for entry in missing]
    write(ROOT / 'docs/missing-dish-images.md', '\n'.join(table) + '\n')
    countries = country_names(records)
    queue = build_queue(records, entries, countries)
    write(ROOT / 'catalog/images/generated-image-queue.json', queue)
    review = review_report(records, entries, countries, queue)
    write(ROOT / 'catalog/images/image-review.json', review)
    write(ROOT / 'catalog/images/image-review.html', review_html(review, ROOT))
    print(f"Image coverage: {report['realApprovedImages']} approved real, {report['temporaryRealImages']} temporary real; {len(missing)} unresolved.")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--import-approved', action='store_true', help='Import staged real images; visual review controls mapping separately')
    args = parser.parse_args()
    manifest = read_json(MANIFEST)
    if args.import_approved:
        for entry in manifest['dishes']:
            if entry['status'] in {'approved', 'staged'}:
                try:
                    import_photo(entry)
                except (OSError, ValueError, subprocess.CalledProcessError) as error:
                    entry['lastImportError'] = str(error)
                    print(f"Retained placeholder for {entry['dishId']}: {error}")
    prepare_catalog(manifest)
    if args.import_approved:
        write(MANIFEST, manifest)


if __name__ == '__main__':
    main()
