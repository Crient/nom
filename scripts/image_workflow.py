"""Offline image review policy, catalog-grounded prompts and QA reports.

Storage/import status is independent of visual review. A local file is not proof
of approval. Only explicit human decisions enable runtime imagery.
"""
from collections import Counter
import html
import json
import re

REVIEW_STATUSES = {'approved', 'temporary', 'needs-replacement', 'missing', 'generated-pending', 'pending-review'}
LOCAL_STATUSES = {'existing-local', 'licensed-local', 'generated-local'}
RENDER_STATUSES = {'approved', 'temporary'}


def source_type(entry):
    if entry.get('sourceType'):
        return entry['sourceType']
    return 'generated' if entry.get('status') == 'generated-local' else 'real' if entry.get('localPath') else 'missing'


def review_status(entry):
    return entry.get('reviewStatus', 'pending-review' if entry.get('localPath') else 'missing')


def is_renderable(entry):
    return entry.get('status') in LOCAL_STATUSES and bool(entry.get('localPath')) and review_status(entry) in RENDER_STATUSES


def validate_entries(entries, records):
    if [entry['dishId'] for entry in entries] != [record['id'] for record in records] or len({entry['dishId'] for entry in entries}) != len(records):
        raise ValueError('Image manifest must preserve unique canonical IDs and source order')
    for entry in entries:
        status = entry.get('reviewStatus')
        if status not in REVIEW_STATUSES:
            raise ValueError(f"{entry['dishId']}: explicit valid image reviewStatus required")
        if source_type(entry) not in {'real', 'generated', 'missing'}:
            raise ValueError('Unknown image source type')
        if entry.get('status') in {'existing-local', 'licensed-local'} and source_type(entry) != 'real':
            raise ValueError('Real-image storage requires real provenance')
        if entry.get('status') == 'generated-local' and source_type(entry) != 'generated':
            raise ValueError('Generated storage requires generated provenance')
        if status == 'missing' and entry.get('status') in LOCAL_STATUSES:
            raise ValueError('Stored candidates need an explicit review state, not missing')
        if status in {'approved', 'temporary'} and not is_renderable(entry):
            raise ValueError('Approved/temporary images require a successfully imported local file')
        if status == 'generated-pending' and source_type(entry) != 'generated':
            raise ValueError('generated-pending requires generated provenance')


def unresolved_reason(entry):
    status = review_status(entry)
    return entry.get('reviewReason') or {
        'pending-review': 'Local photo has no explicit manual visual approval.',
        'generated-pending': 'Generated candidate awaits cultural and visual review; not documentary evidence.',
        'needs-replacement': 'Current image failed manual visual review.',
        'missing': 'No visually approved local image is available.',
    }.get(status, 'Image review required.')


def coverage(entries, records):
    counts = Counter(review_status(entry) for entry in entries)
    ready = [entry for entry in entries if is_renderable(entry)]
    real = lambda status: sum(source_type(entry) == 'real' and review_status(entry) == status for entry in entries)
    generated = lambda status: sum(source_type(entry) == 'generated' and review_status(entry) == status for entry in entries)
    unresolved = [{'dishId': entry['dishId'], 'name': record['name'], 'reviewStatus': review_status(entry),
                   'sourceType': source_type(entry), 'reason': unresolved_reason(entry)}
                  for entry, record in zip(entries, records) if not is_renderable(entry)]
    return dict(total=len(records), realBefore=10,
                realAfter=sum(source_type(entry) == 'real' for entry in ready),
                approvedImages=counts['approved'], temporaryImages=counts['temporary'],
                realApprovedImages=real('approved'), temporaryRealImages=real('temporary'),
                rejectedRealImages=real('needs-replacement'), pendingReviewRealImages=real('pending-review'),
                missingImages=counts['missing'], generatedCandidates=generated('generated-pending'),
                generatedApprovedImages=generated('approved'), generatedTemporaryImages=generated('temporary'),
                needsReplacementImages=counts['needs-replacement'],
                storedLocalImages=sum(bool(entry.get('localPath')) and entry.get('status') in LOCAL_STATUSES for entry in entries),
                mappedImages=len(ready), remainingPlaceholders=len(unresolved),
                generatedFallbackQueued=len(unresolved), reviewStatuses=dict(sorted(counts.items())), missing=unresolved)


