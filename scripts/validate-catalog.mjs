import { readFileSync } from 'node:fs'
import { validateCatalog } from '../src/data/catalog/validateCatalog.js'

const candidate = process.argv.includes('--stdin')
  ? JSON.parse(readFileSync(0, 'utf8'))
  : {
      records: JSON.parse(readFileSync(new URL('../src/data/catalog/records.json', import.meta.url), 'utf8')),
      taxonomy: JSON.parse(readFileSync(new URL('../src/data/catalog/taxonomy.json', import.meta.url), 'utf8')),
    }
const errors = validateCatalog(candidate.records, candidate.taxonomy)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Catalog valid: ${candidate.records.length} unique dishes. Review metadata does not restrict development use.`)
}
