import HubLayout from '../components/layout/HubLayout'
import credits from '../data/dishImageCredits.json'
import { dishes } from '../data/dishes'

export default function ImageCredits() {
  return <HubLayout title="Dish photo" accent="Credits" backTo="/profile">
    <p>Photos are mapped to canonical dish IDs. Existing supplied images are retained; their original attribution was not supplied.</p>
    {credits.map(entry => <section className="hub-section" key={entry.dishId}><h2>{dishes.find(dish => dish.id === entry.dishId)?.name}</h2>
      <p>{entry.creator ? `Photo by ${entry.creator}` : 'Existing Nom photo · creator not recorded'}</p>
      {entry.sourcePageUrl && <a className="hub-action" href={entry.sourcePageUrl} target="_blank" rel="noreferrer">Photo source</a>}
      {entry.licenseUrl ? <a className="hub-action" href={entry.licenseUrl} target="_blank" rel="noreferrer">{entry.license}</a> : <p className="flow-demo">Reuse license needs source verification before public release.</p>}
      {entry.changes && <p>{entry.changes}</p>}
    </section>)}
  </HubLayout>
}
