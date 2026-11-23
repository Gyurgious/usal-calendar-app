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

    /// <summary>Pending submissions for the approvals list, sorted by date then time.</summary>
    public Task<IReadOnlyList<CalendarEvent>> GetPendingAsync(CancellationToken ct = default) =>
        events.GetPendingAsync(ct);

    /// <summary>Approves a pending event (approvers only, enforced by the API). Respects the daily cap (V9).</summary>
    public async Task<CalendarEvent> ApproveAsync(int eventId, int approverId, CancellationToken ct = default)
    {
        var calendarEvent = await GetExistingAsync(eventId, ct);
        if (calendarEvent.IsApproved)
        {
            throw new BusinessRuleException($"\"{calendarEvent.Title}\" is already approved.");
        }

        await EnsureDayHasRoomAsync(calendarEvent.Date, excludeEventId: null, ct);

        var approver = await users.GetByIdAsync(approverId, ct)
                       ?? throw new NotFoundException($"User {approverId} was not found.");
        calendarEvent.Approve(approver, clock.GetUtcNow().UtcDateTime);
        await events.SaveChangesAsync(ct);
        return calendarEvent;
    }

    // removes event. (approvers can delete any event, normal users can only withdraw their own pending event)
    public async Task DeleteAsync(int eventId, int userId, bool isApprover, CancellationToken ct = default)
    {
        var calendarEvent = await GetExistingAsync(eventId, ct);
        if (!isApprover)
        {
            if (calendarEvent.CreatorId != userId)
            {
                throw new ForbiddenException("You can only withdraw events you submitted.");
            }
            if (calendarEvent.IsApproved)
            {
                throw new BusinessRuleException(
                    $"\"{calendarEvent.Title}\" is already approved and can no longer be withdrawn. Ask an approver to delete it.");
            }
        }

        events.Remove(calendarEvent);
        await events.SaveChangesAsync(ct);
    }

    /// <summary>The creator takes back their own submission, but only while it is still pending.</summary>
    public async Task WithdrawAsync(int eventId, int userId, CancellationToken ct = default)
    {
        var calendarEvent = await GetExistingAsync(eventId, ct);
        if (calendarEvent.CreatorId != userId)
        {
            throw new ForbiddenException("You can only withdraw events you submitted.");
        }
        if (calendarEvent.IsApproved)
        {
            throw new BusinessRuleException(
                $"\"{calendarEvent.Title}\" is already approved and can no longer be withdrawn. Ask an approver to delete it.");
        }

        events.Remove(calendarEvent);
        await events.SaveChangesAsync(ct);
    }

    private async Task<CalendarEvent> GetExistingAsync(int eventId, CancellationToken ct) =>
        await events.GetByIdAsync(eventId, ct) ?? throw new NotFoundException($"Event {eventId} was not found.");

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