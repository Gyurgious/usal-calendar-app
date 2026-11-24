import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventQueryKeys, invalidateEventQueries } from './eventQueryKeys'
import {
  approveEvent,
  deleteEvent,
  getEvent,
  getEvents,
  getPendingEvents,
  updateEvent,
  type EventRequest,
  type EventStatusFilter,
} from './eventsApi'

/** The approvals list (approvers only). Pass `enabled: false` to skip the request, e.g. for normal users. */
export function usePendingEvents({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: eventQueryKeys.pending, queryFn: getPendingEvents, enabled })
}

/** The events list (approvers only). */
export function useEvents(status: EventStatusFilter) {
  return useQuery({ queryKey: eventQueryKeys.list(status), queryFn: () => getEvents(status) })
}

/**
 * One event's details (approvers only). Pass `enabled: false` to only read what is already loaded, without
 * sending a request; the result still updates when another component loads it.
 */
export function useEvent(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: eventQueryKeys.detail(id), queryFn: () => getEvent(id), enabled })
}

/** helper mutation that refreshes all event data on success, else screens would show old data */
function useEventMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => invalidateEventQueries(queryClient) })
}

export const useApproveEvent = () => useEventMutation(approveEvent)
export const useDeleteEvent = () => useEventMutation(deleteEvent)
export const useUpdateEvent = () =>
  useEventMutation(({ id, request }: { id: number; request: EventRequest }) => updateEvent(id, request))