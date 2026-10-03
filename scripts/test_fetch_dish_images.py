"""Offline fixtures only: no API requests, no changes to Nom's real assets/maps."""
import copy
from email.message import Message
import importlib.util
import json
from pathlib import Path
import runpy
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError, URLError

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
import commons_images as sources
spec = importlib.util.spec_from_file_location('fetcher', SCRIPTS / 'fetch-dish-images.py')
fetcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetcher)


def target(dish_id='ramen', name='Ramen', country='Japan', code='JP'):
    return dict(dishId=dish_id, dishName=name, country=country, countryCode=code,
                alternateNames=[], expectedImageFilename=dish_id + '.webp',
                expectedRuntimePath='src/assets/food/catalog/' + dish_id + '.webp')


def page(name='Ramen', country='Japan', page_id=1):
    return {
        'pageid': page_id, 'index': page_id, 'title': f'File:{name} {country}.jpg',
        'categories': [{'title': f'Category:Cuisine of {country}'}],
        'imageinfo': [{
            'width': 1600, 'height': 1000, 'mime': 'image/jpeg', 'mediatype': 'BITMAP',
            'url': 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Photo.jpg',
            'thumburl': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/1200px-Photo.jpg',
            'descriptionurl': f'https://commons.wikimedia.org/wiki/File:{name}_{country}.jpg',
            'extmetadata': {
                'ImageDescription': {'value': f'{name}, a dish from {country}.'},
                'Artist': {'value': '<a href="/wiki/User:Author">Photo author</a>'},
                'Credit': {'value': 'Own work'}, 'LicenseShortName': {'value': 'CC BY-SA 4.0'},
                'LicenseUrl': {'value': 'https://creativecommons.org/licenses/by-sa/4.0/'},
            },
        }],
    }


class CandidateTests(unittest.TestCase):
    def test_exact_name_country_and_attribution(self):
        selected = sources.evaluate_candidate(target(), page())
        self.assertEqual(selected['creator'], 'Photo author')
        self.assertEqual(selected['license'], 'CC-BY-SA-4.0')
        self.assertEqual(selected['selectionEvidence']['matchedCountry'], 'Japan')

    def test_alias_and_accents_are_exact_phrases_not_substrings(self):
        dish = target('bun-cha', 'Bún Chả', 'Vietnam', 'VN')
        self.assertEqual(sources.evaluate_candidate(dish, page('Bun Cha', 'Vietnam'))['selectionEvidence']['matchedName'], 'Bún Chả')
        dish = target('ramen', 'Noodle Dish'); dish['alternateNames'] = ['Ramen']
        self.assertEqual(sources.evaluate_candidate(dish, page())['selectionEvidence']['matchedName'], 'Ramen')
        with self.assertRaises(ValueError):
            sources.evaluate_candidate(target(), page('Ramenburger', 'Japan'))

    def test_rejects_unrelated_country_missing_evidence_and_non_food(self):
        decoys = [page('Pizza', 'Japan'), page('Ramen', 'Canada'), page('Ramen menu', 'Japan')]
        missing_country = page(); missing_country['categories'] = []
        missing_country['title'] = 'File:Ramen.jpg'
        missing_country['imageinfo'][0]['extmetadata']['ImageDescription']['value'] = 'A bowl of ramen'
        decoys.append(missing_country)
        caption = page(); caption['imageinfo'][0]['extmetadata']['ImageDescription']['value'] = 'Restaurant menu showing ramen in Japan'
        decoys.append(caption)
        for decoy in decoys:
            with self.subTest(title=decoy['title']), self.assertRaises(ValueError):
                sources.evaluate_candidate(target(), decoy)

    def test_category_alone_does_not_prove_dish_identity(self):
        decoy = page('Generic meal', 'Japan')
        decoy['categories'].append({'title': 'Category:Ramen'})
        with self.assertRaises(ValueError):
            sources.evaluate_candidate(target(), decoy)

    def test_name_only_fallback_still_requires_actual_country_evidence(self):
        client = Mock()
        client.search.side_effect = [('"Ramen" "Japan"', []), ('"Ramen"', [page('Ramen', 'Canada'), page(page_id=2)])]
        selected, rejected = fetcher.find_candidate(client, target())
        self.assertEqual(selected['selectionEvidence']['matchedCountry'], 'Japan')
        self.assertEqual(len(rejected), 1)
        self.assertEqual(client.search.call_args_list[-1].args, ('Ramen', None))

    def test_rejects_unsupported_license_search_urls_small_photos_and_missing_author(self):
        for patch_value in ['license', 'search', 'small', 'author', 'restrictions', 'svg']:
            candidate = page(); info = candidate['imageinfo'][0]; metadata = info['extmetadata']
            if patch_value == 'license': metadata['LicenseShortName']['value'] = 'All rights reserved'
            if patch_value == 'search': info['thumburl'] = 'https://commons.wikimedia.org/w/index.php?search=ramen'
            if patch_value == 'small': info['width'] = 100
            if patch_value == 'author': metadata['Artist']['value'] = ''
            if patch_value == 'restrictions': metadata['Restrictions'] = {'value': 'Restricted reuse'}
            if patch_value == 'svg': info['mime'] = 'image/svg+xml'
            with self.subTest(patch=patch_value), self.assertRaises(ValueError):
                sources.evaluate_candidate(target(), candidate)

    def test_license_name_and_url_must_agree(self):
        metadata = page()['imageinfo'][0]['extmetadata']
        metadata['LicenseUrl']['value'] = 'https://creativecommons.org/licenses/by/4.0/'
        with self.assertRaises(ValueError): sources.reusable_license(metadata)
        metadata['LicenseShortName']['value'] = 'CC0'
        metadata['LicenseUrl']['value'] = 'https://creativecommons.org/publicdomain/zero/1.0/'
        self.assertEqual(sources.reusable_license(metadata)[0], 'CC0-1.0')

    def test_automatic_import_rechecks_evidence_without_claiming_human_review(self):
        dish, source = target(), page()
        entry = dict(sources.evaluate_candidate(dish, source), dishId='ramen', visuallyReviewed=False,
                     needsVisualReview=True, selectionMethod='commons-exact-identity',
                     automaticSelection=dict(provider='wikimedia-commons', target=dish, page=source))
        importer = runpy.run_path(str(SCRIPTS / 'import-dish-images.py'))
        importer['check_source'](entry)
        bad = copy.deepcopy(entry); bad['automaticSelection']['page']['title'] = 'File:Pizza Japan.jpg'
        bad['automaticSelection']['page']['imageinfo'][0]['extmetadata']['ImageDescription']['value'] = 'Pizza in Japan'
        with self.assertRaises(ValueError): importer['check_source'](bad)
        bad = dict(entry, needsVisualReview=False)
        with self.assertRaises(ValueError): importer['check_source'](bad)


