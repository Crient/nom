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
          <button type="button" disabled title="Nearby search is not connected yet" className="relative top-[2px] ml-auto mr-[4px] flex items-center gap-[5px] text-[12px] font-bold text-primary-teal">
            See all
            <img src={seeAllArrow} alt="" className="translate-y-[4px] max-w-none" />
          </button>
        </div>
        <div className="mt-[1px] flex min-h-[95px] w-[395px] justify-between">
          {previews.length > 0 ? previews.map((restaurant) => (
            <RestaurantPreviewCard key={restaurant.id} restaurant={restaurant} />
          )) : (
            <p className="self-center text-body-sm text-text-secondary">Nearby restaurant search is not available yet.</p>
          )}
        </div>
      </section>

      <div className="mx-[23px] mt-[18px] flex flex-col gap-[11px]">
        <Button
          variant="primary" size="none" disabled
          title="Nearby restaurant search is not connected yet"
          style={{ opacity: 1, backgroundColor: 'var(--color-alt-teal)', color: 'var(--color-pale-teal)' }}
          className="relative h-[63px] w-[394px] rounded-lg text-[19px] leading-[13.31px] font-bold tracking-meta shadow-card"
        >
          <img src={nearbyLocation} alt="" className="absolute top-[15px] left-[48.5px] max-w-none" />
          <span className="absolute top-[26px] left-[84px]">Find nearby restaurants</span>
          <img src={nearbyArrow} alt="" className="absolute top-[13px] left-[322.7px] max-w-none" />
        </Button>
        <div className="flex gap-[10px]">
          <Button
            variant="secondary" size="none"
            aria-pressed={favorite}
            aria-label={favorite ? 'Remove from favorites' : 'Save to favorites'}
            onClick={() => toggleFavorite(dish.id)}
            className="relative h-[63px] w-[190px] rounded-[17px] bg-transparent text-[15px] leading-[13.31px] font-bold tracking-meta text-primary-teal shadow-card"
          >
            <img src={saveBackground} alt="" className="absolute inset-0 max-w-none" />
            <img src={saveStar} alt="" className="absolute top-[22px] left-[24.5px] max-w-none" />
            <span className="absolute top-[25px] left-[47px]">{favorite ? 'Saved to favorites' : 'Save to favorites'}</span>
          </Button>
          <Button
            variant="secondary" size="none"
            onClick={() => navigate('/recommendations/more')}
            className="relative h-[63px] w-[190px] rounded-[17px] bg-transparent text-[15px] leading-[13.31px] font-bold tracking-meta text-primary-teal shadow-card"
          >
            <img src={moreBackground} alt="" className="absolute inset-0 max-w-none" />
            <img src={moreSync} alt="" className="absolute top-[19px] left-[12px] size-[24.305px] max-w-none" />
            <span className="absolute top-[25px] left-[45px]">See more options</span>
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
