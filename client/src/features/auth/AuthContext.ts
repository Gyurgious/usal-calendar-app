import { createContext, useContext } from 'react'
import type { CurrentUser } from './authApi'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

// shape of authenticated data
export interface AuthContextValue {
  user: CurrentUser | null
  status: AuthStatus
  signIn: (logonName: string, password: string) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Read the signed-in user from any component inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }
  return context
}
