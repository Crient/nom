import { Link, useLocation, useSearchParams } from 'react-router-dom'
import HubLayout, { HubEmpty } from '../components/layout/HubLayout'
import FilterChip from '../components/ui/FilterChip'
import ActivityCard from '../components/experience/ActivityCard'
import { useActivity } from '../context/Activity'
import { useExperience } from '../context/Experience'
import { activityEntries } from '../utils/explorationSummary'

export default function History() {
  const [params, setParams] = useSearchParams(), { recentDishes } = useActivity(), { state } = useExperience(), location = useLocation()
  const view = ['meals', 'views'].includes(params.get('view')) ? params.get('view') : 'all'
  const entries = activityEntries(state.logs, recentDishes).filter(entry => view === 'all' || entry.kind === (view === 'meals' ? 'meal' : 'view'))
  return <HubLayout title="Your" accent="History">
    <div className="hub-filters" role="group" aria-label="History type">{[['all', 'All'], ['views', 'Dishes explored'], ['meals', 'Meals logged']].map(([id, label]) => <FilterChip key={id} solid selected={view === id} onClick={() => setParams(id === 'all' ? {} : { view: id }, { replace: true, state: location.state })}>{label}</FilterChip>)}</div>
    {!entries.length ? <HubEmpty action={<Link className="hub-action" to="/explore">Explore dishes</Link>}>No {view === 'meals' ? 'meals logged' : 'dish activity'} yet. Your own activity will appear here.</HubEmpty> : <div className="hub-activity">{entries.map(entry => <ActivityCard key={entry.id} entry={entry} returnTo={`/history${view === 'all' ? '' : `?view=${view}`}`} />)}</div>}
  </HubLayout>
}
