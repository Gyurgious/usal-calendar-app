import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../../test/fetchMock'
import { renderApp } from '../../test/renderApp'
import type { User } from './usersApi'

const adminUser: User = {
  id: 1,
  firstName: 'Margaret',
  middleName: 'A',
  lastName: 'Thompson',
  loginName: 'admin',
  displayName: 'Thompson, Margaret A',
  isApprover: true,
}
const jsmithUser: User = {
  id: 3,
  firstName: 'John',
  middleName: 'Michael',
  lastName: 'Smith',
  loginName: 'jsmith',
  displayName: 'Smith, John Michael',
  isApprover: false,
}
const me = (user: User) => ({ id: user.id, displayName: user.displayName, isApprover: user.isApprover })

type Handler = (url: string, method: string) => Response | undefined

/** Signed in as `signedIn`. `handler` answers specific requests; anything else gets a sensible default. */
function setUpApi(signedIn: User, handler: Handler = () => undefined) {
  localStorage.setItem('usal.token', 'saved-token')
  const fetchMock = mockFetch()
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const handled = handler(url, method)
    if (handled) return handled
    if (url === '/api/auth/me') return jsonResponse(200, me(signedIn))
    if (url === '/api/users') return jsonResponse(200, [jsmithUser, adminUser])
    return jsonResponse(200, [])
  })
  return fetchMock
}

const callsTo = (fetchMock: ReturnType<typeof mockFetch>, method: string, url: string) =>
  fetchMock.mock.calls.filter(([u, init]) => String(u) === url && (init?.method ?? 'GET') === method)

const bodyOf = (fetchMock: ReturnType<typeof mockFetch>, method: string, url: string) =>
  JSON.parse(callsTo(fetchMock, method, url)[0][1]!.body as string)

const rowOf = (name: string) => screen.getByText(name).closest('tr')!

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('users page', () => {
  it('approvers see the Users link and a table of users; you cannot delete yourself', async () => {
    setUpApi(adminUser)
    renderApp('/')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Users' }))

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
    await screen.findByText('Smith, John Michael')
    expect(within(rowOf('Smith, John Michael')).getByText('jsmith')).toBeInTheDocument()
    expect(within(rowOf('Smith, John Michael')).getByText('User')).toBeInTheDocument()
    expect(within(rowOf('admin')).getByText('Approver')).toBeInTheDocument()
    expect(within(rowOf('admin')).getByText('(you)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Smith, John Michael' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Thompson, Margaret A' })).not.toBeInTheDocument()
  })

  it('normal users have no Users link and are sent back to the calendar', async () => {
    const fetchMock = setUpApi(jsmithUser)
    const router = renderApp('/users')

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
    expect(callsTo(fetchMock, 'GET', '/api/users')).toHaveLength(0)
  })

  it('another approver has Edit but no Delete (remove their approver role first)', async () => {
    const approver2: User = { ...jsmithUser, id: 2, loginName: 'approver2', displayName: 'Garcia, Robert J', isApprover: true }
    setUpApi(adminUser, (url) => (url === '/api/users' ? jsonResponse(200, [approver2, adminUser]) : undefined))
    renderApp('/users')

    expect(await screen.findByRole('button', { name: 'Edit Garcia, Robert J' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Garcia, Robert J' })).not.toBeInTheDocument()
  })
})

describe('new user', () => {
  it('sends the form, shows a message and refreshes the list', async () => {
    const created: User = { ...jsmithUser, id: 9, firstName: 'Pat', middleName: null, lastName: 'Lee', loginName: 'plee', displayName: 'Lee, Pat' }
    const fetchMock = setUpApi(adminUser, (url, method) =>
      url === '/api/users' && method === 'POST' ? jsonResponse(201, created) : undefined,
    )
    renderApp('/users')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '+ New user' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('First name'), 'Pat')
    await user.type(within(dialog).getByLabelText('Last name'), 'Lee')
    await user.type(within(dialog).getByLabelText('Login name'), 'plee')
    await user.type(within(dialog).getByLabelText('Password'), 'Pass123!')
    await user.click(within(dialog).getByLabelText(/Approver/))
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))

    expect(await screen.findByText('Lee, Pat was added.')).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/api/users')).toEqual({
      firstName: 'Pat',
      middleName: null,
      lastName: 'Lee',
      loginName: 'plee',
      password: 'Pass123!',
      isApprover: true,
    })
    await waitFor(() => expect(callsTo(fetchMock, 'GET', '/api/users').length).toBeGreaterThan(1))
  })

  it('checks the rules before sending anything (V1–V3)', async () => {
    const fetchMock = setUpApi(adminUser)
    renderApp('/users')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '+ New user' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('First name'), 'A'.repeat(26))
    await user.type(within(dialog).getByLabelText('Login name'), 'p.lee')
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))

    expect(await within(dialog).findByText('First name must be 25 characters or fewer.')).toBeInTheDocument()
    expect(within(dialog).getByText('Last name is required.')).toBeInTheDocument()
    expect(within(dialog).getByText('Login name must be 4–16 letters or numbers.')).toBeInTheDocument()
    expect(within(dialog).getByText('Password is required.')).toBeInTheDocument()
    expect(callsTo(fetchMock, 'POST', '/api/users')).toHaveLength(0)
  })

  it('shows the server message when the login name is taken (409)', async () => {
    setUpApi(adminUser, (url, method) =>
      url === '/api/users' && method === 'POST'
        ? jsonResponse(409, { detail: 'The login name "jsmith" is already taken.' })
        : undefined,
    )
    renderApp('/users')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '+ New user' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('First name'), 'John')
    await user.type(within(dialog).getByLabelText('Last name'), 'Smith')
    await user.type(within(dialog).getByLabelText('Login name'), 'jsmith')
    await user.type(within(dialog).getByLabelText('Password'), 'Pass123!')
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))

    expect(await within(dialog).findByText('The login name "jsmith" is already taken.')).toBeInTheDocument()
  })
})

