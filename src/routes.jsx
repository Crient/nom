import RootLayout from './components/layout/RootLayout'
import Home from './pages/Home'

/**
 * Central route table. Each Figma screen becomes one entry under the layout
 * route as it is built.
 */
export const routes = [
  {
    element: <RootLayout />,
    children: [{ index: true, element: <Home /> }],
  },
]
