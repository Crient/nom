import { useState } from 'react'
import { Link } from 'react-router-dom'
import HubLayout, { SummaryGrid } from '../components/layout/HubLayout'
import CountryProgressCard from '../components/ui/CountryProgressCard'
import Button from '../components/ui/Button'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import { useExperience } from '../context/Experience'
import { useActivity } from '../context/Activity'
import { collectionCountries, collectibleDefinitions } from '../data/collectionDefinitions'
import { explorationSummary } from '../utils/explorationSummary'
import { countryProgressPresentation, pendingBox } from '../utils/experienceProgress'

export default function Progress() {
  const { state } = useExperience(), { recentDishes } = useActivity()
  const summary = explorationSummary(state, recentDishes), [info, setInfo] = useState(false)
  return <HubLayout title="Your" accent="Progress">
    <p>Every dish is another place to explore.</p>
    <SummaryGrid items={[["Dishes explored", summary.dishesExplored], ['Meals logged', summary.meals], ['Countries explored', summary.countriesExplored], ['Collectibles', `${summary.collectibles}/${collectionCountries.length * collectibleDefinitions.length}`]]} />
    <div className="hub-links"><Link to="/history?view=meals" state={{ returnTo: '/progress' }}>View meal history</Link><Link to="/collections" state={{ returnTo: '/progress' }}>View Collections</Link></div>
    <section className="hub-section"><h2>Your next Mystery Box</h2><p>Log three eligible experiences for a country to earn a box. A dish earns progress once per day.</p><Button variant="secondary" onClick={() => setInfo(true)}>How progress works</Button></section>
    <section className="hub-section"><h2>Country progress</h2><div className="hub-country-list">{collectionCountries.map(country => {
      const box = pendingBox(state, country.id)
      return <div key={country.id}><Link to={`/collections/${country.id}`} state={{ returnTo: '/progress' }} aria-label={`View ${country.name} collection`}><CountryProgressCard {...countryProgressPresentation(state, country)} /></Link>
        {box && <Link className="hub-action" to={`/boxes/${box.id}`} state={{ returnTo: '/progress' }}>Open {country.name} Mystery Box</Link>}
      </div>
    })}</div></section>
    <p className="flow-demo">Country progress includes starter collectibles. Activity totals count your dish views and meal logs.</p>
    <EdgeStateModal kind={info ? 'progress' : null} onClose={() => setInfo(false)} />
  </HubLayout>
}
