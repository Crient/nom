"""Provider adapters and normalized provenance. No network at import time.

Add future credentialed providers to make_providers only when configured. Each
adapter implements search(name, country) and normalize(raw); UI/storage never
depends on a provider's response shape. No optional API credentials required.
"""
from urllib.parse import urlencode, urlparse, unquote

from commons_images import PHOTO_MIMES, plain, reusable_license

OPENVERSE_API = 'https://api.openverse.org/v1/images/'


def safe_https(url):
    try:
        parsed = urlparse(url)
        return (parsed.scheme == 'https' and bool(parsed.hostname)
                and not parsed.username and not parsed.password
                and parsed.port in {None, 443})
    except ValueError:
        return False


def download_url(url):
    """Only known reusable-image CDNs, never arbitrary provider result URLs."""
    host = urlparse(url).hostname or ''
    return safe_https(url) and (host in {'upload.wikimedia.org', 'thumb.wikimedia.org', 'cdn.stocksnap.io'}
                               or host.endswith('.staticflickr.com'))


def source_url(url):
    parsed = urlparse(url)
    path = unquote(parsed.path)
    return safe_https(url) and (
        (parsed.hostname == 'commons.wikimedia.org' and path.startswith('/wiki/File:'))
        or (parsed.hostname in {'flickr.com', 'www.flickr.com'} and path.startswith('/photos/'))
        or (parsed.hostname in {'stocksnap.io', 'www.stocksnap.io'} and path.startswith('/photo/')))


def attribution(candidate):
    if not source_url(candidate['sourcePageUrl']) or not download_url(candidate['imageDownloadUrl']):
        raise ValueError('Unsupported source page or direct image host; retain placeholder')
    if not download_url(candidate['originalImageUrl']):
        raise ValueError('Unsupported original image host')
    if not candidate['creator']:
        raise ValueError('Missing creator attribution')
    return candidate


class CommonsProvider:
    name = 'commons'
    priority = 0

    def __init__(self, client):
        self.client = client

    def search(self, name, country):
        return self.client.search(name, country)

    @staticmethod
    def normalize(raw):
        info = (raw.get('imageinfo') or [{}])[0]
        metadata = info.get('extmetadata', {})
        if not raw.get('title', '').startswith('File:') or info.get('mime') not in PHOTO_MIMES or info.get('mediatype') != 'BITMAP':
            raise ValueError('Not a supported photograph')
        if plain(metadata.get('Restrictions', {}).get('value')):
            raise ValueError('Source carries additional reuse restrictions')
        license_id, license_url = reusable_license(metadata)
        return attribution(dict(
            provider='commons', source='wikimedia', candidateId=str(raw.get('pageid', raw['title'])),
            title=plain(raw['title'][5:]), description=plain(metadata.get('ImageDescription', {}).get('value')),
            objectName=plain(metadata.get('ObjectName', {}).get('value')),
            tags=[plain(item.get('title')) for item in raw.get('categories', [])],
            sourcePageUrl=info.get('descriptionurl', ''), imageDownloadUrl=info.get('thumburl') or info.get('url', ''),
            originalImageUrl=info.get('url', ''), creator=plain(metadata.get('Artist', {}).get('value')),
            creatorUrl=None, license=license_id, licenseUrl=license_url,
            licenseOriginal=plain(metadata.get('LicenseShortName', {}).get('value')),
            credit=plain(metadata.get('Credit', {}).get('value')),
            attribution=plain(metadata.get('Attribution', {}).get('value')),
            attributionRequired=plain(metadata.get('AttributionRequired', {}).get('value')),
            originalDimensions={'width': info.get('width'), 'height': info.get('height')},
        ))


class OpenverseProvider:
    name = 'openverse'
    priority = 1

    def __init__(self, client):
        self.client = client

    def search(self, name, country):
        query = f'"{name.replace(chr(34), " ")}"' + (f' "{country}"' if country else '')
        params = {'q': query, 'page_size': 10, 'license': 'by,by-sa,cc0,pdm', 'mature': 'false',
                  'source': 'flickr,wikimedia,stocksnap'}
        return query, self.client.request(OPENVERSE_API + '?' + urlencode(params)).get('results', [])

    @staticmethod
    def normalize(raw):
        family, version = raw.get('license', ''), raw.get('license_version', '')
        if family in {'by', 'by-sa'}:
            license_name = f'CC {family.upper()} {version}'
        elif family in {'cc0', 'pdm'}:
            license_name = 'CC0' if family == 'cc0' else 'Public domain'
        else:
            raise ValueError('Unsupported Openverse license')
        license_id, license_url = reusable_license({
            'LicenseShortName': {'value': license_name}, 'LicenseUrl': {'value': raw.get('license_url', '')}})
        if raw.get('mature') is True:
            raise ValueError('Mature result rejected')
        tags = [plain(item.get('name')) for item in raw.get('tags', [])
                if item.get('accuracy') is None or float(item['accuracy']) >= 0.85]
        return attribution(dict(
            provider='openverse', source=raw.get('source', ''), candidateId=str(raw.get('id', '')),
            title=plain(raw.get('title')), description=plain(raw.get('description')), objectName='', tags=tags,
            sourcePageUrl=raw.get('foreign_landing_url', ''), imageDownloadUrl=raw.get('url', ''),
            originalImageUrl=raw.get('url', ''), creator=plain(raw.get('creator')),
            creatorUrl=raw.get('creator_url'), license=license_id, licenseUrl=license_url,
            licenseOriginal=license_name, credit='', attribution=plain(raw.get('attribution')),
            attributionRequired=family in {'by', 'by-sa'},
            originalDimensions={'width': raw.get('width'), 'height': raw.get('height')},
        ))


PROVIDER_TYPES = {'commons': CommonsProvider, 'openverse': OpenverseProvider}


def make_providers(client, choice='all'):
    names = list(PROVIDER_TYPES) if choice == 'all' else [choice]
    return [PROVIDER_TYPES[name](client) for name in names]
