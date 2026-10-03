#!/usr/bin/env python3
"""Run in normal Mac Terminal: conservative, resumable Commons photo acquisition.

Dry run searches metadata only, never downloads images or changes runtime maps.
Normal runs need macOS sips, cwebp (brew install webp), and Node. No API key.
"""
import argparse
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import build_opener, HTTPRedirectHandler, Request

from commons_images import DOWNLOAD_HOSTS, PHOTO_MIMES, evaluate_candidate

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / 'catalog/images/remaining-image-manifest.json'
MANIFEST = ROOT / 'catalog/images/manifest.json'
API = 'https://commons.wikimedia.org/w/api.php'
MAX_BYTES = 20_000_000
USER_AGENT = 'NomDishPhotoFetcher/1.0 (local development; Wikimedia Commons metadata matching)'


def read_json(path):
    return json.loads(path.read_text())


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def allowed_url(url):
    parsed = urlparse(url)
    return parsed.scheme == 'https' and not parsed.username and (
        parsed.hostname in DOWNLOAD_HOSTS or
        (parsed.hostname == 'commons.wikimedia.org' and parsed.path == '/w/api.php')
    )


class CommonsRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, new_url):
        if not allowed_url(new_url):
            raise ValueError('Redirect outside Commons API/image hosts')
        return super().redirect_request(request, file, code, message, headers, new_url)


class CommonsClient:
    def __init__(self, retries=2, delay=0.8, user_agent=USER_AGENT):
        self.retries, self.delay, self.user_agent = retries, delay, user_agent
        self.opener = build_opener(CommonsRedirects())

    def request(self, url, image=False):
        if not allowed_url(url):
            raise ValueError('Only the Commons API and direct image files are allowed')
        for attempt in range(self.retries + 1):
            time.sleep(self.delay)
            try:
                with self.opener.open(Request(url, headers={'User-Agent': self.user_agent}), timeout=25) as response:
                    if not allowed_url(response.geturl()):
                        raise ValueError('Unexpected response URL')
                    content_type = response.headers.get_content_type()
                    if image and content_type not in PHOTO_MIMES:
                        raise ValueError('Download is not a supported image; HTML/search pages are rejected')
                    limit = MAX_BYTES if image else 4_000_000
                    data = response.read(limit + 1)
                    if len(data) > limit:
                        raise ValueError('Response exceeds size limit')
                    if image:
                        return data, content_type
                    payload = json.loads(data)
                    if payload.get('error'):
                        error = payload['error']
                        if error.get('code') in {'maxlag', 'ratelimited'} and attempt < self.retries:
                            time.sleep(min(2 ** (attempt + 1), 8))
                            continue
                        raise ValueError(f"Commons API: {error.get('code')}: {error.get('info')}")
                    return payload
            except (HTTPError, URLError, TimeoutError, OSError) as error:
                retryable = not isinstance(error, HTTPError) or error.code in {408, 429, 500, 502, 503, 504}
                if not retryable or attempt == self.retries:
                    raise
                retry_after = error.headers.get('Retry-After', '0') if isinstance(error, HTTPError) else '0'
                wait = min(float(retry_after), 30) if retry_after.isdigit() else 0
                time.sleep(max(wait, min(2 ** (attempt + 1), 8)))

    def search(self, name, country=None):
        # Never broaden to anonymous "food" results when exact identity fails.
        name = name.replace('"', ' ')
        query = f'"{name}"' + (f' "{country}"' if country else '')
        params = {
            'action': 'query', 'format': 'json', 'formatversion': 2, 'maxlag': 5,
            'generator': 'search', 'gsrnamespace': 6, 'gsrsearch': query, 'gsrlimit': 10,
            'prop': 'imageinfo|categories', 'cllimit': 50,
            'iiprop': 'url|size|mime|mediatype|extmetadata', 'iiurlwidth': 1200,
            'iiextmetadatalanguage': 'en',
            'iiextmetadatafilter': 'Artist|Credit|Attribution|AttributionRequired|LicenseShortName|LicenseUrl|ImageDescription|ObjectName|Restrictions',
        }
        return query, self.request(API + '?' + urlencode(params)).get('query', {}).get('pages', [])


