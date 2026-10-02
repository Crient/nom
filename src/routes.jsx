import RootLayout from './components/layout/RootLayout'
import Welcome from './pages/Welcome'
import Home from './pages/Home'
import FoodType from './pages/FoodType'
import Flavor from './pages/Flavor'

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
    ],
  },
]
