import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FlowHeader } from '../experience/FlowLayout'
import NomNavigation from './NomNavigation'
import '../../styles/hubs.css'
import { recommendationReturnTo } from '../../utils/navigation'

/** App destinations borrow Collections' title, cards, spacing, and Home tabs. */
export default function HubLayout({ title, accent, children, backTo = '/home' }) {
  const navigate = useNavigate(), location = useLocation()
  const origin = recommendationReturnTo(location.state?.returnTo, backTo)
  return <div className="flow-page hub-page"><FlowHeader onBack={() => navigate(origin === location.pathname ? backTo : origin)} />
    <header className="hub-title"><h1>{title}{accent && <> <span>{accent}</span></>}</h1></header>
    <div className="hub-content">{children}</div><NomNavigation fixed />
  </div>
}

export function HubEmpty({ children, action }) {
  return <div className="hub-empty" role="status"><p>{children}</p>{action}</div>
}

export function SummaryGrid({ items }) {
  const location = useLocation()
  return <dl className="hub-summary">{items.map(([label, count, to]) => <div key={label}>
    <dt>{to ? <Link className="hub-summary-link" to={to} state={{ returnTo: location.pathname }}>{label}</Link> : label}</dt><dd>{count}</dd>
  </div>)}</dl>
}
