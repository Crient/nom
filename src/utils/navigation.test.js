import { describe, it, expect } from 'vitest'
import { discoveryDestination } from './navigation'

describe('discovery returns to the selected dish/restaurant', () => {
  it.each(['/recommendations/lort-cha', '/recommendations/lort-cha/nearby', '/recommendations/lort-cha/nearby/preview-thmor-da',
    '/recommendations/lort-cha/nearby/google:ChIJ_valid-Place', '/recommendations/lort-cha/nearby/google%3AChIJ_valid-Place'])('preserves %s', path => {
    expect(discoveryDestination(path)).toBe(path)
  })
  it.each([null, 'https://evil.example/recommendations/lort-cha', '//evil.example/recommendations/lort-cha',
    '/recommendations/not-a-dish/nearby/google:trusted-place', '/recommendations/lort-cha/nearby/google%3A../../home',
    '/recommendations/lort-cha/nearby/%', '/recommendations/lort-cha/nearby/google%3Aplace%2Fother', '/home'])('rejects an invalid or external destination %#', path => {
    expect(discoveryDestination(path)).toBe('/recommendations')
  })
})
