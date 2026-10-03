"""Conservative Commons candidate matching; no network or image writes here.

Automatic metadata matching is not human visual verification. Keep the evidence
and needsVisualReview flag so an incorrect source caption can be corrected later.
"""
import html
import re
import unicodedata
from urllib.parse import urlparse

COUNTRY_MARKERS = {
    'AE': ['Emirati', 'UAE'], 'AR': ['Argentine', 'Argentinian'], 'AT': ['Austrian'],
    'BA': ['Bosnia', 'Bosnian'], 'BR': ['Brazilian'], 'CA': ['Canadian'],
    'CI': ['Ivory Coast', 'Ivorian'], 'CN': ['Chinese'], 'CO': ['Colombian'],
    'DE': ['German'], 'DZ': ['Algerian'], 'EG': ['Egyptian'], 'ES': ['Spanish'],
    'ET': ['Ethiopian'], 'FR': ['French'], 'GB': ['British', 'England', 'English cuisine'],
    'GH': ['Ghanaian'], 'GR': ['Greek'], 'HU': ['Hungarian'], 'ID': ['Indonesian'],
    'IN': ['Indian'], 'IR': ['Iranian', 'Persian'], 'IT': ['Italian'], 'JM': ['Jamaican'],
    'JO': ['Jordanian'], 'JP': ['Japanese'], 'KE': ['Kenyan'], 'KH': ['Cambodian', 'Khmer'],
    'KR': ['Korea', 'Korean'], 'LB': ['Lebanese'], 'LK': ['Sri Lankan'],
    'MA': ['Moroccan'], 'MM': ['Myanmar', 'Burma', 'Burmese'], 'MX': ['Mexican'],
    'MY': ['Malaysian'], 'NG': ['Nigerian'], 'NP': ['Nepali', 'Nepalese'],
    'PE': ['Peruvian'], 'PH': ['Filipino', 'Philippine'], 'PK': ['Pakistani'],
    'PL': ['Polish'], 'PR': ['Puerto Rican'], 'PS': ['Palestine', 'Palestinian'],
    'PT': ['Portuguese'], 'SA': ['Saudi'], 'SG': ['Singaporean'], 'SN': ['Senegalese'],
    'SO': ['Somali'], 'SV': ['Salvadoran'], 'TR': ['Turkey', 'Turkish'],
    'UA': ['Ukrainian'], 'UG': ['Ugandan'], 'US': ['USA', 'United States', 'American cuisine'],
    'UY': ['Uruguayan'], 'VE': ['Venezuelan'], 'VN': ['Vietnamese', 'Viet Nam'],
    'YE': ['Yemeni'], 'ZA': ['South African'],
}
PHOTO_MIMES = {'image/jpeg', 'image/png', 'image/webp'}
DOWNLOAD_HOSTS = {'upload.wikimedia.org', 'thumb.wikimedia.org'}
NON_FOOD_SUBJECTS = re.compile(r'\b(menu|logo|map|sign|storefront|building|packaging|packet|cartoon|drawing|diagram|advertisement|raw ingredients)\b')


def plain(value):
    return ' '.join(html.unescape(re.sub(r'<[^>]*>', ' ', str(value or ''))).split())


def normalized(value):
    value = unicodedata.normalize('NFKD', plain(value)).casefold()
    value = ''.join(char for char in value if not unicodedata.combining(char))
    return ' '.join(re.sub(r'[^\w]+', ' ', value).split())


def phrase_in(phrase, text):
    phrase = normalized(phrase)
    return bool(phrase) and f' {phrase} ' in f' {normalized(text)} '


def direct_image_url(value):
    parsed = urlparse(value)
    return parsed.scheme == 'https' and parsed.hostname in DOWNLOAD_HOSTS and not parsed.username


def reusable_license(metadata):
    name = plain(metadata.get('LicenseShortName', {}).get('value'))
    url = plain(metadata.get('LicenseUrl', {}).get('value'))
    if url.startswith('//'):
        url = 'https:' + url
    if url.startswith('http://creativecommons.org/'):
        url = url.replace('http://', 'https://', 1)
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in {'creativecommons.org', 'www.creativecommons.org'}:
        raise ValueError('No supported machine-readable reusable license URL')
    match = re.fullmatch(r'CC[ -]BY(?:[ -](SA))?[ -](2\.0|3\.0|4\.0)', name, re.I)
    if match:
        family = 'by-sa' if match.group(1) else 'by'
        version = match.group(2)
        if not parsed.path.startswith(f'/licenses/{family}/{version}/'):
            raise ValueError('License name and URL disagree')
        return f'CC-BY{"-SA" if match.group(1) else ""}-{version}', url
    if name.casefold() in {'cc0', 'cc0 1.0', 'cc0-1.0'} and parsed.path.startswith('/publicdomain/zero/1.0/'):
        return 'CC0-1.0', url
    if name.casefold() in {'public domain', 'public-domain'} and parsed.path.startswith('/publicdomain/mark/1.0/'):
        return 'public-domain', url
    raise ValueError('Unsupported or ambiguous license; retain placeholder')


