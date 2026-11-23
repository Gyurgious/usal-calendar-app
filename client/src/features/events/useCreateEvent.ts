import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateEventQueries } from './eventQueryKeys'
import { createEvent } from './eventsApi'

/** Creates an event, then refreshes all event data so it shows up right away. */
export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => invalidateEventQueries(queryClient),
  })
}