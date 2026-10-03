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
import tempfile
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
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
        if entry.get('selectionMethod') != 'commons-exact-identity':
            raise ValueError(f"{entry['dishId']}: visual review or explicit exact-identity metadata matching is required")
        canonical = next((dish for dish in read_json(RECORDS) if dish['id'] == entry['dishId']), None)
        if canonical is None:
            raise ValueError('Unknown canonical dish')
        runpy.run_path(str(ROOT / 'scripts/commons_images.py'))['validate_automatic_selection'](entry, canonical)
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
        width, height = dimensions(source)
        if min(width, height) < 240:
            raise ValueError('Photo is too small for the Nom detail view')
        optimized = Path(folder) / 'optimized.webp'
        command = ['cwebp', '-quiet', '-q', '82', '-m', '6']
        if max(width, height) > 1200:
            command += ['-resize', '1200' if width >= height else '0', '1200' if height > width else '0']
        subprocess.run(command + [str(source), '-o', str(optimized)], check=True)
        width, height = dimensions(optimized)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(optimized, destination)
        entry.update(status='licensed-local', localPath=str(destination.relative_to(ROOT)), width=width, height=height,
                     sha256=hashlib.sha256(destination.read_bytes()).hexdigest(), changes='Resized when needed and converted to WebP; presentation cropping varies by card.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--import-approved', action='store_true', help='Download/import visually reviewed, approved manifest rows')
    args = parser.parse_args()
    manifest = read_json(MANIFEST)
    entries, records = manifest['dishes'], read_json(RECORDS)
    if manifest.get('version') != 1 or [entry['dishId'] for entry in entries] != [dish['id'] for dish in records]:
        raise ValueError('Image manifest must preserve all 201 canonical IDs in catalog order')
    if len({entry['dishId'] for entry in entries}) != 201:
        raise ValueError('Duplicate or missing canonical image IDs')
    for entry in entries:
        if entry['status'] not in {'existing-local', 'licensed-local', 'needs-image', 'approved'}:
            raise ValueError('Unknown image status')
        if args.import_approved and entry['status'] == 'approved':
            try:
                import_photo(entry)
            except (OSError, ValueError, subprocess.CalledProcessError) as error:
                entry['lastImportError'] = str(error)
                print(f"Retained placeholder for {entry['dishId']}: {error}")
    licensed = [entry for entry in entries if entry['status'] == 'licensed-local']
    ready = [entry for entry in entries if entry['status'] in {'existing-local', 'licensed-local'}]
    for entry in ready:
        path = local_path(entry['localPath'])
        if not path.is_file() or not path.stat().st_size:
            raise ValueError(f"Missing local image for {entry['dishId']}")
        if entry['status'] == 'licensed-local':
            check_source(entry)
            if (ROOT / 'src/assets/food' / ('dish-' + entry['dishId'] + '.webp')).exists():
                raise ValueError('Licensed manifest entry conflicts with an existing supplied photo')
            if not all(isinstance(entry.get(key), int) and entry[key] > 0 for key in ['width', 'height']):
                raise ValueError('Imported photos need valid intrinsic dimensions')
    lines = ['// Generated by scripts/import-dish-images.py. Existing photos are kept separately.']
    for index, entry in enumerate(licensed):
        relative = Path(entry['localPath']).relative_to('src')
        lines.append(f"import photo{index} from {json.dumps('../' + str(relative))}")
    lines += ['export const licensedDishImages = {'] + [f"  {json.dumps(entry['dishId'])}: photo{index}," for index, entry in enumerate(licensed)] + ['}', 'export const licensedImageDimensions = {']
    lines += [f"  [photo{index}]: {{ width: {entry['width']}, height: {entry['height']} }}," for index, entry in enumerate(licensed)] + ['}', '']
    write(ROOT / 'src/data/dishImageAssets.js', '\n'.join(lines))
    credits = [{key: entry.get(key) for key in ['dishId', 'status', 'sourcePageUrl', 'creator', 'license', 'licenseUrl', 'changes', 'credit', 'attribution', 'attributionRequired', 'selectionMethod', 'needsVisualReview']} for entry in ready]
    write(ROOT / 'src/data/dishImageCredits.json', credits)
    missing = [{'dishId': entry['dishId'], 'name': records[index]['name'], 'reason': entry.get('reason', 'Approved candidate still needs successful local import')} for index, entry in enumerate(entries) if entry['status'] not in {'existing-local', 'licensed-local'}]
    write(ROOT / 'catalog/images/coverage-report.json', {'total': 201, 'realBefore': 10, 'realAfter': len(ready), 'remainingPlaceholders': len(missing), 'missing': missing})
    table = ['# Dishes still needing a photo', '', 'Generated from the canonical image manifest. A search link is never a runtime photo.', '', '| Dish ID | Dish | Reason |', '| --- | --- | --- |']
    table += [f"| {entry['dishId']} | {entry['name']} | {entry['reason']} |" for entry in missing]
    write(ROOT / 'docs/missing-dish-images.md', '\n'.join(table) + '\n')
    if args.import_approved:
        write(MANIFEST, manifest)
    print(f'Photo coverage: {len(ready)}/201 real local images; {len(missing)} placeholders.')


if __name__ == '__main__':
    main()
