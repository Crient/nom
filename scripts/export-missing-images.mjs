import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'))
const records = read('src/data/catalog/records.json')
const images = read('catalog/images/manifest.json')
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const entries = new Map(images.dishes.map(entry => [entry.dishId, entry]))
if (entries.size !== records.length || records.some(dish => !entries.has(dish.id))) throw new Error('Image manifest must cover every canonical dish')

// Search/description links are reference metadata only. They are never placed
// in the runtime image map or treated as an approved photo/license.
const missing = records.filter(dish => !['existing-local', 'licensed-local'].includes(entries.get(dish.id).status)).map(dish => {
  const source = entries.get(dish.id)
  const country = countryNames.of(dish.countryCode)
  const searchQuery = `${dish.name} ${country} food`
  return {
    dishId: dish.id, dishName: dish.name, country, countryCode: dish.countryCode,
    expectedImageFilename: `${dish.id}.webp`,
    expectedRuntimePath: `src/assets/food/catalog/${dish.id}.webp`,
    searchQuery, alternateNames: dish.aliases,
    recommendedSources: ['Wikimedia Commons', 'Openverse'],
    sourceSearchUrls: {
      commons: `https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search=${encodeURIComponent(searchQuery)}`,
      openverse: `https://openverse.org/search/image?q=${encodeURIComponent(searchQuery)}`,
    },
    reason: source.reason ?? 'Local photo still needs successful import',
    visualReviewNote: source.reviewNote ?? 'Confirm exact dish identity, then record creator and reusable license before approval.',
    ...(source.candidate ? { unapprovedCandidate: source.candidate } : {}),
  }
})
writeFileSync(new URL('catalog/images/remaining-image-manifest.json', root), `${JSON.stringify({ version: 1, totalDishes: records.length, realImages: records.length - missing.length, remaining: missing.length, dishes: missing }, null, 2)}\n`)
console.log(`External-fill manifest: ${missing.length} dishes with canonical IDs, countries, filenames, and source queries.`)
