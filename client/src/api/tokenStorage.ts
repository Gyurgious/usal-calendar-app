// Keeps the JWT in localStorage so the user stays signed in after a page refresh.
const TOKEN_KEY = 'usal.token'

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
}