import HubLayout from '../components/layout/HubLayout'
import credits from '../data/dishImageCredits.json'
import { dishes } from '../data/dishes'

export default function ImageCredits() {
  return <HubLayout title="Dish photo" accent="Credits" backTo="/profile">
    <p>Generated illustrations are identified below. Photo sources and licenses are shown where recorded.</p>
    {credits.map(entry => <section className="hub-section" key={entry.dishId}><h2>{dishes.find(dish => dish.id === entry.dishId)?.name}</h2>
      <p>{entry.sourceType === 'generated' ? 'Generated illustration · not documentary evidence' : entry.creator ? `Photo by ${entry.creator}` : 'Existing Nom photo · creator not recorded'}</p>
      {import.meta.env.DEV && <p>Image review: {entry.reviewStatus}</p>}
      {entry.sourcePageUrl && <a className="hub-action" href={entry.sourcePageUrl} target="_blank" rel="noreferrer">Photo source</a>}
      {entry.licenseUrl ? <a className="hub-action" href={entry.licenseUrl} target="_blank" rel="noreferrer">{entry.license}</a> : entry.sourceType !== 'generated' && <p className="flow-demo">Reuse license needs source verification before public release.</p>}
      {import.meta.env.DEV && entry.changes && <p>{entry.changes}</p>}
      {import.meta.env.DEV && entry.history?.filter(previous => previous.sourcePageUrl).map((previous, index) => <p key={index}>Previous source: {previous.creator} · <a href={previous.sourcePageUrl} target="_blank" rel="noreferrer">{previous.license ?? 'Source metadata'}</a></p>)}
    </section>)}
  </HubLayout>
}
