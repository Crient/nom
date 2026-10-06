import { readLocalState, writeLocalState } from './localPersistence'

// The snapshot is a projection. Separate records in the same account outbox
// prevent concurrent snapshot writes from replacing another tab's mutations.
// Receipts survive until account deletion so stale snapshots cannot resurrect
// operations that another tab already acknowledged.
export function createAccountOutbox(cacheKey, validOperation, legacy) {
  const prefix = `${cacheKey}.outbox.`, encodeId = id => encodeURIComponent(id).replace(/\./g, '%2E')
  const operationKey = id => `${prefix}operation.${encodeId(id)}`, receiptKey = id => `${prefix}ack.${encodeId(id)}`
  const unsaved = new Map()
  let clock = 0, lastRead = []
  function acknowledged(id) { return globalThis.localStorage?.getItem(receiptKey(id)) === '1' }
  function save(operation) {
    try {
      if (acknowledged(operation.id)) { unsaved.delete(operation.id); return true }
      if (!writeLocalState(operationKey(operation.id), operation)) return false
      unsaved.delete(operation.id)
      return true
    } catch { return false }
  }
  try {
    if (globalThis.localStorage?.getItem(`${prefix}version`) !== '1') {
      let saved = true
      for (const [index, original] of legacy.entries()) {
        const operation = { ...original, clock: original.clock ?? index + 1 }
        unsaved.set(operation.id, operation)
        if (!save(operation)) saved = false
      }
      if (saved) globalThis.localStorage?.setItem(`${prefix}version`, '1')
    }
  } catch { for (const operation of legacy) unsaved.set(operation.id, operation) }
  function read() {
    const pending = new Map()
    try {
      const storage = globalThis.localStorage
      if (!storage) throw new Error('Storage unavailable')
      const keys = Array.from({ length: storage?.length ?? 0 }, (_, i) => storage.key(i))
      for (const key of keys) {
        if (!key?.startsWith(`${prefix}operation.`) || key.includes('.recovery.')) continue
        const operation = readLocalState(key, value => {
          if (!validOperation(value) || key !== operationKey(value.id)) throw new Error('Invalid outbox record')
          return value
        }, () => null)
        if (operation && !acknowledged(operation.id)) pending.set(operation.id, operation)
      }
      for (const [id, operation] of unsaved) if (!acknowledged(id)) pending.set(id, operation)
    } catch {
      for (const operation of lastRead) pending.set(operation.id, operation)
      for (const [id, operation] of unsaved) pending.set(id, operation)
    }
    const operations = [...pending.values()].sort((a, b) => (a.clock ?? 0) - (b.clock ?? 0) || a.id.localeCompare(b.id))
    clock = operations.reduce((latest, item) => Math.max(latest, item.clock ?? 0), clock)
    lastRead = operations
    return operations
  }
  return {
    prefix, read,
    append(mutation, id, timestamp) {
      read()
      const operation = { ...mutation, id, clock: clock = Math.max(clock + 1, timestamp) }
      unsaved.set(id, operation)
      save(operation)
    },
    flush() { return [...unsaved.values()].map(save).every(Boolean) },
    acknowledge(id) {
      try {
        const storage = globalThis.localStorage
        if (!storage) return false
        storage.setItem(receiptKey(id), '1')
        unsaved.delete(id)
        storage.removeItem(operationKey(id))
        return true
      } catch { return false }
    },
  }
}

const flights = new Map()
export function withAccountSyncLock(key, run) {
  // Web Locks serialize drains between browser tabs. The promise chain also
  // serializes stores in runtimes without Web Locks (including tests/SSR).
  const previous = flights.get(key) ?? Promise.resolve()
  const flight = previous.catch(() => {}).then(() => globalThis.navigator?.locks?.request
    ? globalThis.navigator.locks.request(key, run) : run())
  flights.set(key, flight)
  return flight.finally(() => { if (flights.get(key) === flight) flights.delete(key) })
}
