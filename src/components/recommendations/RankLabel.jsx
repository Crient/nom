import { cn } from '../../utils/cn'

export function rankCopy(rank) {
  return rank === 1 ? 'Best Match' : 'Great Match'
}

export default function RankLabel({ rank, variant = 'compact', className }) {
  const hero = variant === 'hero'

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold whitespace-nowrap text-strong-neutral shadow-card',
        hero
          ? 'h-[24.096px] w-[112.771px] bg-yellow-accent text-[14.458px] leading-[17.105px]'
          : 'h-[21.15px] w-[108.394px] bg-surface text-[12.741px] leading-[15.074px]',
        className,
      )}
    >
      #{rank} {rankCopy(rank)}
    </span>
  )
}
