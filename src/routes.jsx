import { lazy } from 'react'
import RootLayout from './components/layout/RootLayout'
import Welcome from './pages/Welcome'
import Home from './pages/Home'
import FoodType from './pages/FoodType'
import Flavor from './pages/Flavor'
import Adventure from './pages/Adventure'
import Region from './pages/Region'
import { Navigate } from 'react-router-dom'

// Load results, restaurant, visit, and reward screens when that part of the
// journey is reached. Welcome, Home, and discovery stay immediately available.
const Recommendations = lazy(() => import('./pages/Recommendations'))
const SurpriseMe = lazy(() => import('./pages/SurpriseMe'))
const MoreOptions = lazy(() => import('./pages/MoreOptions'))
const DishDetails = lazy(() => import('./pages/DishDetails'))
const NearbyRestaurants = lazy(() => import('./pages/NearbyRestaurants'))
const RestaurantDetails = lazy(() => import('./pages/RestaurantDetails'))
const VerifyVisit = lazy(() => import('./pages/VerifyVisit'))
const MealFeedback = lazy(() => import('./pages/MealFeedback'))
const ExperienceLogged = lazy(() => import('./pages/ExperienceLogged'))
const SurpriseBox = lazy(() => import('./pages/SurpriseBox'))
const Collections = lazy(() => import('./pages/Collections'))
const CountryCollection = lazy(() => import('./pages/CountryCollection'))
const CollectibleDetails = lazy(() => import('./pages/CollectibleDetails'))
const Progress = lazy(() => import('./pages/Progress'))
const Profile = lazy(() => import('./pages/Profile'))
const Favorites = lazy(() => import('./pages/Favorites'))
const History = lazy(() => import('./pages/History'))
const Explore = lazy(() => import('./pages/Explore'))
const Scan = lazy(() => import('./pages/Scan'))
const ImageCredits = lazy(() => import('./pages/ImageCredits'))
const PlacesPolicy = lazy(() => import('./pages/PlacesPolicy'))
const RewardPlayground = import.meta.env.DEV ? lazy(() => import('./pages/RewardPlayground')) : null

/**
 * Central route table. Each Figma screen becomes one entry under the layout
 * route as it is built.
 */
export const routes = [
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Welcome /> },
      { path: 'home', element: <Home /> },
      { path: 'progress', element: <Progress /> },
      { path: 'profile', element: <Profile /> },
      ...(import.meta.env.DEV ? [{ path: 'dev/rewards', element: <RewardPlayground /> }] : []),
      { path: 'favorites', element: <Favorites /> },
      { path: 'history', element: <History /> },
      { path: 'explore', element: <Explore /> },
      { path: 'scan', element: <Scan /> },
      { path: 'image-credits', element: <ImageCredits /> },
      { path: 'terms', element: <PlacesPolicy /> },
      { path: 'privacy', element: <PlacesPolicy privacy /> },
      { path: 'discover/food-type', element: <FoodType /> },
      { path: 'discover/flavor', element: <Flavor /> },
      { path: 'discover/adventure', element: <Adventure /> },
      { path: 'discover/region', element: <Region /> },
      { path: 'recommendations', element: <Recommendations /> },
      { path: 'recommendations/surprise', element: <SurpriseMe /> },
      { path: 'recommendations/more', element: <MoreOptions /> },
      { path: 'recommendations/nearby', element: <NearbyRestaurants /> },
      { path: 'recommendations/:dishId/nearby', element: <NearbyRestaurants /> },
      { path: 'recommendations/:dishId/nearby/:restaurantId', element: <RestaurantDetails /> },
      { path: 'recommendations/:dishId', element: <DishDetails /> },
      { path: 'visits/:visitId/verify', element: <VerifyVisit /> },
      { path: 'visits/:visitId/feedback', element: <MealFeedback /> },
      { path: 'visits/:visitId/logged', element: <ExperienceLogged /> },
      { path: 'boxes/:boxId', element: <SurpriseBox /> },
      { path: 'boxes/:boxId/opening', element: <SurpriseBox phase="opening" /> },
      { path: 'boxes/:boxId/reveal', element: <SurpriseBox phase="reveal" /> },
      { path: 'collections', element: <Collections /> },
      { path: 'collections/:countryId', element: <CountryCollection /> },
      { path: 'collections/:countryId/:collectibleId', element: <CollectibleDetails /> },
      { path: '*', element: <Navigate to="/home" replace /> },
    ],
  },
]
