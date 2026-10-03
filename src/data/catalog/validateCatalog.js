// Frozen app taxonomy. Workbook values must fit these existing session IDs.
export const PREFERENCE_FLAVORS = ['spicy', 'comforting', 'fresh', 'rich', 'crispy', 'tangy']
const REGIONS = ['east-asia', 'southeast-asia', 'south-asia', 'middle-east', 'africa', 'europe', 'latin-america', 'north-america']
const FOOD_TYPES = ['noodle', 'rice', 'soup-broth', 'grilled-protein', 'handheld']
const DESCRIPTORS = ['savory', 'smoky', 'bold', 'light', 'sweet', 'umami', 'aromatic', 'herbal', 'creamy', 'nutty', 'charred', 'fermented', 'garlicky', 'buttery', 'earthy', 'chewy', 'tender', 'juicy']
const REVIEW_STATUSES = ['draft', 'needs-review', 'approved', 'rejected']

/** Return all errors so an import can be corrected without dropping any rows. */
export function validateCatalog(records, taxonomy, { expectedCount = 201 } = {}) {
  const errors = []
  const error = message => errors.push(message)
  if (!Array.isArray(records)) return ['Catalog must be an array']
  if (records.length !== expectedCount) error(`Expected ${expectedCount} dishes, received ${records.length}`)
  const schema = { regions: REGIONS, foodTypes: FOOD_TYPES, preferenceFlavors: PREFERENCE_FLAVORS,
    descriptors: DESCRIPTORS, adventureLevels: [1, 2, 3], reviewStatuses: REVIEW_STATUSES }
  for (const [key, expected] of Object.entries(schema)) {
    const values = taxonomy?.[key]
    if (!Array.isArray(values) || values.length !== expected.length ||
        new Set(values).size !== values.length || expected.some(value => !values.includes(value))) {
      error(`Unsupported taxonomy: ${key}`)
    }
  }
  const countries = taxonomy?.countryCodes
  if (!Array.isArray(countries) || countries.length === 0 ||
      countries.some(code => typeof code !== 'string' || !/^[A-Z]{2}$/.test(code)) ||
      new Set(countries).size !== countries.length) error('Malformed country-code taxonomy')
  const countryCodes = new Set(Array.isArray(countries) ? countries : [])

  const ids = new Set()
  records.forEach((dish, index) => {
    const label = `Record ${index + 1} (${dish?.id ?? 'missing id'})`
    if (!dish || typeof dish !== 'object' || Array.isArray(dish)) { error(`${label}: malformed record`); return }
    for (const key of ['id', 'name', 'countryCode', 'region', 'foodType', 'shortDescription', 'description', 'reviewStatus']) {
      if (typeof dish[key] !== 'string' || !dish[key].trim()) error(`${label}: missing ${key}`)
    }
    if (typeof dish.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dish.id)) error(`${label}: invalid dish ID`)
    if (ids.has(dish.id)) error(`${label}: duplicate dish ID`)
    ids.add(dish.id)
    for (const [field, allowed] of [['region', REGIONS], ['foodType', FOOD_TYPES], ['reviewStatus', REVIEW_STATUSES]]) {
      if (!allowed.includes(dish[field])) error(`${label}: unsupported ${field}`)
    }
    if (!countryCodes.has(dish.countryCode)) error(`${label}: unsupported countryCode`)
    if (!Number.isInteger(dish.adventureLevel) || dish.adventureLevel < 1 || dish.adventureLevel > 3) error(`${label}: invalid adventureLevel`)
    for (const [field, allowed, min, max] of [['preferenceFlavors', PREFERENCE_FLAVORS, 1, 3], ['descriptors', DESCRIPTORS, 0, 4]]) {
      const values = dish[field]
      if (!Array.isArray(values) || values.length < min || values.length > max ||
          new Set(values).size !== values.length || values.some(value => !allowed.includes(value))) error(`${label}: invalid ${field}`)
    }
    if (!Array.isArray(dish.aliases) || dish.aliases.some(alias => typeof alias !== 'string' || !alias.trim())) error(`${label}: invalid aliases`)
    if (typeof dish.notes !== 'string') error(`${label}: invalid notes`)
    if (dish.validationStatus !== 'OK') error(`${label}: source validationStatus is not OK`)
    if (!Number.isInteger(dish.sourceRow) || dish.sourceRow < 5) error(`${label}: invalid sourceRow`)
  })
  return errors
}
