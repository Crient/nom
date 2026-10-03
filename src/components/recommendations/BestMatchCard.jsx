import { projectDishTags } from '../../utils/dishTags'
import DishTag from './DishTag'
import HeartButton from './HeartButton'
import MatchBadge from './MatchBadge'
import RankLabel from './RankLabel'
import DishDetailsLink from './DishDetailsLink'

export default function BestMatchCard({ result, liked = false, onToggleLike }) {
  const { dish, score, matchedAttributes } = result
  const tags = projectDishTags(dish, {
    matchedPreferenceFlavors: matchedAttributes.preferenceFlavors,
    limit: 4,
  })
  const percent = Math.round(score)

  return (
    <article className="absolute top-[296px] left-[18px] h-[238.2px] w-[397px] rounded-[17.261px] bg-surface shadow-card">
      <DishDetailsLink dish={dish} />
      <div className="absolute top-[8.06px] left-[9.21px] h-[169.157px] w-[378.588px] overflow-hidden rounded-t-[17.261px]">
        <img
          src={dish.image}
          alt=""
          className="absolute inset-0 size-full max-w-none object-cover object-[center_35%]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[96px] bg-gradient-to-t from-surface via-surface/85 to-transparent" />
      </div>

      <RankLabel rank={1} variant="hero" className="absolute top-[16.11px] left-[14.96px] z-10" />
      <HeartButton
        liked={liked}
        onToggle={onToggleLike}
        className="top-[12.66px] left-[354.42px] z-30"
      />
      <div className="absolute top-[73px] left-[304px] z-10">
        <MatchBadge percent={percent} variant="hero" />
      </div>

      <h2 className="absolute top-[143.84px] left-[9.21px] text-[28.768px] leading-[20.421px] font-bold whitespace-nowrap text-strong-neutral">
        {dish.name} {dish.flag}
      </h2>
      <p className="absolute top-[172.61px] left-[9.21px] w-[227.843px] text-[11.507px] leading-[13.809px] font-light text-strong-neutral">
        {dish.shortDescription}
      </p>

      <div className="absolute top-[208.28px] left-[9.21px] flex items-center gap-[11px]">
        {tags.map((label) => (
          <DishTag key={label} label={label} size="hero" />
        ))}
      </div>
    </article>
  )
}
