import { cn } from '../../utils/cn'

/** Variants mirror 02 - Controls: Primary, Secondary and Alt buttons. */
const VARIANTS = {
  primary: 'bg-primary-teal text-on-primary',
  secondary: 'bg-secondary-fill text-brand-teal',
  alt: 'bg-soft-teal-2 border border-teal-highlight text-brand-teal',
  soft: 'bg-soft-teal-2 text-alt-teal',
}

/**
 * `cta` is the full-width button at the bottom of the welcome sheet;
 * `discovery` is the fixed-size Continue button on the question screens.
 */
const SIZES = {
  md: 'rounded-md px-6 py-3 text-cta',
  cta: 'h-cta w-full rounded-md text-cta',
  discovery: 'h-[80px] w-[386px] rounded-lg text-button tracking-meta',
  none: '',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-[14.08px]',
        'transition-opacity active:opacity-80',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
