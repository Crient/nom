import { cn } from '../../utils/cn'

/**
 * One "Categories Container" row holding a pair of option cards.
 *
 * Preserve the two-card Figma row while allowing each column to shrink.
 */
export default function OptionRow({ gap = 30.27, className, children }) {
  return (
    <div
      className={cn(
        'discovery-option-row flex flex-col items-center justify-center bg-surface',
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