# A cue lexicon only extracts phrases already in catalog text. It does not add
# ingredients, dictate optional variants, or infer a recipe from country/flavors.
INGREDIENT_CUES = (
    'alkaline wheat noodles', 'flat rice noodles', 'short rice noodles', 'rice noodles', 'wheat noodles',
    'bean sprouts', 'bamboo shoots', 'ground peanut cake', 'split peas', 'melted cheese', 'coconut milk',
    'rice flour', 'sweet potatoes', 'cassava leaves', 'banana leaves', 'plantain leaves', 'palm oil',
    'pickled vegetables', 'fermented fish', 'peanut sauce', 'rice cakes', 'fried egg', 'minced meat',
    'cooked onions', 'caramelized onions', 'seasoned vegetables', 'marinated pork', 'lobster meat',
    'chickpeas', 'lentils', 'beans', 'peanuts', 'corn', 'potatoes', 'cassava', 'plantains', 'tomatoes',
    'onions', 'onion', 'scallions', 'cilantro', 'parsley', 'herbs', 'garlic', 'ginger', 'chili', 'turmeric',
    'gochujang', 'nori', 'tofu', 'yogurt', 'citrus', 'pineapple', 'egg', 'eggs', 'beef', 'pork', 'chicken',
    'lamb', 'goat', 'fish', 'shrimp', 'prawns', 'lobster', 'crab', 'seafood', 'meat', 'vegetables',
    'rice', 'noodles', 'bread', 'croutons', 'cheese', 'butter', 'mayonnaise', 'tortillas', 'roll', 'broth',
    'couscous', 'bulgur', 'millet', 'okra', 'spinach', 'aubergine', 'eggplant', 'mushrooms', 'cabbage',
    'carrots', 'cucumber', 'olives', 'raisins', 'almonds', 'pistachios', 'sesame', 'saffron', 'miso',
)
PRESENTATION = re.compile(r'\b(topped|served|finished|layered|layers|skewers|roll|tortillas|wrapped|stuffed|broth|soup|stir.fried|grilled|bread|crust|stew|dumplings)\b', re.I)


def ingredient_cues(text):
    result = []
    for phrase in INGREDIENT_CUES:
        if re.search(r'(?<!\w)' + re.escape(phrase) + r'(?!\w)', text, re.I):
            if not any(phrase in existing for existing in result):
                result.append(phrase)
    return result


def queue_entry(record, entry, country):
    context = record['shortDescription'] + ' ' + record['description']
    ingredients = ingredient_cues(context)
    presentation = [sentence.strip() for sentence in re.split(r'(?<=[.!?])\s+', record['description']) if PRESENTATION.search(sentence)]
    needs_review = len(ingredients) < 2 or not presentation or record.get('reviewStatus') != 'approved'
    review_reasons = []
    if len(ingredients) < 2: review_reasons.append('Catalog has limited visible ingredient detail')
    if not presentation: review_reasons.append('Catalog does not establish a confident presentation')
    if record.get('reviewStatus') != 'approved': review_reasons.append('Catalog factual metadata is still needs-review')
    aliases = ', '.join(record.get('aliases', []))
    prompt = f"Realistic professional food photography of {record['name']} ({country})"
    prompt += f", also known as {aliases}" if aliases else ''
    prompt += f". Catalog reference: {record['shortDescription']} {record['description']} "
    prompt += 'Depict one coherent finished version supported by this reference; do not combine alternative regional versions or add unsupported garnishes. '
    prompt += 'Make the canonical dish immediately recognizable and dominant in the frame. Natural restaurant/editorial light, appetizing but believable textures. '
    prompt += 'Landscape 4:3 or square-friendly framing, with breathing room around the food for responsive mobile-card cropping. '
    prompt += 'No people, hands, text, logos, cooking scenes, obstructing utensils, or unrelated foods dominating the frame. '
    prompt += 'This is a generated illustration in a photographic style, not documentary evidence of a restaurant or authentic serving.'
    generation = entry.get('generation', {})
    prompt = generation.get('promptUsed') or generation.get('requestedPrompt') or prompt
    return dict(dishId=record['id'], dishName=record['name'], country=country, countryCode=record['countryCode'],
                aliases=record.get('aliases', []), shortDescription=record['shortDescription'], description=record['description'],
                importantVisibleIngredients=ingredients, ingredientEvidence=context,
                expectedCanonicalPresentation=presentation, presentationEvidenceSource='Catalog description; no external additions',
                preferredComposition='Finished dish dominates frame; natural editorial light; breathing room for responsive crops',
                preferredOrientation='landscape 4:3 / square-friendly', outputFilename=record['id'] + '.webp',
                inputFilename=record['id'] + '.png', incomingDirectory='src/assets/food/generated-incoming/',
                runtimePath='src/assets/food/catalog/' + record['id'] + '.webp', currentImageStatus=review_status(entry),
                sourceType=source_type(entry), currentImage=entry.get('localPath'), reason=unresolved_reason(entry),
                catalogReviewStatus=record.get('reviewStatus'), catalogNotes=record.get('notes'),
                needsPromptReview=needs_review, promptReviewReasons=review_reasons, prompt=prompt)


