import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/httpClient'

/** TanStack Query cache for server data (events, users...). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // reuse fetched data for 30 s before refetching
        retry: (failureCount, error) => { // retry for network/server problems. 4xx errors wont change on retry
          if (error instanceof ApiError && error.status < 500) return false
          return failureCount < 1                                         
        },
        refetchOnWindowFocus: false,
      },
    },
  })
}