import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Alert, Button, Card, Container, Form } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { login } from './authApi'
import { loginSchema, type LoginFormValues } from './loginSchema'

export function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null)

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
      const result = await login(values)
      // Temporary: Part D replaces this with AuthContext + redirect to the calendar.
      console.log('Signed in as', result.user.displayName)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Sign-in failed.')
    }
  }

  return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100">
      <Card className="shadow-sm w-100" style={{ maxWidth: 400 }}>
        <Card.Body className="p-4">
          <h1 className="h4 mb-4 text-center">USAL School Calendar</h1>

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
        </Card.Body>
      </Card>
    </Container>
  )
}
