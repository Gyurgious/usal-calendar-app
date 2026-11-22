import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCalendarEvents } from './calendarApi'

/** Fetches (and caches) calendar events for a date range. */
export function useCalendarEvents(from: string, to: string) {
  return useQuery({
    queryKey: ['calendar-events', from, to],
    queryFn: () => getCalendarEvents(from, to),
    placeholderData: keepPreviousData, // keep showing the old month while the next one loads
  })
}
