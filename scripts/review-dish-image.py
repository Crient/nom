#!/usr/bin/env python3
"""Record an explicit human image decision and regenerate offline artifacts."""
import argparse
from datetime import datetime, timezone
import runpy
import subprocess
from pathlib import Path

from fetch_dish_image_lock import single_run
from image_workflow import LOCAL_STATUSES, source_type

ROOT = Path(__file__).resolve().parents[1]


def apply_review(entry, status, reason, prompt_reviewed=False):
    if status not in {'approved', 'temporary', 'needs-replacement'} or not reason.strip():
        raise ValueError('Explicit approved/temporary/needs-replacement decision and reason required')
    if not entry.get('localPath') or entry.get('status') not in LOCAL_STATUSES:
        raise ValueError('Review requires a successfully imported local candidate')
    if source_type(entry) == 'generated' and status in {'approved', 'temporary'}:
        if not prompt_reviewed and entry.get('needsPromptReview') is not False:
            raise ValueError('Generated candidate needs cultural prompt review; pass --prompt-reviewed only after checking it')
        entry['needsPromptReview'] = False
    entry.update(reviewStatus=status, reviewReason=reason, visuallyReviewed=True, needsVisualReview=False,
                 reviewDecisionSource='explicit-human-review', reviewedAt=datetime.now(timezone.utc).isoformat())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dish_id')
    parser.add_argument('--status', required=True, choices=['approved', 'temporary', 'needs-replacement'])
    parser.add_argument('--reason', required=True)
    parser.add_argument('--prompt-reviewed', action='store_true', help='Confirm culturally accurate generated prompt and resulting image')
    args = parser.parse_args()
    importer = runpy.run_path(str(ROOT / 'scripts/import-dish-images.py'))
    with single_run(ROOT / 'catalog/images'):
        manifest = importer['read_json'](ROOT / 'catalog/images/manifest.json')
        entry = next((entry for entry in manifest['dishes'] if entry['dishId'] == args.dish_id), None)
        if not entry:
            parser.error('Unknown canonical dish ID')
        if not entry.get('localPath') or not importer['local_path'](entry['localPath']).is_file():
            parser.error('Local image is unavailable')
        try:
            apply_review(entry, args.status, args.reason, args.prompt_reviewed)
            importer['prepare_catalog'](manifest)
            importer['write'](ROOT / 'catalog/images/manifest.json', manifest)
            if source_type(entry) == 'real' and entry.get('sourcePageUrl'):
                qa_path = ROOT / 'catalog/images/selection-qa.json'
                qa = importer['read_json'](qa_path) if qa_path.exists() else {'version': 1, 'sources': []}
                qa['sources'] = [item for item in qa['sources'] if item['sourcePageUrl'] != entry['sourcePageUrl']]
                qa['sources'].append(dict(dishId=entry['dishId'], sourcePageUrl=entry['sourcePageUrl'],
                                          decision={'approved': 'keep', 'temporary': 'review', 'needs-replacement': 'reject'}[args.status], reason=args.reason))
                importer['write'](qa_path, qa)
            subprocess.run(['node', str(ROOT / 'scripts/export-missing-images.mjs')], cwd=ROOT, check=True)
        except ValueError as error:
            parser.error(str(error))


if __name__ == '__main__':
    main()
