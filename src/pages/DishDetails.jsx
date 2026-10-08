import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import DishDetailHero from '../components/recommendations/DishDetailHero'
import WhyMatchedCard from '../components/recommendations/WhyMatchedCard'
import RestaurantPreviewCard from '../components/recommendations/RestaurantPreviewCard'
import RestaurantSkeletons from '../components/restaurants/RestaurantSkeletons'
import Button from '../components/ui/Button'
import { useDiscoverySession } from '../context/DiscoverySession'
import { useFavorites } from '../context/Favorites'
import { useActivity } from '../context/Activity'
import { recommendationReturnTo } from '../utils/navigation'
import { useRestaurants } from '../hooks/useRestaurants'
import GooglePlacesAttribution from '../components/restaurants/GooglePlacesAttribution'
import { nearbyErrorMessage } from '../data/nearbyRestaurantService'
import { selectRestaurantDetails } from '../data/placeExtrasService'
import '../styles/nearby.css'
import { useDishRecommendation } from '../hooks/useDishRecommendation'
import { surpriseQuery } from '../utils/surpriseStrategy'
import { whyMatched } from '../utils/whyMatched'
import nearbyLocation from '../assets/icons/rec-location.svg'
import nearbyArrow from '../assets/icons/rec-arrow.svg'
import saveBackground from '../assets/icons/detail-save-bg.svg'
import FavoriteStar from '../components/icons/FavoriteStar'
import moreBackground from '../assets/icons/detail-more-bg.svg'
import moreSync from '../assets/icons/detail-more-sync.png'
import seeAllArrow from '../assets/icons/detail-see-all.svg'
import SendToFriend from '../components/social/SendToFriend'
import { sharedContextQuery } from '../data/sharedContent'

