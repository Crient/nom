import Image from '../ui/Image'
import { cn } from '../../utils/cn'
import checkIcon from '../../assets/icons/check.svg'

const IMAGE_CROP = { height: '118.56%', left: '1.31%', top: '-0.04%', width: '95.75%' }
const CHECKBOX = { top: 5.23 }

/**
 * 190×125 cuisine-region tile. Same check-badge treatment as OptionCard, but
 * the frame is a different size, includes a subtitle, and uses a fixed 80px
 * illustration — not a match for OptionCard or ListOption.
 */
export default function RegionCard({
  label,
  subtitle,
  image,
  titleSize,
  selected = false,
  onSelect,
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'relative flex min-h-[125px] min-w-0 w-full flex-col items-center justify-center gap-[2px] rounded-md',
        selected ? 'bg-soft-teal-2' : 'bg-surface shadow-card',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute inset-0 rounded-md border-[0.86px] border-solid',
          selected ? 'border-alt-teal' : 'border-transparent',
        )}
      />

      <span className="relative size-[80px] shrink-0 overflow-hidden">
        <Image
          src={image}
          alt=""
          className="absolute max-w-none"
          style={IMAGE_CROP}
        />
      </span>

      <span
        className="font-semibold tracking-tile whitespace-nowrap text-text-primary"
        style={{ fontSize: titleSize ?? 18, lineHeight: '22px' }}
      >
        {label}
      </span>
      <span className="px-[3px] text-center text-[10px] leading-[14px] font-light tracking-tile text-text-primary">
        {subtitle}
      </span>

      {selected && (
        <span
          className="absolute size-[23.077px] rounded-full bg-alt-teal"
          style={{ right: 7.323, top: CHECKBOX.top }}
        >
          <img
            src={checkIcon}
            alt=""
            className="absolute top-[4.44px] left-[4.44px] size-[13.314px] max-w-none"
          />
        </span>
      )}
    </button>
  )
}
