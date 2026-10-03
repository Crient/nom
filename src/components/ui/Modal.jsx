import { useEffect } from 'react'
import { cn } from '../../utils/cn'

/** Centred sheet used by the edge-state and info modals. */
export default function Modal({ open, onClose, className, children }) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center px-page-gutter">
      <div
        className="absolute inset-0 bg-strong-neutral/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn('relative w-full max-w-app rounded-lg bg-surface p-6 shadow-card', className)}
      >
        {children}
      </div>
    </div>
  )
}
