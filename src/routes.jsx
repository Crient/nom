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
      { path: 'discover/food-type', element: <FoodType /> },
      { path: 'discover/flavor', element: <Flavor /> },
      { path: 'discover/adventure', element: <Adventure /> },
      { path: 'discover/region', element: <Region /> },
      { path: 'recommendations', element: <Recommendations /> },
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
import { lazy } from 'react'
