import RootLayout from './components/layout/RootLayout'
import Welcome from './pages/Welcome'
import Home from './pages/Home'
import FoodType from './pages/FoodType'
import Flavor from './pages/Flavor'
import Adventure from './pages/Adventure'
import Region from './pages/Region'
import Recommendations from './pages/Recommendations'
import MoreOptions from './pages/MoreOptions'
import DishDetails from './pages/DishDetails'

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
      { path: 'recommendations/:dishId', element: <DishDetails /> },
    ],
  },
]
