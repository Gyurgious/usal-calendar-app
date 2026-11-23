import type { QueryClient } from '@tanstack/react-query'

/** Cache keys for event data, in one place so reads and writes always agree. */
export const eventQueryKeys = {
  calendar: ['calendar-events'] as const,
  pending: ['pending-events'] as const,
}

/** After any change to events: refetch the calendar and the pending list. */
export function invalidateEventQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: eventQueryKeys.calendar }),
    queryClient.invalidateQueries({ queryKey: eventQueryKeys.pending }),
  ])
}