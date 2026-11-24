import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate, type Location } from 'react-router'
import { Icon } from '../../shared/components/Icon'
import { useAuth } from './AuthContext'
import { loginSchema, type LoginFormValues } from './loginSchema'
import './login.css'

export function LoginPage() {
  const { status, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)

  // Where RequireAuth sent us from (e.g. a bookmarked page), otherwise the calendar.
  const redirectTo = (location.state as { from?: Location } | null)?.from?.pathname ?? '/'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { logonName: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    try {
      await signIn(values.logonName, values.password)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Sign-in failed.')
    }
  }

   // Already signed in (e.g. the user typed /login): go straight to the app.
  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">
            <Icon name="calendar" size={24} />
          </span>
          <h1>USAL School Calendar</h1>
          <p>Sign in to view and submit school events.</p>
        </div>

        {serverError && <Alert variant="danger">{serverError}</Alert>}

        <Form noValidate onSubmit={handleSubmit(onSubmit)}>
          <Form.Group className="mb-3" controlId="logonName">
            <Form.Label>Logon name</Form.Label>
            <Form.Control
              autoComplete="username"
              autoFocus
              isInvalid={!!errors.logonName}
              {...register('logonName')}
            />
            <Form.Control.Feedback type="invalid">{errors.logonName?.message}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="current-password"
              isInvalid={!!errors.password}
              {...register('password')}
            />
            <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
          </Form.Group>

          <Button type="submit" className="w-100" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Form>
      </div>
    </main>
  )
}
