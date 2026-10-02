import { cn } from '../../utils/cn'

/** Variants mirror 02 - Controls: Primary, Secondary and Alt buttons. */
const VARIANTS = {
  primary: 'bg-primary-teal text-on-primary',
  secondary: 'bg-secondary-fill text-brand-teal',
  alt: 'bg-soft-teal-2 border border-teal-highlight text-brand-teal',
}

/** `cta` is the full-width button used at the bottom of a screen. */
const SIZES = {
  md: 'px-6 py-3',
  cta: 'h-cta w-full',
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
        'inline-flex items-center justify-center gap-[14.08px] rounded-md text-cta',
        'transition-opacity active:opacity-80 disabled:opacity-50',
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
