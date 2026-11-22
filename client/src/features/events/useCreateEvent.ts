import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEvent } from './eventsApi'

/** Creates an event, then refreshes every cached calendar range so it shows up right away. */
export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  })
}