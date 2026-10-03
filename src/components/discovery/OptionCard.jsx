import Image from '../ui/Image'
import { cn } from '../../utils/cn'
import checkIcon from '../../assets/icons/check.svg'

/**
 * Selectable option card used by the discovery question screens.
 *
 * Each card's artwork sits in its own box and is cropped differently, so the
 * image geometry is supplied per option rather than normalised here. Some
 * artwork is mirrored in Figma, which `flipped` reproduces.
 *
 * The outline is drawn as an overlay rather than a border so that the check
 * badge is positioned against the card's outer edge, the way Figma measures
 * it — a real border would shift every absolute child inwards.
 */
export default function OptionCard({
  label,
  image,
  imageBox,
  imageCrop,
  flipped = false,
  width,
  checkbox,
  raised = false,
  selected = false,
  onSelect,
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'relative flex h-[125px] min-w-0 w-full flex-col items-center justify-center gap-[8.075px] rounded-md',
        selected && 'bg-soft-teal-2',
        raised && 'shadow-card',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute inset-0 rounded-md border-[0.86px] border-solid',
          selected ? 'border-alt-teal' : 'border-strong-neutral/20',
        )}
      />

      <span className={cn('shrink-0', flipped && '-scale-y-100 rotate-180')}>
        <span
          className="relative block overflow-hidden"
          style={{ width: imageBox.width, height: imageBox.height }}
        >
          <Image
            src={image}
            alt=""
            className="absolute w-full max-w-none"
            style={{ height: imageCrop.height, left: imageCrop.left, top: imageCrop.top }}
          />
        </span>
      </span>

      <span className="text-tile-label tracking-tile text-center text-text-primary">
        {label}
      </span>

      {selected && (
        <span
          className="absolute size-[23.077px] rounded-full bg-alt-teal"
          style={{ right: width - checkbox.left - 23.077, top: checkbox.top }}
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
