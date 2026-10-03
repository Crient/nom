import { Outlet } from 'react-router-dom'
import AppShell from './AppShell'
import RouteTransition from './RouteTransition'

/**
 * Layout route. Screens render into the Outlet inside the mobile shell.
 *
 * TopBar and BottomNav are intentionally not mounted yet — pass them to
 * AppShell once the screens that need them exist.
 */
export default function RootLayout() {
  return (
    <AppShell>
      <RouteTransition />
      <Outlet />
    </AppShell>
  )
}
