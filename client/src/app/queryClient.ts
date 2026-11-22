import { QueryClient } from '@tanstack/react-query'

/** TanStack Query cache for server data (events, users...). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // reuse fetched data for 30 s before refetching
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}
