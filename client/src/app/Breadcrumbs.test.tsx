import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ManagedEvent } from '../features/events/eventsApi'
import { jsonResponse, mockFetch } from '../test/fetchMock'
import { renderApp } from '../test/renderApp'

const admin = { id: 1, displayName: 'Thompson, Margaret A', isApprover: true }
const jsmith = { id: 3, displayName: 'Smith, John Michael', isApprover: false }

const pta: ManagedEvent = {
  id: 7,
  title: 'PTA Meeting',
  location: 'Library',
  description: null,
  date: '2026-11-03',
  time: '18:30:00',
  isApproved: true,
  creatorName: 'Jones, Maria',
  createdAtUtc: '2026-11-01T10:00:00Z',
  approverName: 'Thompson, Margaret A',
  approvedAtUtc: '2026-11-01T11:00:00Z',
}

function setUpApi(user: typeof admin) {
  localStorage.setItem('usal.token', 'saved-token')
  const fetchMock = mockFetch()
  fetchMock.mockImplementation(async (input) => {
    const url = String(input)
    if (url === '/api/auth/me') return jsonResponse(200, user)
    if (url === '/api/events/7') return jsonResponse(200, pta)
    return jsonResponse(200, [])
  })
  return fetchMock
}

const breadcrumb = () => screen.getByRole('navigation', { name: 'Breadcrumb' })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('breadcrumbs', () => {
  it('the calendar reads "USAL › Calendar", with Calendar as the current page', async () => {
    setUpApi(jsmith)
    renderApp('/')

    await screen.findByRole('heading', { name: /school calendar/i })
     expect(within(breadcrumb()).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(breadcrumb()).getByText('Calendar')).toHaveAttribute('aria-current', 'page')
  })

    it('the calendar reads "Home › Calendar", with Calendar as the current page', async () => {
    setUpApi(admin)
    renderApp('/events/7')

    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(await within(nav).findByText('PTA Meeting')).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/events')
  })

  it('the event crumb never requests the event itself: normal users are redirected without a request', async () => {
    const fetchMock = setUpApi(jsmith)
    const router = renderApp('/events/7')

    await screen.findByRole('heading', { name: /school calendar/i })
    expect(router.state.location.pathname).toBe('/')
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/events/7')).toHaveLength(0)
  })
})
