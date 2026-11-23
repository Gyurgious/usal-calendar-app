using Microsoft.EntityFrameworkCore;
using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Interfaces;
using UsalCalendar.Infrastructure.Data;
using UsalCalendar.Core.Models;

namespace UsalCalendar.Infrastructure.Repositories;

internal sealed class EventRepository(AppDbContext db) : IEventRepository
{
    public Task<CalendarEvent?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Events
            .Include(e => e.Creator)
            .Include(e => e.Approver)
            .FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<IReadOnlyList<CalendarEvent>> GetCalendarAsync(
        DateOnly startDate, DateOnly endDate, int pendingCreatorId, bool includeAllPending,
        CancellationToken ct = default) =>
        await db.Events
            .AsNoTracking() // read-only: no change tracking needed
            .Include(e => e.Creator)
            .Where(e => e.Date >= startDate && e.Date <= endDate)
            .Where(e => e.ApproverId != null || includeAllPending || e.CreatorId == pendingCreatorId)
            .OrderBy(e => e.Date)
            .ThenBy(e => e.Time)
            .ToListAsync(ct);

        public async Task<IReadOnlyList<CalendarEvent>> GetAllAsync(EventStatus? status, CancellationToken ct = default) =>
        await db.Events
            .AsNoTracking()
            .Include(e => e.Creator)
            .Include(e => e.Approver)
            .Where(e => status == null
                        || (status == EventStatus.Approved && e.ApproverId != null)
                        || (status == EventStatus.Pending && e.ApproverId == null))
            .OrderBy(e => e.Date)
            .ThenBy(e => e.Time)
            .ToListAsync(ct);

    public Task<int> CountApprovedOnDateAsync(DateOnly eventDate, int? excludeEventId = null, CancellationToken ct = default) =>
        db.Events.CountAsync(
            e => e.Date == eventDate && e.ApproverId != null && (excludeEventId == null || e.Id != excludeEventId),
            ct);

    public void Add(CalendarEvent calendarEvent) => db.Events.Add(calendarEvent);

    public void Remove(CalendarEvent calendarEvent) => db.Events.Remove(calendarEvent);

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}
