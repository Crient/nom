"""Offline fixtures for review gates, generation plans and local imports."""
import copy
import hashlib
import json
from pathlib import Path
import runpy
import shutil
import sys
import tempfile
import unittest
from unittest.mock import Mock

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
import image_workflow as workflow

generated = runpy.run_path(str(SCRIPTS / 'import-generated-images.py'))
review = runpy.run_path(str(SCRIPTS / 'review-dish-image.py'))
importer = runpy.run_path(str(SCRIPTS / 'import-dish-images.py'))
RECORDS = json.loads((SCRIPTS.parent / 'src/data/catalog/records.json').read_text())


def record(dish_id='bibimbap'):
    return copy.deepcopy(next(record for record in RECORDS if record['id'] == dish_id))


def local_entry(status='needs-replacement'):
    return dict(dishId='bibimbap', status='licensed-local', sourceType='real', reviewStatus=status,
                localPath='src/assets/food/catalog/bibimbap.webp', sourcePageUrl='https://commons.wikimedia.org/wiki/File:Old.jpg',
                creator='Original author', license='CC0-1.0', licenseUrl='https://creativecommons.org/publicdomain/zero/1.0/',
                reviewReason='Ambiguous canonical identity', width=1000, height=800)


class PolicyQueueTests(unittest.TestCase):
    def test_unreviewed_and_downloaded_files_do_not_approve_themselves(self):
        self.assertEqual(workflow.review_status({'localPath': 'photo.webp'}), 'pending-review')
        for status in ['pending-review', 'needs-replacement', 'generated-pending']:
            self.assertFalse(workflow.is_renderable(local_entry(status)))
        self.assertTrue(workflow.is_renderable(local_entry('approved')))
        self.assertTrue(workflow.is_renderable(local_entry('temporary')))
        self.assertFalse(workflow.is_renderable(dict(local_entry('approved'), status='staged')))

    def test_strict_status_validation_rejects_missing_and_invalid_states(self):
        for changes in [{'reviewStatus': 'unknown'}, {'reviewStatus': 'approved', 'localPath': None},
                        {'reviewStatus': 'generated-pending', 'sourceType': 'real'}]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                workflow.validate_entries([dict(local_entry(), **changes)], [record()])
        missing_status = local_entry(); missing_status.pop('reviewStatus')
        with self.assertRaises(ValueError): workflow.validate_entries([missing_status], [record()])

    def test_coverage_separates_storage_approval_temporary_rejected_and_generated(self):
        states = ['approved', 'temporary', 'needs-replacement', 'pending-review', 'missing', 'generated-pending', 'approved']
        entries, records = [], []
        for i, status in enumerate(states):
            entry, row = local_entry(status), record()
            entry['dishId'] = row['id'] = str(i)
            if status == 'missing': entry.update(status='needs-image', sourceType='missing', localPath=None)
            if i >= 5: entry.update(status='generated-local', sourceType='generated')
            entries.append(entry); records.append(row)
        counts = workflow.coverage(entries, records)
        self.assertEqual(counts['realApprovedImages'], 1)
        self.assertEqual(counts['temporaryRealImages'], 1)
        self.assertEqual(counts['rejectedRealImages'], 1)
        self.assertEqual(counts['pendingReviewRealImages'], 1)
        self.assertEqual(counts['generatedCandidates'], 1)
        self.assertEqual(counts['generatedApprovedImages'], 1)
        self.assertEqual(counts['missingImages'], 1)
        self.assertEqual(counts['mappedImages'], 3)
        self.assertEqual(counts['generatedFallbackQueued'], 4)
        self.assertEqual(counts['storedLocalImages'], 6)

    def test_queue_only_contains_unresolved_dishes_in_catalog_order(self):
        records = [record('ramen'), record('bibimbap'), record('suya')]
        entries = [dict(local_entry('approved'), dishId='ramen'), local_entry(),
                   dict(dishId='suya', status='needs-image', sourceType='missing', reviewStatus='missing')]
        queue = workflow.build_queue(records, entries, {'JP': 'Japan', 'KR': 'South Korea', 'NG': 'Nigeria'})
        self.assertEqual([item['dishId'] for item in queue['dishes']], ['bibimbap', 'suya'])
        self.assertEqual(queue['queued'], 2)
        self.assertEqual(queue, workflow.build_queue(records, entries, {'JP': 'Japan', 'KR': 'South Korea', 'NG': 'Nigeria'}))

    def test_prompts_and_ingredients_are_grounded_in_catalog_without_added_garnishes(self):
        row = record('suya')
        queued = workflow.queue_entry(row, dict(local_entry(), dishId='suya'), 'Nigeria')
        self.assertEqual(queued['aliases'], ['Tsire'])
        self.assertIn(row['description'], queued['prompt'])
        self.assertIn('skewers', ' '.join(queued['expectedCanonicalPresentation']))
        self.assertTrue(all(cue.lower() in queued['ingredientEvidence'].lower() for cue in queued['importantVisibleIngredients']))
        self.assertNotIn('cilantro', queued['importantVisibleIngredients'])
        self.assertNotIn('spicy', queued['importantVisibleIngredients'])
        self.assertTrue(queued['needsPromptReview'])
        self.assertIn('No people, hands, text, logos', queued['prompt'])

    def test_sparse_description_is_not_filled_with_invented_ingredients(self):
        row = dict(record(), shortDescription='A traditional meal.', description='A meal enjoyed locally.', reviewStatus='approved')
        queued = workflow.queue_entry(row, local_entry(), 'South Korea')
        self.assertEqual(queued['importantVisibleIngredients'], [])
        self.assertEqual(queued['expectedCanonicalPresentation'], [])
        self.assertTrue(queued['needsPromptReview'])

    def test_local_review_html_escapes_metadata_and_keeps_rejected_photo_visible_for_qa(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'src/assets/food/catalog/bibimbap.webp'
            path.parent.mkdir(parents=True); path.write_bytes(b'fixture')
            entry = local_entry()
            queued = workflow.build_queue([record()], [entry], {'KR': 'South Korea'})
            report = workflow.review_report([dict(record(), name='<script>bad</script>')], [entry], {'KR': 'South Korea'}, queued)
            rendered = workflow.review_html(report, root)
            self.assertIn('../../src/assets/food/catalog/bibimbap.webp', rendered)
            self.assertIn('placeholder in app', rendered)
            self.assertNotIn('<script>', rendered)

    def test_explicit_decision_ledger_and_real_counts_match_current_workbook_catalog(self):
        manifest = json.loads((SCRIPTS.parent / 'catalog/images/manifest.json').read_text())
        counts = workflow.coverage(manifest['dishes'], RECORDS)
        self.assertEqual(counts['realApprovedImages'], 2)
        self.assertEqual(counts['generatedApprovedImages'], 199)
        self.assertEqual(counts['mappedImages'], 201)
        for key in ['temporaryRealImages', 'rejectedRealImages', 'pendingReviewRealImages',
                    'missingImages', 'generatedFallbackQueued', 'remainingPlaceholders']:
            self.assertEqual(counts[key], 0, key)
        decisions = json.loads((SCRIPTS.parent / 'catalog/images/image-review-decisions.json').read_text())
        entries = {entry['dishId']: entry for entry in manifest['dishes']}
        self.assertEqual(set(entries), {row['id'] for row in RECORDS})
        self.assertEqual(len(manifest['dishes']), len(entries))
        self.assertEqual(len({entry['localPath'] for entry in entries.values()}), 201)
        self.assertEqual({entry['dishId'] for entry in entries.values() if entry['sourceType'] == 'real'},
                         {'ramen', 'harira'})
        # Earlier source-specific decisions still describe the retained photos:
        # replaced real sources keep those decisions in history, not on the new generation.
        for decision in decisions['dishes']:
            entry = entries[decision['dishId']]
            sources = [source for source in [entry, *entry.get('history', [])]
                       if source.get('sourcePageUrl') == decision['sourcePageUrl']]
            self.assertEqual(len(sources), 1, decision['dishId'])
            self.assertEqual(sources[0]['reviewStatus'], decision['reviewStatus'])
            self.assertTrue((SCRIPTS.parent / sources[0]['localPath']).is_file())
        final = json.loads((SCRIPTS.parent / 'image-audit/results/final-image-decisions.json').read_text())
        self.assertEqual({decision['dishId'] for decision in final['dishes']}, set(entries))
        self.assertEqual(len(final['dishes']), 201)
        for decision in final['dishes']:
            entry = entries[decision['dishId']]
            self.assertEqual(entry['reviewStatus'], 'approved')
            self.assertEqual(entry['localPath'], decision['selectedRuntimePath'])
            actual_hash = hashlib.sha256((SCRIPTS.parent / entry['localPath']).read_bytes()).hexdigest()
            if decision['decision'] == 'KEEP_EXISTING':
                self.assertEqual(actual_hash, decision['currentImageHash'])
            else:
                self.assertEqual(entry['humanReviewAuthorization'], decision)
                self.assertEqual(actual_hash, decision['candidateOutputHash'])
                self.assertEqual(entry['sourceSha256'], decision['candidateSourceHash'])


class GeneratedImportTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix='nom-generated-test-')
        self.root = Path(self.folder.name)
        self.entry = local_entry()
        self.destination = self.root / self.entry['localPath']
        self.destination.parent.mkdir(parents=True); self.destination.write_bytes(b'original-photo')
        self.source = self.root / 'src/assets/food/generated-incoming/bibimbap.png'
        self.source.parent.mkdir(parents=True); self.source.write_bytes(b'generated-input')
        self.queued = workflow.queue_entry(record(), self.entry, 'South Korea')
        def optimize(source, destination):
            destination.write_bytes(b'optimized-generation'); return 1000, 800
        self.importer = {'optimize_photo': Mock(side_effect=optimize), 'write': importer['write']}

    def tearDown(self): self.folder.cleanup()

    def run_import(self, metadata=None):
        generated['import_generated'](self.entry, record(), self.queued, self.source, metadata or {}, self.importer, self.root)

    def test_replacement_preserves_full_provenance_and_archives_old_pixels(self):
        self.run_import(dict(tool='User chosen generator', prompt='Reviewed cultural prompt'))
        self.assertEqual(self.entry['reviewStatus'], 'generated-pending')
        self.assertEqual(self.entry['sourceType'], 'generated')
        self.assertFalse(workflow.is_renderable(self.entry))
        self.assertEqual(self.entry['generation']['promptUsed'], 'Reviewed cultural prompt')
        self.assertFalse(self.entry['generation']['documentaryEvidence'])
        self.assertIsNone(self.entry['license'])
        self.assertIsNone(self.entry['creator'])
        previous = self.entry['history'][0]
        self.assertEqual(previous['creator'], 'Original author')
        self.assertEqual(previous['license'], 'CC0-1.0')
        self.assertEqual((self.root / previous['localPath']).read_bytes(), b'original-photo')
        self.assertEqual(self.destination.read_bytes(), b'optimized-generation')
        self.assertTrue(list((self.root / 'catalog/images/import-backups').glob('bibimbap-*.json')))

    def test_approved_and_temporary_files_are_protected_before_conversion(self):
        for status in ['approved', 'temporary']:
            self.entry['reviewStatus'] = status
            with self.subTest(status=status), self.assertRaisesRegex(ValueError, 'protected'): self.run_import()
        self.assertEqual(self.destination.read_bytes(), b'original-photo')
        self.importer['optimize_photo'].assert_not_called()

    def test_conversion_failure_preserves_original_and_metadata(self):
        before = copy.deepcopy(self.entry)
        self.importer['optimize_photo'].side_effect = ValueError('Invalid input')
        with self.assertRaises(ValueError): self.run_import()
        self.assertEqual(self.entry, before)
        self.assertEqual(self.destination.read_bytes(), b'original-photo')
        self.assertFalse((self.root / 'src/assets/food/archive').exists())

    def test_wrong_id_external_input_and_unmapped_output_are_rejected(self):
        wrong = self.source.with_name('other.png'); wrong.write_bytes(b'fixture')
        for path in [wrong, self.destination]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                generated['import_generated'](self.entry, record(), self.queued, path, {}, self.importer, self.root)
        self.entry.pop('localPath')
        with self.assertRaisesRegex(ValueError, 'Unmapped'): self.run_import()
        self.assertEqual(self.destination.read_bytes(), b'original-photo')

    def test_generated_sidecar_never_invents_missing_tool_or_prompt_used(self):
        self.run_import()
        self.assertIsNone(self.entry['generation']['tool'])
        self.assertIsNone(self.entry['generation']['promptUsed'])
        self.assertEqual(self.entry['generation']['requestedPrompt'], self.queued['prompt'])
        self.assertEqual(self.entry['sourceSha256'], hashlib.sha256(self.source.read_bytes()).hexdigest())

    def test_explicit_cultural_and_visual_review_required_for_rendering(self):
        self.run_import()
        with self.assertRaisesRegex(ValueError, 'cultural'): review['apply_review'](self.entry, 'approved', 'Looks good')
        review['apply_review'](self.entry, 'approved', 'Canonical identity and prompt checked', prompt_reviewed=True)
        self.assertTrue(workflow.is_renderable(self.entry))
        self.assertFalse(self.entry['needsPromptReview'])
        self.assertTrue(self.entry['visuallyReviewed'])

    def test_original_supplied_photo_is_retained_when_an_unreviewed_candidate_is_replaced(self):
        self.destination.unlink()
        original = self.root / 'src/assets/food/dish-bibimbap.webp'
        original.write_bytes(b'supplied-original')
        self.entry.update(status='existing-local', localPath=str(original.relative_to(self.root)), reviewStatus='pending-review')
        self.run_import()
        self.assertEqual(original.read_bytes(), b'supplied-original')
        self.assertEqual(self.entry['history'][0]['localPath'], str(original.relative_to(self.root)))

    @unittest.skipUnless(shutil.which('cwebp') and shutil.which('sips'), 'macOS image tools unavailable')
    def test_actual_offline_webp_conversion_with_local_fixture(self):
        fixture = SCRIPTS.parent / 'src/assets/food/dish-lort-cha.webp'
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'optimized.webp'
            width, height = importer['optimize_photo'](fixture, output)
            self.assertLessEqual(max(width, height), 1200)
            self.assertGreater(output.stat().st_size, 0)
            self.assertEqual(output.read_bytes()[8:12], b'WEBP')


if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=1).run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
    if result.wasSuccessful(): print(f'Image workflow offline tests passed: {result.testsRun}')
    sys.exit(0 if result.wasSuccessful() else 1)
