import { cn } from '../../utils/cn'

/**
 * Covers the chip family in 02 - Controls: content tags, filter chips and
 * feedback tags. `tag` is the static pill, `filter` is interactive.
 */
const VARIANTS = {
  tag: 'bg-tag-teal text-text-primary',
  filter: 'bg-surface border border-progress-track text-text-secondary',
  selected: 'bg-primary-teal text-surface',
}

export default function Chip({ variant = 'tag', as, className, children, ...props }) {
  const Tag = as ?? (variant === 'tag' ? 'span' : 'button')

  return (
    <Tag
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-label',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
