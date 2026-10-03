import { cn } from '../../utils/cn'
import { projectDishTags } from '../../utils/dishTags'
import DishTag from './DishTag'
import HeartButton from './HeartButton'
import MatchBadge from './MatchBadge'
import RankLabel from './RankLabel'
import DishDetailsLink from './DishDetailsLink'
import Image from '../ui/Image'

export default function RecommendationCard({ result, rank, liked = false, onToggleLike, className, variant = 'ranked' }) {
  const list = variant === 'list'
  const { dish, score, matchedAttributes } = result
  const tags = projectDishTags(dish, { matchedPreferenceFlavors: matchedAttributes.preferenceFlavors, limit: 3 })
  const percent = Math.round(score)

  return (
    <article aria-label={`#${rank} ${dish.name}, ${percent}% match`}
      className={cn('relative grid w-full', list
        ? 'min-h-[97px] grid-cols-[30.46%_minmax(0,1fr)] gap-x-[13px]'
        : 'min-h-[121.7px] grid-cols-[35.42%_minmax(0,1fr)] gap-x-[18.72px]', className)}>
      <DishDetailsLink dish={dish} />
      <div className={cn('relative overflow-hidden rounded-[17.358px]', list ? 'mt-[3px] min-h-[94px]' : 'mt-[2.55px] min-h-[119.136px]')}>
        <Image src={dish.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        {!list && <RankLabel rank={rank} className="absolute top-[5.56px] left-[5.55px]" />}
      </div>
      <div className={cn('min-w-0 pb-[8px]', list ? 'pt-[8px]' : 'pt-[23.83px]')}>
        <h2 className={cn('mr-[52px] font-bold text-strong-neutral', list ? 'text-title leading-[24px]' : 'text-[21px] leading-[21px]')}>
          {dish.name} <span className="whitespace-nowrap">{dish.flag}</span>
        </h2>
        <p className={cn('mr-[52px] text-[9.792px] leading-[11.751px] font-light text-strong-neutral', list ? 'mt-[4px]' : 'mt-[6px]')}>
          {dish.shortDescription}
        </p>
        <div className={cn('flex flex-wrap items-center gap-x-[10px] gap-y-[4px]', list ? 'mt-[9px]' : 'mt-[10px]')}>
          {tags.map(label => <DishTag key={label} label={label} size="compact" />)}
        </div>
      </div>
      <HeartButton dishName={dish.name} liked={liked} onToggle={onToggleLike} size={23.502} className="top-0 right-0 z-30" />
      <div className="pointer-events-none absolute top-[30.63px] right-0">
        <MatchBadge percent={percent} variant="compact" />
      </div>
    </article>
  )
}
