import { cn } from '../../utils/cn'

/** A Figma pill inside a 44px button, shared by collection and feedback filters. */
export default function FilterChip({ selected, solid = false, children, className, ...props }) {
  return <button type="button" aria-pressed={selected} className={cn('nom-filter-chip', solid && 'nom-filter-chip-solid', className)} {...props}><span>{children}</span></button>
}
