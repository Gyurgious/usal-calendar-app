using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using UsalCalendar.Api.Dtos;

namespace UsalCalendar.Tests.Integration;

/// <summary>Pending list, approve, delete (approvers only) and withdraw (creator only).</summary>
public class ApprovalEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly MonthStart = new(DateTime.Now.Year, DateTime.Now.Month, 1);

    // A far-away date per test, so tests in this class never affect each other's data.
    private static string FreeDay(int n) =>
        MonthStart.AddMonths(7).AddDays(n).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private Task<HttpClient> AdminAsync() => factory.CreateClientAsAsync("admin", "Admin123!");
    private Task<HttpClient> JsmithAsync() => factory.CreateClientAsAsync("jsmith", "Pass123!");

    /// <summary>Submits a pending event as `client` and returns its id.</summary>
    private static async Task<int> SubmitAsync(HttpClient client, string date, string title = "Robotics Demo")
    {
        var response = await client.PostAsJsonAsync("/api/events", new { title, date, time = "15:00:00" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CalendarEventDto>())!.Id;
    }

    private static async Task<List<PendingEventDto>> GetPendingAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<PendingEventDto>>(new Uri("/api/events/pending", UriKind.Relative)))!;

    private static async Task<List<CalendarEventDto>> GetDayAsync(HttpClient client, string date) =>
        (await client.GetFromJsonAsync<List<CalendarEventDto>>(new Uri($"/api/events?from={date}&to={date}", UriKind.Relative)))!;

    private static Uri Url(string path) => new(path, UriKind.Relative);

    [Fact]
    public async Task Pending_AsApprover_ListsSeededSubmissions_SortedWithCreatorAndUtcTimestamp()
    {
        var admin = await AdminAsync();

        var response = await admin.GetAsync(Url("/api/events/pending"));
        var json = await response.Content.ReadAsStringAsync();
        var pending = JsonSerializer.Deserialize<List<PendingEventDto>>(json, JsonSerializerOptions.Web)!;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(pending, p => p.Title == "Bake Sale" && p.CreatorName == "Smith, John Michael");
        Assert.Contains(pending, p => p.Title == "Movie Night");
        Assert.Equal(pending.OrderBy(p => p.Date).ThenBy(p => p.Time).Select(p => p.Id), pending.Select(p => p.Id));
        Assert.Contains("\"createdAtUtc\":", json, StringComparison.Ordinal);
        Assert.Matches("\"createdAtUtc\":\"[^\"]+Z\"", json); // ends in Z = UTC, so browsers show local time correctly
    }

    [Fact]
    public async Task NormalUser_CannotUseApproverEndpoints_Returns403()
    {
        var jsmith = await JsmithAsync();
        var id = await SubmitAsync(jsmith, FreeDay(1));

        Assert.Equal(HttpStatusCode.Forbidden, (await jsmith.GetAsync(Url("/api/events/pending"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await jsmith.PostAsync(Url($"/api/events/{id}/approve"), null)).StatusCode);
    }

    [Fact]
    public async Task Approve_MakesEventVisibleToEveryone()
    {
        var date = FreeDay(2);
        var id = await SubmitAsync(await JsmithAsync(), date);
        var mjones = await factory.CreateClientAsAsync("mjones", "Pass123!");
        Assert.Empty(await GetDayAsync(mjones, date)); // pending: not visible to other users

        var response = await (await AdminAsync()).PostAsync(Url($"/api/events/{id}/approve"), null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await response.Content.ReadFromJsonAsync<CalendarEventDto>())!.IsApproved);
        Assert.Single(await GetDayAsync(mjones, date));
        Assert.DoesNotContain(await GetPendingAsync(await AdminAsync()), p => p.Id == id);
    }

    [Fact]
    public async Task Approve_SeededMovieNightOnFullDay_Returns409()
    {
        var admin = await AdminAsync();
        var movieNight = (await GetPendingAsync(admin)).Single(p => p.Title == "Movie Night");

        var response = await admin.PostAsync(Url($"/api/events/{movieNight.Id}/approve"), null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Contains("already has 10 approved events", problem!.Detail, StringComparison.Ordinal);
        Assert.Contains(await GetPendingAsync(admin), p => p.Id == movieNight.Id); // still pending
    }

    [Fact]
    public async Task Delete_AsApprover_Returns204_AndEventIsGone()
    {
        var date = FreeDay(3);
        var id = await SubmitAsync(await JsmithAsync(), date);
        var admin = await AdminAsync();

        var response = await admin.DeleteAsync(Url($"/api/events/{id}"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await GetDayAsync(admin, date));
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync(Url($"/api/events/{id}"))).StatusCode);
    }

        [Fact]
    public async Task Delete_AsCreator_OwnPendingEvent_Returns204_AndEventIsGone()
    {
        var date = FreeDay(4);
        var jsmith = await JsmithAsync();
        var id = await SubmitAsync(jsmith, date);

        var response = await jsmith.DeleteAsync(Url($"/api/events/{id}"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await GetDayAsync(jsmith, date));
    }

    [Fact]
    public async Task Delete_AsNormalUser_SomeoneElsesEvent_Returns403()
    {
        var id = await SubmitAsync(await JsmithAsync(), FreeDay(5));
        var mjones = await factory.CreateClientAsAsync("mjones", "Pass123!");

        var response = await mjones.DeleteAsync(Url($"/api/events/{id}"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Delete_AsCreator_AfterApproval_Returns409()
    {
        var jsmith = await JsmithAsync();
        var id = await SubmitAsync(jsmith, FreeDay(6));
        (await (await AdminAsync()).PostAsync(Url($"/api/events/{id}/approve"), null)).EnsureSuccessStatusCode();

        var response = await jsmith.DeleteAsync(Url($"/api/events/{id}"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Contains("can no longer be withdrawn", problem!.Detail, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UnknownEvent_Returns404()
    {
        var admin = await AdminAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsync(Url("/api/events/99999/approve"), null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync(Url("/api/events/99999"))).StatusCode);
    }
}