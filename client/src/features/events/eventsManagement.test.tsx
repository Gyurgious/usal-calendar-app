import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../../test/fetchMock'
import { renderApp } from '../../test/renderApp'
import type { ManagedEvent } from './eventsApi'

const admin = { id: 1, displayName: 'Thompson, Margaret A', isApprover: true }
const jsmith = { id: 3, displayName: 'Smith, John Michael', isApprover: false }

const pta: ManagedEvent = {
  id: 7,
  title: 'PTA Meeting',
  location: 'Library',
  description: 'Monthly parent-teacher meeting.',
  date: '2026-11-03',
  time: '18:30:00',
  isApproved: true,
  creatorName: 'Smith, John Michael',
  createdAtUtc: '2026-11-01T15:00:00Z',
  approverName: 'Thompson, Margaret A',
  approvedAtUtc: '2026-11-02T15:00:00Z',
}

const bakeSale: ManagedEvent = {
  ...pta,
  id: 8,
  title: 'Bake Sale',
  location: 'Cafeteria',
  description: null,
  date: '2026-11-21',
  time: '16:00:00',
  isApproved: false,
  approverName: null,
  approvedAtUtc: null,
}

type Handler = (url: string, method: string, body: string | undefined) => Response | undefined

/** Signed in as `user`. `handler` answers specific requests; anything else gets a sensible default. */
function setUpApi(user: typeof admin, handler: Handler = () => undefined) {
  localStorage.setItem('usal.token', 'saved-token')
  const fetchMock = mockFetch()
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/auth/me') return jsonResponse(200, user)
    const handled = handler(url, method, init?.body as string | undefined)
    if (handled) return handled
    if (url === '/api/events/all') return jsonResponse(200, [pta, bakeSale])
    if (url === '/api/events/all?status=pending') return jsonResponse(200, [bakeSale])
    if (url === '/api/events/7') return jsonResponse(200, pta)
    if (url === '/api/events/8') return jsonResponse(200, bakeSale)
    return jsonResponse(200, [])
  })
  return fetchMock
}

const callsTo = (fetchMock: ReturnType<typeof mockFetch>, method: string, url: string) =>
  fetchMock.mock.calls.filter(([u, init]) => String(u) === url && (init?.method ?? 'GET') === method)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('events list', () => {
  it('approvers see the Events link and a table of all events with their status', async () => {
    setUpApi(admin)
    renderApp('/')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Events' }))

    expect(await screen.findByRole('heading', { name: 'Events' })).toBeInTheDocument()
    const ptaRow = (await screen.findByRole('link', { name: 'PTA Meeting' })).closest('tr')!
    expect(within(ptaRow).getByText('Tue, Nov 3, 2026')).toBeInTheDocument()
    expect(within(ptaRow).getByText('6:30 PM')).toBeInTheDocument()
    expect(within(ptaRow).getByText('Approved')).toBeInTheDocument()
    const bakeSaleRow = screen.getByRole('link', { name: 'Bake Sale' }).closest('tr')!
    expect(within(bakeSaleRow).getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('2 events')).toBeInTheDocument()
  })

  it('the status filter updates the URL and asks the server for only those events', async () => {
    const fetchMock = setUpApi(admin)
    const router = renderApp('/events')
    const user = userEvent.setup()
    await screen.findByRole('link', { name: 'PTA Meeting' })

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'pending')

    await waitFor(() => expect(screen.queryByRole('link', { name: 'PTA Meeting' })).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Bake Sale' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?status=pending')
    expect(callsTo(fetchMock, 'GET', '/api/events/all?status=pending')).toHaveLength(1)
  })

  it('normal users have no Events link and are sent back to the calendar', async () => {
    const fetchMock = setUpApi(jsmith)
    const router = renderApp('/events/7')

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByRole('link', { name: 'Events' })).not.toBeInTheDocument()
    expect(callsTo(fetchMock, 'GET', '/api/events/7')).toHaveLength(0)
  })
})

describe('event details', () => {
  it('clicking a title opens the details with creator and approver', async () => {
    setUpApi(admin)
    const router = renderApp('/events')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'PTA Meeting' }))

    expect(await screen.findByRole('heading', { name: /PTA Meeting/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/events/7')
    expect(screen.getByText('Monthly parent-teacher meeting.')).toBeInTheDocument()
    // <dt>Label</dt><dd>value</dd>: check the value next to each label
    expect(screen.getByText('Created by').nextElementSibling).toHaveTextContent('Smith, John Michael')
    expect(screen.getByText('Approved by').nextElementSibling).toHaveTextContent('Thompson, Margaret A')
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument() // already approved
  })

  it('a pending event shows "Not approved yet" and an Approve button', async () => {
    setUpApi(admin)
    renderApp('/events/8')

    expect(await screen.findByText('Not approved yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })

  it('shows a not-found message for an event that does not exist', async () => {
    setUpApi(admin, (url) => (url === '/api/events/999' ? jsonResponse(404, { detail: 'Event 999 was not found.' }) : undefined))
    renderApp('/events/999')

    expect(await screen.findByText('This event does not exist. It may have been deleted.')).toBeInTheDocument()
  })
})

describe('edit event', () => {
  it('opens a form filled with the event, sends the changes and shows a message', async () => {
    const fetchMock = setUpApi(admin, (url, method) =>
      url === '/api/events/7' && method === 'PUT' ? jsonResponse(200, { ...pta, title: 'PTA Meeting (moved)' }) : undefined,
    )
    renderApp('/events/7')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Title')).toHaveValue('PTA Meeting')
    expect(within(dialog).getByLabelText('Date')).toHaveValue('2026-11-03')
    expect(within(dialog).getByLabelText('Time')).toHaveValue('18:30')

    await user.clear(within(dialog).getByLabelText('Title'))
    await user.type(within(dialog).getByLabelText('Title'), 'PTA Meeting (moved)')
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-11-04' } })
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('"PTA Meeting (moved)" was saved.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const [[, init]] = callsTo(fetchMock, 'PUT', '/api/events/7')
    expect(JSON.parse(init!.body as string)).toEqual({
      title: 'PTA Meeting (moved)',
      location: 'Library',
      description: 'Monthly parent-teacher meeting.',
      date: '2026-11-04',
      time: '18:30',
    })
  })

  it('keeps the form open and shows the server message when the new day is full (409)', async () => {
    setUpApi(admin, (url, method) =>
      url === '/api/events/7' && method === 'PUT'
        ? jsonResponse(409, { detail: 'November 26, 2026 already has 10 approved events. Please choose another day.' })
        : undefined,
    )
    renderApp('/events/7')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByText(/already has 10 approved events/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('delete event', () => {
  it('asks first, deletes, then goes back to the list with a message', async () => {
    let deleted = false
    const fetchMock = setUpApi(admin, (url, method) => {
      if (url === '/api/events/7' && method === 'DELETE') {
        deleted = true
        return new Response(null, { status: 204 })
      }
      if (url === '/api/events/7' && deleted) return jsonResponse(404, {})
      if (url === '/api/events/all' && deleted) return jsonResponse(200, [bakeSale])
      return undefined
    })
    const router = renderApp('/events/7')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog')
    expect(callsTo(fetchMock, 'DELETE', '/api/events/7')).toHaveLength(0) // nothing deleted yet
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('"PTA Meeting" was deleted.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/events')
    expect(screen.queryByRole('link', { name: 'PTA Meeting' })).not.toBeInTheDocument()
    expect(callsTo(fetchMock, 'DELETE', '/api/events/7')).toHaveLength(1)
  })
})