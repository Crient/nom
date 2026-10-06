import { useCallback, useSyncExternalStore } from 'react'
export function usePlaceExtra(service, key) {
  const subscribe = useCallback(callback => service.subscribe(key, callback), [service, key])
  const snapshot = useCallback(() => service.getSnapshot(key), [service, key])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
