import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../../test/fetchMock'
import { renderApp } from '../../test/renderApp'
import type { CalendarEvent } from '../calendar/calendarApi'

const jsmith = { id: 3, displayName: 'Smith, John Michael', isApprover: false }
const admin = { id: 1, displayName: 'Thompson, Margaret A', isApprover: true }

const created = (isApproved: boolean): CalendarEvent => ({
  id: 99,
  title: 'Robotics Demo',
  location: 'Room 101',
  description: null,
  date: '2026-11-05',
  time: '15:30:00',
  creatorId: 3,
  creatorName: 'Smith, John Michael',
  isApproved,
})

/** Signed in as `user`; POST /api/events answers with `postResponse`. */
function setUpApi(user: typeof jsmith, postResponse: () => Response) {
  localStorage.setItem('usal.token', 'saved-token')
  const fetchMock = mockFetch()
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    if (url === '/api/auth/me') return jsonResponse(200, user)
    if (url === '/api/events' && init?.method === 'POST') return postResponse()
    return jsonResponse(200, []) // calendar reads
  })
  return fetchMock
}

const postCalls = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
const calendarReads = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/events?')).length

async function openFormAndFill() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'New event' }))
  await user.type(screen.getByLabelText('Title'), 'Robotics Demo')
  await user.type(screen.getByLabelText(/Location/), 'Room 101')
  fireEvent.change(screen.getByLabelText('Time'), { target: { value: '15:30' } })
  return user
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('create event', () => {
  it('normal user submits for approval: sends the form, closes it, shows a pending message, refreshes the calendar', async () => {
    const fetchMock = setUpApi(jsmith, () => jsonResponse(201, created(false)))
    renderApp('/?view=month&date=2026-11-05')
    const user = await openFormAndFill()

    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-05') // prefilled with the selected day
    const readsBefore = calendarReads(fetchMock)
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))

    expect(await screen.findByText(/was submitted for approval/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const [, init] = postCalls(fetchMock)[0]
    expect(JSON.parse(String(init?.body))).toEqual({
      title: 'Robotics Demo',
      location: 'Room 101',
      description: null,
      date: '2026-11-05',
      time: '15:30',
    })
    await waitFor(() => expect(calendarReads(fetchMock)).toBeGreaterThan(readsBefore))
  })

  it('approver adds directly to the calendar', async () => {
    setUpApi(admin, () => jsonResponse(201, created(true)))
    renderApp('/?view=month&date=2026-11-05')
    const user = await openFormAndFill()

    await user.click(screen.getByRole('button', { name: 'Add event' }))

    expect(await screen.findByText('"Robotics Demo" was added to the calendar.')).toBeInTheDocument()
  })

  it('shows the server message when the day is full (409) and keeps the form open', async () => {
    setUpApi(admin, () =>
      jsonResponse(409, { status: 409, detail: 'November 5, 2026 already has 10 approved events. Please choose another day.' }),
    )
    renderApp('/?view=month&date=2026-11-05')
    const user = await openFormAndFill()

    await user.click(screen.getByRole('button', { name: 'Add event' }))

    expect(await screen.findByText(/already has 10 approved events/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('validates on the client before sending anything', async () => {
    const fetchMock = setUpApi(jsmith, () => jsonResponse(201, created(false)))
    renderApp('/?view=month&date=2026-11-05')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'New event' }))
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))

    expect(await screen.findByText('Title is required.')).toBeInTheDocument()
    expect(screen.getByText('Time is required.')).toBeInTheDocument()
    expect(postCalls(fetchMock)).toHaveLength(0)
  })

  it('rejects a past date before sending anything, and the date picker starts at today', async () => {
    // The tests' "today" is Nov 1, 2026 (see test/setup.ts).
    const fetchMock = setUpApi(jsmith, () => jsonResponse(201, created(false)))
    renderApp('/?view=month&date=2026-11-05')
    const user = await openFormAndFill()

    expect(screen.getByLabelText('Date')).toHaveAttribute('min', '2026-11-01')
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-31' } })
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))

    expect(await screen.findByText('Pick today or a later date.')).toBeInTheDocument()
    expect(postCalls(fetchMock)).toHaveLength(0)
  })

  it('Cancel closes the form without saving', async () => {
    const fetchMock = setUpApi(jsmith, () => jsonResponse(201, created(false)))
    renderApp('/?view=month&date=2026-11-05')
    const user = await openFormAndFill()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(postCalls(fetchMock)).toHaveLength(0)
  })

  it('New event on the Events page saves and stays on the list', async () => {
    const fetchMock = setUpApi(admin, () => jsonResponse(201, created(true)))
    const router = renderApp('/events')
    const user = await openFormAndFill()
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-05' } })

    await user.click(screen.getByRole('button', { name: 'Add event' }))

    expect(await screen.findByText('"Robotics Demo" was added.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/events')
    expect(postCalls(fetchMock)).toHaveLength(1)
  })

  it('pages that do not create events (e.g. Users) have no New event button', async () => {
    setUpApi(admin, () => jsonResponse(201, created(true)))
    renderApp('/users')

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New event' })).not.toBeInTheDocument()
  })
})
