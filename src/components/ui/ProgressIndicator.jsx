import { cn } from '../../utils/cn'

/**
 * Step progress for multi-step flows: a "n of total" label plus one filled
 * marker per completed step.
 */
export default function ProgressIndicator({ current, total, showLabel = true, className }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex flex-1 gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full',
              index < current ? 'bg-primary-teal' : 'bg-progress-track',
            )}
          />
        ))}
      </div>

      {showLabel && (
        <span className="shrink-0 text-body-sm text-text-secondary">
          {current} of {total}
        </span>
      )}
    </div>
  )
}