export default function DishDetails() {
  const { dishId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useDiscoverySession()
  const { ready, results, chips, surprise, shared } = useDishRecommendation(dishId)
  const { isFavorite, toggleFavorite } = useFavorites()
  const { recordDishView } = useActivity()
  const result = results.find((item) => item.dish.id === dishId)
  const nearby = useRestaurants(ready ? result?.dish.id : undefined, { autoLoad: true })
  useEffect(() => {
    if (import.meta.env.DEV && nearby.searchDebug && nearby.status === 'ready') {
      const eligible = nearby.restaurants.filter(place => !place.metadataOnly)
      console.debug('[Nom nearby preview]', { dishId, receivedIds: nearby.restaurants.map(place => place.id),
        renderedIds: eligible.slice(0, 3).map(place => place.id),
        excluded: nearby.restaurants.filter(place => place.metadataOnly || !eligible.slice(0, 3).includes(place))
          .map(place => ({ id: place.id, reason: place.metadataOnly ? 'metadata-only' : 'preview-limit-3' })) })
    }
  }, [dishId, nearby.restaurants, nearby.searchDebug, nearby.status])
  useEffect(() => { if (result) recordDishView(result.dish.id) }, [result?.dish.id, recordDishView])

  if (!ready) return <Navigate to="/discover/food-type" replace state={{ ...location.state, discoveryReturnTo: location.pathname }} />
  if (!result) return shared ? <div className="flow-page"><p className="flow-state" role="status">This shared dish is no longer available.</p><Button onClick={() => navigate('/friends/inbox')}>Back to shared items</Button></div> : <Navigate to="/recommendations" replace />

  const { dish } = result
  const favorite = isFavorite(dish.id)
  const returnTo = recommendationReturnTo(location.state?.returnTo)
  const previews = nearby.restaurants.filter(restaurant => !restaurant.metadataOnly).slice(0, 3)
  const findNearby = () => {
    nearby.search({ refresh: nearby.status === 'ready' })
  }
  const seeAll = () => {
    navigate(`/recommendations/${dish.id}/nearby${shared ? sharedContextQuery : surprise ? surpriseQuery : ''}`, { state: { returnTo } })
  }

  return (
    <div className="min-h-[960px] bg-surface pb-[18px]">
      <DishDetailHero result={result} chips={chips} onBack={() => navigate(returnTo)} backLabel={returnTo.startsWith('/recommendations') ? 'Go back to recommendations' : 'Go back'} />
      <p className="mx-[25px] mt-[15px] min-h-[45px] text-body-sm text-strong-neutral">
        {dish.description}
      </p>
      {shared ? <p className="mx-[25px] my-[18px] text-body-sm text-text-secondary">A friend’s food suggestion. Choose your own preferences to find matches.</p> : surprise ? <p className="mx-[25px] my-[18px] text-body-sm text-text-secondary">A random pick from all 201 dishes. Your discovery preferences haven’t changed.</p> : <WhyMatchedCard explanation={whyMatched(session, result)} />}

      <section aria-labelledby="nearby-title" aria-describedby="restaurant-preview-note" className="mx-[21px] mt-[1px]">
        <div className="dish-nearby-heading">
          <h2 id="nearby-title" className="text-[17px] leading-[24px] font-bold text-strong-neutral [text-shadow:0_2px_4px_rgb(0_0_0/0.25)]">
            Where to try nearby
          </h2>
          {previews.length > 0 && <span className="text-[12px] text-text-secondary">Preview</span>}
          <button type="button" onClick={seeAll} disabled={nearby.busy} className="ml-auto flex min-h-[44px] shrink-0 items-center gap-[5px] text-[12px] font-bold text-accessible-teal">
            See all
            <img src={seeAllArrow} alt="" className="h-[12px] w-[14px] object-contain" />
          </button>
        </div>
        {nearby.busy && !previews.length ? <RestaurantSkeletons compact /> : <div className="restaurant-preview-grid mt-[1px] grid min-h-[95px] grid-cols-3 gap-[16px]">
          {previews.length > 0 ? previews.map((restaurant) => (
            <RestaurantPreviewCard key={restaurant.id} restaurant={restaurant} dish={dish} onSelect={() => {
              selectRestaurantDetails(restaurant)
              navigate(`/recommendations/${dish.id}/nearby/${encodeURIComponent(restaurant.id)}${shared ? sharedContextQuery : surprise ? surpriseQuery : ''}`, { state: { returnTo, view: 'list' } })
            }} />
          )) : (
            <p className="col-span-3 self-center text-body-sm text-text-secondary" role="status">{nearby.busy ? 'Finding restaurants near you…' : nearby.metadataOnly
              ? 'Your saved search is ready. Refresh to see current restaurant details.' : `Find restaurants relevant to ${dish.name} near you.`}</p>
          )}
        </div>}
      </section>

      <div className="mx-[23px] mt-[18px] flex flex-col gap-[11px]">
        <Button
          variant="nearby" size="none" onClick={findNearby} disabled={nearby.busy}
          className="relative min-h-[63px] w-full rounded-lg px-[12px] text-[19px] leading-[23px] font-bold tracking-meta shadow-card"
        >
          <img src={nearbyLocation} alt="" className="shrink-0 max-w-none" />
          <span>{nearby.busy ? 'Finding restaurants near you…' : nearby.status === 'ready' ? 'Refresh nearby restaurants' : 'Find nearby restaurants'}</span>
          <img src={nearbyArrow} alt="" className="shrink-0 max-w-none" />
        </Button>
        <div className="grid grid-cols-2 gap-[10px]">
          <Button
            variant="artwork" size="none"
            aria-pressed={favorite}
            aria-label={favorite ? `Remove ${dish.name} from favorites` : `Save ${dish.name} to favorites`}
            onClick={() => toggleFavorite(dish.id)}
            className="relative min-h-[63px] rounded-[17px] px-[10px] text-[15px] leading-[18px] font-bold tracking-meta shadow-card"
          >
            <img src={saveBackground} alt="" className="absolute inset-0 size-full" />
            <FavoriteStar saved={favorite} size={22} />
            <span className="relative">{favorite ? 'Saved to favorites' : 'Save to favorites'}</span>
          </Button>
          <Button
            variant="artwork" size="none"
            onClick={() => navigate(surprise ? '/recommendations/surprise' : '/recommendations/more')}
            className="relative min-h-[63px] rounded-[17px] px-[10px] text-[15px] leading-[18px] font-bold tracking-meta shadow-card"
          >
            <img src={moreBackground} alt="" className="absolute inset-0 size-full" />
            <img src={moreSync} alt="" width={25} height={25} className="relative size-[24.305px] shrink-0 max-w-none" />
            <span className="relative">See more options</span>
          </Button>
        </div>
        <div className="social-send-options"><SendToFriend content={{ type: 'dish', id: dish.id }}>Send dish to a friend</SendToFriend><SendToFriend content={{ type: 'recommendation', id: dish.id }}>Send recommendation to a friend</SendToFriend></div>
        <p id="restaurant-preview-note" role={nearby.status === 'error' ? 'alert' : 'status'} aria-live="polite" className="text-[12px] leading-[18px] text-text-secondary">
          {nearby.status === 'error' ? nearbyErrorMessage(nearby.errorCode) : nearby.busy ? 'Finding restaurants near you…'
            : nearby.metadataOnly ? 'Refresh loads current names, ratings, hours, and available photos.'
            : previews.length ? "Search results suggest places to try. Dish availability isn't confirmed."
            : nearby.status === 'ready' ? 'No nearby matches found.' : 'Allow location to find places near you. Once allowed, nearby restaurants load when you open a dish.'}
        </p>
        {nearby.partialError && <p className="restaurant-partial-notice" role="status">Some results are available. Additional nearby cuisine matches are temporarily unavailable.</p>}
        {nearby.locationNotice && <p className="restaurant-partial-notice" role="status">{nearby.locationNotice}</p>}
        {nearby.source === 'google-places' && previews.length > 0 && !nearby.metadataOnly && <GooglePlacesAttribution restaurants={previews} />}
      </div>
    </div>
  )
}
