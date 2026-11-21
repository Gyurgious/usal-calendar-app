import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/router'
import { jsonResponse, mockFetch } from '../../test/fetchMock'
import { AuthProvider } from './AuthProvider'

const admin = { id: 1, displayName: 'Thompson, Margaret A', isApprover: true }

/** Renders the whole app (real routes + AuthProvider) starting at `path`. */
function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

let fetchMock: ReturnType<typeof mockFetch>

beforeEach(() => {
  fetchMock = mockFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('auth flow', () => {
  it('redirects a signed-out user to the login page', async () => {
    const router = renderApp('/')

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('signs in, shows the user in the navbar, then signs out', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { token: 'token-123', user: admin }))
    const router = renderApp('/')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Logon name'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'Admin123!')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Thompson, Margaret A')).toBeInTheDocument()
    expect(screen.getByText('Approver')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(localStorage.getItem('usal.token')).toBe('token-123')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(localStorage.getItem('usal.token')).toBeNull()
  })

  it('shows an error for a wrong password', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { title: 'Unauthorized', status: 401 }))
    renderApp('/login')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Logon name'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login name or password.')
    expect(localStorage.getItem('usal.token')).toBeNull()
  })

  it('restores the session from a saved token (page refresh)', async () => {
    localStorage.setItem('usal.token', 'saved-token')
    fetchMock.mockResolvedValueOnce(jsonResponse(200, admin))
    renderApp('/')

    expect(await screen.findByText('Thompson, Margaret A')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/me')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer saved-token')
  })

  it('clears an expired token and sends the user to login', async () => {
    localStorage.setItem('usal.token', 'expired-token')
    fetchMock.mockResolvedValue(jsonResponse(401, { title: 'Unauthorized' }))
    const router = renderApp('/')

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem('usal.token')).toBeNull())
    expect(router.state.location.pathname).toBe('/login')
  })

  it('sends a signed-in user away from /login to the calendar', async () => {
    localStorage.setItem('usal.token', 'saved-token')
    fetchMock.mockResolvedValue(jsonResponse(200, admin))
    const router = renderApp('/login')

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
