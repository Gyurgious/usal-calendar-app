import { tokenStorage } from './tokenStorage'

/** Error thrown for any non-2xx response. `status` lets callers react to 401, 404, 409... */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// AuthProvider registers a callback here so an expired token signs the user out everywhere.
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

/** fetch() wrapper: adds JSON + Bearer token headers and turns error responses into ApiError. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  const token = tokenStorage.get()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(path, { ...init, headers })

  if (!response.ok) {
    if (response.status === 401 && token) {
      onUnauthorized?.()
    }
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  return (response.status === 204 ? undefined : await response.json()) as T
}

// The API returns ProblemDetails JSON: { title, detail, errors }. Use the most useful part.
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as {
      title?: string
      detail?: string
      errors?: Record<string, string[]>
    }
    const firstValidationError = problem.errors ? Object.values(problem.errors)[0]?.[0] : undefined
    return problem.detail ?? firstValidationError ?? problem.title ?? `Request failed (${response.status}).`
  } catch {
    return `Request failed (${response.status}).`
  }
}
