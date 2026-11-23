import { Badge } from 'react-bootstrap'

/** Green "Approved" or gray "Pending" label. */
export function EventStatusBadge({ isApproved }: { isApproved: boolean }) {
  return isApproved ? <Badge bg="success">Approved</Badge> : <Badge bg="secondary">Pending</Badge>
}