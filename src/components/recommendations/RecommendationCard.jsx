import { cn } from '../../utils/cn'
import { projectDishTags } from '../../utils/dishTags'
import DishTag from './DishTag'
import HeartButton from './HeartButton'
import MatchBadge from './MatchBadge'
import RankLabel from './RankLabel'

export default function RecommendationCard({ result, rank, liked = false, onToggleLike, className }) {
  const { dish, score, matchedAttributes } = result
  const tags = projectDishTags(dish, {
    matchedPreferenceFlavors: matchedAttributes.preferenceFlavors,
    limit: 3,
  })
  const percent = Math.round(score)

  return (
    <article className={cn('absolute left-[18px] h-[121.7px] w-[394px]', className)}>
      <div className="absolute top-[2.55px] left-0 h-[119.136px] w-[139.559px] overflow-hidden rounded-[17.358px]">
        <img src={dish.image} alt="" className="absolute inset-0 size-full max-w-none object-cover" />
        <RankLabel rank={rank} className="absolute top-[5.56px] left-[5.55px]" />
      </div>

      <HeartButton
        liked={liked}
        onToggle={onToggleLike}
        size={23.502}
        className="top-0 left-[370.17px]"
      />

      <h2 className="absolute top-[23.83px] left-[158.28px] w-[180px] text-[21px] leading-[17.378px] font-bold text-strong-neutral">
        {dish.name} {dish.flag}
      </h2>
      <p className="absolute top-[51.06px] left-[158.28px] w-[185px] text-[9.792px] leading-[11.751px] font-light text-strong-neutral">
        {dish.shortDescription}
      </p>

      <div className="absolute top-[84.25px] left-[158.28px] flex items-center gap-[10px]">
        {tags.map((label) => (
          <DishTag key={label} label={label} size="compact" />
        ))}
      </div>

      <div className="absolute top-[30.63px] left-[346.75px]">
        <MatchBadge percent={percent} variant="compact" />
      </div>
    </article>
  )
}