class NetworkTests(unittest.TestCase):
    def response(self, content=b'{}', content_type='application/json'):
        headers = Message(); headers['Content-Type'] = content_type
        response = Mock(headers=headers)
        response.geturl.return_value = fetcher.API
        response.read.return_value = content
        response.__enter__ = Mock(return_value=response); response.__exit__ = Mock(return_value=False)
        return response

    @patch.object(fetcher.time, 'sleep')
    def test_bounded_retries_and_no_retry_on_404(self, sleep):
        client = fetcher.CommonsClient(retries=2)
        client.opener = Mock()
        client.opener.open.side_effect = [URLError('temporary'), URLError('temporary'), self.response()]
        self.assertEqual(client.request(fetcher.API), {})
        self.assertEqual(client.opener.open.call_count, 3)
        client.opener.open.reset_mock()
        client.opener.open.side_effect = HTTPError(fetcher.API, 404, 'Not Found', {}, None)
        with self.assertRaises(HTTPError): client.request(fetcher.API)
        self.assertEqual(client.opener.open.call_count, 1)

    @patch.object(fetcher.time, 'sleep')
    def test_download_rejects_html_oversize_and_external_redirects(self, sleep):
        client = fetcher.CommonsClient(retries=0); client.opener = Mock()
        url = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/photo.jpg'
        for response in [self.response(b'<html>', 'text/html'), self.response(b'x' * 6, 'image/jpeg')]:
            response.geturl.return_value = url; client.opener.open.return_value = response
            with patch.object(fetcher, 'MAX_BYTES', 5), self.assertRaises(ValueError): client.request(url, image=True)
        with self.assertRaises(ValueError):
            fetcher.CommonsRedirects().redirect_request(None, None, 302, '', {}, 'https://example.com/photo.jpg')


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix='nom-fetch-test-')
        self.root = Path(self.folder.name)
        self.targets = [target(), target('bibimbap', 'Bibimbap', 'South Korea', 'KR'), target('missing', 'No Such Dish')]
        self.entries = [{'dishId': dish['dishId'], 'status': 'needs-image'} for dish in self.targets]
        self.patches = [patch.object(fetcher, 'ROOT', self.root), patch.object(fetcher, 'INPUT', self.root / 'catalog/images/remaining-image-manifest.json'), patch.object(fetcher, 'MANIFEST', self.root / 'catalog/images/manifest.json'), patch.object(fetcher.subprocess, 'run')]
        for item in self.patches: item.start()
        fetcher.write_json(fetcher.INPUT, {'dishes': self.targets})
        fetcher.write_json(fetcher.MANIFEST, {'dishes': self.entries})
        fetcher.write_json(self.root / 'src/data/catalog/records.json', [{'id': d['dishId'], 'name': d['dishName'], 'countryCode': d['countryCode'], 'aliases': []} for d in self.targets])
        self.client = Mock()
        self.client.search.side_effect = lambda name, country: (f'{name} {country}', [] if name == 'No Such Dish' else [page(name, country)])
        self.client.request.return_value = (b'photo-fixture', 'image/jpeg')
        def import_photo(entry):
            path = self.root / 'src/assets/food/catalog' / (entry['dishId'] + '.webp')
            path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(b'optimized-fixture')
            entry.update(status='licensed-local', localPath=str(path.relative_to(self.root)), width=1200, height=800)
        self.importer = {'local_path': lambda value: self.root / value, 'import_photo': import_photo}
        self.args = SimpleNamespace(dry_run=False, batch_size=20, retry_failed=False, retries=0, delay=0.5, user_agent='Test')

    def tearDown(self):
        for item in reversed(self.patches): item.stop()
        self.folder.cleanup()

    def test_dry_run_changes_no_images_manifest_or_mapping(self):
        before = fetcher.MANIFEST.read_bytes(); self.args.dry_run = True; self.args.batch_size = 1
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['summary'], {'planned': 1, 'pending': 2})
        self.client.request.assert_not_called()
        self.assertEqual(fetcher.MANIFEST.read_bytes(), before)
        self.assertFalse((self.root / 'src/assets').exists())
        fetcher.subprocess.run.assert_not_called()

    def test_batch_resume_success_failures_and_no_redownload(self):
        self.args.batch_size = 1
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['summary'], {'success': 1, 'pending': 2})
        self.assertEqual(self.client.request.call_count, 1)
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['summary'], {'success': 2, 'pending': 1})
        self.assertEqual(self.client.request.call_count, 2)
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['summary'], {'success': 2, 'failed': 1})
        calls = self.client.search.call_count
        fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(self.client.search.call_count, calls)
        self.args.retry_failed = True; fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(self.client.search.call_count, calls + 2)
        entry = fetcher.read_json(fetcher.MANIFEST)['dishes'][0]
        self.assertFalse(entry['visuallyReviewed']); self.assertTrue(entry['needsVisualReview'])
        self.assertEqual(entry['license'], 'CC-BY-SA-4.0')
        self.assertTrue(fetcher.subprocess.run.called)

    def test_retry_reuses_a_checksum_verified_staged_source_after_conversion_failure(self):
        original = self.importer['import_photo']
        self.importer['import_photo'] = Mock(side_effect=ValueError('Temporary conversion failure'))
        self.args.batch_size = 1
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['summary'], {'failed': 1, 'pending': 2})
        self.assertEqual(self.client.request.call_count, 1)
        self.importer['import_photo'] = original
        self.args.retry_failed = True
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['summary'], {'success': 1, 'pending': 2})
        self.assertEqual(self.client.request.call_count, 1)

    def test_preserves_protected_photo_and_continues_after_a_download_error(self):
        protected = self.root / 'src/assets/food/dish-ramen.webp'
        protected.parent.mkdir(parents=True); protected.write_bytes(b'original')
        self.client.request.side_effect = URLError('offline')
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(protected.read_bytes(), b'original')
        self.assertEqual(report['summary'], {'failed': 3})
        self.assertEqual(self.client.request.call_count, 1)

    def test_rejects_path_or_canonical_identity_drift_before_network(self):
        self.targets[0]['expectedRuntimePath'] = '../outside.webp'
        fetcher.write_json(fetcher.INPUT, {'dishes': self.targets})
        with self.assertRaises(ValueError): fetcher.run(self.args, self.client, self.importer)
        self.client.search.assert_not_called()

    def test_only_one_run_holds_the_manifest_lock(self):
        with fetcher.single_run(self.root):
            with self.assertRaises(ValueError):
                with fetcher.single_run(self.root): pass
        self.assertFalse((self.root / '.fetch.lock').exists())


if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=1).run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
    if result.wasSuccessful(): print(f'Image fetcher offline tests passed: {result.testsRun}')
    sys.exit(0 if result.wasSuccessful() else 1)
