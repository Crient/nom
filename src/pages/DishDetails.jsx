import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import DishDetailHero from '../components/recommendations/DishDetailHero'
import WhyMatchedCard from '../components/recommendations/WhyMatchedCard'
import RestaurantPreviewCard from '../components/recommendations/RestaurantPreviewCard'
import Button from '../components/ui/Button'
import { useDiscoverySession } from '../context/DiscoverySession'
import { useFavorites } from '../context/Favorites'
import { dishDetailsRestaurantDesignPreview } from '../data/dishDetailsRestaurantDesignPreview'
import { useRecommendations } from '../hooks/useRecommendations'
import { whyMatched } from '../utils/whyMatched'
import nearbyLocation from '../assets/icons/rec-location.svg'
import nearbyArrow from '../assets/icons/rec-arrow.svg'
import saveBackground from '../assets/icons/detail-save-bg.svg'
import saveStar from '../assets/icons/detail-save-star.svg'
import moreBackground from '../assets/icons/detail-more-bg.svg'
import moreSync from '../assets/icons/detail-more-sync.png'
import seeAllArrow from '../assets/icons/detail-see-all.svg'

export default function DishDetails() {
  const { dishId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useDiscoverySession()
  const { ready, results, chips } = useRecommendations()
  const { isFavorite, toggleFavorite } = useFavorites()

  if (!ready) return <Navigate to="/discover/food-type" replace />
  const result = results.find((item) => item.dish.id === dishId)
  if (!result) return <Navigate to="/recommendations" replace />

  const { dish } = result
  const favorite = isFavorite(dish.id)
  const returnTo = location.state?.returnTo === '/recommendations/more'
    ? '/recommendations/more' : '/recommendations'
  const previews = dish.id === dishDetailsRestaurantDesignPreview.dishId
    ? dishDetailsRestaurantDesignPreview.restaurants : []

  return (
    <div className="min-h-[960px] bg-surface pb-[18px]">
      <DishDetailHero result={result} chips={chips} onBack={() => navigate(returnTo)} />
      <p className="mx-[25px] mt-[15px] min-h-[45px] text-body-sm text-strong-neutral">
        {dish.description}
      </p>
      <WhyMatchedCard explanation={whyMatched(session, result)} />

      <section aria-labelledby="nearby-title" aria-describedby="restaurant-preview-note" className="mx-[21px] mt-[1px]">
        <div className="flex h-[35px] items-center">
          <h2 id="nearby-title" className="text-[17px] leading-[35px] font-bold text-strong-neutral [text-shadow:0_2px_4px_rgb(0_0_0/0.25)]">
            Where to try nearby
          </h2>
          {previews.length > 0 && <span className="ml-[8px] text-[10px] text-text-secondary">Preview</span>}
          <button type="button" disabled title="Nearby search is not connected yet" className="relative top-[2px] ml-auto mr-[4px] flex items-center gap-[5px] text-[12px] font-bold text-accessible-teal">
            See all
            <img src={seeAllArrow} alt="" className="translate-y-[4px] max-w-none" />
          </button>
        </div>
        <div className="mt-[1px] grid min-h-[95px] grid-cols-3 gap-[16px]">
          {previews.length > 0 ? previews.map((restaurant) => (
            <RestaurantPreviewCard key={restaurant.id} restaurant={restaurant} />
          )) : (
            <p className="col-span-3 self-center text-body-sm text-text-secondary">Nearby restaurant search is not available yet.</p>
          )}
        </div>
      </section>

      <div className="mx-[23px] mt-[18px] flex flex-col gap-[11px]">
        <Button
          variant="nearby" size="none" disabled
          title="Nearby restaurant search is not connected yet"
          className="relative min-h-[63px] w-full rounded-lg px-[12px] text-[19px] leading-[23px] font-bold tracking-meta shadow-card"
        >
          <img src={nearbyLocation} alt="" className="shrink-0 max-w-none" />
          <span>Find nearby restaurants</span>
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
            <img src={saveStar} alt="" className="relative shrink-0 max-w-none" />
            <span className="relative">{favorite ? 'Saved to favorites' : 'Save to favorites'}</span>
          </Button>
          <Button
            variant="artwork" size="none"
            onClick={() => navigate('/recommendations/more')}
            className="relative min-h-[63px] rounded-[17px] px-[10px] text-[15px] leading-[18px] font-bold tracking-meta shadow-card"
          >
            <img src={moreBackground} alt="" className="absolute inset-0 size-full" />
            <img src={moreSync} alt="" width={25} height={25} className="relative size-[24.305px] shrink-0 max-w-none" />
            <span className="relative">See more options</span>
          </Button>
        </div>
        <p id="restaurant-preview-note" className="text-[10px] leading-[14px] text-text-secondary">
          {previews.length > 0
            ? 'Design preview only. Ratings and distances are examples.'
            : 'Nearby search is not connected yet.'}
        </p>
      </div>
    </div>
  )
}
