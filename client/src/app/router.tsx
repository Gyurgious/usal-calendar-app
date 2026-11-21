import { createBrowserRouter, Navigate } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { AppLayout } from './AppLayout'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Everything below requires sign-in.
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [{ index: true, element: <CalendarPage /> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
