import { execFileSync } from 'node:child_process'
import { expect, it } from 'vitest'

it('validates the external fetcher against offline identity, attribution, retries, dry-run and resume fixtures', () => {
  const result = execFileSync('python3', ['-B', 'scripts/test_fetch_dish_images.py'], { encoding: 'utf8' })
  expect(result).toContain('Image fetcher offline tests passed:')
})
