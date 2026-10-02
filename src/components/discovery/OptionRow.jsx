import { cn } from '../../utils/cn'

/**
 * One "Categories Container" row holding a pair of option cards.
 *
 * The container is narrower than the cards it holds, so the content overflows
 * and is clipped — `justify-center` then wins over the padding. That is how
 * Figma lays the row out, and the same container recurs on every discovery
 * question screen.
 */
export default function OptionRow({ top, left, gap = 30.27, className, children }) {
  return (
    <div
      style={{ top, left }}
      className={cn(
        'absolute flex h-[144.538px] w-[426.803px] flex-col items-center justify-center overflow-hidden bg-surface py-[22.111px]',
        className,
      )}
    >
      <div
        className="flex items-center justify-center px-[21.535px] drop-shadow-tile"
        style={{ gap }}
      >
        {children}
      </div>
    </div>
  )
}
