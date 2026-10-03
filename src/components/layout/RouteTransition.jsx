import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Shared policy for PUSH, REPLACE and Back: introduce every screen at its top. */
export default function RouteTransition() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const main = document.getElementById('main-content')
    const introduceScreen = () => {
      main?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    introduceScreen()
    // Initial document loading can restore native focus after React commits.
    if (document.readyState !== 'complete') {
      window.addEventListener('load', introduceScreen, { once: true })
    }
    document.title = `${main?.querySelector('h1')?.textContent ?? 'Welcome'} · Nom`
    return () => {
      window.removeEventListener('load', introduceScreen)
      window.history.scrollRestoration = previous
    }
  }, [pathname])

  return null
}
