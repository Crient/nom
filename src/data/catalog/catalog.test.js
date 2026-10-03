import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import records from './records.json'
import taxonomy from './taxonomy.json'
import report from '../../../catalog/ingestion-report.json'
import { dishes, dishImages } from '../dishes'
import { PREFERENCE_FLAVORS, validateCatalog } from './validateCatalog'
import { FOOD_TYPE_LABELS, FLAVOR_LABELS, REGION_CHIP_LABELS } from '../../utils/sessionChips'

describe('full workbook catalog', () => {
  it('imports exactly 201 unique, structurally valid records', () => {
    expect(validateCatalog(records, taxonomy)).toEqual([])
    expect(new Set(records.map(dish => dish.id)).size).toBe(201)
    expect(taxonomy.preferenceFlavors).toEqual(PREFERENCE_FLAVORS)
    expect(taxonomy.preferenceFlavors).toEqual(Object.keys(FLAVOR_LABELS))
    expect(taxonomy.regions.every(id => id in REGION_CHIP_LABELS)).toBe(true)
    expect(taxonomy.foodTypes.every(id => id in FOOD_TYPE_LABELS)).toBe(true)
  })

  it('reproduces every generated record from the committed workbook without writing files', () => {
    const output = execFileSync('python3', ['scripts/import-catalog.py', '--check'], { encoding: 'utf8' })
    expect(output).toContain('Checked 201 Dishes records in spreadsheet order')
  })

  it('preserves all metadata and source order, including every needs-review dish', () => {
    expect(dishes.map(({ country, flag, image, imageStatus, ...record }) => record)).toEqual(records)
    expect(records.every(dish => dish.reviewStatus === 'needs-review')).toBe(true)
    expect(records.map(dish => dish.sourceRow)).toEqual(Array.from({ length: 201 }, (_, i) => i + 5))
    expect(report.withApprovedFactualSource).toBe(25)
    expect(report.reviewStatuses).toEqual({ 'needs-review': 201 })
    expect(dishes.find(dish => dish.id === 'mie-goreng').aliases).toEqual(['Mi Goreng', 'Bakmi Goreng'])
    expect(dishes.find(dish => dish.id === 'lort-cha')).toMatchObject({ country: 'Cambodia', countryCode: 'KH', flag: '🇰🇭' })
  })

  it('preserves the ten original photos and uses local imports or one replaceable placeholder', () => {
    expect(dishes.filter(dish => dish.imageStatus === 'existing-local')).toHaveLength(10)
    const placeholders = dishes.filter(dish => dish.imageStatus === 'placeholder')
    expect(placeholders).toHaveLength(201 - Object.keys(dishImages).length)
    expect(new Set(placeholders.map(dish => dish.image)).size).toBe(placeholders.length ? 1 : 0)
    expect(dishes.every(dish => dish.image && !dish.image.includes('wikimedia'))).toBe(true)
    expect(Object.keys(dishImages).every(id => records.some(dish => dish.id === id))).toBe(true)
    expect(report.directImageReferences).toBe(0)
  })

  it('keeps every descriptor within the allowed taxonomy without exceptions', () => {
    expect(taxonomy.descriptors).not.toContain('crispy')
    expect(report.descriptorPreferenceOverlap).toEqual([])
    expect(records.every(dish => dish.descriptors.every(id => taxonomy.descriptors.includes(id)))).toBe(true)
  })

  it.each([
    ['chole-bhature', ['savory', 'aromatic'], ['rich']],
    ['koshari', ['savory', 'earthy'], ['comforting', 'tangy', 'crispy']],
    ['arepa', ['savory', 'tender'], ['comforting']],
    ['reuben-sandwich', ['savory', 'tender'], ['rich', 'tangy', 'crispy']],
  ])('cleans %s descriptors while preserving its preference flavors', (id, descriptors, preferenceFlavors) => {
    expect(records.find(dish => dish.id === id)).toMatchObject({ descriptors, preferenceFlavors })
  })
})

describe('catalog validation rejects malformed candidates instead of dropping rows', () => {
  it.each([
    ['id', 'Invalid ID'], ['region', 'surprise-me'], ['foodType', 'anything'],
    ['countryCode', 'XX'], ['adventureLevel', 0], ['adventureLevel', 4], ['adventureLevel', '2'],
    ['name', ''], ['shortDescription', ''], ['description', null], ['reviewStatus', 'verified'],
    ['preferenceFlavors', []], ['preferenceFlavors', ['savory']],
    ['preferenceFlavors', ['spicy', 'spicy']], ['preferenceFlavors', null],
    ['descriptors', ['unknown']], ['descriptors', ['crispy']], ['descriptors', ['savory', 'savory']],
    ['aliases', 'alias|other'], ['aliases', ['']], ['notes', null],
    ['validationStatus', 'INVALID'], ['sourceRow', 0],
  ])('rejects invalid %s = %j', (field, value) => {
    const candidate = [{ ...records[0], [field]: value }, ...records.slice(1)]
    expect(validateCatalog(candidate, taxonomy).length).toBeGreaterThan(0)
  })

  it('rejects duplicate IDs, omitted rows, non-array catalogs, and non-object records', () => {
    expect(validateCatalog([...records, records[0]], taxonomy).join(' ')).toContain('duplicate dish ID')
    expect(validateCatalog(records.slice(0, 25), taxonomy).join(' ')).toContain('Expected 201')
    expect(validateCatalog({}, taxonomy)).toEqual(['Catalog must be an array'])
    expect(validateCatalog([null, ...records.slice(1)], taxonomy).join(' ')).toContain('malformed record')
  })

  it('rejects taxonomy drift and malformed country lists', () => {
    expect(validateCatalog(records, { ...taxonomy, preferenceFlavors: [...PREFERENCE_FLAVORS, 'umami'] }).join(' '))
      .toContain('Unsupported taxonomy: preferenceFlavors')
    expect(validateCatalog(records, { ...taxonomy, countryCodes: {} }).join(' ')).toContain('Malformed country-code taxonomy')
  })
})
