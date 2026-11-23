import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventQueryKeys, invalidateEventQueries } from './eventQueryKeys'
import { approveEvent, deleteEvent, getPendingEvents} from './eventsApi'

/** The approvals list (approvers only). */
export function usePendingEvents() {
  return useQuery({ queryKey: eventQueryKeys.pending, queryFn: getPendingEvents })
}

/** helper mutation that refreshes the calendar and pending list on approve/withdraw */
// else, calendar would show old data still
function useEventMutation(mutationFn: (id: number) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => invalidateEventQueries(queryClient) })
}

export const useApproveEvent = () => useEventMutation(approveEvent)
export const useDeleteEvent = () => useEventMutation(deleteEvent)