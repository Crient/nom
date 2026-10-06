import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { dishes } from '../data/dishes'
import { selectRestaurants } from '../data/restaurantProvider'
import { recommendationReturnTo } from '../utils/navigation'
import DishTitle from '../components/ui/DishTitle'
import '../styles/recommendations.css'
import { useRecommendations } from '../hooks/useRecommendations'
import { useRestaurants } from '../hooks/useRestaurants'
import RecommendationHeader from '../components/recommendations/RecommendationHeader'
import SessionChip from '../components/recommendations/SessionChip'
import MatchBadge from '../components/recommendations/MatchBadge'
import RestaurantCard from '../components/restaurants/RestaurantCard'
import RestaurantSkeletons from '../components/restaurants/RestaurantSkeletons'
import RestaurantMap from '../components/restaurants/RestaurantMap'
import Button from '../components/ui/Button'
import Image from '../components/ui/Image'
import locationIcon from '../assets/icons/restaurant-preview-location.svg'
import promo from '../assets/nearby/promo.webp'
import listIcon from '../assets/nearby/list.svg'
import mapsIcon from '../assets/nearby/maps.svg'
import '../styles/nearby.css'
import GooglePlacesAttribution from '../components/restaurants/GooglePlacesAttribution'
import { nearbyErrorMessage } from '../data/nearbyRestaurantService'
import { selectRestaurantDetails } from '../data/placeExtrasService'
import LiveRestaurantMap from '../components/restaurants/LiveRestaurantMap'

function ViewIcon({ map = false }) {
  return <span aria-hidden="true" className="nearby-view-icon" style={{ maskImage: `url("${map ? mapsIcon : listIcon}")` }} />
}

