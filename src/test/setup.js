import { beforeEach, vi } from 'vitest'

// Isolate synthetic happy-dom storage between tests, while allowing refresh
// simulations to preserve data within a test. This never touches browser data.
beforeEach(() => {
  // Tests opt into synthetic Maps configuration; never inherit local credentials.
  vi.stubEnv('VITE_GOOGLE_MAPS_BROWSER_KEY', '')
  vi.stubEnv('VITE_GOOGLE_MAPS_MAP_ID', '')
  if (typeof window !== 'undefined') window.localStorage.clear()
})
