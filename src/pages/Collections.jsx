import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useExperience } from '../context/Experience'
import { collectionCountries, collectibleDefinitions } from '../data/collectionDefinitions'
import { unlockedCount } from '../utils/experienceProgress'
import { FlowHeader } from '../components/experience/FlowLayout'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import FilterChip from '../components/ui/FilterChip'
import world from '../assets/experience/world.webp'
import wave from '../assets/experience/collection-wave.svg'
import NomNavigation from '../components/layout/NomNavigation'
import { recommendationReturnTo } from '../utils/navigation'

export default function Collections() {
  const navigate = useNavigate(), location = useLocation(), { state } = useExperience()
  const [filter, setFilter] = useState('All'), [modal, setModal] = useState(null)
  const countries = collectionCountries.filter(country => {
    const count = unlockedCount(state, country.id)
    if (filter === 'In progress') return count > 0 && count < collectibleDefinitions.length
    if (filter === 'Completed') return count === collectibleDefinitions.length
    if (filter === 'Favorites') return state.favorites.some(key => key.startsWith(`${country.id}:`))
    return true
  })
  return <div className="flow-page collections-page pb-[calc(100px+env(safe-area-inset-bottom,0px))]">
    <FlowHeader onBack={() => navigate(recommendationReturnTo(location.state?.returnTo, '/home'))} onInfo={() => setModal('progress')} />
    <h1>Your <span>Collections</span></h1>
    <div className="collection-filters" role="group" aria-label="Filter collections">{['All', 'In progress', 'Completed', 'Favorites'].map(option => <FilterChip solid selected={filter === option} key={option} onClick={() => setFilter(option)}>{option}</FilterChip>)}</div>
    <div className="collection-banner" aria-hidden="true">
      <img className="collection-wave" src={wave} alt="" />
      <img className="collection-world" src={world} alt="" />
    </div>
    <div className="collection-countries">{countries.map(country => {
      const count = unlockedCount(state, country.id)
      return <button type="button" className={`collection-country ${count === collectibleDefinitions.length ? 'is-complete' : ''}`} data-country={country.id} data-complete={count === collectibleDefinitions.length} key={country.id} aria-label={`${country.name}, ${count} of 6 collectibles`} onClick={() => navigate(`/collections/${country.id}`)}>
        <span className="collection-country-art"><img src={country.image} alt="" loading="lazy" style={{ objectPosition: country.cardPosition }} /></span><div className="collection-country-meta"><strong>{country.name}</strong><span>{count}/6 collectibles</span><div className="collection-dots" aria-hidden="true">{collectibleDefinitions.map((item, index) => <i key={item.id} className={index < count ? 'reached' : ''} />)}</div></div>
        {count === collectibleDefinitions.length && <span className="collection-complete-accent" aria-label="Country complete">✓</span>}
      </button>
    })}</div>
    {!countries.length && <p className="collection-empty" role="status">{filter === 'Favorites' ? 'Favorite a collectible to see its country here.' : 'No collections in this view yet.'}</p>}
    {import.meta.env.DEV && <p className="flow-demo collection-demo">Development collection previews • Local progress</p>}
    <NomNavigation fixed />
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} />
  </div>
}
