using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Interfaces;

namespace UsalCalendar.Core.Services;

public sealed class EventService(IEventRepository events)
{
    /// <summary>
    /// Events shown on the calendar for the given viewer:
    /// every approved event, plus pending events (approvers see all, normal users only their own).
    /// </summary>
    public Task<IReadOnlyList<CalendarEvent>> GetCalendarAsync(
        DateOnly startDate, DateOnly endDate, int viewerId, bool viewerIsApprover, CancellationToken ct = default) =>
        events.GetCalendarAsync(startDate, endDate, pendingCreatorId: viewerId, includeAllPending: viewerIsApprover, ct);
}
