import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { dishes } from '../data/dishes'
import { selectRestaurants } from '../data/restaurantProvider'
import { recommendationReturnTo } from '../utils/navigation'
import { useRecommendations } from '../hooks/useRecommendations'
import { useRestaurants } from '../hooks/useRestaurants'
import RecommendationHeader from '../components/recommendations/RecommendationHeader'
import SessionChip from '../components/recommendations/SessionChip'
import MatchBadge from '../components/recommendations/MatchBadge'
import RestaurantCard from '../components/restaurants/RestaurantCard'
import RestaurantMap from '../components/restaurants/RestaurantMap'
import Button from '../components/ui/Button'
import Image from '../components/ui/Image'
import locationIcon from '../assets/icons/restaurant-preview-location.svg'
import promo from '../assets/nearby/promo.webp'
import listIcon from '../assets/nearby/list.svg'
import mapsIcon from '../assets/nearby/maps.svg'
import '../styles/nearby.css'

function ViewIcon({ map = false }) {
  return <span aria-hidden="true" className="nearby-view-icon" style={{ maskImage: `url("${map ? mapsIcon : listIcon}")` }} />
}

export default function NearbyRestaurants() {
  const { dishId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const dish = dishes.find(item => item.id === dishId)
  const { ready, results, chips } = useRecommendations()
  const data = useRestaurants(ready ? dish?.id : undefined)
  const [view, setView] = useState(location.state?.view === 'map' ? 'map' : 'list')
  const [sort, setSort] = useState('closest')
  const [rating, setRating] = useState(0)
  const [price, setPrice] = useState(0)
  const [openOnly, setOpenOnly] = useState(false)
  const [selectedId, setSelectedId] = useState(location.state?.selectedRestaurantId ?? null)
  const restaurants = useMemo(() => selectRestaurants(data.restaurants, { sort, rating, price, openOnly }),
    [data.restaurants, sort, rating, price, openOnly])
  const selected = restaurants.find(restaurant => restaurant.id === selectedId) ?? restaurants[0]
  const returnTo = recommendationReturnTo(location.state?.returnTo)
  const back = () => navigate(dish ? `/recommendations/${dish.id}` : ready ? '/recommendations' : '/discover/food-type', { state: { returnTo } })
  const resetFilters = () => { setRating(0); setPrice(0); setOpenOnly(false) }
  const showRestaurant = id => navigate(`/recommendations/${dishId}/nearby/${id}`, { state: { returnTo, view, selectedRestaurantId: id } })

  if (!dish) return (
    <div className="nearby-page">
      <RecommendationHeader onBack={back} />
      <div className="nearby-state" role="status">
        <h1 className="text-title">Dish not found</h1>
        <p>Choose a dish to find nearby restaurants.</p>
        <Button onClick={back}>{ready ? 'Back to recommendations' : 'Back to discovery'}</Button>
      </div>
    </div>
  )
  if (!ready) return <Navigate to="/discover/food-type" replace state={{ ...location.state, discoveryReturnTo: location.pathname }} />
  const result = results.find(item => item.dish.id === dish.id)

  return (
    <div className="nearby-page">
      <RecommendationHeader onBack={back} />
      <header className="nearby-dish">
        <Image src={dish.image} alt={dish.name} width={110} height={110} className="nearby-dish-photo" />
        <div className="nearby-dish-copy">
          {result && <div className="nearby-match"><MatchBadge percent={Math.round(result.score)} variant="detail" /></div>}
          <h1>{dish.name} <span className="nearby-flag">{dish.flag}</span></h1>
          <p>{dish.shortDescription}</p>
          <div className="nearby-chips" aria-label="Your discovery preferences">
            {chips.map(chip => <SessionChip key={`${chip.kind}-${chip.value}`} chip={chip} variant="nearby" />)}
          </div>
        </div>
      </header>
      <section aria-labelledby="nearby-restaurants-title">
        <div className="nearby-heading">
          <h2 id="nearby-restaurants-title">Nearby Restaurants</h2>
          <p role="status"><img src={locationIcon} alt="" width={12} height={12} />
            {data.status === 'loading' ? 'Finding places…' : `Found ${restaurants.length} ${restaurants.length === 1 ? 'place' : 'places'} near you.`}
          </p>
        </div>
        <div className="nearby-view" role="group" aria-label="Restaurant view">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><ViewIcon /> List</button>
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}><ViewIcon map /> Maps</button>
        </div>
        <div className="nearby-filters">
          <label><span className="sr-only">Sort restaurants</span><select aria-label="Sort restaurants" value={sort} onChange={event => setSort(event.target.value)}><option value="closest">Closest</option><option value="rating">Top rated</option></select></label>
          <label><span className="sr-only">Minimum rating</span><select aria-label="Minimum rating" value={rating} onChange={event => setRating(Number(event.target.value))}><option value={0}>Rating</option><option value={4}>4+ stars</option><option value={4.5}>4.5+ stars</option></select></label>
          <label><span className="sr-only">Price level</span><select aria-label="Price level" value={price} onChange={event => setPrice(Number(event.target.value))}><option value={0}>Price</option>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{'$'.repeat(value)}</option>)}</select></label>
          <button type="button" aria-pressed={openOnly} onClick={() => setOpenOnly(value => !value)}>Open Now</button>
        </div>
        {data.status === 'loading' ? <p className="nearby-state" role="status">Loading restaurants…</p>
          : data.status === 'error' ? <div className="nearby-state" role="alert"><p>We couldn’t load restaurants. Please try again.</p><Button onClick={data.retry}>Try again</Button></div>
          : !restaurants.length ? <div className="nearby-state" role="status">
            <h3 className="text-heading">No restaurants found</h3>
            <p>{data.restaurants.length ? 'Try changing your filters.' : data.source === 'mock'
              ? `No development results for ${dish.name} yet.` : `No places serving ${dish.name} found nearby.`}</p>
            {data.restaurants.length > 0 ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : <Button variant="secondary" onClick={back}>Back to dish</Button>}
          </div> : view === 'list' ? <div className="nearby-results">
            {restaurants.map(restaurant => <RestaurantCard key={restaurant.id} restaurant={restaurant} dish={dish}
              selected={restaurant.id === selected.id} onSelect={() => showRestaurant(restaurant.id)} actionLabel={`View ${restaurant.name} details`} />)}
          </div> : <div className="nearby-map-results">
            <RestaurantMap restaurants={restaurants} selectedId={selected.id} onSelect={setSelectedId} />
            <RestaurantCard key={selected.id} restaurant={selected} dish={dish} onSelect={() => showRestaurant(selected.id)} actionLabel={`View ${selected.name} details`} />
          </div>}
      </section>
      <div className="nearby-promo">
        <Image src={promo} alt="" width={90} height={59} />
        <div><h3>Can’t find a good place?</h3><p>{view === 'list' ? 'Explore more on the map to see more options' : 'Change some preferences…'}</p></div>
        <Button size="none" onClick={() => view === 'list' ? setView('map') : navigate('/discover/food-type')}>
          {view === 'list' ? <><ViewIcon map /> Open Map</> : 'Adjust'}
        </Button>
      </div>
      {(data.notice || data.status !== 'ready') && <p className="nearby-notice">{data.notice ?? 'Development preview. Restaurant data and the map are examples.'}</p>}
    </div>
  )
}
