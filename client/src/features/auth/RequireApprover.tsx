import { Navigate, Outlet } from 'react-router'
import { useAuth } from './AuthContext'

export function RequireApprover() {
  const { user } = useAuth()
  return user?.isApprover ? <Outlet /> : <Navigate to="/" replace />
}