using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Exceptions;
using UsalCalendar.Core.Services;
using UsalCalendar.Tests.Fakes;

namespace UsalCalendar.Tests.Unit;

/// <summary>Approve, delete and withdraw rules in EventService.</summary>
public class EventServiceApprovalTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 20, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Day = new(2026, 12, 1);

    private readonly User _creator = TestUsers.Create(id: 1, logonName: "jsmith", isApprover: false);
    private readonly User _otherUser = TestUsers.Create(id: 3, logonName: "mjones", isApprover: false);
    private readonly User _approver = TestUsers.Create(id: 2, logonName: "admin", isApprover: true);
    private readonly FakeEventRepository _events = new();
    private readonly EventService _service;

    public EventServiceApprovalTests() =>
        _service = new EventService(_events, new FakeUserRepository(_creator, _otherUser, _approver), new FixedTimeProvider(Now));

    private CalendarEvent AddEvent(bool approved, DateOnly? date = null)
    {
        var e = new CalendarEvent
        {
            Title = "Bake Sale",
            Date = date ?? Day,
            Time = new TimeOnly(15, 0),
            CreatorId = _creator.Id,
            Creator = _creator,
        };
        if (approved)
        {
            e.Approve(_approver, Now.UtcDateTime.AddDays(-1));
        }
        _events.Add(e);
        return e;
    }

    [Fact]
    public async Task Approve_PendingEvent_SetsApproverAndTimestamp()
    {
        var pending = AddEvent(approved: false);

        var approved = await _service.ApproveAsync(pending.Id, _approver.Id);

        Assert.True(approved.IsApproved);
        Assert.Equal(_approver.Id, approved.ApproverId);
        Assert.Equal(Now.UtcDateTime, approved.ApprovedAtUtc);
        Assert.Equal(1, _events.SaveCount);
    }

    [Fact]
    public async Task Approve_OntoFullDay_Throws_AndEventStaysPending()
    {
        for (var i = 0; i < 10; i++)
        {
            AddEvent(approved: true);
        }
        var pending = AddEvent(approved: false);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ApproveAsync(pending.Id, _approver.Id));

        Assert.Contains("already has 10 approved events", error.Message, StringComparison.Ordinal);
        Assert.False(pending.IsApproved);
        Assert.Equal(0, _events.SaveCount);
    }

    [Fact]
    public async Task Approve_AlreadyApprovedEvent_Throws()
    {
        var approved = AddEvent(approved: true);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ApproveAsync(approved.Id, _approver.Id));
    }

    [Fact]
    public async Task Approve_UnknownEvent_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _service.ApproveAsync(999, _approver.Id));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Delete_AsApprover_RemovesPendingOrApprovedEvent(bool approved)
    {
        var e = AddEvent(approved);

        await _service.DeleteAsync(e.Id, _approver.Id, isApprover: true);

        Assert.Empty(_events.Events);
        Assert.Equal(1, _events.SaveCount);
    }

    [Fact]
    public async Task Delete_UnknownEvent_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteAsync(999, _approver.Id, isApprover: true));
    }

    [Fact]
    public async Task Delete_AsCreator_OwnPendingEvent_RemovesIt()
    {
        var pending = AddEvent(approved: false);

        await _service.DeleteAsync(pending.Id, _creator.Id, isApprover: false);

        Assert.Empty(_events.Events);
    }

    [Fact]
    public async Task Delete_AsNormalUser_SomeoneElsesEvent_ThrowsForbidden_AndKeepsIt()
    {
        var pending = AddEvent(approved: false);

        await Assert.ThrowsAsync<ForbiddenException>(() => _service.DeleteAsync(pending.Id, _otherUser.Id, isApprover: false));

        Assert.Single(_events.Events);
    }

    [Fact]
    public async Task Delete_AsCreator_ApprovedEvent_Throws_AndKeepsIt()
    {
        var approved = AddEvent(approved: true);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.DeleteAsync(approved.Id, _creator.Id, isApprover: false));

        Assert.Contains("can no longer be withdrawn", error.Message, StringComparison.Ordinal);
        Assert.Single(_events.Events);
    }
}