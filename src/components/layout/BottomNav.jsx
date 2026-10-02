import { NavLink } from 'react-router-dom'
import { cn } from '../../utils/cn'

/**
 * Bottom tab bar. Positioning belongs to the caller, so the same bar works
 * whether a screen pins it or lets it sit at the end of the shell column.
 *
 * `items` is a list of { label, icon, to }. Items without a `to` render as
 * plain labels, which keeps the bar usable before every route exists.
 */
export default function BottomNav({ items = [], className }) {
  if (items.length === 0) return null

  return (
    <nav className={cn('flex h-bottom-nav items-center', className)}>
      <ul className="flex w-full items-start justify-between px-[42.443px]">
        {items.map((item) => (
          <li key={item.label}>
            <Tab {...item} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Tab({ label, icon, to }) {
  const content = (
    <>
      {icon}
      <span className="text-center text-nav-label tracking-nav-label whitespace-nowrap">
        {label}
      </span>
    </>
  )

  const shape = 'flex h-[47.159px] w-[56.59px] flex-col items-center justify-between px-[15.327px]'

  if (!to) {
    return <div className={cn(shape, 'text-text-muted')}>{content}</div>
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(shape, isActive ? 'text-primary-teal' : 'text-text-muted')
      }
    >
      {content}
    </NavLink>
  )
}
