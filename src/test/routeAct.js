import { act } from 'react'
import { vi } from 'vitest'

/** DOM route tests wait for lazy screen imports as well as React updates. */
export async function actAndLoadRoutes(callback) {
  await act(callback)
  await act(async () => { await vi.dynamicImportSettled() })
}
