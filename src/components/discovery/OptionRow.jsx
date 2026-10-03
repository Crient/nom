import { cn } from '../../utils/cn'

/**
 * One "Categories Container" row holding a pair of option cards.
 *
 * Preserve the two-card Figma row while allowing each column to shrink.
 */
export default function OptionRow({ top, left, gap = 30.27, className, children }) {
  return (
    <div
      style={{ top, left, right: Math.max(6, 440 - left - 426.803) }}
      className={cn(
        'absolute flex h-[144.538px] flex-col items-center justify-center bg-surface',
        className,
      )}
    >
      <div
        className="grid w-full grid-cols-2 px-[20px] drop-shadow-tile"
        style={{ gap }}
      >
        {children}
      </div>
    </div>
  )
}
