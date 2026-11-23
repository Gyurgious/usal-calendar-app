import { apiFetch } from '../../api/httpClient'
import type { CalendarEvent } from '../calendar/calendarApi'

/** Interfaces matches the server's shape */
export interface EventRequest {
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

export interface ManagedEvent {
  id: number
  title: string
  location: string | null
  description: string | null
  date: string
  time: string // "15:30:00"
  isApproved: boolean
  creatorName: string
  createdAtUtc: string
  approverName: string | null
  approvedAtUtc: string | null
}

export type EventStatusFilter = 'all' | 'approved' | 'pending'

/** Normal users: created as pending. Approvers: approved immediately (409 if the day is full). */
export function createEvent(request: EventRequest): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>('/api/events', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Approvers only. */
export function getPendingEvents(): Promise<PendingEvent[]> {
  return apiFetch<PendingEvent[]>('/api/events/pending')
}

/** Approvers only. All events, or only approved/pending ones, sorted by date then time. */
export function getEvents(status: EventStatusFilter): Promise<ManagedEvent[]> {
  const query = status === 'all' ? '' : `?${new URLSearchParams({ status })}`
  return apiFetch<ManagedEvent[]>(`/api/events/all${query}`)
}

/** Approvers only. 404 if the event doesn't exist. */
export function getEvent(id: number): Promise<ManagedEvent> {
  return apiFetch<ManagedEvent>(`/api/events/${id}`)
}

/** Approvers only. 409 if an approved event is moved to a day that already has 10 approved events. */
export function updateEvent(id: number, request: EventRequest): Promise<ManagedEvent> {
  return apiFetch<ManagedEvent>(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

/** Approvers only. 409 if the day already has 10 approved events. */
export function approveEvent(id: number): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/api/events/${id}/approve`, { method: 'POST' })
}

/** Approvers: deletes any event. Normal users: withdraws their own pending submission */
export function deleteEvent(id: number): Promise<void> {
  return apiFetch<void>(`/api/events/${id}`, { method: 'DELETE' })
}