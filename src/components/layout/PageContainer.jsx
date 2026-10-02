import { cn } from '../../utils/cn'

/** Applies the standard page gutter. Use inside AppShell's main slot. */
export default function PageContainer({ children, className }) {
  return <div className={cn('px-gutter py-4', className)}>{children}</div>
}
