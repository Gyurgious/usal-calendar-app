/** Green "Approved" or amber "Pending" chip. */
export function EventStatusBadge({ isApproved }: { isApproved: boolean }) {
  return isApproved ? <span className="status live">Approved</span> : <span className="status pending">Pending</span>
}
