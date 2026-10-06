#!/usr/bin/env python3
"""Run in normal Mac Terminal: conservative, resumable multi-source acquisition.

Dry run searches metadata only, never downloads images or changes runtime maps.
Normal runs need macOS sips, cwebp (brew install webp), and Node. No API key.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import html
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

from commons_images import PHOTO_MIMES
from image_providers import CommonsProvider, download_url, make_providers, safe_https
from image_selection import MIN_CONFIDENCE, rank_key, score_candidate, source_key
from image_workflow import LOCAL_STATUSES, is_renderable, review_status
from fetch_dish_image_lock import single_run

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / 'catalog/images/remaining-image-manifest.json'
MANIFEST = ROOT / 'catalog/images/manifest.json'
API = 'https://commons.wikimedia.org/w/api.php'
MAX_BYTES = 20_000_000
USER_AGENT = 'NomDishPhotoFetcher/2.0 (local development; reusable dish photo selection)'


def read_json(path):
    return json.loads(path.read_text())


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def allowed_url(url):
    parsed = urlparse(url)
    return safe_https(url) and (
        download_url(url) or
        (parsed.hostname == 'commons.wikimedia.org' and parsed.path == '/w/api.php') or
        (parsed.hostname == 'api.openverse.org' and parsed.path == '/v1/images/')
    )


class CommonsRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, new_url):
        if not allowed_url(new_url):
            raise ValueError('Redirect outside supported API/image hosts')
        return super().redirect_request(request, file, code, message, headers, new_url)


class CommonsClient:
    def __init__(self, retries=2, delay=0.8, user_agent=USER_AGENT):
        self.retries, self.delay, self.user_agent = retries, delay, user_agent
        self.opener = build_opener(CommonsRedirects())

    def request(self, url, image=False):
        if not allowed_url(url):
            raise ValueError('Only supported provider APIs and direct image CDNs are allowed')
        if image and not download_url(url):
            raise ValueError('An API/search URL is not an image download')
        for attempt in range(self.retries + 1):
            time.sleep(self.delay)
            try:
                with self.opener.open(Request(url, headers={'User-Agent': self.user_agent}), timeout=25) as response:
                    if not allowed_url(response.geturl()):
                        raise ValueError('Unexpected response URL')
                    content_type = response.headers.get_content_type()
                    if image and content_type not in PHOTO_MIMES:
                        raise ValueError('Download is not a supported image; HTML/search pages are rejected')
                    if not image and content_type != 'application/json':
                        raise ValueError('Provider response is not JSON')
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


def candidate_summary(candidate):
    return {key: candidate.get(key) for key in [
        'provider', 'source', 'query', 'title', 'sourcePageUrl', 'originalImageUrl', 'creator', 'creatorUrl',
        'license', 'licenseUrl', 'originalDimensions', 'identityConfidence', 'visualSuitability',
        'candidateClassification', 'selectionScore', 'selectionEvidence', 'needsVisualReview']}


def find_candidate(client, dish, providers=None, min_confidence=MIN_CONFIDENCE, decisions=(), require_strong=False):
    rejected, eligible = [], []
    names = list(dict.fromkeys([dish['dishName'], *dish.get('alternateNames', [])][:3]))
    queries = [(name, country) for name in names for country in [dish['country'], None]]
    for provider in providers if providers is not None else [CommonsProvider(client)]:
        seen = set()
        for name, country in queries:
            try:
                query, pages = provider.search(name, country)
            except (OSError, ValueError, TypeError, KeyError) as error:
                rejected.append({'provider': provider.name, 'query': [name, country], 'reason': str(error), 'status': 'provider-error'})
                # Bound outages/rate limits: the other provider can still succeed.
                break
            for raw in pages:
                selected = None
                try:
                    selected = provider.normalize(raw)
                    identity = source_key(selected['sourcePageUrl'])
                    if identity in seen:
                        continue
                    seen.add(identity)
                    selected['query'] = query
                    score_candidate(dish, selected, min_confidence, decisions)
                    if require_strong and selected['candidateClassification'] != 'strong-candidate':
                        raise ValueError('Conservative fetch gate requires a strong candidate; questionable imagery stays unresolved')
                    selected['automaticSelection'] = {'version': 2, 'provider': provider.name, 'query': query,
                                                       'minConfidence': min_confidence, 'target': dish, 'raw': raw,
                                                       'qaDecision': next((item for item in decisions if source_key(item['sourcePageUrl']) == identity), None)}
                    eligible.append(selected)
                except (ValueError, TypeError, KeyError) as error:
                    detail = candidate_summary(selected) if selected else {'provider': provider.name, 'query': query, 'title': raw.get('title')}
                    rejected.append(dict(detail, reason=str(error), candidateClassification='rejected-unresolved'))
    if not eligible:
        return None, rejected
    eligible.sort(key=rank_key)
    # Deduplicate Commons files also indexed by Openverse, keeping the best evidence.
    unique = {}
    for selected in eligible:
        unique.setdefault(source_key(selected['sourcePageUrl']), selected)
    ranked = list(unique.values())
    selected = dict(ranked[0], rankedCandidates=ranked)
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
    entry.update(candidate, status='staged', sourceType='real', reviewStatus='pending-review',
                 reviewReason='Automatic download is not visual approval; manual review required.', inputPath=str(source_path.relative_to(ROOT)),
                 visuallyReviewed=False, needsVisualReview=True, selectionMethod='multi-source-ranked',
                 sourceSha256=hashlib.sha256(source_path.read_bytes()).hexdigest())
    width, height = importer['dimensions'](source_path)
    if min(width, height) < 480:
        raise ValueError('Downloaded photo below 480px minimum edge')
    entry['downloadedDimensions'] = {'width': width, 'height': height}
    entry.pop('reason', None)
    importer['import_photo'](entry)
    entry.pop('lastImportError', None)


def write_review(path, outcomes):
    """Standalone, escaped local QA page. Never hotlinks candidate image URLs."""
    escape = lambda value: html.escape(str(value if value is not None else 'unknown'), quote=True)
    sections = []
    for outcome in outcomes:
        image = ''
        local = outcome.get('localPath')
        if local and local.startswith('src/assets/food/catalog/') and (ROOT / local).is_file():
            image = f'<img src="../../{escape(local)}" alt="{escape(outcome["dishName"])}" loading="lazy">'
        source = outcome.get('sourcePageUrl')
        link = f'<a href="{escape(source)}" rel="noreferrer">Source and attribution</a>' if source and safe_https(source) else ''
        sections.append(f'<section><h2>{escape(outcome["dishName"])} · {escape(outcome["country"])}</h2>{image}'
                        f'<p>{escape(outcome.get("status"))} · {escape(outcome.get("candidateClassification"))}</p>'
                        f'<p>Identity: {escape(outcome.get("identityConfidence"))}; visual heuristic: {escape(outcome.get("visualSuitability"))}. Human review required.</p>'
                        f'{link}<details><summary>Evidence, alternatives and rejection reasons</summary><pre>{escape(json.dumps(outcome, ensure_ascii=False, indent=2))}</pre></details></section>')
    content = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nom image QA</title>'
    content += '<style>body{font:16px system-ui;max-width:900px;margin:24px auto;padding:16px}section{border-top:1px solid #ccc;padding:16px 0}img{max-width:100%;max-height:420px;object-fit:contain}pre{white-space:pre-wrap;overflow-wrap:anywhere}summary{cursor:pointer;padding:12px}</style><h1>Latest image batch · manual QA</h1>'
    content += '<p>Confirm canonical dish identity, composition and attribution for every photo. Metadata scores do not verify pixels.</p>'
    content += ''.join(sections) or '<p>No new dish attempts in this run.</p>'
    path.write_text(content + '</html>')


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
    providers = make_providers(client, getattr(args, 'provider', 'all'))
    qa_path = ROOT / 'catalog/images/selection-qa.json'
    decisions = read_json(qa_path).get('sources', []) if qa_path.exists() else []
    min_confidence = getattr(args, 'min_confidence', MIN_CONFIDENCE)
    report_path = ROOT / 'catalog/images' / ('fetch-dry-run-report.json' if args.dry_run else 'fetch-report.json')
    previous = read_json(report_path) if report_path.exists() else {}
    real_report_path = ROOT / 'catalog/images/fetch-report.json'
    real_outcomes = {item['dishId']: item for item in read_json(real_report_path).get('dishes', [])} if real_report_path.exists() else {}
    outcomes = {item['dishId']: item for item in previous.get('dishes', [])}
    for dish in targets:
        outcomes.setdefault(dish['dishId'], {'dishId': dish['dishId'], 'dishName': dish['dishName'], 'status': 'pending'})
    attempted, attempted_ids = 0, []

    def save_report():
        ordered = [outcomes[dish['id']] for dish in records if dish['id'] in outcomes]
        report = {'version': 2, 'dryRun': args.dry_run, 'updatedAt': datetime.now(timezone.utc).isoformat(),
                  'providers': [provider.name for provider in providers], 'minConfidence': min_confidence,
                  'attemptedThisRun': attempted, 'attemptedDishIds': attempted_ids,
                  'summary': dict(Counter(item['status'] for item in ordered)), 'dishes': ordered}
        write_json(report_path, report)
        write_review(report_path.with_suffix('.html'), [outcomes[dish_id] for dish_id in attempted_ids])

    try:
        for dish in targets:
            dish_id = dish['dishId']
            entry, outcome = entries[dish_id], outcomes[dish_id]
            protected = ROOT / 'src/assets/food' / ('dish-' + dish_id + '.webp')
            destination = ROOT / dish['expectedRuntimePath']
            if entry['status'] in LOCAL_STATUSES:
                path = importer['local_path'](entry['localPath'])
                if not path.is_file() or not path.stat().st_size:
                    outcome.update(status='failed', error='Mapped local photo is missing; no silent replacement')
                else:
                    outcome.update(status='downloaded' if entry['status'] == 'licensed-local' else 'existing', localPath=entry['localPath'],
                                   downloaded=True, mapped=is_renderable(entry), visuallyApproved=review_status(entry) == 'approved',
                                   imageReviewStatus=review_status(entry))
                continue
            if protected.exists() or destination.exists():
                outcome.update(status='failed', error='Unmapped/protected local file retained; inspect it before any replacement')
                continue
            if (real_outcomes.get(dish_id, {}).get('status') == 'failed' or (not args.dry_run and outcome['status'] == 'failed')) and not args.retry_failed:
                continue
            if attempted >= args.batch_size:
                continue
            attempted += 1
            attempted_ids.append(dish_id)
            outcome.clear()
            outcome.update(candidate_summary({}), dishId=dish_id, dishName=dish['dishName'], country=dish['country'],
                           needsVisualReview=True, localPath=None, status='pending')
            try:
                candidate, rejected = find_candidate(client, dish, providers, min_confidence, decisions, require_strong=True)
                outcome.update(dishId=dish_id, dishName=dish['dishName'], country=dish['country'],
                               rejectedCandidates=rejected, needsVisualReview=True, localPath=None)
                if not candidate:
                    outcome.update(status='failed', candidateClassification='rejected-unresolved',
                                   error='No candidate passed identity, visual suitability and reusable attribution checks')
                elif args.dry_run:
                    outcome.update(candidate_summary(candidate), status='planned',
                                   rankedCandidates=[candidate_summary(item) for item in candidate['rankedCandidates']],
                                   winnerReason='Highest combined identity/visual score; provider priority breaks ties')
                else:
                    ranked = candidate['rankedCandidates']
                    outcome.update(rankedCandidates=[candidate_summary(item) for item in ranked], downloadFailures=[])
                    for option in ranked[:3]:
                        outcome.update(candidate_summary(option))
                        try:
                            import_selected(entry, dish, option, client, importer)
                            write_json(MANIFEST, manifest)
                            outcome.update(status='downloaded', downloaded=True, mapped=False, visuallyApproved=False,
                                           imageReviewStatus='pending-review', localPath=entry['localPath'], downloadedDimensions=entry['downloadedDimensions'],
                                           winnerReason='Highest-ranked available candidate passing actual download/decode checks')
                            break
                        except (OSError, ValueError, TypeError, KeyError, subprocess.CalledProcessError) as error:
                            outcome['downloadFailures'].append(dict(candidate_summary(option), reason=str(error)))
                            if entry.get('automaticSelection'):
                                entry['lastImportError'] = str(error)
                                write_json(MANIFEST, manifest)
                    else:
                        outcome.update(status='failed', error='All attempted ranked candidates failed download/import; placeholder retained')
            except (OSError, ValueError, TypeError, KeyError, subprocess.CalledProcessError) as error:
                outcome.update(status='failed', error=str(error))
                # Persist staged provenance so a retry can reuse its local source.
                if not args.dry_run and entry.get('automaticSelection'):
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
    parser.add_argument('--provider', choices=['commons', 'openverse', 'all'], default='all', help='Image sources (default all; no API keys required)')
    parser.add_argument('--min-confidence', type=int, default=MIN_CONFIDENCE, help='Minimum identity confidence, 80–100 (default 85)')
    parser.add_argument('--user-agent', default=USER_AGENT, help='Optional descriptive Wikimedia User-Agent including your contact')
    args = parser.parse_args()
    if args.batch_size < 1 or not 0 <= args.retries <= 5 or args.delay < 0.5 or not 80 <= args.min_confidence <= 100:
        parser.error('batch-size must be positive, retries 0–5, delay at least 0.5, min-confidence 80–100')
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
