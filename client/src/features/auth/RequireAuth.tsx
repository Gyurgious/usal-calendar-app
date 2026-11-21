import { Spinner } from 'react-bootstrap'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthContext'

/** security guard for every page except the login page. 
 * Before any protected page renders, it checks whether you're signed in  */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" role="status" aria-label="Loading" />
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
