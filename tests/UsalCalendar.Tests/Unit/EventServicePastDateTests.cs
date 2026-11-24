using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Exceptions;
using UsalCalendar.Core.Models;
using UsalCalendar.Core.Services;
using UsalCalendar.Tests.Fakes;

namespace UsalCalendar.Tests.Unit;

/// <summary>Events can't be created on, or moved to, a past date. Today is allowed.</summary>
public class EventServicePastDateTests
{
    // Nov 20, 2026, 3:00 PM UTC
    private static readonly DateTimeOffset Now = new(2026, 11, 20, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Today = new(2026, 11, 20);
    private static readonly DateOnly Yesterday = Today.AddDays(-1);

    private readonly User _creator = TestUsers.Create(id: 1, logonName: "jsmith", isApprover: false);
    private readonly User _approver = TestUsers.Create(id: 2, logonName: "admin", isApprover: true);
    private readonly FakeEventRepository _events = new();

    private EventService ServiceAt(DateTimeOffset now, TimeZoneInfo? timeZone = null) =>
        new(_events, new FakeUserRepository(_creator, _approver), new FixedTimeProvider(now, timeZone));

    private static EventDetails On(DateOnly date) => new("Bake Sale", null, "Cafeteria", date, new TimeOnly(15, 0));

    private CalendarEvent AddPastEvent()
    {
        var e = new CalendarEvent { Title = "Old Event", Date = Yesterday, Time = new TimeOnly(9, 0), CreatorId = _creator.Id, Creator = _creator };
        _events.Add(e);
        return e;
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Create_OnAPastDate_Throws_AndSavesNothing(bool byApprover)
    {
        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            ServiceAt(Now).CreateAsync(On(Yesterday), byApprover ? _approver.Id : _creator.Id));

        Assert.Equal("November 19, 2026 is in the past. Please choose today or a later date.", ex.Message);
        Assert.Empty(_events.Events);
    }

    [Fact]
    public async Task Create_Today_IsAllowed()
    {
        var created = await ServiceAt(Now).CreateAsync(On(Today), _creator.Id);

        Assert.Equal(Today, created.Date);
    }

    [Fact]
    public async Task Today_IsTheSchoolsDate_NotUtc()
    {
        // 8 PM on Nov 19 in Chicago is already Nov 20 in UTC. For the school it's still the 19th.
        var chicago = TimeZoneInfo.FindSystemTimeZoneById("America/Chicago");
        var eveningInChicago = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);

        var created = await ServiceAt(eveningInChicago, chicago).CreateAsync(On(Yesterday), _creator.Id);

        Assert.Equal(Yesterday, created.Date);
    }

    [Fact]
    public async Task Update_PastEvent_WithoutChangingTheDate_IsAllowed()
    {
        var past = AddPastEvent();

        var updated = await ServiceAt(Now).UpdateAsync(past.Id, new EventDetails("Fixed Typo", null, null, Yesterday, past.Time));

        Assert.Equal("Fixed Typo", updated.Title);
    }

    [Fact]
    public async Task Update_MovingAnEventToAPastDate_Throws_AndNothingChanges()
    {
        var e = AddPastEvent();
        e.Date = Today.AddDays(5);

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            ServiceAt(Now).UpdateAsync(e.Id, new EventDetails("Moved", null, null, Yesterday, e.Time)));

        Assert.Equal(Today.AddDays(5), e.Date);
        Assert.Equal("Old Event", e.Title);
    }
}