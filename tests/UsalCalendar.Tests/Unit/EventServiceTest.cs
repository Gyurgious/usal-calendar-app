using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Exceptions;
using UsalCalendar.Core.Models;
using UsalCalendar.Core.Services;
using UsalCalendar.Tests.Fakes;

namespace UsalCalendar.Tests.Unit;

public class EventServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 20, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Day = new(2026, 12, 1);

    private readonly User _normalUser = TestUsers.Create(id: 1, logonName: "jsmith", isApprover: false);
    private readonly User _approver = TestUsers.Create(id: 2, logonName: "admin", isApprover: true);
    private readonly FakeEventRepository _events = new();
    private readonly EventService _service;

    public EventServiceTests() =>
        _service = new EventService(_events, new FakeUserRepository(_normalUser, _approver), new FixedTimeProvider(Now));

    private static EventDetails Details(string title = "Bake Sale", string? location = "Cafeteria",
                                        string? description = "Fundraiser") =>
        new(title, description, location, Day, new TimeOnly(15, 30));

    private void AddApprovedEvents(int count, DateOnly date)
    {
        for (var i = 0; i < count; i++)
        {
            var e = new CalendarEvent { Title = $"Existing {i}", Date = date, Time = new TimeOnly(8, 0), CreatorId = 2 };
            e.Approve(_approver, Now.UtcDateTime);
            _events.Add(e);
        }
    }

    [Fact]
    public async Task Create_ByNormalUser_IsPending()
    {
        var created = await _service.CreateAsync(Details(), _normalUser.Id);

        Assert.False(created.IsApproved);
        Assert.Null(created.ApproverId);
        Assert.Null(created.ApprovedAtUtc);
        Assert.Equal(_normalUser.Id, created.CreatorId);
        Assert.Equal(Now.UtcDateTime, created.CreatedAtUtc);
        Assert.Single(_events.Events);
        Assert.Equal(1, _events.SaveCount);
    }

    [Fact]
    public async Task Create_ByApprover_IsApprovedImmediatelyByThemselves()
    {
        var created = await _service.CreateAsync(Details(), _approver.Id);

        Assert.True(created.IsApproved);
        Assert.Equal(_approver.Id, created.ApproverId);
        Assert.Equal(Now.UtcDateTime, created.ApprovedAtUtc);
    }

    [Fact]
    public async Task Create_ByApprover_OnFullDay_ThrowsAndSavesNothing()
    {
        AddApprovedEvents(10, Day);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(Details(), _approver.Id));

        Assert.Contains("December 1, 2026 already has 10 approved events", error.Message, StringComparison.Ordinal);
        Assert.Equal(10, _events.Events.Count);
        Assert.Equal(0, _events.SaveCount);
    }

    [Fact]
    public async Task Create_ByApprover_With9ApprovedAndManyPending_Succeeds()
    {
        AddApprovedEvents(9, Day);
        for (var i = 0; i < 5; i++)
        {
            await _service.CreateAsync(Details($"Pending {i}"), _normalUser.Id); // pending: don't count toward the cap
        }

        var created = await _service.CreateAsync(Details("Tenth"), _approver.Id);

        Assert.True(created.IsApproved);
    }

    [Fact]
    public async Task Create_ByNormalUser_OnFullDay_IsAllowedAsPending()
    {
        AddApprovedEvents(10, Day);

        var created = await _service.CreateAsync(Details(), _normalUser.Id);

        Assert.False(created.IsApproved); // the cap is checked when an approver approves it (Part 3)
    }

    [Fact]
    public async Task Create_TrimsText_AndStoresBlankOptionalFieldsAsNull()
    {
        var created = await _service.CreateAsync(Details(title: "  Bake Sale  ", location: "   ", description: ""), _normalUser.Id);

        Assert.Equal("Bake Sale", created.Title);
        Assert.Null(created.Location);
        Assert.Null(created.Description);
    }

    [Fact]
    public async Task Create_ForUnknownUser_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _service.CreateAsync(Details(), creatorId: 999));
    }
}