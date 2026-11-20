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
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (response.status === 401) {
    throw new Error('Invalid login name or password.')
  }
  if (!response.ok) {
    throw new Error('Sign-in failed. Please try again.')
  }

  return (await response.json()) as LoginResponse
}
