import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { ApprovalsPage } from '../features/approvals/ApprovalsPage'
import { LoginPage } from '../features/auth/LoginPage'
import { RequireApprover } from '../features/auth/RequireApprover'
import { RequireAuth } from '../features/auth/RequireAuth'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { AppLayout } from './AppLayout'
import type { RouteHandle } from './Breadcrumbs'
import { EventCrumb } from '../features/events/EventCrumb'
import { EventDetailsPage } from '../features/events/EventDetailsPage'
import { EventsPage } from '../features/events/EventsPage'
import { UsersPage } from '../features/users/UsersPage'

/** Names a route in the breadcrumb bar. */
const crumb = (label: RouteHandle['crumb']): RouteHandle => ({ crumb: label })

// Exported separately so tests can reuse the exact same routes with an in-memory router.
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <CalendarPage />, handle: crumb('Calendar') },
          {
            // Approver-only pages. The API enforces the same rule with the "Approver" policy.
            element: <RequireApprover />,
            children: [
              { path: 'approvals', element: <ApprovalsPage />, handle: crumb('Approvals') },
              {
                // Details are nested under the list so the breadcrumb reads "Events › PTA Meeting".
                path: 'events',
                handle: crumb('Events'),
                children: [
                  { index: true, element: <EventsPage /> },
                  {
                    path: ':id',
                    element: <EventDetailsPage />,
                    handle: crumb((params) => <EventCrumb id={Number(params.id)} />),
                  },
                ],
              },
              { path: 'users', element: <UsersPage />, handle: crumb('Users') },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
