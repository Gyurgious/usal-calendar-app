import { apiFetch } from '../../api/httpClient'
import type { CalendarEvent } from '../calendar/calendarApi'

/** Matches CreateEventRequest on the server. */
export interface CreateEventRequest {
  title: string
  location: string | null
  description: string | null
  date: string // "2026-11-05"
  time: string // "15:30"
}

/** Normal users: created as pending. Approvers: approved immediately (409 if the day is full). */
export function createEvent(request: CreateEventRequest): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>('/api/events', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}