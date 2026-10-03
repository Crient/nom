import { Link, useLocation } from 'react-router-dom'

/** A keyboard-accessible card link, kept separate from the favorite button. */
export default function DishDetailsLink({ dish }) {
  const { pathname } = useLocation()
  const returnTo = pathname === '/recommendations/more' ? pathname : '/recommendations'

  return (
    <Link
      to={`/recommendations/${dish.id}`}
      state={{ returnTo }}
      className="absolute inset-0 z-20 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-teal"
    >
      <span className="sr-only">View {dish.name} details</span>
    </Link>
  )
}
