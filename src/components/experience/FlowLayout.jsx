import StatusBar from '../layout/StatusBar'
import Button from '../ui/Button'
import chevron from '../../assets/icons/chevron-left.svg'
import more from '../../assets/experience/more.svg'
import '../../styles/experience.css'

export function FlowHeader({ onBack, onInfo, children }) {
  return <header className="flow-header"><StatusBar />
    <button type="button" className="flow-back" aria-label="Go back" onClick={onBack}><img src={chevron} alt="" /></button>
    {children}
    {onInfo && <button type="button" className="flow-more" aria-label="More information" onClick={onInfo}><img src={more} alt="" /></button>}
  </header>
}

export function FlowTitle({ title, subtitle }) {
  return <div className="flow-title"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
}

export function FlowState({ title = 'Visit unavailable', children, onBack, onRetry, backLabel = 'Back to Home' }) {
  return <div className="flow-page"><FlowHeader onBack={onBack} />
    <div className="flow-state" role="status"><h1>{title}</h1><p>{children}</p>
      <Button onClick={onRetry ?? onBack}>{onRetry ? 'Try again' : backLabel}</Button>
    </div>
  </div>
}

export function FlowCTA({ children, ...props }) {
  return <div className="flow-cta"><Button size="none" {...props}>{children}</Button></div>
}