def evaluate_candidate(dish, page):
    """Require the complete name/alias AND country evidence, not query position."""
    title = page.get('title', '')
    info = (page.get('imageinfo') or [{}])[0]
    if not title.startswith('File:') or info.get('mime') not in PHOTO_MIMES or info.get('mediatype') != 'BITMAP':
        raise ValueError('Not a supported food photograph')
    if min(info.get('width', 0), info.get('height', 0)) < 240:
        raise ValueError('Image smaller than 240px')
    if NON_FOOD_SUBJECTS.search(normalized(title)):
        raise ValueError('Non-food subject in filename')
    metadata = info.get('extmetadata', {})
    if plain(metadata.get('Restrictions', {}).get('value')):
        raise ValueError('Source carries additional restrictions')
    description = plain(metadata.get('ImageDescription', {}).get('value'))
    if NON_FOOD_SUBJECTS.search(normalized(description)):
        raise ValueError('Caption describes a non-food subject')
    primary = ' '.join([title, plain(metadata.get('ObjectName', {}).get('value')), description])
    names = [dish['dishName'], *dish.get('alternateNames', [])]
    matched_name = next((name for name in names if phrase_in(name, primary)), None)
    if not matched_name:
        raise ValueError('No exact complete dish-name/alias in title or caption')
    categories = ' '.join(category.get('title', '') for category in page.get('categories', []))
    country = next((name for name in [dish['country'], *COUNTRY_MARKERS.get(dish['countryCode'], [])] if phrase_in(name, primary + ' ' + categories)), None)
    if not country:
        raise ValueError('No dish-country evidence in caption/title/categories')
    # A filename naming another cuisine is too ambiguous to import automatically.
    for code, markers in COUNTRY_MARKERS.items():
        if code != dish['countryCode'] and any(phrase_in(marker, title) for marker in markers):
            raise ValueError('Filename points to a different country/cuisine')
    license_id, license_url = reusable_license(metadata)
    creator = plain(metadata.get('Artist', {}).get('value'))
    if not creator:
        raise ValueError('Missing creator attribution')
    download = info.get('thumburl') or info.get('url', '')
    if not direct_image_url(download):
        raise ValueError('Not a direct HTTPS Wikimedia file')
    source = info.get('descriptionurl', '')
    parsed = urlparse(source)
    if parsed.scheme != 'https' or parsed.hostname != 'commons.wikimedia.org' or not parsed.path.startswith('/wiki/File:'):
        raise ValueError('Missing Commons file source page')
    evidence = {'matchedName': matched_name, 'matchedCountry': country, 'title': title, 'description': description}
    return {
        'imageDownloadUrl': download, 'sourcePageUrl': source, 'creator': creator,
        'credit': plain(metadata.get('Credit', {}).get('value')), 'license': license_id,
        'attribution': plain(metadata.get('Attribution', {}).get('value')),
        'attributionRequired': plain(metadata.get('AttributionRequired', {}).get('value')),
        'licenseUrl': license_url, 'licenseOriginal': plain(metadata.get('LicenseShortName', {}).get('value')),
        'selectionEvidence': evidence,
        'selectionScore': (100 if phrase_in(dish['dishName'], title) else 80 if phrase_in(matched_name, title) else 60) + (10 if phrase_in(country, title) else 0),
    }


def validate_automatic_selection(entry, canonical):
    selection = entry.get('automaticSelection', {})
    target = selection.get('target', {})
    if selection.get('provider') != 'wikimedia-commons' or entry.get('visuallyReviewed') is not False or entry.get('needsVisualReview') is not True:
        raise ValueError('Automatic matches must disclose pending human visual review')
    if any(target.get(key) != value for key, value in {
        'dishId': canonical['id'], 'dishName': canonical['name'],
        'countryCode': canonical['countryCode'], 'alternateNames': canonical['aliases'],
    }.items()) or not target.get('country'):
        raise ValueError('Automatic selection does not match the canonical dish')
    candidate = evaluate_candidate(target, selection.get('page', {}))
    for key in ['imageDownloadUrl', 'sourcePageUrl', 'creator', 'license', 'licenseUrl']:
        if entry.get(key) != candidate[key]:
            raise ValueError(f'Automatic source metadata changed: {key}')
