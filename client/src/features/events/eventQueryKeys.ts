import type { QueryClient } from '@tanstack/react-query'
import type { EventStatusFilter } from './eventsApi'

/** Cache keys for event data, in one place so reads and writes always agree. */
export const eventQueryKeys = {
  all: ['events'] as const,
  calendar: (from: string, to: string) => ['events', 'calendar', from, to] as const,
  pending: ['events', 'pending'] as const,
  list: (status: EventStatusFilter) => ['events', 'list', status] as const,
  detail: (id: number) => ['events', 'detail', id] as const,
}

/** After any change to events: refetch everything event-related that is on screen. */
export function invalidateEventQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: eventQueryKeys.all })
}