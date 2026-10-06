import { useAccountSync } from '../../context/LocalData'

const labels = { guest: 'Saved on this device', syncing: 'Syncing…', synced: 'Synced', offline: 'Offline — saved locally', issue: 'Sync issue' }
export default function SyncStatus() {
  const sync = useAccountSync()
  return <div className="account-sync"><p role="status">{labels[sync.syncStatus] ?? 'Sync issue'}</p>
    {sync.syncError && <p>{sync.syncError}</p>}
    {sync.syncStatus !== 'guest' && <button type="button" className="account-text-button" disabled={sync.syncStatus === 'syncing'} onClick={sync.retry}>{sync.syncStatus === 'issue' || sync.syncStatus === 'offline' ? 'Retry sync' : 'Refresh account data'}</button>}
  </div>
}
