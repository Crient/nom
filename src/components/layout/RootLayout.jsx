import { Outlet } from 'react-router-dom'
import AppShell from './AppShell'
import RouteTransition from './RouteTransition'

/**
 * Layout route. Screens render into the Outlet inside the mobile shell.
 *
 * Screens own their Figma headers and navigation; the shell supplies route
 * focus, scroll reset, and one accessible fallback while a screen loads.
 */
export default function RootLayout() {
  return (
    <AppShell>
      <RouteTransition />
      <Suspense fallback={<div role="status" className="px-page-gutter py-12 text-center">Loading Nom…</div>}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}
import { Suspense } from 'react'
