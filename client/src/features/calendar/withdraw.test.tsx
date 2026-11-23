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
  date: '2026-11-21',
  time: '09:00:00',
  creatorId: 3,
  creatorName: 'Smith, John Michael',
  isApproved: false,
  ...overrides,
})

const events = [
  event({ id: 1, title: 'Bake Sale', time: '16:00:00' }), // jsmith's own pending event
  event({ id: 2, title: 'Picture Day', time: '08:00:00', isApproved: true }), // jsmith's, but approved
  event({ id: 3, title: 'Chess Club', time: '15:00:00', creatorId: 4, creatorName: 'Jones, Maria', isApproved: true }),
]

let fetchMock: ReturnType<typeof mockFetch>

beforeEach(() => {
  localStorage.setItem('usal.token', 'saved-token')
  fetchMock = mockFetch()
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    if (url === '/api/auth/me') return jsonResponse(200, jsmith)
    if (url === '/api/events/1' && init?.method === 'DELETE') return new Response(null, { status: 204 })
    if (url.startsWith('/api/events?')) return jsonResponse(200, events)
    return jsonResponse(404, {})
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const withdrawCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')

describe('withdraw', () => {
  it('shows Withdraw only on your own pending events', async () => {
    renderApp('/?view=day&date=2026-11-21')

    expect(await screen.findByRole('button', { name: 'Withdraw Bake Sale' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Withdraw Picture Day' })).not.toBeInTheDocument() // approved
    expect(screen.queryByRole('button', { name: 'Withdraw Chess Club' })).not.toBeInTheDocument() // not yours
  })

  it('confirms, withdraws and shows a message', async () => {
    renderApp('/?view=day&date=2026-11-21')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Withdraw Bake Sale' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Withdraw' }))

    expect(await screen.findByText('"Bake Sale" was withdrawn.')).toBeInTheDocument()
    expect(withdrawCalls()).toHaveLength(1)
  })

  it('Cancel keeps the event', async () => {
    renderApp('/?view=day&date=2026-11-21')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Withdraw Bake Sale' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(withdrawCalls()).toHaveLength(0)
  })
})