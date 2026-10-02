import RootLayout from './components/layout/RootLayout'
import Welcome from './pages/Welcome'

/**
 * Central route table. Each Figma screen becomes one entry under the layout
 * route as it is built.
 */
export const routes = [
  {
    element: <RootLayout />,
    children: [{ index: true, element: <Welcome /> }],
  },
]