describe('edit user', () => {
  it('opens a filled-in form; a blank password is sent as null (keep it)', async () => {
    const fetchMock = setUpApi(adminUser, (url, method) =>
      url === '/api/users/3' && method === 'PUT' ? jsonResponse(200, { ...jsmithUser, displayName: 'Smith, Johnny Michael' }) : undefined,
    )
    renderApp('/users')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit Smith, John Michael' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('First name')).toHaveValue('John')
    expect(within(dialog).getByLabelText('Login name')).toHaveValue('jsmith')
    expect(within(dialog).getByLabelText('New password')).toHaveValue('')
    expect(within(dialog).getByText('Leave blank to keep the current password.')).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('First name'))
    await user.type(within(dialog).getByLabelText('First name'), 'Johnny')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Smith, Johnny Michael was saved.')).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'PUT', '/api/users/3')).toMatchObject({ firstName: 'Johnny', password: null, isApprover: false })
  })

  it('editing yourself hides the approver switch, keeps you an approver, and updates the navbar', async () => {
    let myName = 'Thompson, Margaret A'
    const fetchMock = setUpApi(adminUser, (url, method) => {
      if (url === '/api/users/1' && method === 'PUT') {
        myName = 'Thompson, Maggie A'
        return jsonResponse(200, { ...adminUser, firstName: 'Maggie', displayName: myName })
      }
      if (url === '/api/auth/me') return jsonResponse(200, { ...me(adminUser), displayName: myName })
      return undefined
    })
    renderApp('/users')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit Thompson, Margaret A' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByLabelText(/Approver/)).not.toBeInTheDocument()
    expect(within(dialog).getByText(/can't remove your own approver role/)).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText('First name'))
    await user.type(within(dialog).getByLabelText('First name'), 'Maggie')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Thompson, Maggie A was saved.')).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'PUT', '/api/users/1')).toMatchObject({ firstName: 'Maggie', isApprover: true })
    // the navbar shows the new name (it reloads /api/auth/me)
    await waitFor(() => expect(callsTo(fetchMock, 'GET', '/api/auth/me')).toHaveLength(2))
    expect(within(screen.getByRole('navigation')).getByText(/Thompson, Maggie A/)).toBeInTheDocument()
  })
})

describe('delete user', () => {
  it('asks first, then deletes', async () => {
    const fetchMock = setUpApi(adminUser, (url, method) =>
      url === '/api/users/3' && method === 'DELETE' ? new Response(null, { status: 204 }) : undefined,
    )
    renderApp('/users')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete Smith, John Michael' }))
    const dialog = await screen.findByRole('dialog')
    expect(callsTo(fetchMock, 'DELETE', '/api/users/3')).toHaveLength(0) // nothing deleted yet
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Smith, John Michael was deleted.')).toBeInTheDocument()
    expect(callsTo(fetchMock, 'DELETE', '/api/users/3')).toHaveLength(1)
  })

    it('explains what happens to their events before deleting', async () => {
    setUpApi(adminUser)
    renderApp('/users')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete Smith, John Michael' }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText('Their events stay, marked "(deactivated)".')).toBeInTheDocument()
    expect(within(dialog).getByText(/pending submissions stay in Approvals/)).toBeInTheDocument()
  })

  it('shows the server message when the delete is refused (409)', async () => {
    setUpApi(adminUser, (url, method) =>
      url === '/api/users/3' && method === 'DELETE'
        ? jsonResponse(409, { detail: 'Smith, John Michael is an approver. Remove their approver role first, then delete them.' })
        : undefined,
    )
    renderApp('/users')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete Smith, John Michael' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText(/Remove their approver role first/)).toBeInTheDocument()
    expect(screen.getByText('Smith, John Michael')).toBeInTheDocument() // still in the list
  })
})