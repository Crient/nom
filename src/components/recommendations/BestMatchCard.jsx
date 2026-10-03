import { projectDishTags } from '../../utils/dishTags'
import DishTag from './DishTag'
import HeartButton from './HeartButton'
import MatchBadge from './MatchBadge'
import RankLabel from './RankLabel'
import DishDetailsLink from './DishDetailsLink'
import Image from '../ui/Image'

export default function BestMatchCard({ result, liked = false, onToggleLike }) {
  const { dish, score, matchedAttributes } = result
  const tags = projectDishTags(dish, {
    matchedPreferenceFlavors: matchedAttributes.preferenceFlavors,
    limit: 4,
  })
  const percent = Math.round(score)

  return (
    <article className="relative min-h-[238.2px] rounded-[17.261px] bg-surface px-[9.21px] pb-[9px] shadow-card">
      <DishDetailsLink dish={dish} />
      <div className="absolute top-[8.06px] left-[9.21px] right-[9.21px] h-[169.157px] overflow-hidden rounded-t-[17.261px]">
        <Image
          src={dish.image}
          alt=""
          className="absolute inset-0 size-full max-w-none object-cover object-[center_35%]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[96px] bg-gradient-to-t from-surface via-surface/85 to-transparent" />
      </div>

      <RankLabel rank={1} variant="hero" className="absolute top-[16.11px] left-[14.96px] z-10" />
      <HeartButton
        dishName={dish.name}
        liked={liked}
        onToggle={onToggleLike}
        className="top-[12.66px] right-[15px] z-30"
      />
      <div className="absolute top-[73px] right-[16px] z-10">
        <MatchBadge percent={percent} variant="hero" />
      </div>

      <h2 className="relative pt-[138px] text-[28.768px] leading-[32px] font-bold text-strong-neutral">
        {dish.name} {dish.flag}
      </h2>
      <p className="relative mt-[3px] max-w-[227.843px] text-[11.507px] leading-[13.809px] font-light text-strong-neutral">
        {dish.shortDescription}
      </p>

      <div className="relative mt-[8px] flex flex-wrap items-center gap-x-[11px] gap-y-[4px]">
        {tags.map((label) => (
          <DishTag key={label} label={label} size="hero" />
        ))}
      </div>
    </article>
  )
}
