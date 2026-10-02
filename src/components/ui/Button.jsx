import { cn } from '../../utils/cn'

/** Variants mirror 02 - Controls: Primary, Secondary and Alt buttons. */
const VARIANTS = {
  primary: 'bg-primary-teal text-surface',
  secondary: 'bg-soft-teal text-primary-teal',
  alt: 'bg-soft-teal-2 border border-teal-highlight text-primary-teal',
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-6 py-3',
        'text-heading transition-opacity active:opacity-80 disabled:opacity-50',
        VARIANTS[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
