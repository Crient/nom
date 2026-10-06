import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useAccountSync } from '../../context/LocalData'

export default function GuestMigration() {
  const sync = useAccountSync(), location = useLocation()
  const [busy, setBusy] = useState(false), [error, setError] = useState(null)
  // Finish auth links before presenting consent. QA tools are isolated previews.
  const hidden = location.pathname.startsWith('/auth/') || location.pathname === '/account/reset-password' || location.pathname.startsWith('/dev/')
  async function merge() {
    setBusy(true); setError(null)
    try { if (!await sync.mergeGuest()) setError('Your Guest journey is still safe on this device. Reconnect and retry the merge.') }
    catch { setError('The merge could not finish. Your Guest journey is still safe on this device.') }
    finally { setBusy(false) }
  }
  return <Modal open={sync.migrationPending && !hidden} labelledBy="guest-merge-title" onClose={() => {}} className="account-modal">
    <h2 id="guest-merge-title">Bring your Nom journey with you?</h2>
    <p>Merge this device’s Guest favorites, meals, recent views, and rewards into your account. Your Guest journey stays on this device.</p>
    <p>Discovery answers and unfinished visits stay local. Existing account names take priority.</p>
    {(error || sync.syncError) && <p role="alert">{error || sync.syncError}</p>}
    <Button disabled={busy || sync.syncStatus === 'syncing'} onClick={merge}>{busy ? 'Merging…' : sync.migrationInProgress ? 'Retry Merge & Sync' : 'Merge & Sync'}</Button>
    <Button variant="secondary" disabled={busy || sync.migrationInProgress} onClick={sync.useAccountOnly}>Use account data only</Button>
    {sync.migrationInProgress && <p role="status">Approved changes are queued for this account. Retry will continue the same merge.</p>}
  </Modal>
}