export default function NearbyRestaurants() {
  const { dishId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const dish = dishes.find(item => item.id === dishId)
  const { ready, results, chips } = useRecommendations()
  const data = useRestaurants(ready ? dish?.id : undefined, { autoLoad: true })
  const [view, setView] = useState(location.state?.view === 'map' ? 'map' : 'list')
  const [mapActivated, setMapActivated] = useState(location.state?.view === 'map')
  const [sort, setSort] = useState('closest')
  const [rating, setRating] = useState(0)
  const [price, setPrice] = useState(0)
  const [openOnly, setOpenOnly] = useState(false)
  const [selectedId, setSelectedId] = useState(location.state?.selectedRestaurantId ?? null)
  const restaurants = useMemo(() => selectRestaurants(data.restaurants, { sort, rating, price, openOnly }),
    [data.restaurants, sort, rating, price, openOnly])
  useEffect(() => {
    if (import.meta.env.DEV && data.searchDebug && data.status === 'ready') {
      console.debug('[Nom nearby rendered]', { dishId, view, filters: { sort, rating, price, openOnly },
        receivedIds: data.restaurants.map(place => place.id), renderedIds: restaurants.map(place => place.id),
        excluded: data.restaurants.filter(place => !restaurants.some(visible => visible.id === place.id)).map(place => ({ id: place.id,
          reason: rating && !(typeof place.rating === 'number' && place.rating >= rating) ? 'rating-filter'
            : price && place.priceLevel !== price ? 'price-filter' : openOnly ? 'open-now-filter' : 'dedupe' })) })
    }
  }, [dishId, view, sort, rating, price, openOnly, data.searchDebug, data.status, data.restaurants, restaurants])
  const selected = restaurants.find(restaurant => restaurant.id === selectedId) ?? restaurants[0]
  const mockMode = data.source === 'mock'
  const returnTo = recommendationReturnTo(location.state?.returnTo)
  const back = () => navigate(dish ? `/recommendations/${dish.id}` : ready ? '/recommendations' : '/discover/food-type', { state: { returnTo } })
  const resetFilters = () => { setRating(0); setPrice(0); setOpenOnly(false) }
  const showRestaurant = id => {
    selectRestaurantDetails(data.restaurants.find(place => place.id === id))
    navigate(`/recommendations/${dishId}/nearby/${encodeURIComponent(id)}`, { state: { returnTo, view, selectedRestaurantId: id } })
  }
  const selectMap = () => { setView('map'); setMapActivated(true) }

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
          {result && <div className="nearby-match"><MatchBadge percent={Math.round(result.displayMatchPercent ?? result.score)} variant="detail" /></div>}
          <h1><DishTitle dish={dish} /></h1>
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
            {data.busy ? 'Finding restaurants near you…' : data.status === 'idle' ? 'Search when you’re ready.'
              : data.status === 'error' ? 'Nearby search unavailable.' : data.metadataOnly ? 'Saved search ready to refresh.' : `Found ${restaurants.length} ${restaurants.length === 1 ? 'place' : 'places'} near you.`}
          </p>
        </div>
        <div className="nearby-view" role="group" aria-label="Restaurant view">
          <button type="button" aria-pressed={view === 'list'} disabled={data.metadataOnly} onClick={() => setView('list')}><ViewIcon /> List</button>
          <button type="button" aria-pressed={view === 'map'} disabled={data.metadataOnly} onClick={selectMap}><ViewIcon map /> {mockMode ? 'Maps' : 'Map'}</button>
        </div>
        {data.status === 'ready' && !data.metadataOnly && <div className="nearby-filters" data-live={!mockMode}>
          <label><span className="sr-only">Sort restaurants</span><select aria-label="Sort restaurants" value={sort} onChange={event => setSort(event.target.value)}><option value="closest">Closest</option><option value="rating">Highest Rated</option><option value="rating-ascending">Lowest Rated</option></select></label>
          <label><span className="sr-only">Minimum rating</span><select aria-label="Minimum rating" value={rating} onChange={event => setRating(Number(event.target.value))}><option value={0}>Any rating</option><option value={4}>4+ stars</option><option value={4.5}>4.5+ stars</option></select></label>
          {mockMode && <label><span className="sr-only">Price level</span><select aria-label="Price level" value={price} onChange={event => setPrice(Number(event.target.value))}><option value={0}>Price</option>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{'$'.repeat(value)}</option>)}</select></label>}
          <button type="button" aria-pressed={openOnly} onClick={() => setOpenOnly(value => !value)}>Open Now</button>
        </div>}
        {data.busy ? <RestaurantSkeletons />
          : data.status === 'idle' ? <div className="nearby-state"><p>Find restaurants relevant to {dish.name} near you.</p><Button onClick={() => data.search()}>Find nearby restaurants</Button></div>
          : data.status === 'error' ? <div className="nearby-state" role="alert"><p>{nearbyErrorMessage(data.errorCode)}</p><Button onClick={data.retry}>Try again</Button></div>
          : data.metadataOnly ? <div className="nearby-state" role="status"><h3 className="text-heading">Your saved search is ready</h3><p>Refresh to see current restaurant names, ratings, hours, and available photos.</p></div>
          : !restaurants.length ? <div className="nearby-state" role="status">
            <h3 className="text-heading">No restaurants found</h3>
            <p>{data.restaurants.length ? 'Try changing your filters.' : data.source === 'mock'
              ? `No sample results for ${dish.name} yet.` : 'No nearby matches found.'}</p>
            {data.restaurants.length > 0 ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : <Button variant="secondary" onClick={back}>Back to dish</Button>}
          </div> : !mockMode ? <>
            <div className="nearby-results" hidden={view !== 'list'}>
              {restaurants.map((restaurant, index) => <RestaurantCard key={restaurant.id} restaurant={restaurant} dish={dish} number={index + 1}
                selected={restaurant.id === selected.id} onSelect={() => showRestaurant(restaurant.id)} actionLabel={`View ${restaurant.name} details`} />)}
            </div>
            {mapActivated && <div className="nearby-live-map-results" hidden={view !== 'map'}>
              <LiveRestaurantMap restaurants={restaurants} selectedId={selected.id} onSelect={setSelectedId}
                active={view === 'map'} sessionKey={`${dishId}:${data.searchedAt}`} />
              {view === 'map' && selected && <RestaurantCard restaurant={selected} dish={dish} eagerPhoto number={restaurants.indexOf(selected) + 1}
                onSelect={() => showRestaurant(selected.id)} actionLabel={`View ${selected.name} details`} />}
            </div>}
          </> : view === 'list' ? <div className="nearby-results">
            {restaurants.map((restaurant, index) => <RestaurantCard key={restaurant.id} restaurant={restaurant} dish={dish} number={index + 1}
              selected={restaurant.id === selected.id} onSelect={() => showRestaurant(restaurant.id)} actionLabel={`View ${restaurant.name} details`} />)}
          </div> : <div className="nearby-map-results">
            <RestaurantMap restaurants={restaurants} selectedId={selected.id} onSelect={setSelectedId} />
            <RestaurantCard key={selected.id} restaurant={selected} dish={dish} number={restaurants.indexOf(selected) + 1} onSelect={() => showRestaurant(selected.id)} actionLabel={`View ${selected.name} details`} />
          </div>}
      </section>
      {data.status === 'ready' && !mockMode && <div className="nearby-search-actions">
        {data.partialError && <p role="status">Some results are available. Additional nearby matches are temporarily unavailable.</p>}
        {data.locationNotice && <p role="status">{data.locationNotice}</p>}
        <Button variant="secondary" disabled={data.busy} onClick={() => data.search({ refresh: true })}>Refresh nearby search</Button>
        <p>Dish availability isn't confirmed. Distances are approximate.</p>
        {!data.metadataOnly && data.restaurants.length > 0 && <GooglePlacesAttribution restaurants={data.restaurants} />}
      </div>}
      {mockMode && <div className="nearby-promo">
        <Image src={promo} alt="" width={90} height={59} />
        <div><h3>Can’t find a good place?</h3><p>{view === 'list' ? 'Explore more on the map to see more options' : 'Change some preferences…'}</p></div>
        <Button size="none" onClick={() => view === 'list' ? setView('map') : navigate('/discover/food-type')}>
          {view === 'list' ? <><ViewIcon map /> Open Map</> : 'Adjust'}
        </Button>
      </div>}
      {mockMode && data.notice && <p className="nearby-notice">{data.notice}</p>}
      <p className="nearby-notice"><Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link></p>
    </div>
  )
}
