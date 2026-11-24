import { useEvent } from './useEventActions'

/**
 * The event's title for the breadcrumb bar. It only reads the event the details page loads (same query, same
 * cache) and never requests it itself: the bar renders before the approver check, so fetching here would send
 * a forbidden request for normal users. Shows "Event" until the title arrives, or if it can't load.
 */
export function EventCrumb({ id }: { id: number }) {
  const { data: event } = useEvent(id, { enabled: false })
  return <>{event?.title ?? 'Event'}</>
}
