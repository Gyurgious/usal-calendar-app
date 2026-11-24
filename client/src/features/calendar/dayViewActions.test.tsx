import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../../test/fetchMock'
import { renderApp } from '../../test/renderApp'
import type { ManagedEvent } from '../events/eventsApi'
import type { CalendarEvent } from './calendarApi'

const admin = { id: 1, displayName: 'Thompson, Margaret A', isApprover: true }
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
  event({ id: 1, title: 'Picture Day', location: 'Gym', description: 'Wear school colors!' }),
  event({ id: 2, title: 'Bake Sale', time: '15:00:00', isApproved: false, creatorId: 3, creatorName: 'Smith, John Michael' }),
]

const saved: ManagedEvent = {
  id: 1,
  title: 'Picture Day (moved)',
  location: 'Gym',
  description: 'Wear school colors!',
  date: '2026-11-06',
  time: '08:00:00',
  isApproved: true,
  creatorName: 'Jones, Maria',
  createdAtUtc: '2026-11-01T10:00:00Z',
  approverName: 'Thompson, Margaret A',
  approvedAtUtc: '2026-11-01T11:00:00Z',
}

/** Signed in as `user`. `handler` answers writes; reads get the events above. */
function setUpApi(user: typeof admin, handler: (url: string, method: string) => Response | undefined = () => undefined) {
  localStorage.setItem('usal.token', 'saved-token')
  const fetchMock = mockFetch()
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/auth/me') return jsonResponse(200, user)
    const handled = handler(url, method)
    if (handled) return handled
    if (url.startsWith('/api/events?')) return jsonResponse(200, events)
    return jsonResponse(200, [])
  })
  return fetchMock
}

const callsTo = (fetchMock: ReturnType<typeof mockFetch>, method: string, url: string) =>
  fetchMock.mock.calls.filter(([u, init]) => String(u) === url && (init?.method ?? 'GET') === method)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('day view summary', () => {
  it('shows the event count and how many of the 10 approved slots are used', async () => {
    setUpApi(admin)
    renderApp('/?view=day&date=2026-11-05')

    expect(await screen.findByText('2 events (1 pending)')).toBeInTheDocument()
    expect(screen.getByText('1 of 10 approved slots used')).toBeInTheDocument()
    expect(screen.queryByText('Full')).not.toBeInTheDocument()
  })
})

describe('day view: approver actions', () => {
  it('approvers see Edit and Delete on every event, including pending ones', async () => {
    setUpApi(admin)
    renderApp('/?view=day&date=2026-11-05')

    expect(await screen.findByRole('button', { name: 'Edit Picture Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Picture Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Bake Sale' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Bake Sale' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Withdraw Bake Sale' })).not.toBeInTheDocument()
  })

  it('normal users see no Edit or Delete, only Withdraw on their own pending event', async () => {
    setUpApi(jsmith)
    renderApp('/?view=day&date=2026-11-05')

    expect(await screen.findByRole('button', { name: 'Withdraw Bake Sale' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
  })

  it('Edit opens the form filled in, saves with PUT, and follows the event to its new date', async () => {
    const fetchMock = setUpApi(admin, (url, method) =>
      url === '/api/events/1' && method === 'PUT' ? jsonResponse(200, saved) : undefined,
    )
    const router = renderApp('/?view=day&date=2026-11-05')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit Picture Day' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Picture Day')
    expect(within(dialog).getByLabelText('Time')).toHaveValue('08:00')

    await user.clear(within(dialog).getByLabelText('Title'))
    await user.type(within(dialog).getByLabelText('Title'), 'Picture Day (moved)')
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-11-06' } })
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('"Picture Day (moved)" was saved.')).toBeInTheDocument()
    expect(JSON.parse(String(callsTo(fetchMock, 'PUT', '/api/events/1')[0][1]?.body))).toEqual({
      title: 'Picture Day (moved)',
      location: 'Gym',
      description: 'Wear school colors!',
      date: '2026-11-06',
      time: '08:00',
    })
    expect(router.state.location.search).toBe('?view=day&date=2026-11-06')
  })

  it('shows the server message when the new day is full (409) and keeps the form open', async () => {
    setUpApi(admin, (url, method) =>
      url === '/api/events/1' && method === 'PUT'
        ? jsonResponse(409, { status: 409, detail: 'November 6, 2026 already has 10 approved events. Please choose another day.' })
        : undefined,
    )
    renderApp('/?view=day&date=2026-11-05')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit Picture Day' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByText(/already has 10 approved events/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Delete asks first, then deletes the event', async () => {
    const fetchMock = setUpApi(admin, (url, method) =>
      url === '/api/events/2' && method === 'DELETE' ? new Response(null, { status: 204 }) : undefined,
    )
    renderApp('/?view=day&date=2026-11-05')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete Bake Sale' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Delete Bake Sale submitted by Smith, John Michael?')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('"Bake Sale" was deleted.')).toBeInTheDocument()
    expect(callsTo(fetchMock, 'DELETE', '/api/events/2')).toHaveLength(1)
  })

  it('Cancel in the delete dialog deletes nothing', async () => {
    const fetchMock = setUpApi(admin)
    renderApp('/?view=day&date=2026-11-05')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete Picture Day' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)
  })
})
