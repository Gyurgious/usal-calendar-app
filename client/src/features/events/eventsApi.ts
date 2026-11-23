import { apiFetch } from '../../api/httpClient'
import type { CalendarEvent } from '../calendar/calendarApi'

export interface CreateEventRequest {
  title: string
  location: string | null
  description: string | null
  date: string // "2026-11-05"
  time: string // "15:30"
}

export interface PendingEvent {
  id: number
  title: string
  location: string | null
  description: string | null
  date: string
  time: string
  creatorName: string
  createdAtUtc: string // ISO timestamp ending in "Z"
}

/** Normal users: created as pending. Approvers: approved immediately (409 if the day is full). */
export function createEvent(request: CreateEventRequest): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>('/api/events', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Approvers only. */
export function getPendingEvents(): Promise<PendingEvent[]> {
  return apiFetch<PendingEvent[]>('/api/events/pending')
}

/** Approvers only. 409 if the day already has 10 approved events. */
export function approveEvent(id: number): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/api/events/${id}/approve`, { method: 'POST' })
}

/** Approvers: deletes any event. Normal users: withdraws their own pending submission */
export function deleteEvent(id: number): Promise<void> {
  return apiFetch<void>(`/api/events/${id}`, { method: 'DELETE' })
}
