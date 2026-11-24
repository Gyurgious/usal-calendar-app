import { useState } from 'react'
import { Alert, Badge, Button, Spinner, Table } from 'react-bootstrap'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { useAuth } from '../auth/AuthContext'
import { UserFormModal } from './UserFormModal'
import type { User } from './usersApi'
import { useDeleteUser, useUsers } from './useUsers'

type Message = { variant: 'success' | 'danger'; text: string }

/** The form is closed, open for a new user, or open for editing one user. */
type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; user: User }

/** Users list with create, edit and delete (approvers only). */
export function UsersPage() {
  const { user: currentUser, refreshUser } = useAuth()
  const { data: users = [], isPending, isError, error } = useUsers()
  const remove = useDeleteUser()
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [message, setMessage] = useState<Message | null>(null)

  const handleSaved = async (saved: User) => {
    setMessage({
      variant: 'success',
      text: form.mode === 'edit' ? `${saved.displayName} was saved.` : `${saved.displayName} was added.`,
    })
    setForm({ mode: 'closed' })
    if (saved.id === currentUser?.id) {
      await refreshUser() // you edited yourself: update your name in the navbar
    }
  }

  const handleDelete = async (user: User) => {
    try {
      await remove.mutateAsync(user.id)
      setMessage({ variant: 'success', text: `${user.displayName} was deleted.` })
    } catch (err) {
      setMessage({ variant: 'danger', text: err instanceof Error ? err.message : 'Could not delete the user.' })
    } finally {
      setUserToDelete(null)
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Users</h1>
        <Button
          onClick={() => {
            setMessage(null)
            setForm({ mode: 'create' })
          }}
        >
          + New user
        </Button>
      </div>

      {message && (
        <Alert variant={message.variant} dismissible onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {isError && <Alert variant="danger">Could not load users: {error.message}</Alert>}

      {isPending ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" aria-label="Loading users" />
        </div>
      ) : (
        <Table responsive striped hover className="align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Login name</th>
              <th>Role</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUser?.id
              const canDelete = !isSelf && !user.isApprover
              return (
                <tr key={user.id}>
                  <td>
                    {user.displayName} {isSelf && <span className="text-body-secondary small">(you)</span>}
                  </td>
                  <td>{user.loginName}</td>
                  <td>{user.isApprover ? <Badge bg="info" text="dark">Approver</Badge> : 'User'}</td>
                  <td className="text-nowrap text-end">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="me-2"
                      onClick={() => {
                        setMessage(null)
                        setForm({ mode: 'edit', user })
                      }}
                      aria-label={`Edit ${user.displayName}`}
                    >
                      Edit
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => setUserToDelete(user)}
                        aria-label={`Delete ${user.displayName}`}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}

      {form.mode !== 'closed' && (
        <UserFormModal
          user={form.mode === 'edit' ? form.user : undefined}
          onClose={() => setForm({ mode: 'closed' })}
          onSaved={handleSaved}
        />
      )}

      {userToDelete && (
        <ConfirmDialog
          title="Delete user"
          confirmLabel="Delete"
          isWorking={remove.isPending}
          onConfirm={() => handleDelete(userToDelete)}
          onCancel={() => setUserToDelete(null)}
        >
          <p>
            Delete <strong>{userToDelete.displayName}</strong> ({userToDelete.loginName})? They will no longer be able
            to sign in.
          </p>
          <ul className="mb-0">
            <li>Their events stay, marked "(deactivated)".</li>
            <li>Their pending submissions stay in Approvals, so you can still approve or delete them.</li>
          </ul>
        </ConfirmDialog>
      )}
    </>
  )
}