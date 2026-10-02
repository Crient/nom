import { Navigate, useNavigate } from 'react-router-dom'

import StatusBar from '../components/layout/StatusBar'
import RecommendationHeader from '../components/recommendations/RecommendationHeader'
import RecommendationCard from '../components/recommendations/RecommendationCard'
import SessionChip from '../components/recommendations/SessionChip'
import { useFavorites } from '../context/Favorites'
import { useRecommendations } from '../hooks/useRecommendations'
import recDivider from '../assets/icons/rec-divider.svg'
import refineBackground from '../assets/icons/rec-refine-bg.svg'
import refineSettings from '../assets/icons/rec-refine-settings.svg'
import refineArrow from '../assets/icons/rec-refine-arrow.svg'

// Gaps between the seven row slots measured from the final frame.
const ROW_GAPS = [13, 16, 16, 15, 16, 16]

/** 02.02 More options — Figma 263:4258, using ranks 4–10 of the current session. */
export default function MoreOptions() {
  const navigate = useNavigate()
  const { ready, results, chips } = useRecommendations()
  const { isFavorite, toggleFavorite } = useFavorites()

  if (!ready) {
    return <Navigate to="/discover/food-type" replace />
  }

  return (
    <div className="min-h-[1205px] w-full bg-surface">
      <header className="relative min-h-[271px] rounded-b-[25px] border border-strong-neutral/15 bg-surface-muted shadow-panel">
        <StatusBar className="bg-transparent" />
        <RecommendationHeader title="More Options" onBack={() => navigate('/recommendations')} />
        <p className="px-[17px] pt-[71px] text-body-tight text-strong-neutral">
          Here are more dishes you might like.
          <br />
          You can save your favorites or refine your preferences.
        </p>
        <div className="mt-[20px] ml-[16px] flex w-[310px] flex-wrap gap-x-[8px] gap-y-[10px] pb-[15px]">
          {chips.map((chip) => (
            <SessionChip
              key={chip.id}
              chip={chip}
              className={chip.kind === 'adventure'
                ? 'min-w-[103px]'
                : chip.kind === 'region' ? 'min-w-[122px]' : 'min-w-[94px]'}
            />
          ))}
        </div>
      </header>

      <section aria-label="More dish matches" className="mx-[22px] mt-[17px] w-[394px]">
        {results.slice(3, 10).map((result, index) => (
          <div key={result.dish.id}>
            {index > 0 && (
              <div className="relative" style={{ height: ROW_GAPS[index - 1] }}>
                <img
                  src={recDivider}
                  alt=""
                  className="absolute -left-[7px] block max-w-none"
                  style={{ top: index === 1 ? 1 : index === 4 ? 4 : 2 }}
                />
              </div>
            )}
            <RecommendationCard
              result={result}
              rank={index + 4}
              variant="list"
              liked={isFavorite(result.dish.id)}
              onToggleLike={() => toggleFavorite(result.dish.id)}
            />
          </div>
        ))}
      </section>

      <button
        type="button"
        onClick={() => navigate('/discover/food-type')}
        aria-label="Adjust preferences"
        className="relative mx-[23px] mt-[20px] block h-[63px] w-[394px] rounded-lg text-left text-strong-neutral shadow-panel"
      >
        <img src={refineBackground} alt="" className="absolute inset-0 max-w-none" />
        <img src={refineSettings} alt="" className="absolute top-[10px] left-[14px] max-w-none" />
        <span className="absolute top-[16px] left-[70px] text-heading leading-[13.31px] tracking-meta">
          Not Quite Right?
        </span>
        <span className="absolute top-[34px] left-[70px] text-[10px] leading-[11.751px] font-light">
          Adjust your preferences to get better recommendations.
        </span>
        <img src={refineArrow} alt="" className="absolute top-[26.3px] left-[363.8px] max-w-none" />
      </button>
    </div>
  )
}
