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

/** The approvals list (approvers only). */
export function usePendingEvents() {
  return useQuery({ queryKey: eventQueryKeys.pending, queryFn: getPendingEvents })
}

/** The events list (approvers only). */
export function useEvents(status: EventStatusFilter) {
  return useQuery({ queryKey: eventQueryKeys.list(status), queryFn: () => getEvents(status) })
}

/** One event's details (approvers only). */
export function useEvent(id: number) {
  return useQuery({ queryKey: eventQueryKeys.detail(id), queryFn: () => getEvent(id) })
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