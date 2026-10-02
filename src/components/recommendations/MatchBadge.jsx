import { cn } from '../../utils/cn'

export default function MatchBadge({ percent, variant = 'compact' }) {
  const hero = variant === 'hero'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center shadow-card',
        hero
          ? 'h-[56px] w-[77px] rounded-[12px] bg-yellow-accent'
          : 'h-[34.365px] w-[47.252px] rounded-[7.364px] bg-alt-teal',
      )}
    >
      <span
        className={cn(
          'font-bold text-strong-neutral',
          hero ? 'text-[23px] leading-[12px]' : 'text-[14.114px] leading-[7.364px]',
        )}
      >
        {percent} %
      </span>
      <span
        className={cn(
          'font-bold text-strong-neutral',
          hero ? 'mt-[6px] text-[15px] leading-[12px]' : 'mt-[3px] text-[9.205px] leading-[7.364px]',
        )}
      >
        match
      </span>
    </div>
  )
}
