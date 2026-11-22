using System.Globalization;
using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Exceptions;
using UsalCalendar.Core.Interfaces;
using UsalCalendar.Core.Models;
using UsalCalendar.Core.Rules;

namespace UsalCalendar.Core.Services;

public sealed class EventService(IEventRepository events, IUserRepository users, TimeProvider clock)
{
    // events shown in calendar for given viewer(approvers see all, normal users see approved and their own pending events)
    public Task<IReadOnlyList<CalendarEvent>> GetCalendarAsync(
        DateOnly startDate, DateOnly endDate, int viewerId, bool viewerIsApprover, CancellationToken ct = default) =>
        events.GetCalendarAsync(startDate, endDate, pendingCreatorId: viewerId, includeAllPending: viewerIsApprover, ct);


    // create event, normal users submit for approval, approvers add it directly
    public async Task<CalendarEvent> CreateAsync(EventDetails details, int creatorId, CancellationToken ct = default)
    {
        var creator = await users.GetByIdAsync(creatorId, ct)
                      ?? throw new NotFoundException($"User {creatorId} was not found.");
        var nowUtc = clock.GetUtcNow().UtcDateTime;

        var calendarEvent = new CalendarEvent
        {
            Title = details.Title.Trim(),
            Description = TrimToNull(details.Description),
            Location = TrimToNull(details.Location),
            Date = details.Date,
            Time = details.Time,
            CreatorId = creator.Id,
            Creator = creator,
            CreatedAtUtc = nowUtc,
        };

        if (creator.IsApprover)
        {
            await EnsureDayHasRoomAsync(details.Date, excludeEventId: null, ct);
            calendarEvent.Approve(creator, nowUtc);
        }

        events.Add(calendarEvent);
        await events.SaveChangesAsync(ct);
        return calendarEvent;
    }

    /// <summary>V9: a day can hold at most 10 approved events. Pending events don't count.</summary>
    private async Task EnsureDayHasRoomAsync(DateOnly date, int? excludeEventId, CancellationToken ct)
    {
        var approvedCount = await events.CountApprovedOnDateAsync(date, excludeEventId, ct);
        if (approvedCount >= ValidationRules.MaxApprovedEventsPerDay)
        {
            throw new BusinessRuleException(
                $"{date.ToString("MMMM d, yyyy", CultureInfo.InvariantCulture)} already has " +
                $"{ValidationRules.MaxApprovedEventsPerDay} approved events. Please choose another day.");
        }
    }

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}