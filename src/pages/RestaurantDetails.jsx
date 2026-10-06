import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { dishes } from '../data/dishes'
import { restaurantPresentation } from '../data/restaurantDetails'
import { useRestaurant } from '../hooks/useRestaurant'
import { useRecommendations } from '../hooks/useRecommendations'
import { useExperience } from '../context/Experience'
import { useFavorites } from '../context/Favorites'
import { FlowHeader, FlowState } from '../components/experience/FlowLayout'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import RestaurantPhoto from '../components/restaurants/RestaurantPhoto'
import HeartButton from '../components/recommendations/HeartButton'
import DishTag from '../components/recommendations/DishTag'
import Image from '../components/ui/Image'
import DishTitle from '../components/ui/DishTitle'
import '../styles/recommendations.css'
import star from '../assets/icons/restaurant-preview-star.svg'
import directions from '../assets/experience/directions.svg'
import phone from '../assets/experience/phone.svg'
import website from '../assets/experience/website.svg'
import friends from '../assets/experience/friends.svg'
import share from '../assets/experience/share.svg'
import ate from '../assets/experience/ate-here.webp'
import LiveRestaurantDetails from '../components/restaurants/LiveRestaurantDetails'

export default function RestaurantDetails() {
  const { dishId, restaurantId } = useParams(), navigate = useNavigate(), location = useLocation()
  const dish = dishes.find(item => item.id === dishId)
  const { ready } = useRecommendations()
  const data = useRestaurant(ready ? dish?.id : undefined, restaurantId)
  const { startVisit } = useExperience()
  const { isRestaurantFavorite, toggleRestaurantFavorite } = useFavorites()
  const [modal, setModal] = useState(null), [message, setMessage] = useState('')
  useEffect(() => {
    if (location.hash === '#popular-menu' && data.restaurant) document.getElementById('popular-menu')?.scrollIntoView?.({ block: 'start' })
  }, [location.hash, data.restaurant?.id])
  const nearby = `/recommendations/${dishId}/nearby`
  const returnState = { returnTo: location.state?.returnTo, view: location.state?.view ?? 'list', selectedRestaurantId: restaurantId }
  const back = () => navigate(dish ? nearby : '/home', { state: returnState })
  if (!dish) return <FlowState title="Dish not found" onBack={() => navigate('/home')}>Choose a dish before opening a restaurant.</FlowState>
  if (!ready) return <Navigate to="/discover/food-type" replace state={{ ...location.state, discoveryReturnTo: location.pathname }} />
  if (data.status === 'loading') return <FlowState title="Loading restaurant…" backLabel="Back to nearby restaurants" onBack={back}>Getting the restaurant preview.</FlowState>
  if (data.status === 'error') return <FlowState title="Restaurant unavailable" onBack={back} onRetry={data.retry}>Please try again.</FlowState>
  if (!data.restaurant) return <FlowState title="Restaurant not found" backLabel="Back to nearby restaurants" onBack={back}>This restaurant is not available for {dish.name}.</FlowState>
  const restaurant = data.restaurant
  if (restaurant.source === 'google-places') return <LiveRestaurantDetails restaurant={restaurant} dish={dish} back={back} returnState={returnState} />
  if (!import.meta.env.DEV) return <FlowState title="Restaurant unavailable" backLabel="Back to nearby restaurants" onBack={back}>Refresh nearby search for current restaurant details.</FlowState>
  const presentation = restaurantPresentation(restaurant, dish)
  const preview = text => { setMessage(text); setModal('preview') }
  const shareLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(window.location.href)
      preview('Restaurant link copied. You can paste it into a message to a friend.')
    } catch { preview(`Share this restaurant by copying the page address: ${window.location.href}`) }
  }
  const actions = [
    { label: 'Directions', icon: directions, action: () => navigate(nearby, { state: { ...returnState, view: 'map' } }) },
    { label: 'Call', icon: phone, action: () => preview('Phone numbers are not connected in this development preview.') },
    { label: 'Website', icon: website, action: () => preview('Restaurant websites are not connected in this development preview.') },
    { label: 'Send to Friend', icon: friends, action: () => preview('Friends on Nom are coming soon.') },
    { label: 'Share', icon: share, action: shareLink },
  ]
  return <div className="flow-page restaurant-details-page">
    <FlowHeader onBack={back} onInfo={() => preview('Restaurant details, menus, ratings, and opening hours are Figma development examples.')}>
      <HeartButton dishName={restaurant.name} liked={isRestaurantFavorite(restaurant.id)} onToggle={() => toggleRestaurantFavorite(restaurant.id)} size={37} className="top-[64px] right-[49px]" />
    </FlowHeader>
    <RestaurantPhoto src={presentation.image} alt={restaurant.name} cropped={presentation.imageCrop} />
    <div className="restaurant-details-copy">
      <h1>{restaurant.name}</h1>
      <p className="restaurant-details-meta">{restaurant.distance} mi • {restaurant.cuisine} • {'$'.repeat(restaurant.priceLevel)}</p>
      <p className="restaurant-details-rating"><img src={star} alt="" /><strong>{restaurant.rating}</strong> ({restaurant.reviewCount}) • <span>{restaurant.isOpen ? 'Open' : 'Closed'}</span></p>
      <div className="restaurant-details-tags">{[dish.name, ...restaurant.tags].map(tag => <DishTag key={tag} label={tag} />)}</div>
      <div className="restaurant-actions">{actions.map(action => <button key={action.label} type="button" onClick={action.action}><span><img src={action.icon} alt="" /></span><strong>{action.label}</strong></button>)}</div>
      <button type="button" className="restaurant-ate" onClick={() => {
        const id = startVisit({ dish, restaurant, returnState }); navigate(`/visits/${id}/verify`)
      }}><Image src={ate} alt="" />I ate here</button>
      <section className="restaurant-about"><h2>About</h2><p>{presentation.about}</p><button type="button" className="restaurant-about-more" onClick={() => preview(`Development preview for ${restaurant.name} in ${restaurant.address}. Searching for ${dish.name}. Menus and availability are examples, and live contact details are not connected.`)}>See more</button></section>
      <section id="popular-menu" className="restaurant-menu"><h2>More dishes from this cuisine</h2><p className="restaurant-availability-note">Explore Nom’s {presentation.cuisine} catalog. Check the restaurant’s menu for availability.</p><div>{presentation.menu.map(item => <article key={item.name}>
        <button type="button" aria-label={`View ${item.name} details`} onClick={() => navigate(`/recommendations/${item.dishId}`, { state: { returnTo: location.state?.returnTo } })}><Image src={item.image} alt="" /><strong><DishTitle dish={dishes.find(dish => dish.id === item.dishId)} /></strong></button>
      </article>)}</div></section>
    </div>
    <EdgeStateModal kind={modal} message={message} onClose={() => setModal(null)} />
  </div>
}
