#!/usr/bin/env python3
"""Read the committed XLSX source into deterministic JSON, without Excel dependencies.

This reads workbook data only; it never edits the workbook or applies instructions
from its notes, pilot, backup, or audit sheets. Requires Python 3 and Node 22+.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import posixpath
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'catalog' / 'Nom_Dish_Catalog_Master_V1_Pilot25_SourcesVerified.xlsx'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL_ID = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
HEADERS = ['id', 'name', 'aliases', 'countryCode', 'region', 'foodType',
           'flavor1', 'flavor2', 'flavor3', 'descriptor1', 'descriptor2',
           'descriptor3', 'descriptor4', 'adventureLevel', 'shortDescription',
           'description', 'reviewStatus', 'notes', 'validationStatus']


def read_workbook(path):
    with zipfile.ZipFile(path) as archive:
        def xml(name):
            return ET.fromstring(archive.read(name))

        def rich_text(node):
            return ''.join(t.text or '' for t in node.findall('.//s:t', NS))

        strings = [rich_text(item) for item in xml('xl/sharedStrings.xml')] \
            if 'xl/sharedStrings.xml' in archive.namelist() else []
        relationships = {r.attrib['Id']: r.attrib['Target']
                         for r in xml('xl/_rels/workbook.xml.rels')}
        sheets = {}
        for sheet in xml('xl/workbook.xml').find('s:sheets', NS):
            target = relationships[sheet.attrib[REL_ID]]
            target = target.lstrip('/') if target.startswith('/') \
                else posixpath.normpath('xl/' + target)
            rows = {}
            for row in xml(target).findall('s:sheetData/s:row', NS):
                cells = {}
                for cell in row:
                    value = cell.find('s:v', NS)
                    text = value.text or '' if value is not None else ''
                    if cell.attrib.get('t') == 's':
                        text = strings[int(text)]
                    elif cell.attrib.get('t') == 'inlineStr':
                        text = rich_text(cell)
                    cells[''.join(c for c in cell.attrib['r'] if c.isalpha())] = text
                rows[int(row.attrib['r'])] = cells
            sheets[sheet.attrib['name']] = rows
        return sheets


def table(rows, header_row):
    headers = rows[header_row]
    return [(number, {name: row.get(column, '') for column, name in headers.items() if name})
            for number, row in sorted(rows.items())
            if number > header_row and any(row.values())]


def convert(sheets):
    dishes = sheets['Dishes']
    if list(dishes[4].values()) != HEADERS:
        raise ValueError('Dishes headers changed; review the importer before importing.')
    records = []
    for number, row in table(dishes, 4):
        record = {key: value for key, value in row.items()
                  if not key.startswith(('flavor', 'descriptor')) and key != 'aliases'}
        # Pipe is the workbook alias delimiter. Keep source order and spelling.
        record['aliases'] = row['aliases'].split('|') if row['aliases'] else []
        record['preferenceFlavors'] = [row[f'flavor{i}'] for i in range(1, 4) if row[f'flavor{i}']]
        record['descriptors'] = [row[f'descriptor{i}'] for i in range(1, 5) if row[f'descriptor{i}']]
        record['adventureLevel'] = int(row['adventureLevel'])
        record['sourceRow'] = number
        records.append(record)

    allowed = sheets['Allowed_Values']
    def values(column, start, end):
        return [allowed[row].get(column, '') for row in range(start, end + 1)
                if allowed.get(row, {}).get(column)]

    taxonomy = {
        'regions': values('A', 5, 12),
        'foodTypes': values('D', 5, 9),
        'preferenceFlavors': values('G', 5, 10),
        'descriptors': values('I', 5, 22),
        'adventureLevels': [int(v) for v in values('K', 5, 7)],
        'reviewStatuses': values('N', 5, 8),
        'countryCodes': values('K', 17, max(allowed)),
    }
    references = table(sheets['Sources'], 4)
    approved_source_ids = {row['dishId'] for _, row in references if row['approved'] == '1'}
    image_rows = table(sheets['Images'], 4)
    report = {
        'sourceFile': SOURCE.name,
        'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'sheet': 'Dishes',
        'recordCount': len(records),
        'reviewStatuses': dict(Counter(d['reviewStatus'] for d in records)),
        'regions': dict(Counter(d['region'] for d in records)),
        'foodTypes': dict(Counter(d['foodType'] for d in records)),
        'withApprovedFactualSource': sum(d['id'] in approved_source_ids for d in records),
        'directImageReferences': sum(bool(row['imageDownloadUrl'] or row['runtimePath'])
                                     for _, row in image_rows),
        'descriptorPreferenceOverlap': [
            {'id': d['id'], 'sourceRow': d['sourceRow'], 'descriptors': d['descriptors']}
            for d in records if set(d['descriptors']) & set(taxonomy['preferenceFlavors'])
        ],
    }
    return records, taxonomy, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check generated files without writing them')
    args = parser.parse_args()
    records, taxonomy, report = convert(read_workbook(SOURCE))
    # Validate the candidate before replacing any runtime files. No status filter.
    subprocess.run(['node', str(ROOT / 'scripts/validate-catalog.mjs'), '--stdin'],
                   input=json.dumps({'records': records, 'taxonomy': taxonomy}),
                   text=True, check=True)
    outputs = {
        ROOT / 'src/data/catalog/records.json': records,
        ROOT / 'src/data/catalog/taxonomy.json': taxonomy,
        ROOT / 'catalog/ingestion-report.json': report,
    }
    for path, data in outputs.items():
        content = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
        if args.check:
            if not path.exists() or path.read_text() != content:
                raise ValueError(f'{path.relative_to(ROOT)} is stale; run npm run catalog:import')
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding='utf-8')
    print(f'{"Checked" if args.check else "Imported"} {len(records)} Dishes records in spreadsheet order.')


if __name__ == '__main__':
    main()
