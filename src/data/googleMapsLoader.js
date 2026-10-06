let pending
export function loadGoogleMaps({ key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY, timeoutMs = 12_000 } = {}) {
  if (!key || key === 'your_browser_maps_key') return Promise.reject(new Error('MAP_NOT_CONFIGURED'))
  if (globalThis.google?.maps?.Map && globalThis.google?.maps?.marker?.AdvancedMarkerElement) return Promise.resolve(globalThis.google.maps)
  if (pending) return pending
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script'), callback = '__nomGoogleMapsReady'
    let settled = false
    const finish = (error) => {
      if (settled) return
      settled = true; clearTimeout(timer); delete globalThis[callback]
      if (error) { script.remove(); pending = undefined; reject(new Error(error)) }
      else resolve(globalThis.google.maps)
    }
    const timer = setTimeout(() => finish('MAP_UNAVAILABLE'), timeoutMs)
    globalThis[callback] = () => finish(globalThis.google?.maps?.Map && globalThis.google?.maps?.marker?.AdvancedMarkerElement ? null : 'MAP_UNAVAILABLE')
    const previousAuthFailure = globalThis.gm_authFailure
    globalThis.gm_authFailure = () => {
      finish('MAP_UNAVAILABLE')
      globalThis.dispatchEvent(new Event('nom-google-map-auth-error'))
      previousAuthFailure?.()
    }
    const url = new URL('https://maps.googleapis.com/maps/api/js')
    url.search = new URLSearchParams({ key, loading: 'async', callback, v: 'quarterly', libraries: 'marker' }).toString()
    script.src = url.href; script.async = true; script.dataset.nomGoogleMaps = 'true'
    script.onerror = () => finish('MAP_UNAVAILABLE')
    document.head.append(script)
  })
  pending = pending.catch(error => { pending = undefined; throw error })
  return pending
}
