import { beforeEach } from 'vitest'

// Isolate synthetic happy-dom storage between tests, while allowing refresh
// simulations to preserve data within a test. This never touches browser data.
beforeEach(() => {
  if (typeof window !== 'undefined') window.localStorage.clear()
})
