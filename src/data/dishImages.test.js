import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import manifest from '../../catalog/images/manifest.json'
import coverage from '../../catalog/images/coverage-report.json'
import remaining from '../../catalog/images/remaining-image-manifest.json'
import records from './catalog/records.json'
import credits from './dishImageCredits.json'
import queue from '../../catalog/images/generated-image-queue.json'
import { dishes } from './dishes'
import { dishImages, existingDishImages } from './dishImages'
import { catalogDishImages } from './dishImageAssets'
import { imageDimensions } from './imageDimensions'

describe('canonical dish photo mapping', () => {
  it('keeps all 201 IDs, local files, credits, dimensions and coverage consistent without treating candidates as photos', () => {
    expect(manifest.dishes.map(entry => entry.dishId)).toEqual(records.map(dish => dish.id))
    expect(new Set(manifest.dishes.map(entry => entry.dishId)).size).toBe(201)
    const stored = manifest.dishes.filter(entry => ['existing-local', 'licensed-local', 'generated-local'].includes(entry.status))
    const ready = stored.filter(entry => ['approved', 'temporary'].includes(entry.reviewStatus))
    expect(ready.every(entry => existsSync(entry.localPath))).toBe(true)
    expect(Object.keys(catalogDishImages)).toHaveLength(ready.filter(entry => entry.status !== 'existing-local').length)
    for (const entry of ready) {
      const dish = dishes.find(candidate => candidate.id === entry.dishId)
      expect(dish.image).toBe(dishImages[entry.dishId])
      expect(dish.imageStatus).toBe(entry.status)
      expect(dish.image).not.toContain('dish-placeholder')
    }
    expect(coverage.mappedImages).toBe(ready.length)
    expect(coverage.realAfter).toBe(ready.filter(entry => entry.sourceType === 'real').length)
    expect(coverage.remainingPlaceholders).toBe(201 - ready.length)
    expect(coverage.missing.map(entry => entry.dishId)).toEqual(dishes.filter(dish => dish.imageStatus === 'placeholder').map(dish => dish.id))
    expect(remaining.dishes.map(entry => entry.dishId)).toEqual(coverage.missing.map(entry => entry.dishId))
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    for (const entry of remaining.dishes) {
      const dish = records.find(dish => dish.id === entry.dishId)
      expect(entry).toMatchObject({ dishName: dish.name, country: names.of(dish.countryCode), expectedImageFilename: `${dish.id}.webp`, expectedRuntimePath: `src/assets/food/catalog/${dish.id}.webp` })
      expect(entry.searchQuery).toContain(dish.name)
    }
    expect(credits.map(entry => entry.dishId)).toEqual(stored.map(entry => entry.dishId))
    expect(Object.keys(existingDishImages)).toHaveLength(10)
    for (const [id, image] of Object.entries(existingDishImages)) {
      const entry = manifest.dishes.find(entry => entry.dishId === id)
      expect(existsSync(entry.localPath)).toBe(true)
      if (['approved', 'temporary'].includes(entry.reviewStatus) && entry.status === 'existing-local') expect(dishImages[id]).toBe(image)
      else if (['approved', 'temporary'].includes(entry.reviewStatus)) expect(dishImages[id]).toBe(catalogDishImages[id])
      else expect(dishImages[id]).toBeUndefined()
    }
    expect(queue.dishes.map(entry => entry.dishId)).toEqual(remaining.dishes.map(entry => entry.dishId))
    for (const image of Object.values(dishImages)) expect(imageDimensions[image]).toMatchObject({ width: expect.any(Number), height: expect.any(Number) })
  })

  it('renders current human choices while retaining replaced real-source pixels and attribution in history', () => {
    for (const id of ['ramen', 'harira', 'jambalaya', 'carbonara', 'biryani', 'yakitori']) expect(dishImages[id]).toBeTruthy()
    for (const id of ['bibimbap', 'suya', 'shish-taouk', 'tacos-al-pastor', 'lobster-roll', 'french-onion-soup']) {
      const entry = manifest.dishes.find(entry => entry.dishId === id)
      const credit = credits.find(entry => entry.dishId === id)
      if (entry.sourceType === 'generated') {
        expect(dishImages[id]).toBe(catalogDishImages[id])
        expect(entry).toMatchObject({ reviewStatus: 'approved', visuallyReviewed: true, needsPromptReview: false })
        const previous = entry.history.find(old => old.sourceType === 'real' && old.reviewStatus === 'needs-replacement')
        expect(previous.sourcePageUrl).toBeTruthy()
        expect(existsSync(previous.localPath)).toBe(true)
        expect(credit.sourcePageUrl).toBeNull()
        expect(credit.history.some(old => old.sourcePageUrl === previous.sourcePageUrl)).toBe(true)
      } else {
        expect(dishImages[id]).toBeUndefined()
        expect(entry).toMatchObject({ reviewStatus: 'needs-replacement', sourceType: 'real' })
        expect(credit.sourcePageUrl).toBeTruthy()
      }
    }
    for (const id of ['ramen', 'harira']) {
      expect(manifest.dishes.find(entry => entry.dishId === id)).toMatchObject({ reviewStatus: 'approved', sourceType: 'real' })
    }
    if (coverage.mappedImages === 201) {
      expect(coverage).toMatchObject({ realApprovedImages: 2, generatedApprovedImages: 199, temporaryRealImages: 0,
        remainingPlaceholders: 0, generatedFallbackQueued: 0, missingImages: 0 })
      expect(dishes.every(dish => dish.imageStatus !== 'placeholder')).toBe(true)
    }
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
