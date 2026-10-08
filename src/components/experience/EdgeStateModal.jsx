import { useId } from 'react'
import { useAuth } from '../../context/Auth'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import error from '../../assets/experience/verification-error.svg'
import counted from '../../assets/experience/already-counted.webp'
import progress from '../../assets/experience/progress-info.webp'
import feedback from '../../assets/experience/feedback-info.webp'
import log from '../../assets/experience/log-unverified.webp'
import qr from '../../assets/experience/qr.webp'
import receipt from '../../assets/experience/feedback-info.webp'

const CONTENT = {
  failed: { title: 'We couldn’t verify your visit automatically', image: error, body: 'Other options to verify your visit' },
  counted: { title: 'This visit was already counted.', image: counted, body: 'You can still log this meal, but this dish can only earn Mystery Box progress once per day.' },
  progress: { title: 'How Mystery Box Progress Works', image: progress },
  feedback: { title: 'About your feedback', image: feedback },
  manual: { title: 'Log without verification', image: log, body: 'This meal will be saved to your history, but it won’t count toward rewards or Mystery Box progress.' },
}

export default function EdgeStateModal({ kind, onClose, onVerify, onLogAnyway, onOtherDishes, message, onManualConfirm }) {
  const id = useId(), content = CONTENT[kind]
  const auth = useAuth()
  return <Modal open={Boolean(kind)} onClose={onClose} labelledBy={id} overlayClassName="edge-modal-overlay" className={`edge-sheet edge-${kind}`}>
    <button type="button" className="edge-close" onClick={onClose} aria-label="Close dialog">×</button>
    <div className="edge-scroll" role="region" aria-labelledby={id} tabIndex={0}>
    {content?.image && <img className="edge-illustration" src={content.image} alt="" />}
    <h2 id={id}>{content?.title ?? 'About this feature'}</h2>
    {content?.body && <p className="edge-body">{content.body}</p>}
    {kind === 'progress' && <ul className="edge-body"><li>Only verified meals count toward country rewards and Mystery Boxes.</li><li>A dish can earn progress once per UTC day.</li><li>You can save unverified meals to History anytime.</li></ul>}
    {kind === 'feedback' && <><p className="edge-body">Save what you enjoyed for future food adventures.<br /><br />Your responses won’t affect your Mystery Box progress.</p><p className="flow-demo">{auth.isAuthenticated ? 'Completed meal feedback syncs with your Nom account.' : 'Your feedback is saved on this device.'} It doesn’t change your current matches.</p></>}
    {kind === 'preview' && <p className="edge-body">{message}</p>}
    </div>
    {kind === 'failed' && <div className="edge-options edge-footer">
      <button type="button" onClick={() => onVerify('qr')}><img src={qr} alt="" /><span><strong>Scan restaurant QR code</strong><small>For partnered restaurants</small></span></button>
      <button type="button" onClick={() => onVerify('receipt')}><img src={receipt} alt="" /><span><strong>Scan receipt</strong><small>Take or import a photo of your receipt</small></span></button>
      <button type="button" className="edge-log-fallback" onClick={() => onVerify('manual')}><img src={log} alt="" /><span><strong>Log without verification</strong><small>Save to history without adding progress</small></span></button>
    </div>}
    {kind === 'manual' && <div className="edge-actions edge-footer"><Button onClick={onManualConfirm}>Save without verification</Button><Button variant="alt" onClick={onClose}>Cancel</Button></div>}
    {kind === 'counted' && <div className="edge-actions edge-footer"><Button onClick={onLogAnyway}>Log anyway</Button><Button variant="alt" onClick={onOtherDishes}>View other dishes from this restaurant</Button></div>}
    {['progress', 'feedback', 'preview'].includes(kind) && <div className="edge-footer"><Button className="edge-confirm" onClick={onClose}>I got it</Button></div>}
  </Modal>
}
