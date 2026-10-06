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
import image_providers as providers
import image_selection as selection
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
                'ImageDescription': {'value': f'{name}, a plated dish from {country}.'},
                'Artist': {'value': '<a href="/wiki/User:Author">Photo author</a>'},
                'Credit': {'value': 'Own work'}, 'LicenseShortName': {'value': 'CC BY-SA 4.0'},
                'LicenseUrl': {'value': 'https://creativecommons.org/licenses/by-sa/4.0/'},
            },
        }],
    }


def openverse_photo(name='Ramen', country='Japan', photo_id='photo-1'):
    return dict(id=photo_id, title=f'{name} plated in {country}', description=f'{name}, a plated dish from {country}.',
                source='flickr', provider='flickr', foreign_landing_url=f'https://www.flickr.com/photos/author/{photo_id}/',
                url=f'https://live.staticflickr.com/12/{photo_id}.jpg', creator='Photo author',
                creator_url='https://www.flickr.com/people/author/', license='by-sa', license_version='4.0',
                license_url='https://creativecommons.org/licenses/by-sa/4.0/', attribution='Photo author / CC BY-SA 4.0',
                width=1600, height=1000, tags=[{'name': country}])


class ProviderSelectionTests(unittest.TestCase):
    def score(self, source=None, dish=None, **options):
        return selection.score_candidate(dish or target(), providers.CommonsProvider.normalize(source or page()), **options)

    def test_openverse_normalization_preserves_provenance(self):
        raw = openverse_photo()
        candidate = providers.OpenverseProvider.normalize(raw)
        self.assertEqual(candidate['license'], 'CC-BY-SA-4.0')
        self.assertEqual(candidate['creatorUrl'], raw['creator_url'])
        self.assertEqual(candidate['originalImageUrl'], raw['url'])
        self.assertEqual(candidate['originalDimensions'], {'width': 1600, 'height': 1000})
        self.assertEqual(selection.score_candidate(target(), candidate)['candidateClassification'], 'strong-candidate')

    def test_openverse_query_is_exact_and_requests_reusable_licenses(self):
        from urllib.parse import parse_qs, urlparse
        client = Mock(); client.request.return_value = {'results': [openverse_photo()]}
        query, photos = providers.OpenverseProvider(client).search('Ramen', 'Japan')
        params = parse_qs(urlparse(client.request.call_args.args[0]).query)
        self.assertEqual(query, '"Ramen" "Japan"')
        self.assertEqual(params['license'], ['by,by-sa,cc0,pdm'])
        self.assertEqual(len(photos), 1)
        self.assertEqual([p.name for p in providers.make_providers(client)], ['commons', 'openverse'])

    def test_openverse_rejects_bad_licenses_unknown_hosts_and_missing_creator(self):
        for changes in [{'license': 'by-nc'}, {'license_url': 'https://creativecommons.org/licenses/by/4.0/'},
                        {'url': 'https://recipe-blog.example/ramen.jpg'}, {'creator': ''},
                        {'foreign_landing_url': 'https://restaurant.example/ramen'}, {'mature': True}]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                providers.OpenverseProvider.normalize(dict(openverse_photo(), **changes))

    def test_generic_bowl_incidental_mention_and_tags_do_not_prove_identity(self):
        dish = target('bibimbap', 'Bibimbap', 'South Korea', 'KR')
        for description in ['A vegetable tofu bowl in Korea inspired by bibimbap',
                            'Vegetables, tofu and sauce in a bowl from Korea. Other menu items include bibimbap',
                            'A vegetable bowl in Korea']:
            raw = openverse_photo('Vegetable tofu bowl', 'South Korea')
            raw.update(description=description, tags=[{'name': 'bibimbap'}, {'name': 'South Korea'}])
            with self.subTest(description=description), self.assertRaises(ValueError):
                selection.score_candidate(dish, providers.OpenverseProvider.normalize(raw))

    def test_alias_accent_and_primary_name_strength(self):
        dish = target('bun-cha', 'Bún Chả', 'Vietnam', 'VN')
        self.assertEqual(self.score(page('Bun Cha', 'Vietnam'), dish)['selectionEvidence']['matchedName'], 'Bún Chả')
        dish = target(); dish['dishName'] = 'Japanese Ramen'; dish['alternateNames'] = ['Ramen']
        self.assertEqual(self.score(dish=dish)['selectionEvidence']['matchedName'], 'Ramen')
        with self.assertRaises(ValueError): self.score(page('Ramenburger', 'Japan'))

    def test_plated_beats_process_and_tall_low_quality_photos(self):
        plated = page('Ramen plated bowl'); plated['imageinfo'][0]['extmetadata']['ImageDescription']['value'] = 'Ramen plated in a bowl in Japan'
        cooking = page('Ramen cooking hands'); cooking['imageinfo'][0]['extmetadata']['ImageDescription']['value'] = 'Ramen being grilled by a cook in Japan'
        winner, weaker = self.score(plated), self.score(cooking)
        self.assertGreater(winner['visualSuitability'], weaker['visualSuitability'])
        self.assertEqual(weaker['candidateClassification'], 'acceptable-review-recommended')
        tall = copy.deepcopy(plated); tall['imageinfo'][0].update(width=800, height=2400)
        self.assertLess(self.score(tall)['visualSuitability'], winner['visualSuitability'])

    def test_visual_hard_rejections_and_unknown_dimensions(self):
        for name in ['Ramen menu', 'Ramen packaging', 'Ramen collage', 'Ramen raw ingredients']:
            with self.subTest(name=name), self.assertRaises(ValueError): self.score(page(name))
        small = page(); small['imageinfo'][0]['width'] = 479
        with self.assertRaises(ValueError): self.score(small)
        raw = dict(openverse_photo(), width=None, height=None)
        scored = selection.score_candidate(target(), providers.OpenverseProvider.normalize(raw))
        self.assertEqual(scored['candidateClassification'], 'acceptable-review-recommended')
        self.assertTrue(scored['needsVisualReview'])

    def test_country_mismatch_and_confidence_threshold(self):
        with self.assertRaises(ValueError): self.score(page('Ramen', 'Canada'))
        weaker = page(); weaker['title'] = 'File:Meal Japan.jpg'
        self.assertLess(self.score(weaker)['identityConfidence'], 100)
        with self.assertRaises(ValueError): self.score(weaker, min_confidence=100)

    def test_prior_manual_rejection_and_review_penalty(self):
        candidate = providers.CommonsProvider.normalize(page())
        decision = dict(sourcePageUrl=candidate['sourcePageUrl'], decision='reject', reason='Wrong visual identity')
        with self.assertRaisesRegex(ValueError, 'manual QA'): self.score(decisions=[decision])
        decision['decision'] = 'review'
        self.assertLess(self.score(decisions=[decision])['visualSuitability'], self.score()['visualSuitability'])
        qa = json.loads((SCRIPTS.parent / 'catalog/images/selection-qa.json').read_text())
        self.assertEqual(next(row for row in qa['sources'] if row['dishId'] == 'bibimbap')['decision'], 'reject')

    def test_all_queries_all_providers_are_ranked_not_first_success(self):
        client = Mock(); client.search.return_value = ('"Ramen"', [page('Ramen cooking hands')])
        client.request.return_value = {'results': [openverse_photo()]}
        chosen, rejected = fetcher.find_candidate(client, target(), providers.make_providers(client))
        self.assertEqual(chosen['provider'], 'openverse')
        self.assertEqual(len(chosen['rankedCandidates']), 2)
        self.assertEqual(client.search.call_count, 2)
        self.assertEqual(client.request.call_count, 2)
        self.assertEqual(rejected, [])

    def test_later_query_can_win_and_alias_queries_are_bounded(self):
        dish = target(); dish['alternateNames'] = ['Chuka Soba', 'Shina Soba', 'Ignored alias']
        weaker = page('Ramen cooking hands')
        better = page('Ramen plated bowl', page_id=2)
        client = Mock(); client.search.side_effect = lambda name, country: (name, [better] if country is None else [weaker])
        chosen, _ = fetcher.find_candidate(client, dish)
        self.assertEqual(chosen['title'], better['title'][5:])
        self.assertEqual(client.search.call_count, 6)
        self.assertEqual(client.search.call_args_list[-1].args, ('Shina Soba', None))

    def test_ties_are_deterministic_and_commons_wins_equal_provider_scores(self):
        left = page(); right = page(page_id=2)
        right['imageinfo'][0]['descriptionurl'] = 'https://commons.wikimedia.org/wiki/File:AAA_Ramen.jpg'
        client = Mock()
        winners = []
        for ordering in [[left, right], [right, left]]:
            client.search.return_value = ('query', ordering)
            chosen, _ = fetcher.find_candidate(client, target())
            winners.append(chosen['sourcePageUrl'])
        self.assertEqual(winners[0], winners[1])
        first = self.score()
        second = selection.score_candidate(target(), providers.OpenverseProvider.normalize(openverse_photo()))
        for key in ['selectionScore', 'identityConfidence', 'visualSuitability']: second[key] = first[key]
        self.assertLess(selection.rank_key(first), selection.rank_key(second))

    def test_provider_failure_falls_back_without_repeated_outage_requests(self):
        client = Mock(); client.search.side_effect = URLError('Commons unavailable')
        client.request.return_value = {'results': [openverse_photo()]}
        chosen, rejected = fetcher.find_candidate(client, target(), providers.make_providers(client))
        self.assertEqual(chosen['provider'], 'openverse')
        self.assertEqual(client.search.call_count, 1)
        self.assertEqual(rejected[0]['status'], 'provider-error')
        client.search.side_effect = None; client.search.return_value = ('query', [page()])
        client.request.side_effect = HTTPError(providers.OPENVERSE_API, 429, 'Rate limited', {}, None)
        client.request.reset_mock()
        chosen, rejected = fetcher.find_candidate(client, target(), providers.make_providers(client))
        self.assertEqual(chosen['provider'], 'commons')
        self.assertEqual(client.request.call_count, 1)

    def test_ranked_import_gate_revalidates_both_provider_snapshots(self):
        canonical = dict(id='ramen', name='Ramen', countryCode='JP', aliases=[])
        for provider, raw in [(providers.CommonsProvider, page()), (providers.OpenverseProvider, openverse_photo())]:
            candidate = selection.score_candidate(target(), provider.normalize(raw))
            entry = dict(candidate, dishId='ramen', visuallyReviewed=False,
                         automaticSelection=dict(version=2, provider=provider.name, target=target(), minConfidence=85, raw=raw))
            selection.validate_ranked_selection(entry, canonical)
            importer = runpy.run_path(str(SCRIPTS / 'import-dish-images.py'))
            importer['check_source'](dict(entry, selectionMethod='multi-source-ranked'))
            for changes in [{'sourcePageUrl': 'https://wrong.example/'}, {'identityConfidence': 99}, {'needsVisualReview': False}]:
                with self.subTest(provider=provider.name, changes=changes), self.assertRaises(ValueError):
                    selection.validate_ranked_selection(dict(entry, **changes), canonical)

    def test_later_qa_preserves_existing_imports_but_blocks_new_rejected_sources(self):
        client = Mock(); client.search.return_value = ('query', [page()])
        candidate, _ = fetcher.find_candidate(client, target())
        candidate.pop('rankedCandidates')
        canonical = dict(id='ramen', name='Ramen', countryCode='JP', aliases=[])
        entry = dict(candidate, dishId='ramen', visuallyReviewed=False, status='licensed-local')
        decision = dict(sourcePageUrl=candidate['sourcePageUrl'], decision='review', reason='Weak composition')
        selection.validate_ranked_selection(entry, canonical, [decision])
        decision['decision'] = 'reject'
        selection.validate_ranked_selection(entry, canonical, [decision])
        with self.assertRaises(ValueError):
            selection.validate_ranked_selection(dict(entry, status='approved'), canonical, [decision])

    def test_review_decision_snapshot_reproduces_original_scores(self):
        client = Mock(); client.search.return_value = ('query', [page()])
        decision = dict(sourcePageUrl=page()['imageinfo'][0]['descriptionurl'], decision='review', reason='Weak composition')
        candidate, _ = fetcher.find_candidate(client, target(), decisions=[decision])
        candidate.pop('rankedCandidates')
        entry = dict(candidate, dishId='ramen', visuallyReviewed=False, status='licensed-local')
        canonical = dict(id='ramen', name='Ramen', countryCode='JP', aliases=[])
        selection.validate_ranked_selection(entry, canonical)


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

    def test_url_allowlist_rejects_credentials_ports_and_deceptive_hosts(self):
        for url in ['https://live.staticflickr.com/1/photo.jpg', providers.OPENVERSE_API,
                    'https://cdn.stocksnap.io/img.jpg']:
            self.assertTrue(fetcher.allowed_url(url))
        for url in ['http://live.staticflickr.com/photo.jpg', 'https://evilstaticflickr.com/photo.jpg',
                    'https://user@live.staticflickr.com/photo.jpg', 'https://live.staticflickr.com:444/photo.jpg',
                    'https://api.openverse.org/v1/other/', 'https://127.0.0.1/photo.jpg']:
            self.assertFalse(fetcher.allowed_url(url))


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
        countries = {dish['dishName']: dish['country'] for dish in self.targets}
        self.client.search.side_effect = lambda name, country: (f'{name} {country}', [] if name == 'No Such Dish' else [page(name, countries[name])])
        self.client.request.return_value = (b'photo-fixture', 'image/jpeg')
        def import_photo(entry):
            path = self.root / 'src/assets/food/catalog' / (entry['dishId'] + '.webp')
            path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(b'optimized-fixture')
            entry.update(status='licensed-local', localPath=str(path.relative_to(self.root)), width=1200, height=800)
        self.importer = {'local_path': lambda value: self.root / value, 'import_photo': import_photo, 'dimensions': lambda path: (1600, 1000)}
        self.args = SimpleNamespace(dry_run=False, batch_size=20, retry_failed=False, retries=0, delay=0.5, user_agent='Test', provider='commons', min_confidence=85)

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
        planned = report['dishes'][0]
        self.assertEqual(planned['country'], 'Japan')
        self.assertEqual(planned['provider'], 'commons')
        self.assertTrue(planned['needsVisualReview'])
        self.assertIn('originalDimensions', planned)
        self.assertIn('winnerReason', planned)
        self.assertTrue((self.root / 'catalog/images/fetch-dry-run-report.html').exists())

    def test_download_failure_tries_next_ranked_candidate(self):
        self.args.batch_size = 1
        best, fallback = page('Ramen plated bowl'), page('Ramen plated dish', page_id=2)
        self.client.search.return_value = ('query', [fallback, best]); self.client.search.side_effect = None
        self.client.request.side_effect = [URLError('Broken source'), (b'fallback-photo', 'image/jpeg')]
        report = fetcher.run(self.args, self.client, self.importer)
        outcome = report['dishes'][0]
        self.assertEqual(outcome['status'], 'downloaded')
        self.assertEqual(outcome['title'], fallback['title'][5:])
        self.assertEqual(len(outcome['downloadFailures']), 1)
        self.assertEqual(self.client.request.call_count, 2)

    def test_unknown_reported_dimensions_cannot_bypass_decode_check(self):
        self.args.batch_size = 1
        self.importer['dimensions'] = lambda path: (100, 100)
        import_photo = self.importer['import_photo'] = Mock()
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['dishes'][0]['status'], 'failed')
        self.assertIn('480px', report['dishes'][0]['downloadFailures'][0]['reason'])
        import_photo.assert_not_called()

    def test_mapped_accepted_image_is_not_downloaded_or_overwritten(self):
        self.args.batch_size = 1
        path = self.root / 'src/assets/food/catalog/ramen.webp'
        path.parent.mkdir(parents=True); path.write_bytes(b'accepted')
        self.entries[0].update(status='licensed-local', localPath=str(path.relative_to(self.root)))
        fetcher.write_json(fetcher.MANIFEST, {'dishes': self.entries})
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(path.read_bytes(), b'accepted')
        self.assertEqual(report['attemptedDishIds'], ['bibimbap'])
        self.assertTrue(all(call.args[0] != 'Ramen' for call in self.client.search.call_args_list))

    def test_dry_run_skips_prior_failures_just_like_real_run(self):
        fetcher.write_json(self.root / 'catalog/images/fetch-report.json', {
            'dishes': [{'dishId': 'ramen', 'dishName': 'Ramen', 'status': 'failed'}]})
        self.args.dry_run = True; self.args.batch_size = 1
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['attemptedDishIds'], ['bibimbap'])
        self.args.retry_failed = True
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['attemptedDishIds'], ['ramen'])

    def test_review_html_escapes_untrusted_metadata_without_remote_image_hotlinks(self):
        path = self.root / 'review.html'
        fetcher.write_review(path, [dict(dishName='<script>alert(1)</script>', country='Japan',
                                       sourcePageUrl='javascript:alert(1)', status='failed')])
        html = path.read_text()
        self.assertNotIn('<script>', html)
        self.assertNotIn('<img', html)
        self.assertNotIn('<a href="javascript:', html)

    def test_dry_run_error_does_not_mutate_a_previously_staged_manifest(self):
        self.entries[0]['automaticSelection'] = {'previous': 'staged source'}
        fetcher.write_json(fetcher.MANIFEST, {'dishes': self.entries})
        before = fetcher.MANIFEST.read_bytes()
        self.args.dry_run = True; self.args.batch_size = 1
        with patch.object(fetcher, 'find_candidate', side_effect=ValueError('Metadata failure')):
            report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['dishes'][0]['status'], 'failed')
        self.assertEqual(fetcher.MANIFEST.read_bytes(), before)

    def test_interruption_saves_a_resumable_pending_attempt(self):
        self.args.dry_run = True
        with patch.object(fetcher, 'find_candidate', side_effect=KeyboardInterrupt), self.assertRaises(KeyboardInterrupt):
            fetcher.run(self.args, self.client, self.importer)
        report = fetcher.read_json(self.root / 'catalog/images/fetch-dry-run-report.json')
        self.assertEqual(report['attemptedDishIds'], ['ramen'])
        self.assertEqual(report['dishes'][0]['status'], 'pending')

    def test_batch_resume_success_failures_and_no_redownload(self):
        self.args.batch_size = 1
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['summary'], {'downloaded': 1, 'pending': 2})
        self.assertEqual(self.client.request.call_count, 1)
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['summary'], {'downloaded': 2, 'pending': 1})
        self.assertEqual(self.client.request.call_count, 2)
        report = fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(report['summary'], {'downloaded': 2, 'failed': 1})
        calls = self.client.search.call_count
        fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(self.client.search.call_count, calls)
        self.args.retry_failed = True; fetcher.run(self.args, self.client, self.importer)
        self.assertEqual(self.client.search.call_count, calls + 2)
        entry = fetcher.read_json(fetcher.MANIFEST)['dishes'][0]
        self.assertFalse(entry['visuallyReviewed']); self.assertTrue(entry['needsVisualReview'])
        self.assertEqual(entry['reviewStatus'], 'pending-review')
        self.assertFalse(report['dishes'][0]['visuallyApproved'])
        self.assertFalse(report['dishes'][0]['mapped'])
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
        self.assertEqual(report['summary'], {'downloaded': 1, 'pending': 2})
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
