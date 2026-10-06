import { useId } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import error from '../../assets/experience/verification-error.svg'
import counted from '../../assets/experience/already-counted.webp'
import progress from '../../assets/experience/progress-info.webp'
import feedback from '../../assets/experience/feedback-info.webp'
import qr from '../../assets/experience/qr.webp'
import log from '../../assets/experience/log-unverified.webp'

const CONTENT = {
  failed: { title: 'We couldn’t verify your visit automatically.', image: error, body: 'Choose another way to verify your visit.' },
  counted: { title: 'This visit was already counted.', image: counted, body: 'You can still log this meal, but this dish can only earn Mystery Box progress once per day.' },
  progress: { title: 'How Mystery Box Progress Works', image: progress },
  feedback: { title: 'About your feedback', image: feedback },
}

export default function EdgeStateModal({ kind, onClose, onVerify, onLogAnyway, onOtherDishes, message }) {
  const id = useId(), content = CONTENT[kind]
  return <Modal open={Boolean(kind)} onClose={onClose} labelledBy={id} overlayClassName="edge-modal-overlay" className={`edge-sheet edge-${kind}`}>
    <button type="button" className="edge-close" onClick={onClose} aria-label="Close dialog">×</button>
    <div className="edge-scroll" role="region" aria-labelledby={id} tabIndex={0}>
    {content?.image && <img className="edge-illustration" src={content.image} alt="" />}
    <h2 id={id}>{content?.title ?? 'About this feature'}</h2>
    {content?.body && <p className="edge-body">{content.body}</p>}
    {kind === 'progress' && <ul className="edge-body"><li>A dish can only earn progress once per day.</li><li>You can still log any meal anytime.</li><li>Try different dishes to explore more of the country.</li></ul>}
    {kind === 'feedback' && <><p className="edge-body">Save what you enjoyed for future food adventures.<br /><br />Your responses won’t affect your Mystery Box progress.</p><p className="flow-demo">Your feedback is saved on this device. It doesn’t change your current matches.</p></>}
    {kind === 'preview' && <p className="edge-body">{message}</p>}
    </div>
    {kind === 'failed' && <div className="edge-options edge-footer">
      <button type="button" onClick={() => onVerify('qr-demo')}><img src={qr} alt="" /><span><strong>Scan restaurant QR</strong><small>Simulate a partnered restaurant QR</small></span></button>
      <button type="button" onClick={() => onVerify('receipt-demo')}><span><strong>Scan a receipt</strong><small>Simulate receipt verification</small></span></button>
      <button type="button" onClick={() => onVerify('unverified')}><img src={log} alt="" /><span><strong>Log without verification</strong><small>Save to history without adding progress</small></span></button>
    </div>}
    {kind === 'counted' && <div className="edge-actions edge-footer"><Button onClick={onLogAnyway}>Log anyway</Button><Button variant="alt" onClick={onOtherDishes}>View other dishes from this restaurant</Button></div>}
    {['progress', 'feedback', 'preview'].includes(kind) && <div className="edge-footer"><Button className="edge-confirm" onClick={onClose}>I got it</Button></div>}
  </Modal>
}
