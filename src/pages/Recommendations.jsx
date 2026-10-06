import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import SurpriseMe from './SurpriseMe'
import StatusBar from '../components/layout/StatusBar'
import BestMatchCard from '../components/recommendations/BestMatchCard'
import RecommendationCard from '../components/recommendations/RecommendationCard'
import RecommendationHeader from '../components/recommendations/RecommendationHeader'
import SessionChip from '../components/recommendations/SessionChip'
import Button from '../components/ui/Button'
import Image from '../components/ui/Image'
import { useFavorites } from '../context/Favorites'
import { useRecommendations } from '../hooks/useRecommendations'

import recMap from '../assets/icons/rec-map.webp'
import recWave from '../assets/icons/rec-wave.svg'
import recDivider from '../assets/icons/rec-divider.svg'
import recMoreBg from '../assets/icons/rec-more-bg.svg'
import recLocation from '../assets/icons/rec-location.svg'
import recArrow from '../assets/icons/rec-arrow.svg'
import recSync from '../assets/icons/rec-sync.svg'

export default function Recommendations() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { ready, results, chips } = useRecommendations()

  if (!ready) {
    return <Navigate to="/discover/food-type" replace />
  }

  if (location.state?.surpriseMode) return <SurpriseMe />

  const [best, second, third] = results.slice(0, 3)

  return (
    <div className="relative min-h-[1000px] w-full bg-surface pb-[39px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[37px] h-[308px] overflow-hidden opacity-70">
        <Image src={recMap} alt="" className="absolute top-0 left-[-6px] h-[145.78%] w-[calc(100%+9px)] max-w-none" />
      </div>
      <img
        src={recWave}
        alt=""
        className="pointer-events-none absolute top-[130.87px] left-0 h-[212.126px] w-full"
      />

      <StatusBar overlay />

      <RecommendationHeader
        onBack={() => navigate('/discover/region')}
        onAdjust={() => navigate('/discover/food-type')}
      />

      <h1 className="relative mx-[18px] pt-[127px] text-display text-strong-neutral">
        Your{' '}
        <span className="text-accessible-teal underline decoration-solid decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]">
          Top
        </span>{' '}
        Matches
      </h1>
      <p className="relative mx-[18px] mt-[5px] text-body-tight text-strong-neutral">
        Based on your craving and preferences.
      </p>

      <div className="relative ml-[16px] mr-[16px] flex max-w-[300px] flex-wrap content-start gap-x-[8px] gap-y-[10px]">
        {chips.map((chip) => (
          <SessionChip key={chip.id} chip={chip} />
        ))}
      </div>

      <section aria-label="Top dish matches" className="relative ml-[18px] mr-[25px] mt-[48px] flex flex-col gap-[11px]">
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
          />
        )}

        <img
          src={recDivider}
          alt=""
          className="-my-[11px] h-[14.197px] w-full"
        />

        {third && (
          <RecommendationCard
            result={third}
            rank={3}
            liked={isFavorite(third.dish.id)}
            onToggleLike={() => toggleFavorite(third.dish.id)}
          />
        )}

        <img
          src={recDivider}
          alt=""
          className="-my-[11px] h-[14.197px] w-full"
        />
      </section>

      <Button
        type="button"
        variant="nearby"
        size="none"
        disabled={!best}
        onClick={() => best && navigate(`/recommendations/${best.dish.id}/nearby`, { state: { returnTo: '/recommendations' } })}
        className="relative mx-[21px] mt-[20px] h-[63px] w-[calc(100%-46px)] rounded-lg text-[19px] leading-[23px] tracking-meta"
      >
        <img src={recLocation} alt="" className="h-[35px] w-[34.648px] max-w-none" />
        Find nearby restaurants
        <img src={recArrow} alt="" className="h-[37px] w-[36.628px] max-w-none" />
      </Button>

      <button
        type="button"
        onClick={() => navigate('/recommendations/more')}
        className="relative mx-[21px] mt-[11px] flex h-[63px] w-[calc(100%-46px)] items-center justify-center gap-[7px]"
      >
        <img src={recMoreBg} alt="" className="absolute inset-0 size-full max-w-none" />
        <img src={recSync} alt="" className="relative size-[35px] max-w-none" />
        <span className="relative text-[19px] leading-[23px] font-bold tracking-meta text-accessible-teal">
          See more options
        </span>
      </button>
      <Button variant="secondary" className="mx-[21px] mt-[11px] min-h-[52px] w-[calc(100%-46px)]" onClick={() => navigate('/recommendations/surprise')}>Surprise me</Button>
    </div>
  )
}
