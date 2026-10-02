import { cn } from '../../utils/cn'

/**
 * Screen header. All three regions are optional slots so the same bar covers
 * back-only, titled, and action-bearing headers.
 */
export default function TopBar({ leading, title, subtitle, trailing, className }) {
  return (
    <header className={cn('flex items-start gap-2 px-gutter pt-4 pb-2', className)}>
      <div className="flex min-h-6 w-6 shrink-0 items-center">{leading}</div>

      <div className="min-w-0 flex-1 text-center">
        {title && <h1 className="text-title text-text-primary">{title}</h1>}
        {subtitle && <p className="text-body text-text-secondary">{subtitle}</p>}
      </div>

      <div className="flex min-h-6 w-6 shrink-0 items-center justify-end">{trailing}</div>
    </header>
  )
}
