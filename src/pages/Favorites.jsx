import { useState } from 'react'
import { Link } from 'react-router-dom'
import HubLayout, { HubEmpty } from '../components/layout/HubLayout'
import FilterChip from '../components/ui/FilterChip'
import RecommendationCard from '../components/recommendations/RecommendationCard'
import RestaurantCard from '../components/restaurants/RestaurantCard'
import CollectibleArtwork, { RarityBadge } from '../components/experience/CollectibleArtwork'
import { useFavorites } from '../context/Favorites'
import { useExperience } from '../context/Experience'
import { dishes } from '../data/dishes'
import { mockRestaurants } from '../data/mockRestaurants'
import { collectionCountries, collectibleDefinitions } from '../data/collectionDefinitions'
import { useNavigate } from 'react-router-dom'
import '../styles/nearby.css'

export default function Favorites() {
  const [view, setView] = useState('Dishes'), favorites = useFavorites(), { state } = useExperience(), navigate = useNavigate()
  const savedDishes = favorites.favoriteIds.map(id => dishes.find(dish => dish.id === id)).filter(Boolean)
  const restaurants = favorites.restaurantIds.map(id => mockRestaurants.find(restaurant => restaurant.id === id)).filter(Boolean)
  const count = view === 'Dishes' ? savedDishes.length : view === 'Restaurants' ? restaurants.length : state.favorites.length
  return <HubLayout title="Your" accent="Favorites">
    <div className="hub-filters" role="group" aria-label="Favorite type">{['Dishes', 'Restaurants', 'Collectibles'].map(label => <FilterChip key={label} solid selected={view === label} onClick={() => setView(label)}>{label}</FilterChip>)}</div>
    {!count && <HubEmpty action={<Link className="hub-action" to={view === 'Collectibles' ? '/collections' : '/explore'}>Explore {view === 'Collectibles' ? 'Collections' : 'dishes'}</Link>}>Your saved {view.toLowerCase()} will appear here.</HubEmpty>}
    {view === 'Dishes' && <div className="hub-dishes">{savedDishes.map(dish => <RecommendationCard key={dish.id} result={{ dish }} variant="list" liked onToggleLike={() => favorites.toggleFavorite(dish.id)} />)}</div>}
    {view === 'Restaurants' && <><p className="flow-demo">Saved development restaurants. Menus and availability are examples.</p><div className="hub-restaurants">{restaurants.map(restaurant => <RestaurantCard key={restaurant.id} restaurant={restaurant} dish={dishes.find(dish => dish.id === restaurant.dishId)} actionLabel={`View ${restaurant.name} details`} onSelect={() => navigate(`/recommendations/${restaurant.dishId}/nearby/${restaurant.id}`, { state: { returnTo: '/favorites', view: 'list' } })} />)}</div></>}
    {view === 'Collectibles' && <div className="hub-collectibles">{state.favorites.map(key => {
      const [countryId, collectibleId] = key.split(':'), country = collectionCountries.find(item => item.id === countryId), collectible = collectibleDefinitions.find(item => item.id === collectibleId)
      return country && collectible && <Link key={key} to={`/collections/${countryId}/${collectibleId}`} state={{ returnTo: '/favorites' }}><CollectibleArtwork country={country} collectible={collectible} isUnlocked /><strong>{collectible.name} · {country.name}</strong><RarityBadge rarity={collectible.rarity} /></Link>
    })}</div>}
  </HubLayout>
}
