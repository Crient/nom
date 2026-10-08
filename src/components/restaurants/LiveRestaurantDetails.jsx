import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFavorites } from '../../context/Favorites'
import { useExperience } from '../../context/Experience'
import { useRestaurants } from '../../hooks/useRestaurants'
import { surpriseQuery } from '../../utils/surpriseStrategy'
import { usePlaceExtra } from '../../hooks/usePlaceExtra'
import { placeDetailsService } from '../../data/placeExtrasService'
import { dishes } from '../../data/dishes'
import { restaurantPriceLabel } from '../../data/restaurantActions'
import { restaurantFavoriteActions } from '../../data/restaurantProvider'
import { CUISINE_LABELS, openingLabel, nearbyDistanceBand } from '../../../shared/nearbyRestaurants.js'
import { FlowHeader, FlowState } from '../experience/FlowLayout'
import HeartButton from '../recommendations/HeartButton'
import DishTag from '../recommendations/DishTag'
import DishTitle from '../ui/DishTitle'
import Image from '../ui/Image'
import Button from '../ui/Button'
import GooglePlacesAttribution from './GooglePlacesAttribution'
import PlacePhoto from './PlacePhoto'
import PlaceReviews from './PlaceReviews'
import RestaurantActions from './RestaurantActions'
import RestaurantLocationPreview from './RestaurantLocationPreview'
import AteHereSwipe from './AteHereSwipe'
import DishAvailabilityNotice from './DishAvailabilityNotice'
import { restaurantMatchLabel } from './RestaurantFacts'
import star from '../../assets/icons/restaurant-preview-star.svg'
import { sharedContextQuery } from '../../data/sharedContent'
import '../../styles/nearby.css'
import '../../styles/restaurant-live.css'

