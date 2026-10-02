import { BrowserRouter, useRoutes } from 'react-router-dom'
import { DiscoverySessionProvider } from './context/DiscoverySession'
import { FavoritesProvider } from './context/Favorites'
import { routes } from './routes'

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <BrowserRouter>
      <DiscoverySessionProvider>
        <FavoritesProvider>
          <AppRoutes />
        </FavoritesProvider>
      </DiscoverySessionProvider>
    </BrowserRouter>
  )
}
