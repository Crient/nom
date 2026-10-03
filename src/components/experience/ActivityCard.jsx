import { Link } from 'react-router-dom'
import Image from '../ui/Image'
import DishTitle from '../ui/DishTitle'
import '../../styles/recommendations.css'
import { recommendationReturnTo } from '../../utils/navigation'

export default function ActivityCard({ entry, returnTo = '/history', compact = false }) {
  const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return <Link to={entry.to} state={{ returnTo: recommendationReturnTo(returnTo) }} className={`activity-card ${compact ? 'activity-card-compact' : ''}`}>
    <Image src={entry.dish.image} alt="" loading="lazy" /><span><strong><DishTitle dish={entry.dish} /></strong><small>{entry.label}</small><time dateTime={entry.date}>{date} · {entry.dish.country}</time></span>
  </Link>
}
