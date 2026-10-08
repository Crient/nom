import { Link, useSearchParams } from 'react-router-dom'
import HubLayout, { HubEmpty } from '../components/layout/HubLayout'
import SearchField from '../components/ui/SearchField'
import FilterChip from '../components/ui/FilterChip'
import RecommendationCard from '../components/recommendations/RecommendationCard'
import { useFavorites } from '../context/Favorites'
import { useExperience } from '../context/Experience'
import { searchDishes, localMealTrends } from '../utils/catalogSearch'
import { FOOD_TYPE_LABELS } from '../utils/sessionChips'

export default function Explore() {
  const [params, setParams] = useSearchParams(), favorites = useFavorites(), { state } = useExperience()
  const query = params.get('q') ?? '', foodType = params.get('foodType') ?? null, trending = params.get('view') === 'trending'
  const matches = searchDishes(query, foodType), results = trending ? localMealTrends(state.logs).filter(dish => matches.some(item => item.id === dish.id)) : matches
  const change = (key, value) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next, { replace: true }) }
  return <HubLayout title={trending ? 'Your local' : 'Explore'} accent={trending ? 'Trends' : 'Dishes'}>
    {trending ? <p className="flow-demo">Based only on meals you’ve logged. Live popularity data isn’t connected.</p> : <p>Discover the full 201-dish catalog.</p>}
    {params.get('action') === 'log' && <p className="flow-demo">Choose a dish, find a restaurant, then tap “I ate here” to log your meal.</p>}
    <form role="search" onSubmit={event => event.preventDefault()}><SearchField className="hub-search" aria-label="Search dishes" placeholder="Dish, country, or flavor…" value={query} onChange={event => change('q', event.target.value)} onClear={() => change('q', '')} /></form>
    <div className="hub-filters" role="group" aria-label="Filter food type"><FilterChip solid selected={!foodType} onClick={() => change('foodType', null)}>All</FilterChip>{Object.entries(FOOD_TYPE_LABELS).filter(([id]) => id !== 'anything').map(([id, label]) => <FilterChip solid key={id} selected={foodType === id} onClick={() => change('foodType', foodType === id ? null : id)}>{label}</FilterChip>)}</div>
    <p role="status">{results.length} {results.length === 1 ? 'dish' : 'dishes'} found</p>
    {!results.length ? <HubEmpty action={<Link className="hub-action" to="/explore">Browse all dishes</Link>}>{trending && !state.logs.length ? 'Log a meal to start your local trends.' : 'No dishes found. Try another search or food type.'}</HubEmpty>
      : <div className="hub-dishes">{results.map(dish => <RecommendationCard key={dish.id} result={{ dish }} variant="list" liked={favorites.isFavorite(dish.id)} onToggleLike={() => favorites.toggleFavorite(dish.id)} />)}</div>}
    {import.meta.env.DEV && <p className="flow-demo">Catalog review status remains unchanged. Photos use a placeholder when an accurate local image isn’t available.</p>}
  </HubLayout>
}