def find_candidate(client, dish):
    rejected, eligible, seen = [], [], set()
    # Try country-qualified names first, then the complete canonical name alone
    # to find captions using a demonym. Country evidence is still mandatory.
    queries = [(name, dish['country']) for name in [dish['dishName'], *dish.get('alternateNames', [])][:3]]
    queries.append((dish['dishName'], None))
    for name, country in queries:
        query, pages = client.search(name, country)
        for page in sorted(pages, key=lambda page: page.get('index', 0)):
            identity = page.get('pageid', page.get('title'))
            if identity in seen:
                continue
            seen.add(identity)
            try:
                selected = evaluate_candidate(dish, page)
                eligible.append((selected['selectionScore'], selected, page, query))
            except (ValueError, TypeError, KeyError) as error:
                rejected.append({'title': page.get('title'), 'reason': str(error)})
        if eligible:
            break
    if not eligible:
        return None, rejected
    eligible.sort(key=lambda item: -item[0])  # Stable source order for equal evidence.
    _, selected, page, query = eligible[0]
    selected['automaticSelection'] = {'provider': 'wikimedia-commons', 'query': query, 'target': dish, 'page': page}
    return selected, rejected


def import_selected(entry, dish, candidate, client, importer):
    staged = entry.get('inputPath')
    if (staged and entry.get('automaticSelection') == candidate['automaticSelection']
            and importer['local_path'](staged).is_file()
            and importer['local_path'](staged).stat().st_size <= MAX_BYTES
            and hashlib.sha256(importer['local_path'](staged).read_bytes()).hexdigest() == entry.get('sourceSha256')):
        source_path = importer['local_path'](staged)
    else:
        data, mime = client.request(candidate['imageDownloadUrl'], image=True)
        suffix = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}[mime]
        source_path = ROOT / 'src/assets/food/incoming' / (dish['dishId'] + suffix)
        source_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = source_path.with_suffix(source_path.suffix + '.tmp')
        temporary.write_bytes(data)
        temporary.replace(source_path)
    entry.update(candidate, status='approved', inputPath=str(source_path.relative_to(ROOT)),
                 visuallyReviewed=False, needsVisualReview=True, selectionMethod='commons-exact-identity',
                 sourceSha256=hashlib.sha256(source_path.read_bytes()).hexdigest())
    entry.pop('reason', None)
    importer['import_photo'](entry)
    entry.pop('lastImportError', None)


@contextmanager
def single_run(folder):
    """Avoid two Terminal processes racing over the manifest or generated maps."""
    lock = folder / '.fetch.lock'
    try:
        lock.mkdir()
    except FileExistsError:
        raise ValueError(f'Another fetch is running (or interrupted): {lock}. Remove the empty lock directory only after confirming no fetch process is running.')
    try:
        yield
    finally:
        lock.rmdir()


