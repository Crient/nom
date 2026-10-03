import { BrowserRouter, useRoutes } from 'react-router-dom'
import { DiscoverySessionProvider } from './context/DiscoverySession'
import { FavoritesProvider } from './context/Favorites'
import { ExperienceProvider } from './context/Experience'
import { ActivityProvider } from './context/Activity'
import { routes } from './routes'

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <BrowserRouter>
      <DiscoverySessionProvider>
        <FavoritesProvider>
          <ExperienceProvider><ActivityProvider><AppRoutes /></ActivityProvider></ExperienceProvider>
        </FavoritesProvider>
      </DiscoverySessionProvider>
    </BrowserRouter>
  )
}
