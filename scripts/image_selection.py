"""Deterministic metadata heuristics, not computer vision or human verification."""
import re
from urllib.parse import unquote, urlparse

from commons_images import COUNTRY_MARKERS, normalized, phrase_in
from image_providers import PROVIDER_TYPES

MIN_CONFIDENCE = 85
# Country names complement demonyms; these are source identity hints, not app taxonomy.
COUNTRY_NAMES = dict(AE='United Arab Emirates', AR='Argentina', AT='Austria', BA='Bosnia and Herzegovina',
                    BR='Brazil', CA='Canada', CI='Côte d’Ivoire', CN='China', CO='Colombia', DE='Germany',
                    DZ='Algeria', EG='Egypt', ES='Spain', ET='Ethiopia', FR='France', GB='United Kingdom',
                    GH='Ghana', GR='Greece', HU='Hungary', ID='Indonesia', IN='India', IR='Iran', IT='Italy',
                    JM='Jamaica', JO='Jordan', JP='Japan', KE='Kenya', KH='Cambodia', KR='South Korea',
                    LB='Lebanon', LK='Sri Lanka', MA='Morocco', MM='Myanmar', MX='Mexico', MY='Malaysia',
                    NG='Nigeria', NP='Nepal', PE='Peru', PH='Philippines', PK='Pakistan', PL='Poland',
                    PR='Puerto Rico', PS='Palestine', PT='Portugal', SA='Saudi Arabia', SG='Singapore',
                    SN='Senegal', SO='Somalia', SV='El Salvador', TR='Türkiye', UA='Ukraine', UG='Uganda',
                    US='United States', UY='Uruguay', VE='Venezuela', VN='Vietnam', YE='Yemen', ZA='South Africa')
NON_PHOTO = re.compile(r'\b(menu|logo|map|signage|storefront|packaging|packet|cartoon|drawing|diagram|advertisement|collage|raw ingredients|ingredients for)\b')
INCIDENTAL = re.compile(r'\b(inspired by|alongside|ingredients for|recipe for|style bowl|similar to)\b')
PROCESS = re.compile(r'\b(cooking|being grilled|preparing|preparation|chef|cook|hands|person|people|vendor)\b')
POOR = re.compile(r'\b(blurry|blurred|out of focus|harsh flash|underexposed|overexposed|distant|tiny serving|mixed meals|buffet|assorted dishes|multiple dishes|combo platter|mixed platter|meal set|banquet)\b')
PLATED = re.compile(r'\b(plated|plate|bowl|served|finished dish|close up|food photography)\b')


def source_key(url):
    parsed = urlparse(url)
    host = (parsed.hostname or '').lower()
    path = unquote(parsed.path).rstrip('/')
    if host == 'commons.wikimedia.org':
        path = path.replace(' ', '_')
    if host == 'www.flickr.com':
        host = 'flickr.com'
    return (host + path).casefold()


def visual_score(candidate, qa=None):
    text = normalized(candidate['title'] + ' ' + candidate['description'])
    reasons, score = ['Visual suitability uses metadata/dimensions; pixels are not assessed'], 50
    if NON_PHOTO.search(text):
        raise ValueError('Non-food, ingredient-only, menu, packaging or collage subject')
    width, height = (candidate['originalDimensions'].get(key) for key in ['width', 'height'])
    if width is not None and height is not None:
        if not all(isinstance(value, int) and not isinstance(value, bool) and value > 0 for value in [width, height]):
            raise ValueError('Malformed image dimensions')
        if min(width, height) < 480:
            raise ValueError('Resolution below 480px minimum edge')
        score += 12 if min(width, height) >= 1000 else 8
        reasons.append(f'Useful resolution: {width} × {height}')
        ratio = width / height
        if 0.75 <= ratio <= 1.8:
            score += 12; reasons.append('Square/landscape-friendly framing')
        else:
            score -= 12; reasons.append('Tall/wide crop may obscure the dish')
    else:
        score -= 10; reasons.append('Dimensions unknown; actual download must pass resolution check')
    if PLATED.search(text):
        score += 15; reasons.append('Metadata describes plated/finished food')
    if PROCESS.search(text):
        score -= 30; reasons.append('People/hands/cooking-process metadata')
    if POOR.search(text):
        score -= 25; reasons.append('Metadata indicates weak visual quality or mixed subjects')
    if qa and qa.get('decision') == 'review':
        score -= 20; reasons.append('Prior manual QA: ' + qa['reason'])
    score = max(0, min(100, score))
    if score < 30:
        raise ValueError('Visual suitability too weak even for temporary use: ' + '; '.join(reasons))
    return score, reasons


