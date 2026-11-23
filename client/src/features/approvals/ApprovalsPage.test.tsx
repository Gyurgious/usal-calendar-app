import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../../test/fetchMock'
import { renderApp } from '../../test/renderApp'
import type { PendingEvent } from '../events/eventsApi'

const admin = { id: 1, displayName: 'Thompson, Margaret A', isApprover: true }
const jsmith = { id: 3, displayName: 'Smith, John Michael', isApprover: false }

const pendingEvents: PendingEvent[] = [
  {
    id: 21,
    title: 'Robotics Demo',
    location: 'Room 101',
    description: 'Students show their robot.',
    date: '2026-11-07',
    time: '15:00:00',
    creatorName: 'Nguyen, Thanh',
    createdAtUtc: '2026-11-19T15:00:00Z',
  },
  {
    id: 22,
    title: 'Movie Night',
    location: 'Gym',
    description: null,
    date: '2026-11-26',
    time: '18:00:00',
    creatorName: 'Nguyen, Thanh',
    createdAtUtc: '2026-11-19T16:00:00Z',
  },
]

type Handler = (url: string, method: string) => Response | undefined

/** Signed in as `user`. `handler` answers specific requests; anything else gets a sensible default. */
function setUpApi(user: typeof admin, handler: Handler = () => undefined) {
  localStorage.setItem('usal.token', 'saved-token')
  const fetchMock = mockFetch()
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/auth/me') return jsonResponse(200, user)
    const handled = handler(url, method)
    if (handled) return handled
    if (url === '/api/events/pending') return jsonResponse(200, pendingEvents)
    return jsonResponse(200, [])
  })
  return fetchMock
}

const callsTo = (fetchMock: ReturnType<typeof mockFetch>, method: string, url: string) =>
  fetchMock.mock.calls.filter(([u, init]) => String(u) === url && (init?.method ?? 'GET') === method)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ApprovalsPage', () => {
  it('approvers see the Approvals link and a table of pending submissions', async () => {
    setUpApi(admin)
    renderApp('/')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Approvals' }))

    expect(await screen.findByRole('heading', { name: 'Pending approvals' })).toBeInTheDocument()
    const row = (await screen.findByText('Robotics Demo')).closest('tr')!
    expect(within(row).getByText('Sat, Nov 7, 2026')).toBeInTheDocument()
    expect(within(row).getByText('3:00 PM')).toBeInTheDocument()
    expect(within(row).getByText('Room 101')).toBeInTheDocument()
    expect(within(row).getByText('Students show their robot.')).toBeInTheDocument()
    expect(within(row).getByText('Nguyen, Thanh')).toBeInTheDocument()
  })

  it('Approve calls the API, shows a success message and refreshes the list', async () => {
    const fetchMock = setUpApi(admin, (url, method) =>
      url === '/api/events/21/approve' && method === 'POST' ? jsonResponse(200, {}) : undefined,
    )
    renderApp('/approvals')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Approve Robotics Demo' }))

    expect(await screen.findByText('"Robotics Demo" was approved and is now on the calendar.')).toBeInTheDocument()
    expect(callsTo(fetchMock, 'POST', '/api/events/21/approve')).toHaveLength(1)
    await waitFor(() => expect(callsTo(fetchMock, 'GET', '/api/events/pending').length).toBeGreaterThan(1))
  })

  it('shows the server message when approving onto a full day (409)', async () => {
    setUpApi(admin, (url, method) =>
      url === '/api/events/22/approve' && method === 'POST'
        ? jsonResponse(409, { detail: 'November 26, 2026 already has 10 approved events. Please choose another day.' })
        : undefined,
    )
    renderApp('/approvals')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Approve Movie Night' }))

    expect(await screen.findByText(/already has 10 approved events/)).toBeInTheDocument()
  })

  it('Delete asks for confirmation first, then deletes', async () => {
    const fetchMock = setUpApi(admin, (url, method) =>
      url === '/api/events/21' && method === 'DELETE' ? new Response(null, { status: 204 }) : undefined,
    )
    renderApp('/approvals')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete Robotics Demo' }))
    const dialog = await screen.findByRole('dialog')
    expect(callsTo(fetchMock, 'DELETE', '/api/events/21')).toHaveLength(0) // nothing deleted yet
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('"Robotics Demo" was deleted.')).toBeInTheDocument()
    expect(callsTo(fetchMock, 'DELETE', '/api/events/21')).toHaveLength(1)
  })

  it('shows an empty state when nothing is pending', async () => {
    setUpApi(admin, (url) => (url === '/api/events/pending' ? jsonResponse(200, []) : undefined))
    renderApp('/approvals')

    expect(await screen.findByText('No events are waiting for approval.')).toBeInTheDocument()
  })

  it('normal users have no Approvals link and are sent back to the calendar', async () => {
    const fetchMock = setUpApi(jsmith)
    const router = renderApp('/approvals')

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByRole('link', { name: 'Approvals' })).not.toBeInTheDocument()
    expect(callsTo(fetchMock, 'GET', '/api/events/pending')).toHaveLength(0)
  })
})