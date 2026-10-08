import { useState } from 'react'
import FriendPicker from './FriendPicker'
export default function SendToFriend({ content, children = 'Send to a friend', className = 'hub-action' }) {
  const [open, setOpen] = useState(false)
  return <><button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>{open && <FriendPicker content={content} onClose={() => setOpen(false)} />}</>
}
