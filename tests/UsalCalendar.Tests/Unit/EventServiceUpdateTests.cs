using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Exceptions;
using UsalCalendar.Core.Models;
using UsalCalendar.Core.Services;
using UsalCalendar.Tests.Fakes;

namespace UsalCalendar.Tests.Unit;

/// <summary>Editing events, and the events list filter, in EventService.</summary>
public class EventServiceUpdateTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 20, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Day = new(2026, 12, 1);
    private static readonly DateOnly FullDay = new(2026, 12, 2);

    private readonly User _creator = TestUsers.Create(id: 1, logonName: "jsmith", isApprover: false);
    private readonly User _approver = TestUsers.Create(id: 2, logonName: "admin", isApprover: true);
    private readonly FakeEventRepository _events = new();
    private readonly EventService _service;

    public EventServiceUpdateTests() =>
        _service = new EventService(_events, new FakeUserRepository(_creator, _approver), new FixedTimeProvider(Now));

    private CalendarEvent AddEvent(bool approved, DateOnly date, string title = "Bake Sale")
    {
        var e = new CalendarEvent
        {
            Title = title,
            Location = "Cafeteria",
            Date = date,
            Time = new TimeOnly(15, 0),
            CreatorId = _creator.Id,
            Creator = _creator,
        };
        if (approved)
        {
            e.Approve(_approver, Now.UtcDateTime);
        }
        _events.Add(e);
        return e;
    }

    private void FillDay(DateOnly date)
    {
        for (var i = 0; i < 10; i++)
        {
            AddEvent(approved: true, date, $"Station {i}");
        }
    }

    private static EventDetails Edited(DateOnly date) =>
        new("  Bake Sale (moved)  ", "  New description ", "   ", date, new TimeOnly(9, 30));

    [Fact]
    public async Task Update_ChangesFields_TrimsText_AndKeepsStatus()
    {
        var pending = AddEvent(approved: false, Day);

        var updated = await _service.UpdateAsync(pending.Id, Edited(Day.AddDays(3)));

        Assert.Equal("Bake Sale (moved)", updated.Title);
        Assert.Equal("New description", updated.Description);
        Assert.Null(updated.Location); // whitespace only → no location
        Assert.Equal(Day.AddDays(3), updated.Date);
        Assert.Equal(new TimeOnly(9, 30), updated.Time);
        Assert.False(updated.IsApproved); // editing never approves
        Assert.Equal(1, _events.SaveCount);
    }

    [Fact]
    public async Task Update_ApprovedEvent_ToFullDay_Throws_AndNothingChanges()
    {
        FillDay(FullDay);
        var approved = AddEvent(approved: true, Day);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.UpdateAsync(approved.Id, Edited(FullDay)));

        Assert.Contains("already has 10 approved events", error.Message, StringComparison.Ordinal);
        Assert.Equal(Day, approved.Date);
        Assert.Equal("Bake Sale", approved.Title);
        Assert.Equal(0, _events.SaveCount);
    }

    [Fact]
    public async Task Update_ApprovedEvent_OnItsOwnFullDay_IsAllowed()
    {
        FillDay(FullDay);
        var tenth = _events.Events.Last(); // one of the 10 approved events on the full day

        var updated = await _service.UpdateAsync(tenth.Id, Edited(FullDay));

        Assert.Equal("Bake Sale (moved)", updated.Title); // it doesn't count against itself
    }

    [Fact]
    public async Task Update_PendingEvent_ToFullDay_IsAllowed()
    {
        FillDay(FullDay);
        var pending = AddEvent(approved: false, Day);

        var updated = await _service.UpdateAsync(pending.Id, Edited(FullDay));

        Assert.Equal(FullDay, updated.Date); // the cap is checked again when someone approves it
    }

    [Fact]
    public async Task Update_UnknownEvent_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _service.UpdateAsync(999, Edited(Day)));
    }

    [Theory]
    [InlineData(null, 3)]
    [InlineData(EventStatus.Approved, 2)]
    [InlineData(EventStatus.Pending, 1)]
    public async Task GetAll_FiltersByStatus(EventStatus? status, int expectedCount)
    {
        AddEvent(approved: true, Day);
        AddEvent(approved: true, Day.AddDays(1));
        AddEvent(approved: false, Day);

        var result = await _service.GetAllAsync(status);

        Assert.Equal(expectedCount, result.Count);
    }
}