def run(args, client=None, importer=None):
    source = read_json(INPUT)
    manifest = read_json(MANIFEST)
    records = read_json(ROOT / 'src/data/catalog/records.json')
    canonical = {dish['id']: dish for dish in records}
    entries = {entry['dishId']: entry for entry in manifest['dishes']}
    if [entry['dishId'] for entry in manifest['dishes']] != [dish['id'] for dish in records] or len(entries) != len(records):
        raise ValueError('Image manifest must preserve unique canonical catalog IDs and order')
    targets = source['dishes']
    if len({dish['dishId'] for dish in targets}) != len(targets):
        raise ValueError('Duplicate IDs in remaining-image manifest')
    for dish in targets:
        record = canonical.get(dish['dishId'])
        if not record or dish['dishName'] != record['name'] or dish['countryCode'] != record['countryCode'] or dish.get('alternateNames') != record['aliases']:
            raise ValueError('Remaining-image manifest does not match canonical records; run npm run images:remaining')
        if dish['expectedImageFilename'] != dish['dishId'] + '.webp' or dish['expectedRuntimePath'] != 'src/assets/food/catalog/' + dish['dishId'] + '.webp':
            raise ValueError('Unexpected canonical output filename/path')
    if not args.dry_run and importer is None:
        for command in ['cwebp', 'sips', 'node']:
            if not shutil.which(command):
                raise ValueError(f'Missing {command}; normal runs need macOS sips, Node and brew install webp')
    importer = importer or runpy.run_path(str(ROOT / 'scripts/import-dish-images.py'))
    client = client or CommonsClient(args.retries, args.delay, args.user_agent)
    report_path = ROOT / 'catalog/images' / ('fetch-dry-run-report.json' if args.dry_run else 'fetch-report.json')
    previous = read_json(report_path) if report_path.exists() else {}
    outcomes = {item['dishId']: item for item in previous.get('dishes', [])}
    for dish in targets:
        outcomes.setdefault(dish['dishId'], {'dishId': dish['dishId'], 'dishName': dish['dishName'], 'status': 'pending'})
    attempted = 0

    def save_report():
        ordered = [outcomes[dish['id']] for dish in records if dish['id'] in outcomes]
        write_json(report_path, {'version': 1, 'dryRun': args.dry_run, 'updatedAt': datetime.now(timezone.utc).isoformat(),
                                'attemptedThisRun': attempted, 'summary': dict(Counter(item['status'] for item in ordered)), 'dishes': ordered})

    try:
        for dish in targets:
            dish_id = dish['dishId']
            entry, outcome = entries[dish_id], outcomes[dish_id]
            protected = ROOT / 'src/assets/food' / ('dish-' + dish_id + '.webp')
            destination = ROOT / dish['expectedRuntimePath']
            if entry['status'] in {'existing-local', 'licensed-local'}:
                path = importer['local_path'](entry['localPath'])
                if not path.is_file() or not path.stat().st_size:
                    outcome.update(status='failed', error='Mapped local photo is missing; no silent replacement')
                else:
                    outcome.update(status='success' if entry['status'] == 'licensed-local' else 'existing', localPath=entry['localPath'])
                continue
            if protected.exists() or destination.exists():
                outcome.update(status='failed', error='Unmapped/protected local file retained; inspect it before any replacement')
                continue
            if not args.dry_run and outcome['status'] == 'failed' and not args.retry_failed:
                continue
            if attempted >= args.batch_size:
                continue
            attempted += 1
            try:
                candidate, rejected = find_candidate(client, dish)
                outcome.clear()
                outcome.update(dishId=dish_id, dishName=dish['dishName'], rejectedCandidates=rejected)
                if not candidate:
                    outcome.update(status='failed', error='No exact dish + country photo with complete reusable attribution')
                elif args.dry_run:
                    outcome.update(status='planned', sourcePageUrl=candidate['sourcePageUrl'], license=candidate['license'], evidence=candidate['selectionEvidence'])
                else:
                    import_selected(entry, dish, candidate, client, importer)
                    write_json(MANIFEST, manifest)
                    outcome.update(status='success', localPath=entry['localPath'], sourcePageUrl=entry['sourcePageUrl'],
                                   creator=entry['creator'], license=entry['license'], needsVisualReview=True, evidence=entry['selectionEvidence'])
            except (OSError, ValueError, TypeError, KeyError, subprocess.CalledProcessError) as error:
                outcome.update(status='failed', error=str(error))
                # Persist staged provenance so a retry can reuse its local source.
                if entry.get('automaticSelection'):
                    entry['lastImportError'] = str(error)
                    write_json(MANIFEST, manifest)
            print(f"{dish_id}: {outcome['status']} {outcome.get('error', '')}")
            save_report()
    finally:
        save_report()
        if not args.dry_run:
            # Offline generation also repairs maps after an interrupted previous run.
            subprocess.run([sys.executable, str(ROOT / 'scripts/import-dish-images.py')], cwd=ROOT, check=True)
            subprocess.run(['node', str(ROOT / 'scripts/export-missing-images.mjs')], cwd=ROOT, check=True)
    print(f'Report: {report_path.relative_to(ROOT)}')
    return read_json(report_path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true', help='Search and report only; no photo downloads or mapping changes')
    parser.add_argument('--batch-size', type=int, default=20, help='Maximum new dish attempts this run (default 20)')
    parser.add_argument('--retries', type=int, default=2, help='Retries per transient network request (0–5, default 2)')
    parser.add_argument('--delay', type=float, default=0.8, help='Seconds between requests (minimum 0.5)')
    parser.add_argument('--retry-failed', action='store_true', help='Retry previously failed dishes; otherwise resume pending dishes')
    parser.add_argument('--user-agent', default=USER_AGENT, help='Optional descriptive Wikimedia User-Agent including your contact')
    args = parser.parse_args()
    if args.batch_size < 1 or not 0 <= args.retries <= 5 or args.delay < 0.5:
        parser.error('batch-size must be positive, retries 0–5, delay at least 0.5')
    try:
        with single_run(ROOT / 'catalog/images'):
            run(args)
    except KeyboardInterrupt:
        print('\nStopped; completed imports and reports are saved. Rerun to resume.', file=sys.stderr)
        return 130
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f'Fetcher stopped: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
