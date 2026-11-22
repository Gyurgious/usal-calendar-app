import { apiFetch } from '../../api/httpClient'

/** Matches CalendarEventDto on the server. */
export interface CalendarEvent {
  id: number
  title: string
  location: string | null
  description: string | null
  date: string 
  time: string 
  creatorId: number
  creatorName: string 
  isApproved: boolean
}

/** Events from `from` to `to` inclusive (both "yyyy-MM-dd"), sorted by date then time by the server. */
export function getCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const query = new URLSearchParams({ from, to })
  return apiFetch<CalendarEvent[]>(`/api/events?${query}`)
}
