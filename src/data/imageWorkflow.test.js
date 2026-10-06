import { execFileSync } from 'node:child_process'
import { expect, it } from 'vitest'

it('checks image review, generation queue, provenance, protected photos and local replacement offline', () => {
  const result = execFileSync('python3', ['-B', 'scripts/test_image_workflow.py'], { encoding: 'utf8' })
  expect(result).toContain('Image workflow offline tests passed:')
})
