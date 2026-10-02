import { cn } from '../../utils/cn'

/** Base surface for the card family in 04 - Cards. */
export default function Card({ as: Tag = 'div', selected = false, className, children, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-md bg-surface shadow-card',
        selected ? 'border border-primary-teal' : 'border border-progress-track',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
