using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using UsalCalendar.Api.Dtos;

namespace UsalCalendar.Tests.Integration;

/// <summary>POST /api/events: pending vs auto-approved, the daily cap (V9) and field validation (V4–V6).</summary>
public class CreateEventEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly MonthStart = new(DateTime.Now.Year, DateTime.Now.Month, 1);
    private static readonly DateOnly FullDay = MonthStart.AddDays(25); // seeded with exactly 10 approved events

    // A far-away date per test, so tests in this class never affect each other's data.
    private static string FreeDay(int n) =>
        MonthStart.AddMonths(6).AddDays(n).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static object Body(string date, string title = "Robotics Demo", string? location = "Room 101",
                               string? description = "Students show their robot.", string time = "15:30:00") =>
        new { title, location, description, date, time };

    private static async Task<List<CalendarEventDto>> GetDayAsync(HttpClient client, string date)
    {
        var events = await client.GetFromJsonAsync<List<CalendarEventDto>>(
            new Uri($"/api/events?from={date}&to={date}", UriKind.Relative));
        return events!;
    }

    [Fact]
    public async Task NormalUser_CreatesPendingEvent_VisibleOnlyToThemAndApprovers()
    {
        var jsmith = await factory.CreateClientAsAsync("jsmith", "Pass123!");
        var date = FreeDay(1);

        var response = await jsmith.PostAsJsonAsync("/api/events", Body(date));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CalendarEventDto>();
        Assert.NotNull(created);
        Assert.False(created.IsApproved);
        Assert.Equal("Smith, John Michael", created.CreatorName);
        Assert.Equal(new TimeOnly(15, 30), created.Time);

        Assert.Single(await GetDayAsync(jsmith, date));
        Assert.Single(await GetDayAsync(await factory.CreateClientAsAsync("admin", "Admin123!"), date));
        Assert.Empty(await GetDayAsync(await factory.CreateClientAsAsync("mjones", "Pass123!"), date));
    }

    [Fact]
    public async Task Approver_CreatesApprovedEvent_VisibleToEveryone()
    {
        var admin = await factory.CreateClientAsAsync("admin", "Admin123!");
        var date = FreeDay(2);

        var response = await admin.PostAsJsonAsync("/api/events", Body(date));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CalendarEventDto>();
        Assert.True(created!.IsApproved);
        Assert.Single(await GetDayAsync(await factory.CreateClientAsAsync("mjones", "Pass123!"), date));
    }

    [Fact]
    public async Task Approver_OnFullDay_Returns409WithMessage()
    {
        var admin = await factory.CreateClientAsAsync("admin", "Admin123!");
        var date = FullDay.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        var response = await admin.PostAsJsonAsync("/api/events", Body(date));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Contains("already has 10 approved events", problem!.Detail, StringComparison.Ordinal);
        Assert.Equal(10, (await GetDayAsync(admin, date)).Count(e => e.IsApproved));
    }

    [Fact]
    public async Task NormalUser_OnFullDay_CanStillSubmitForApproval()
    {
        var jsmith = await factory.CreateClientAsAsync("jsmith", "Pass123!");
        var date = FullDay.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        var response = await jsmith.PostAsJsonAsync("/api/events", Body(date, title: "Late Submission"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task OptionalFieldsCanBeOmitted_AndExactMaxLengthsAreAccepted()
    {
        var jsmith = await factory.CreateClientAsAsync("jsmith", "Pass123!");

        var minimal = await jsmith.PostAsJsonAsync("/api/events", new { title = "Minimal", date = FreeDay(3), time = "09:00:00" });
        var maxLengths = await jsmith.PostAsJsonAsync("/api/events",
            Body(FreeDay(4), title: new string('T', 25), location: new string('L', 50), description: new string('D', 255)));

        Assert.Equal(HttpStatusCode.Created, minimal.StatusCode);
        Assert.Equal(HttpStatusCode.Created, maxLengths.StatusCode);
    }

    public static TheoryData<string, object> InvalidBodies => new()
    {
        { "Title", Body(FreeDay(5), title: "") },                         // V5 required
        { "Title", Body(FreeDay(5), title: "   ") },                      // V5 whitespace only
        { "Title", Body(FreeDay(5), title: new string('T', 26)) },        // V5 > 25
        { "Title", Body(FreeDay(5), title: "Caf\u00e9 Night") },          // V5 non-printable
        { "Location", Body(FreeDay(5), location: new string('L', 51)) },  // V4 > 50
        { "Description", Body(FreeDay(5), description: new string('D', 256)) }, // V6 > 255
        { "Description", Body(FreeDay(5), description: "Line 1\nLine 2") },     // V6 newline isn't printable
        { "Date", new { title = "No date", time = "09:00:00" } },
        { "Time", new { title = "No time", date = FreeDay(5) } },
    };

    [Theory]
    [MemberData(nameof(InvalidBodies))]
    public async Task InvalidBody_Returns400_NamingTheField(string field, object body)
    {
        var jsmith = await factory.CreateClientAsAsync("jsmith", "Pass123!");

        var response = await jsmith.PostAsJsonAsync("/api/events", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
    }

    [Fact]
    public async Task WithoutToken_Returns401()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/events", Body(FreeDay(6)));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}