def score_candidate(dish, candidate, min_confidence=MIN_CONFIDENCE, decisions=()):
    decision = next((item for item in decisions if source_key(item['sourcePageUrl']) == source_key(candidate['sourcePageUrl'])), None)
    if decision and decision.get('decision') == 'reject':
        raise ValueError('Prior manual QA rejected this source: ' + decision['reason'])
    title = candidate['title'] + ' ' + candidate.get('objectName', '')
    caption = candidate['description']
    names = [dish['dishName'], *dish.get('alternateNames', [])]
    match = next((name for name in names if phrase_in(name, title)), None)
    in_title = bool(match)
    if not match:
        match = next((name for name in names if phrase_in(name, caption)), None)
    if not match:
        raise ValueError('No complete dish name/alias in primary title or description; tags/query are insufficient')
    if INCIDENTAL.search(normalized(title + ' ' + caption)):
        raise ValueError('Dish mention appears incidental or ingredient/recipe-focused')
    country_text = title + ' ' + caption + ' ' + ' '.join(candidate['tags'])
    country = next((name for name in [dish['country'], *COUNTRY_MARKERS.get(dish['countryCode'], [])]
                    if phrase_in(name, country_text)), None)
    for code, markers in COUNTRY_MARKERS.items():
        if code != dish['countryCode'] and any(phrase_in(marker, title) for marker in [COUNTRY_NAMES.get(code, ''), *markers]):
            raise ValueError('Title points to a different country/cuisine')
    # Generic bowls with only a buried dish reference cannot prove identity.
    lead = ' '.join(normalized(caption).split()[:8])
    lead_match = phrase_in(match, lead)
    confidence = (74 if match == dish['dishName'] else 70) if in_title else (68 if lead_match else 35)
    identity_reasons = [('Complete canonical name' if match == dish['dishName'] else 'Complete catalog alias') +
                        (' in title' if in_title else ' in description')]
    if country:
        confidence += 12; identity_reasons.append('Country evidence in source metadata: ' + country)
    if in_title and lead_match:
        confidence += 10; identity_reasons.append('Description corroborates title')
    if PLATED.search(normalized(title + ' ' + caption)) or phrase_in('dish', caption):
        confidence += 8; identity_reasons.append('Source describes food subject')
    if len(normalized(match).split()) > 1:
        confidence += 4
    confidence = min(100, confidence)
    candidate['identityConfidence'] = confidence
    candidate['selectionEvidence'] = {'matchedName': match, 'matchedCountry': country, 'title': candidate['title'],
                                    'description': caption, 'identityReasons': identity_reasons}
    if confidence < min_confidence:
        raise ValueError(f'Identity confidence {confidence} below {min_confidence}; ' + '; '.join(identity_reasons))
    quality, visual_reasons = visual_score(candidate, decision)
    classification = 'strong-candidate' if confidence >= 90 and quality >= 75 else 'acceptable-review-recommended'
    candidate.update(identityConfidence=confidence, visualSuitability=quality, candidateClassification=classification,
                     selectionScore=confidence * 2 + quality + (5 if country else 0), needsVisualReview=True,
                     selectionEvidence={'matchedName': match, 'matchedCountry': country, 'title': candidate['title'],
                                        'description': caption, 'identityReasons': identity_reasons, 'visualReasons': visual_reasons})
    return candidate


def rank_key(candidate):
    # Provider priority breaks ties; a better Openverse photo can beat Commons.
    return (-candidate['selectionScore'], -candidate['identityConfidence'], -candidate['visualSuitability'],
            PROVIDER_TYPES[candidate['provider']].priority, source_key(candidate['sourcePageUrl']), candidate['candidateId'])


def validate_ranked_selection(entry, canonical, decisions=()):
    selection = entry.get('automaticSelection', {})
    target = selection.get('target', {})
    if selection.get('version') != 2 or entry.get('visuallyReviewed') is not False or entry.get('needsVisualReview') is not True:
        raise ValueError('Automatic matches must disclose pending human visual review')
    expected = {'dishId': canonical['id'], 'dishName': canonical['name'], 'countryCode': canonical['countryCode'], 'alternateNames': canonical['aliases']}
    if any(target.get(key) != value for key, value in expected.items()) or not target.get('country'):
        raise ValueError('Automatic selection does not match the canonical dish')
    provider = PROVIDER_TYPES.get(selection.get('provider'))
    if provider is None:
        raise ValueError('Unknown automatic image provider')
    threshold = selection.get('minConfidence')
    if not isinstance(threshold, int) or not 80 <= threshold <= 100:
        raise ValueError('Invalid automatic confidence threshold (minimum 80)')
    # Reproduce selection-time scores even if future QA changes. Existing imports
    # remain usable; current reject decisions still block a new/approved import.
    normalized_candidate = provider.normalize(selection.get('raw', {}))
    if entry.get('status') != 'licensed-local' and any(
            item.get('decision') == 'reject' and source_key(item['sourcePageUrl']) == source_key(normalized_candidate['sourcePageUrl'])
            for item in decisions):
        raise ValueError('Current manual QA rejects this source for new imports')
    snapshot_decision = selection.get('qaDecision')
    candidate = score_candidate(target, normalized_candidate, threshold, [snapshot_decision] if snapshot_decision else [])
    for key in ['provider', 'imageDownloadUrl', 'originalImageUrl', 'sourcePageUrl', 'creator', 'license', 'licenseUrl',
                'identityConfidence', 'visualSuitability', 'candidateClassification', 'selectionScore', 'selectionEvidence']:
        if entry.get(key) != candidate[key]:
            raise ValueError(f'Automatic source metadata changed: {key}')