export default function LiveRestaurantDetails({ restaurant, dish, back, returnState }) {
  const navigate = useNavigate(), nearby = useRestaurants(dish.id, { revalidateLocation: true }), { startVisit } = useExperience()
  const favorites = useFavorites()
  const details = usePlaceExtra(placeDetailsService, restaurant.placeId), [info, setInfo] = useState(false)
  useEffect(() => { if (returnState?.shared && restaurant.metadataOnly) placeDetailsService.load(restaurant.placeId) }, [returnState?.shared, restaurant.metadataOnly, restaurant.placeId])
  const currentMatch = nearby.restaurants.find(place => place.id === restaurant.id)
  const currentRestaurant = nearby.status === 'ready' && nearby.source === 'google-places'
    ? currentMatch ?? { ...restaurant, approximateDistanceMiles: null } : restaurant
  const venue = details.status === 'ready' ? { ...currentRestaurant, ...details.data.details } : currentRestaurant
  const favorite = restaurantFavoriteActions(venue, favorites)
  const price = restaurantPriceLabel(venue.priceLevel), hours = openingLabel(venue), distance = venue.approximateDistanceMiles
  const cuisine = CUISINE_LABELS[dish.countryCode]
  const ideas = [dish, ...dishes.filter(item => item.countryCode === dish.countryCode && item.id !== dish.id)].slice(0, 3)
  const chips = [...new Set([dish.name, venue.cuisine, venue.primaryTypeDisplayName].filter(Boolean))]
  const contextQuery = returnState?.shared ? sharedContextQuery : returnState?.surprise ? surpriseQuery : ''
  if (returnState?.shared && restaurant.metadataOnly && details.status === 'error') return <FlowState title="Shared restaurant unavailable" onBack={back} backLabel="Back to nearby restaurants" onRetry={() => placeDetailsService.load(restaurant.placeId, { retry: true })}>We couldn’t load this restaurant’s current details. It may be unavailable; try again later.</FlowState>
  return <div className="flow-page restaurant-details-page restaurant-live-page">
    <FlowHeader onBack={back} onInfo={() => setInfo(value => !value)}>
      <HeartButton dishName={venue.name} liked={favorite.liked}
        onToggle={favorite.toggle} size={27.75} className="flow-header-favorite right-[49px]" />
    </FlowHeader>
    {info && <p className="restaurant-details-disclosure" role="status">Restaurant information comes from Google Maps. Search matches suggest places to try; menu availability is not confirmed. Distances are approximate.</p>}
    <PlacePhoto restaurant={venue} eager hero />
    <div className="restaurant-details-copy restaurant-live-copy">
      <h1>{venue.name}</h1>
      <p className="restaurant-details-meta">
        {Number.isFinite(distance) && <span>~{distance.toFixed(1)} mi · </span>}
        {venue.primaryTypeDisplayName ?? venue.cuisine ?? 'Restaurant'}{price && <span> · {price}</span>}
      </p>
      {distance > 50 && <p className="restaurant-distance-band">{nearbyDistanceBand(distance)}</p>}
      <p className="restaurant-details-rating">
        {typeof venue.rating === 'number' && <><img src={star} alt="" /><strong>{venue.rating.toFixed(1)}</strong>{Number.isInteger(venue.userRatingCount) && <span>({venue.userRatingCount.toLocaleString('en-US')})</span>}</>}
        {hours && <span className={`restaurant-opening ${hours === 'Open now' ? 'restaurant-opening-open' : ''}`}>{hours}</span>}
      </p>
      <div className="restaurant-details-tags">{chips.map(label => <DishTag key={label} label={label} />)}</div>
      <RestaurantActions restaurant={venue} dishId={dish.id} />
      {nearby.locationNotice && <p className="restaurant-partial-notice" role="status">{nearby.locationNotice}</p>}
      <DishAvailabilityNotice dish={dish} restaurant={venue} />
      {venue.metadataOnly ? <div className="restaurant-saved-details"><p>Refresh nearby search to load current restaurant details.</p>
        <Button disabled={nearby.busy} onClick={() => {
          nearby.search({ refresh: true, handoff: true }); navigate(`/recommendations/${dish.id}/nearby${contextQuery}`, { state: returnState })
        }}>Refresh nearby search</Button>
      </div> : <AteHereSwipe onConfirm={() => {
        const id = startVisit({ dish, restaurant: venue, returnState }); navigate(`/visits/${id}/verify`)
      }} />}
      <RestaurantLocationPreview restaurant={venue} />
      <section className="restaurant-about"><h2>About</h2>
        {venue.editorialSummary && <p lang={venue.editorialLanguage}>{venue.editorialSummary}</p>}
        <dl className="restaurant-about-facts">
          {venue.address && <><dt>Address</dt><dd>{venue.address}</dd></>}
          {venue.primaryTypeDisplayName && <><dt>Type</dt><dd>{venue.primaryTypeDisplayName}</dd></>}
        </dl>
        <p className="restaurant-availability-note">{restaurantMatchLabel(venue, dish)}. Dish availability isn't confirmed.</p>
        {venue.openingHours?.length > 0 && <details className="restaurant-opening-hours"><summary>Google opening hours</summary><ul>{venue.openingHours.map((line, index) => <li key={index}>{line}</li>)}</ul></details>}
        {!venue.metadataOnly && <GooglePlacesAttribution restaurants={[venue]} />}
      </section>
      <section className="restaurant-menu restaurant-dish-ideas"><h2>More dishes from this cuisine</h2>
        <p className="restaurant-availability-note">Explore dishes from Nom’s {cuisine} catalog. Check the restaurant’s menu for availability.</p>
        <div>{ideas.map(item => <article key={item.id}><button type="button" aria-label={`View ${item.name} details`}
          onClick={() => navigate(`/recommendations/${item.id}${returnState?.shared ? sharedContextQuery : ''}`, { state: { returnTo: returnState?.returnTo } })}>
          <Image src={item.image} alt="" loading="lazy" /><strong><DishTitle dish={item} /></strong>
        </button></article>)}</div>
      </section>
      {!venue.metadataOnly && <PlaceReviews restaurant={venue} />}
    </div>
  </div>
}
