const totals = { textSearchCalls: 0, photoMediaCalls: 0, placeDetailsCalls: 0, mapLoads: 0 }
export function recordNearbyUsage(surface, count = 1) {
  if (!Object.hasOwn(totals, surface) || !Number.isInteger(count) || count < 0) return
  totals[surface] += count
  if (import.meta.env.DEV) console.debug('[Nom nearby usage]', { surface, calls: count, session: { ...totals } })
}
export const nearbyUsageSnapshot = () => ({ ...totals })
export function recordPlaceMediaDiagnostic(info) {
  if (import.meta.env.DEV) console.debug('[Nom place media]', info)
}
