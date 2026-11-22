import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from '../../api/httpClient'
import { tokenStorage } from '../../api/tokenStorage'
import { getCurrentUser, login, type CurrentUser } from './authApi'
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext'
import { useQueryClient } from '@tanstack/react-query'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.get() ? 'loading' : 'anonymous'))

  const queryClient = useQueryClient()

  const signOut = useCallback(() => {
    tokenStorage.clear()
    queryClient.clear() // drop cached data so the next user never sees the previous user's events
    setUser(null)
    setStatus('anonymous')
  }, [queryClient])

  const signIn = useCallback(async (logonName: string, password: string) => {
    const result = await login({ logonName, password })
    tokenStorage.set(result.token)
    setUser(result.user)
    setStatus('authenticated')
  }, [])

  // Any API call that gets a 401 (expired or invalid token) signs the user out.
  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  // On page load: restore the session from a saved token.
  useEffect(() => {
    if (!tokenStorage.get()) {
      return
    }
    let cancelled = false
    getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser)
          setStatus('authenticated')
        }
      })
      .catch(() => {
        if (!cancelled) {
          signOut()
        }
      })
    return () => {
      cancelled = true
    }
  }, [signOut])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signOut }),
    [user, status, signIn, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
