import { ApiError, apiFetch } from "../../api/httpClient"

// contract that defines what backend must accept and return.
export interface LoginRequest {
  logonName: string
  password: string
}

export interface CurrentUser {
  id: number
  displayName: string // "Last, First Middle"
  isApprover: boolean
}

export interface LoginResponse {
  token: string
  user: CurrentUser
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  try {
    return await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new Error('Invalid login name or password.')
    }
    throw new Error('Sign-in failed. Please try again.')
  }
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/api/auth/me')
}
