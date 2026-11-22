import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppProviders } from '../app/AppProviders'
import { routes } from '../app/router'

/** Renders the whole app (real routes + providers) starting at `path`. Returns the router to inspect the URL. */
export function renderApp(path: string) {
  // Fresh cache per test, and no retries so failed requests fail immediately.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}