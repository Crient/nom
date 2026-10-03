import { useEffect, useRef } from 'react'
import { cn } from '../../utils/cn'

/** Centred sheet used by the edge-state and info modals. */
export default function Modal({ open, onClose, className, children, labelledBy, overlayClassName }) {
  const dialog = useRef(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close.current?.()
      if (event.key !== 'Tab') return
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')]
      const first = controls[0], last = controls.at(-1)
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
        event.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className={cn('fixed inset-0 z-20 flex items-center justify-center px-page-gutter', overlayClassName)}>
      <div
        className="absolute inset-0 bg-strong-neutral/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={dialog}
        className={cn('relative w-full max-w-app rounded-lg bg-surface p-6 shadow-card', className)}
      >
        {children}
      </div>
    </div>
  )
}
