import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../../test/fetchMock'
import { renderApp } from '../../test/renderApp'
import type { CalendarEvent } from './calendarApi'

const jsmith = { id: 3, displayName: 'Smith, John Michael', isApprover: false }

const event = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: 1,
  title: 'Event',
  location: null,
  description: null,
  date: '2026-11-05',
  time: '08:00:00',
  creatorId: 2,
  creatorName: 'Jones, Maria',
  isApproved: true,
  ...overrides,
})

const events: CalendarEvent[] = [
  event({ id: 1, title: 'Picture Day', time: '08:00:00', location: 'Gym', description: 'Wear school colors!' }),
  event({ id: 2, title: 'Faculty Lunch', time: '12:00:00', location: 'Cafeteria' }),
  event({ id: 3, title: 'Bake Sale', time: '15:00:00', isApproved: false, creatorName: 'Smith, John Michael' }),
]

let fetchMock: ReturnType<typeof mockFetch>

beforeEach(() => {
  // Signed in as jsmith (saved token), and the API returns the events above.
  localStorage.setItem('usal.token', 'saved-token')
  fetchMock = mockFetch()
  fetchMock.mockImplementation(async (input) => {
    const url = String(input)
    if (url === '/api/auth/me') return jsonResponse(200, jsmith)
    if (url.startsWith('/api/events')) return jsonResponse(200, events)
    return jsonResponse(404, {})
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const eventRequests = () => fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/api/events'))

describe('CalendarPage', () => {
  it('month view shows time, title and location (not description) for the visible grid', async () => {
    renderApp('/?view=month&date=2026-11-05')

    expect(await screen.findByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
    expect(await screen.findByText('Picture Day')).toBeInTheDocument()
    expect(screen.getByText('8:00 AM')).toBeInTheDocument()
    expect(screen.getByText(/Gym/)).toBeInTheDocument()
    expect(screen.queryByText('Wear school colors!')).not.toBeInTheDocument()
    expect(eventRequests()).toContain('/api/events?from=2026-11-01&to=2026-12-05')
  })

  it('shows pending events grayed out and italic', async () => {
    renderApp('/?view=month&date=2026-11-05')

    const pending = (await screen.findByText('Bake Sale')).closest('li')!
    expect(pending).toHaveClass('event-pill', 'is-pending')
    expect(pending).toHaveAttribute('title', 'Pending approval')
    expect(screen.getByText('Picture Day').closest('li')).not.toHaveClass('is-pending')
  })

  it('clicking a day opens the day view with description, creator and a Pending badge', async () => {
    const router = renderApp('/?view=month&date=2026-11-05')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'View Thursday, November 5' }))

    expect(await screen.findByRole('heading', { name: 'Thursday, November 5, 2026' })).toBeInTheDocument()
    expect(screen.getByText('Wear school colors!')).toBeInTheDocument()
    expect(screen.getAllByText('Created by Jones, Maria')).toHaveLength(2)
    const bakeSale = screen.getByText('Bake Sale').closest('li') as HTMLElement
    expect(within(bakeSale).getByText('Pending')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?view=day&date=2026-11-05')
    expect(eventRequests()).toContain('/api/events?from=2026-11-05&to=2026-11-05')
  })

  it('lists events in the order the server sent (sorted by time)', async () => {
    renderApp('/?view=day&date=2026-11-05')

    await screen.findByText('Picture Day')
    const titles = within(screen.getByRole('region', { name: 'Calendar' })).getAllByRole('listitem').map((item) => item.textContent)
    expect(titles[0]).toContain('Picture Day')
    expect(titles[1]).toContain('Faculty Lunch')
    expect(titles[2]).toContain('Bake Sale')
  })

  it('the Month | Day toggle keeps the selected date', async () => {
    const router = renderApp('/?view=day&date=2026-11-05')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Month' }))

    expect(await screen.findByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?view=month&date=2026-11-05')
  })

  it('Previous / Next move by month in Month view and by day in Day view', async () => {
    renderApp('/?view=month&date=2026-11-05')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Next month' }))
    expect(await screen.findByRole('heading', { name: 'December 2026' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Day' }))
    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(await screen.findByRole('heading', { name: 'Friday, December 4, 2026' })).toBeInTheDocument()
  })

  it('shows an error when events cannot be loaded', async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input) === '/api/auth/me'
        ? jsonResponse(200, jsmith)
        : jsonResponse(500, { title: 'An unexpected error occurred' }),
    )
    renderApp('/?view=month&date=2026-11-05')

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load events')
  })
})
