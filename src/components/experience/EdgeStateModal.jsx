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
  feedback: { title: 'Personalized for you!', image: feedback },
}

export default function EdgeStateModal({ kind, onClose, onVerify, onLogAnyway, onOtherDishes, message }) {
  const id = useId(), content = CONTENT[kind]
  return <Modal open={Boolean(kind)} onClose={onClose} labelledBy={id} overlayClassName="edge-modal-overlay" className={`edge-sheet edge-${kind}`}>
    <button type="button" className="edge-close" onClick={onClose} aria-label="Close dialog">×</button>
    {content?.image && <img className="edge-illustration" src={content.image} alt="" />}
    <h2 id={id}>{content?.title ?? 'Development preview'}</h2>
    {content?.body && <p className="edge-body">{content.body}</p>}
    {kind === 'failed' && <div className="edge-options">
      <button type="button" onClick={() => onVerify('qr-demo')}><img src={qr} alt="" /><span><strong>Scan restaurant QR</strong><small>Simulate a partnered restaurant QR</small></span></button>
      <button type="button" onClick={() => onVerify('receipt-demo')}><span><strong>Scan a receipt</strong><small>Simulate receipt verification</small></span></button>
      <button type="button" onClick={() => onVerify('unverified')}><img src={log} alt="" /><span><strong>Log without verification</strong><small>Save to history without adding progress</small></span></button>
    </div>}
    {kind === 'counted' && <div className="edge-actions"><Button onClick={onLogAnyway}>Log anyway</Button><Button variant="alt" onClick={onOtherDishes}>View other dishes from this restaurant</Button></div>}
    {kind === 'progress' && <><ul className="edge-body"><li>A dish can only earn progress once per day.</li><li>You can still log any meal anytime.</li><li>Try different dishes to explore more of the country.</li></ul><Button className="edge-confirm" onClick={onClose}>I got it</Button></>}
    {kind === 'feedback' && <><p className="edge-body">Your feedback helps us learn what you enjoy to improve future dish, cuisine, and restaurant recommendations.<br /><br />Your responses won’t affect your Mystery Box progress.</p><p className="flow-demo">Saved for future personalization. Current recommendation rules are unchanged.</p><Button className="edge-confirm" onClick={onClose}>I got it</Button></>}
    {kind === 'preview' && <><p className="edge-body">{message}</p><Button className="edge-confirm" onClick={onClose}>I got it</Button></>}
  </Modal>
}
