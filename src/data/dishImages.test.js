import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import manifest from '../../catalog/images/manifest.json'
import coverage from '../../catalog/images/coverage-report.json'
import records from './catalog/records.json'
import credits from './dishImageCredits.json'
import { dishes } from './dishes'
import { dishImages, existingDishImages } from './dishImages'
import { imageDimensions } from './imageDimensions'

describe('canonical dish photo mapping', () => {
  it('keeps all 201 IDs, local files, credits, dimensions and coverage consistent without treating candidates as photos', () => {
    expect(manifest.dishes.map(entry => entry.dishId)).toEqual(records.map(dish => dish.id))
    expect(new Set(manifest.dishes.map(entry => entry.dishId)).size).toBe(201)
    const ready = manifest.dishes.filter(entry => ['existing-local', 'licensed-local'].includes(entry.status))
    expect(ready.every(entry => existsSync(entry.localPath))).toBe(true)
    expect(coverage.realAfter).toBe(ready.length)
    expect(coverage.remainingPlaceholders).toBe(201 - ready.length)
    expect(coverage.missing.map(entry => entry.dishId)).toEqual(dishes.filter(dish => dish.imageStatus === 'placeholder').map(dish => dish.id))
    expect(credits.map(entry => entry.dishId)).toEqual(ready.map(entry => entry.dishId))
    for (const [id, image] of Object.entries(existingDishImages)) expect(dishImages[id]).toBe(image)
    for (const image of Object.values(dishImages)) expect(imageDimensions[image]).toMatchObject({ width: expect.any(Number), height: expect.any(Number) })
  })

  it('rejects unreviewed, unlicensed and search-page photo inputs before download or overwriting an existing photo', () => {
    const script = `import runpy
m = runpy.run_path('scripts/import-dish-images.py')
base = dict(dishId='arepa', visuallyReviewed=True, license='CC-BY-SA-3.0', creator='Photo author', sourcePageUrl='https://commons.wikimedia.org/wiki/File:Example.jpg', licenseUrl='https://creativecommons.org/licenses/by-sa/3.0/')
for patch in [dict(visuallyReviewed=False), dict(license='unknown'), dict(creator=''), dict(sourcePageUrl='http://example.com')]:
    try: m['check_source'](dict(base, **patch))
    except ValueError: pass
    else: raise AssertionError('Invalid source accepted')
for entry in [dict(base, dishId='lort-cha'), dict(base, imageDownloadUrl='https://commons.wikimedia.org/w/index.php?search=arepa')]:
    try: m['import_photo'](entry)
    except ValueError: pass
    else: raise AssertionError('Protected photo or search URL accepted')
print('Photo gates passed')`
    expect(execFileSync('python3', ['-c', script], { encoding: 'utf8' })).toContain('Photo gates passed')
  })
})
