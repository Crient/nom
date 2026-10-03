import { cn } from '../../utils/cn'
import { projectDishTags } from '../../utils/dishTags'
import DishTag from './DishTag'
import HeartButton from './HeartButton'
import MatchBadge from './MatchBadge'
import RankLabel from './RankLabel'
import DishDetailsLink from './DishDetailsLink'

export default function RecommendationCard({
  result, rank, liked = false, onToggleLike, className, variant = 'ranked',
}) {
  const list = variant === 'list'
  const { dish, score, matchedAttributes } = result
  const tags = projectDishTags(dish, {
    matchedPreferenceFlavors: matchedAttributes.preferenceFlavors,
    limit: 3,
  })
  const percent = Math.round(score)

  return (
    <article
      aria-label={list ? `#${rank} ${dish.name}, ${percent}% match` : undefined}
      className={cn(
        list ? 'relative h-[97px] w-full' : 'absolute left-[18px] h-[121.7px] w-[394px]',
        className,
      )}
    >
      <DishDetailsLink dish={dish} />
      <div className={cn(
        'absolute left-0 overflow-hidden rounded-[17.358px]',
        list ? 'top-[3px] h-[94px] w-[120px]' : 'top-[2.55px] h-[119.136px] w-[139.559px]',
      )}>
        <img src={dish.image} alt="" className="absolute inset-0 size-full max-w-none object-cover" />
        {!list && <RankLabel rank={rank} className="absolute top-[5.56px] left-[5.55px]" />}
      </div>

      <HeartButton
        liked={liked}
        onToggle={onToggleLike}
        size={23.502}
        className={list ? 'top-0 right-0 z-30' : 'top-0 left-[370.17px] z-30'}
      />

      <h2 className={cn(
        'absolute font-bold text-strong-neutral',
        list
          ? 'top-[8px] left-[133px] right-[29px] text-title leading-[24px]'
          : 'top-[23.83px] left-[158.28px] w-[180px] text-[21px] leading-[17.378px]',
      )}>
        {dish.name} {dish.flag}
      </h2>
      <p className={cn(
        'absolute text-[9.792px] leading-[11.751px] font-light text-strong-neutral',
        list ? 'top-[36px] left-[133px] right-[67px]' : 'top-[51.06px] left-[158.28px] w-[185px]',
      )}>
        {dish.shortDescription}
      </p>

      <div className={cn(
        'absolute flex items-center gap-[10px]',
        list ? 'top-[69px] left-[130px]' : 'top-[84.25px] left-[158.28px]',
      )}>
        {tags.map((label) => (
          <DishTag key={label} label={label} size="compact" />
        ))}
      </div>

      <div className={cn('absolute top-[30.63px]', list ? 'right-0' : 'left-[346.75px]')}>
        <MatchBadge percent={percent} variant="compact" />
      </div>
    </article>
  )
}
