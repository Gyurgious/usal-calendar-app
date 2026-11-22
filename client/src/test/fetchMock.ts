import { vi } from 'vitest'

/** Builds a fake JSON HTTP response, like the API would send. */
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(200, []))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
