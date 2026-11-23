import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { ApprovalsPage } from '../features/approvals/ApprovalsPage'
import { LoginPage } from '../features/auth/LoginPage'
import { RequireApprover } from '../features/auth/RequireApprover'
import { RequireAuth } from '../features/auth/RequireAuth'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { AppLayout } from './AppLayout'
import { EventDetailsPage } from '../features/events/EventDetailsPage'
import { EventsPage } from '../features/events/EventsPage'

// Exported separately so tests can reuse the exact same routes with an in-memory router.
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <CalendarPage /> },
          {
            // Approver-only pages. The API enforces the same rule with the "Approver" policy.
            element: <RequireApprover />,
             children: [
              { path: 'approvals', element: <ApprovalsPage /> },
              { path: 'events', element: <EventsPage /> },
              { path: 'events/:id', element: <EventDetailsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)