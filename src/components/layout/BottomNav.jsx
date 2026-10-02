import { NavLink } from 'react-router-dom'
import { cn } from '../../utils/cn'

/**
 * Fixed bottom tab bar.
 *
 * `items` is a list of { to, label, icon } so the shell stays free of
 * product-specific navigation. `icon` receives the active state.
 */
export default function BottomNav({ items = [], className }) {
  if (items.length === 0) return null

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-1/2 z-10 w-full max-w-app -translate-x-1/2',
        'h-bottom-nav border-t border-progress-track bg-surface',
        className,
      )}
    >
      <ul className="flex h-full items-center justify-around">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex w-14 flex-col items-center gap-1',
                  isActive ? 'text-primary-teal' : 'text-text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {typeof item.icon === 'function' ? item.icon({ isActive }) : item.icon}
                  <span className="text-label">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
