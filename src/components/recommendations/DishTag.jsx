import { cn } from '../../utils/cn'

export default function DishTag({ label, size = 'hero' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-teal-tint font-bold text-text-secondary',
        size === 'hero'
          ? 'h-[20.575px] px-[11px] text-[12.345px] leading-[12.345px]'
          : 'h-[17.508px] px-[10px] text-[10.505px] leading-[10.505px]',
      )}
    >
      {label}
    </span>
  )
}
