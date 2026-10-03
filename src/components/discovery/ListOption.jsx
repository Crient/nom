import Image from '../ui/Image'
import { cn } from '../../utils/cn'

/**
 * Full-width discovery choice used by Adventurousness (and likely Region).
 *
 * This is a different structure from OptionCard: icon + title + subtitle in a
 * 381×100 row, not a 177×125 tile. The outer 427×115 clip container matches
 * the "Categories Container" wrapping each row in Figma.
 */
export default function ListOption({
  top,
  icon,
  title,
  subtitle,
  subtitleWidth,
  selected = false,
  onSelect,
}) {
  return (
    <div
      style={{ top }}
      className="absolute left-[6px] right-[7px] flex h-[115px] flex-col items-center justify-center bg-surface"
    >
      <div className="flex h-[103px] w-[calc(100%-46px)] items-center justify-center drop-shadow-tile">
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className={cn(
            'relative h-[100px] w-full overflow-hidden rounded-md shadow-card',
            selected ? 'bg-soft-teal-2' : 'bg-surface',
          )}
        >
          <span
            className={cn(
              'pointer-events-none absolute inset-0 rounded-md border-[0.86px] border-solid',
              selected ? 'border-alt-teal' : 'border-transparent',
            )}
          />

          <Image
            src={icon}
            alt=""
            className="absolute top-[-0.5px] left-[6.8%] size-[101px] max-w-none object-cover"
          />

          <div className="absolute top-0 right-0 bottom-0 left-[calc(101px+6.8%)] flex flex-col justify-center gap-[2.795px] py-[11.179px] pr-[11.179px] text-text-primary">
            <p className="text-[16.903px] leading-[22.357px] font-semibold [text-shadow:0_2.113px_2.113px_rgb(0_0_0/0.25)]">
              {title}
            </p>
            <p className="text-[11.179px] leading-[12px]" style={subtitleWidth ? { maxWidth: subtitleWidth } : undefined}>
              {subtitle}
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
