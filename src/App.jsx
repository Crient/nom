import { BrowserRouter, useRoutes } from 'react-router-dom'
import { DiscoverySessionProvider } from './context/DiscoverySession'
import { routes } from './routes'

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <BrowserRouter>
      <DiscoverySessionProvider>
        <AppRoutes />
      </DiscoverySessionProvider>
    </BrowserRouter>
  )
}
