using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using UsalCalendar.Api.Dtos;

namespace UsalCalendar.Tests.Integration;

/// <summary>Events list, details and edit (approvers only).</summary>
public class EventManagementEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly MonthStart = new(DateTime.Now.Year, DateTime.Now.Month, 1);
    private static readonly string SeededFullDay = ToIso(MonthStart.AddDays(25)); // 10 Field Day stations

    private static string ToIso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    // A far-away date per test, so tests in this class never affect each other's data.
    private static string FreeDay(int n) => ToIso(MonthStart.AddMonths(7).AddDays(n));

    private static Uri Url(string path) => new(path, UriKind.Relative);

    private Task<HttpClient> AdminAsync() => factory.CreateClientAsAsync("admin", "Admin123!");

    private static object Body(string date, string title = "Robotics Demo", string time = "15:00") =>
        new { title, location = "Room 101", description = "Students show their robot.", date, time };

    /// <summary>Creates an event as `client` (approved if `client` is an approver) and returns its id.</summary>
    private static async Task<int> CreateAsync(HttpClient client, string date)
    {
        var response = await client.PostAsJsonAsync("/api/events", Body(date));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CalendarEventDto>())!.Id;
    }

    private static async Task<List<ManagedEventDto>> GetListAsync(HttpClient client, string query = "") =>
        (await client.GetFromJsonAsync<List<ManagedEventDto>>(Url($"/api/events/all{query}")))!;

    [Fact]
    public async Task List_WithoutStatus_ReturnsApprovedAndPending_Sorted()
    {
        var events = await GetListAsync(await AdminAsync());

        Assert.Contains(events, e => e.Title == "PTA Meeting" && e.IsApproved && e.ApproverName == "Thompson, Margaret A");
        Assert.Contains(events, e => e.Title == "Bake Sale" && !e.IsApproved && e.ApproverName is null);
        Assert.Equal(events.OrderBy(e => e.Date).ThenBy(e => e.Time).Select(e => e.Id), events.Select(e => e.Id));
    }

    [Theory]
    [InlineData("?status=approved", true)]
    [InlineData("?status=pending", false)]
    [InlineData("?status=Pending", false)] // not case-sensitive
    public async Task List_WithStatus_ReturnsOnlyThatStatus(string query, bool approved)
    {
        var events = await GetListAsync(await AdminAsync(), query);

        Assert.NotEmpty(events);
        Assert.All(events, e => Assert.Equal(approved, e.IsApproved));
    }

    [Theory]
    [InlineData("archived")]
    [InlineData("5")]
    public async Task List_WithUnknownStatus_Returns400(string status)
    {
        var response = await (await AdminAsync()).GetAsync(Url($"/api/events/all?status={status}"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetById_ReturnsCreatorApproverAndUtcTimestamps()
    {
        var admin = await AdminAsync();
        var pta = (await GetListAsync(admin)).Single(e => e.Title == "PTA Meeting");

        var response = await admin.GetAsync(Url($"/api/events/{pta.Id}"));
        var json = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("\"creatorName\":\"Smith, John Michael\"", json, StringComparison.Ordinal);
        Assert.Contains("\"approverName\":\"Thompson, Margaret A\"", json, StringComparison.Ordinal);
        Assert.Matches("\"createdAtUtc\":\"[^\"]+Z\"", json);
        Assert.Matches("\"approvedAtUtc\":\"[^\"]+Z\"", json);
    }

    [Fact]
    public async Task GetById_UnknownEvent_Returns404()
    {
        var response = await (await AdminAsync()).GetAsync(Url("/api/events/99999"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task NormalUser_CannotListViewOrEdit_Returns403()
    {
        var id = await CreateAsync(await AdminAsync(), FreeDay(1));
        var jsmith = await factory.CreateClientAsAsync("jsmith", "Pass123!");

        Assert.Equal(HttpStatusCode.Forbidden, (await jsmith.GetAsync(Url("/api/events/all"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await jsmith.GetAsync(Url($"/api/events/{id}"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await jsmith.PutAsJsonAsync($"/api/events/{id}", Body(FreeDay(1), "Hacked"))).StatusCode);
    }

    [Fact]
    public async Task Update_SavesChanges_AndCalendarShowsThem()
    {
        var admin = await AdminAsync();
        var id = await CreateAsync(admin, FreeDay(2));
        var newDate = FreeDay(3);

        var response = await admin.PutAsJsonAsync($"/api/events/{id}", Body(newDate, "Robotics Finals", "09:30"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<ManagedEventDto>())!;
        Assert.Equal("Robotics Finals", updated.Title);
        Assert.Equal(new TimeOnly(9, 30), updated.Time);
        Assert.True(updated.IsApproved); // editing keeps the status

        var calendar = await admin.GetFromJsonAsync<List<CalendarEventDto>>(Url($"/api/events?from={newDate}&to={newDate}"));
        Assert.Single(calendar!, e => e.Id == id && e.Title == "Robotics Finals");
    }

    [Fact]
    public async Task Update_MovingApprovedEventToFullDay_Returns409_AndKeepsOldDate()
    {
        var admin = await AdminAsync();
        var date = FreeDay(4);
        var id = await CreateAsync(admin, date);

        var response = await admin.PutAsJsonAsync($"/api/events/{id}", Body(SeededFullDay));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Contains("already has 10 approved events", problem!.Detail, StringComparison.Ordinal);
        var unchanged = await admin.GetFromJsonAsync<ManagedEventDto>(Url($"/api/events/{id}"));
        Assert.Equal(date, ToIso(unchanged!.Date));
    }

    [Fact]
    public async Task Update_WithInvalidBody_Returns400()
    {
        var admin = await AdminAsync();
        var id = await CreateAsync(admin, FreeDay(5));

        var response = await admin.PutAsJsonAsync($"/api/events/{id}", Body(FreeDay(5), title: "   "));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_UnknownEvent_Returns404()
    {
        var response = await (await AdminAsync()).PutAsJsonAsync("/api/events/99999", Body(FreeDay(6)));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}