def build_queue(records, entries, countries):
    return dict(version=1, totalDishes=len(records), queued=sum(not is_renderable(entry) for entry in entries),
                note='Fallback planning only. No images generated; prompts require cultural review before use.',
                dishes=[queue_entry(record, entry, countries[record['countryCode']])
                        for record, entry in zip(records, entries) if not is_renderable(entry)])


def review_report(records, entries, countries, queue):
    prompts = {item['dishId']: item for item in queue['dishes']}
    return dict(version=1, coverage=coverage(entries, records), dishes=[dict(
        dishId=record['id'], dishName=record['name'], country=countries[record['countryCode']],
        currentImage=entry.get('localPath'), imageStatus=review_status(entry), sourceType=source_type(entry),
        mapped=is_renderable(entry), rejectionReason=entry.get('reviewReason'),
        reason=unresolved_reason(entry) if not is_renderable(entry) else entry.get('reviewReason'),
        sourcePageUrl=entry.get('sourcePageUrl'), creator=entry.get('creator'), license=entry.get('license'),
        history=entry.get('history', []), generation=entry.get('generation'),
        generationPrompt=prompts.get(record['id'], {}).get('prompt'),
        needsPromptReview=prompts.get(record['id'], {}).get('needsPromptReview', False),
        targetFilename=record['id'] + '.webp') for record, entry in zip(records, entries)])


def review_html(report, root):
    escape = lambda value: html.escape(str(value if value is not None else ''), quote=True)
    rows = []
    for row in report['dishes']:
        photo = ''
        path = row['currentImage']
        if path and (root / path).resolve().is_relative_to((root / 'src/assets/food').resolve()) and (root / path).is_file():
            photo = f'<img loading="lazy" src="../../{escape(path)}" alt="Current candidate: {escape(row["dishName"])}">'
        rows.append(f'<article data-status="{escape(row["imageStatus"])}"><h2>{escape(row["dishName"])} · {escape(row["country"])}</h2>{photo}'
                    f'<p><strong>{escape(row["imageStatus"])}</strong> · {escape(row["sourceType"])} · {"rendered" if row["mapped"] else "placeholder in app"}</p>'
                    f'<p>{escape(row["reason"])}</p><p>Target: <code>{escape(row["targetFilename"])}</code></p>'
                    f'<p>{"Prompt needs cultural review." if row["needsPromptReview"] else ""}</p>'
                    f'<details><summary>Generation prompt</summary><pre>{escape(row["generationPrompt"])}</pre></details>'
                    f'<details><summary>Source, review and history</summary><pre>{escape(json.dumps(row, ensure_ascii=False, indent=2))}</pre></details></article>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nom image review</title>'
            '<style>body{font:16px system-ui;margin:24px auto;max-width:1100px;padding:16px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:24px}article{border:1px solid #ccc;border-radius:12px;padding:16px;align-self:start}img{width:100%;max-height:240px;object-fit:contain}pre{white-space:pre-wrap;overflow-wrap:anywhere}summary{padding:12px;cursor:pointer}</style>'
            '<h1>Nom · dish image review</h1><p>Local files and generated candidates are not visual approvals. Existing and archived sources remain traceable.</p>'
            f'<pre>{escape(json.dumps({k: v for k, v in report["coverage"].items() if k != "missing"}, indent=2))}</pre><main>' + ''.join(rows) + '</main></html>')
