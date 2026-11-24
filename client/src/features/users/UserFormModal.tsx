import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { Icon } from '../../shared/components/Icon'
import { useAuth } from '../auth/AuthContext'
import { useCreateUser, useUpdateUser } from './useUsers'
import { userSchema, type UserFormValues } from './userSchema'
import type { User } from './usersApi'

interface UserFormModalProps {
  user?: User
  onClose: () => void
  onSaved: (user: User) => void
}

/** "New user" and "Edit user" form. */
export function UserFormModal({ user, onClose, onSaved }: UserFormModalProps) {
  const { user: currentUser } = useAuth()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const [serverError, setServerError] = useState<string | null>(null)
  const isSelf = user !== undefined && user.id === currentUser?.id

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema(user ? 'edit' : 'create')),
    defaultValues: {
      firstName: user?.firstName ?? '',
      middleName: user?.middleName ?? '',
      lastName: user?.lastName ?? '',
      loginName: user?.loginName ?? '',
      password: '', // never sent to the browser, so always starts empty
      isApprover: user?.isApprover ?? false,
    },
  })

  const onSubmit = async (values: UserFormValues) => {
    setServerError(null)
    const request = {
      ...values,
      middleName: values.middleName || null,
      password: values.password || null, // empty = keep the current password (edit only)
    }
    try {
      const saved = user
        ? await updateUser.mutateAsync({ id: user.id, request })
        : await createUser.mutateAsync(request)
      onSaved(saved)
    } catch (error) {
      // e.g. 409 'The login name "jsmith" is already taken.'
      setServerError(error instanceof Error ? error.message : 'Could not save the user.')
    }
  }

  return (
    <Modal show onHide={onClose} centered>
      <Form noValidate onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <div>
            <Modal.Title>{user ? 'Edit user' : 'New user'}</Modal.Title>
            <p className="modal-subtitle">Shown in the app as “Last, First Middle”.</p>
          </div>
        </Modal.Header>

        <Modal.Body>
          {serverError && <Alert variant="danger">{serverError}</Alert>}

          <div className="form-row">
            <Form.Group className="mb-3" controlId="userFirstName">
              <Form.Label>First name</Form.Label>
              <Form.Control autoFocus isInvalid={!!errors.firstName} {...register('firstName')} />
              <Form.Control.Feedback type="invalid">{errors.firstName?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="userMiddleName">
              <Form.Label>
                Middle name <span className="optional">(optional)</span>
              </Form.Label>
              <Form.Control isInvalid={!!errors.middleName} {...register('middleName')} />
              <Form.Control.Feedback type="invalid">{errors.middleName?.message}</Form.Control.Feedback>
            </Form.Group>
          </div>

          <Form.Group className="mb-3" controlId="userLastName">
            <Form.Label>Last name</Form.Label>
            <Form.Control isInvalid={!!errors.lastName} {...register('lastName')} />
            <Form.Control.Feedback type="invalid">{errors.lastName?.message}</Form.Control.Feedback>
          </Form.Group>

          <div className="form-row">
            <Form.Group className="mb-3" controlId="userLoginName">
              <Form.Label>Login name</Form.Label>
              <Form.Control autoComplete="off" isInvalid={!!errors.loginName} {...register('loginName')} />
              <Form.Control.Feedback type="invalid">{errors.loginName?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="userPassword">
              <Form.Label>{user ? 'New password' : 'Password'}</Form.Label>
              <Form.Control
                type="password"
                autoComplete="new-password"
                isInvalid={!!errors.password}
                {...register('password')}
              />
              {user && <Form.Text muted>Leave blank to keep the current password.</Form.Text>}
              <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
            </Form.Group>
          </div>

          {isSelf ? (
            <div className="submit-note">
              <Icon name="user" size={17} />
              <p>
                <strong>Approver</strong>
                <br />
                You are an approver. You can't remove your own approver role.
              </p>
            </div>
          ) : (
            <Form.Group controlId="userIsApprover">
              <Form.Check type="switch" label="Approver (can approve events and manage users)" {...register('isApprover')} />
            </Form.Group>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : user ? 'Save changes' : 'Add user'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}