import { Navigate, useNavigate } from 'react-router-dom'

import StatusBar from '../components/layout/StatusBar'
import BestMatchCard from '../components/recommendations/BestMatchCard'
import RecommendationCard from '../components/recommendations/RecommendationCard'
import RecommendationHeader from '../components/recommendations/RecommendationHeader'
import SessionChip from '../components/recommendations/SessionChip'
import Button from '../components/ui/Button'
import { useFavorites } from '../context/Favorites'
import { useRecommendations } from '../hooks/useRecommendations'

import recMap from '../assets/icons/rec-map.png'
import recWave from '../assets/icons/rec-wave.svg'
import recDivider from '../assets/icons/rec-divider.svg'
import recMoreBg from '../assets/icons/rec-more-bg.svg'
import recLocation from '../assets/icons/rec-location.svg'
import recArrow from '../assets/icons/rec-arrow.svg'
import recSync from '../assets/icons/rec-sync.svg'

export default function Recommendations() {
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { ready, results, chips } = useRecommendations()

  if (!ready) {
    return <Navigate to="/discover/food-type" replace />
  }

  const [best, second, third] = results.slice(0, 3)

  return (
    <div className="relative h-[1000px] w-full overflow-hidden bg-surface">
      <div className="absolute top-[37px] left-[-6px] h-[308px] w-[449px] overflow-hidden opacity-70">
        <img src={recMap} alt="" className="absolute top-0 left-0 h-[145.78%] w-full max-w-none" />
      </div>
      <img
        src={recWave}
        alt=""
        className="absolute top-[130.87px] left-[-1px] h-[212.126px] w-[441.5px] max-w-none"
      />

      <StatusBar className="absolute top-0 left-0 z-10 bg-transparent" />

      <RecommendationHeader
        onBack={() => navigate('/discover/region')}
        onAdjust={() => navigate('/discover/food-type')}
      />

      <h1 className="absolute top-[127px] left-[18px] w-[308px] text-display text-strong-neutral">
        Your{' '}
        <span className="text-alt-teal underline decoration-solid decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]">
          Top
        </span>{' '}
        Matches
      </h1>
      <p className="absolute top-[167px] left-[18px] w-[402.557px] text-body-tight text-strong-neutral">
        Based on your craving and preferences.
      </p>

      <div className="absolute top-[185px] left-[16px] flex w-[300px] flex-wrap content-start gap-x-[8px] gap-y-[10px]">
        {chips.map((chip) => (
          <SessionChip key={chip.id} chip={chip} />
        ))}
      </div>

      {best && (
        <BestMatchCard
          result={best}
          liked={isFavorite(best.dish.id)}
          onToggleLike={() => toggleFavorite(best.dish.id)}
        />
      )}

      {second && (
        <RecommendationCard
          result={second}
          rank={2}
          liked={isFavorite(second.dish.id)}
          onToggleLike={() => toggleFavorite(second.dish.id)}
          className="top-[545px]"
        />
      )}

      <img
        src={recDivider}
        alt=""
        className="absolute top-[667px] left-[17px] h-[14.197px] w-[410px] max-w-none"
      />

      {third && (
        <RecommendationCard
          result={third}
          rank={3}
          liked={isFavorite(third.dish.id)}
          onToggleLike={() => toggleFavorite(third.dish.id)}
          className="top-[682px]"
        />
      )}

      <img
        src={recDivider}
        alt=""
        className="absolute top-[804px] left-[17px] h-[14.197px] w-[410px] max-w-none"
      />

      <Button
        type="button"
        variant="primary"
        size="none"
        className="absolute top-[824px] left-[21px] h-[63px] w-[394px] rounded-lg bg-alt-teal text-[19px] leading-[13.31px] tracking-meta text-pale-teal"
      >
        <img src={recLocation} alt="" className="h-[35px] w-[34.648px] max-w-none" />
        Find nearby restaurants
        <img src={recArrow} alt="" className="h-[37px] w-[36.628px] max-w-none" />
      </Button>

      <button
        type="button"
        onClick={() => navigate('/recommendations/more')}
        className="absolute top-[898px] left-[21px] flex h-[63px] w-[394px] items-center justify-center gap-[7px]"
      >
        <img src={recMoreBg} alt="" className="absolute inset-0 size-full max-w-none" />
        <img src={recSync} alt="" className="relative size-[35px] max-w-none" />
        <span className="relative text-[19px] leading-[13.31px] font-bold tracking-meta text-primary-teal">
          See more options
        </span>
      </button>
    </div>
  )
}
